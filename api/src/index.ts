import 'dotenv/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { PrismaClient } from '@prisma/client';
import { projectRoutes } from './routes/projects.js';
import { assignmentRoutes } from './routes/assignments.js';
import { absenceRoutes } from './routes/absences.js';
import { manufacturingOrderRoutes } from './routes/manufacturing-orders.js';
import { taskRoutes } from './routes/tasks.js';
import { planningRoutes } from './routes/planning.js';
import { syncRoutes } from './routes/sync.js';
import { warehouseRoutes } from './routes/warehouse.js';
import { clientRoutes } from './routes/clients.js';
import { affaireRoutes } from './routes/affaires.js';
import { subsidiaryRoutes } from './routes/subsidiaries.js';
import { workshopRoutes } from './routes/workshops.js';
import { teamRoutes } from './routes/teams.js';
import { employeeRoutes } from './routes/employees.js';
import { timeEntryRoutes } from './routes/time-entries.js';
import { calendarRoutes } from './routes/calendar.js';
import planRoutes from './routes/plans.js';
import dessinateurRoutes from './routes/dessinateurs.js';
import questionRoutes from './routes/questions.js';
import attachmentRoutes from './routes/attachments.js';
import { runFabricSync } from './services/fabricSync.js';
import { ensureWarehouseTables } from './services/warehouseTables.js';
import { runBackup, listBackups, restoreBackup, verifyRestorePassword } from './services/backup.js';
import { attachUser, requireAdmin } from './middleware/auth.js';
import cron from 'node-cron';

const prisma = new PrismaClient();

// ─── SQLite WAL + busy_timeout (run once at startup) ──────────────────────────
await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL');
await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000');
await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL');
await prisma.$queryRawUnsafe('PRAGMA foreign_keys=ON');

// ─── Create warehouse mirror tables from dbo/Tables/*.sql ─────────────────────
await ensureWarehouseTables(prisma);

// ─── Clean up stale RUNNING sync logs from interrupted syncs ──────────────────
try {
  const stale = await (prisma as any).syncLog.updateMany({
    where: { status: 'RUNNING' },
    data: { status: 'FAILED', finishedAt: new Date(), errors: JSON.stringify(['Sync interrupted (server restart)']) },
  });
  if (stale.count > 0) console.log(`[startup] Cleaned up ${stale.count} stale RUNNING sync log(s)`);
} catch { /* SyncLog table may not exist yet */ }

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = resolve(__dirname, '..', 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const server = Fastify({
  logger: true,
});

await server.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
await server.register(fastifyStatic, { root: UPLOADS_DIR, prefix: '/uploads/', decorateReply: false });

// ─── Security: Helmet (sets safe defaults for many HTTP headers) ──────────────
await server.register(helmet, {
  contentSecurityPolicy: false,       // CSP handled by Nginx (frontend)
  crossOriginEmbedderPolicy: false,   // MSAL needs unsafe-none
  crossOriginOpenerPolicy: false,     // MSAL needs unsafe-none
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: false,                        // HSTS handled by Nginx
});

// ─── Security: Rate limiting (brute-force / DDoS protection) ─────────────────
await server.register(rateLimit, {
  max: 200,                  // 200 requests per window per IP
  timeWindow: '1 minute',
  allowList: ['127.0.0.1'],  // trust localhost (Nginx → API)
  keyGenerator: (request) => {
    // Use X-Real-IP from Nginx if available, else remoteAddress
    return (request.headers['x-real-ip'] as string) || request.ip;
  },
});

await server.register(cors, {
  origin: (origin, cb) => {
    // No origin = same-origin or server-to-server → always allow
    if (!origin) return cb(null, true);
    // If CORS_ORIGIN is set, restrict to those domains; otherwise allow all
    const corsEnv = process.env.CORS_ORIGIN || '';
    if (!corsEnv) return cb(null, true);
    const allowed = corsEnv.split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.includes(origin)) return cb(null, true);
    cb(new Error('CORS not allowed'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400,
});

// ─── Security headers on every API response ──────────────────────────────────
server.addHook('onSend', async (_request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Cache-Control', 'no-store');
  reply.header('Pragma', 'no-cache');
  // Prevent browsers from exposing API version/stack info
  reply.removeHeader('X-Powered-By');
});

server.get('/health', async () => {
  return { ok: true };
});

// ─── Auth: extract user on every request ──────────────────────────────────────
server.addHook('preHandler', attachUser);

// ─── Auth: block write operations for non-admins ──────────────────────────────
server.addHook('preHandler', async (request, reply) => {
  if (request.method === 'GET' || request.method === 'OPTIONS' || request.method === 'HEAD') return;
  if (request.url === '/auth/me' || request.url.startsWith('/sync/')) return;
  await requireAdmin(request, reply);
});

// ─── Auth endpoint ────────────────────────────────────────────────────────────
server.get('/auth/me', async (req) => {
  if (!req.user) {
    console.warn('[auth/me] No user extracted from token');
    return { authenticated: false, isAdmin: false };
  }
  console.log(`[auth/me] ${req.user.email} — isAdmin: ${req.user.isAdmin}, groups: ${req.user.groups.length}`);
  return {
    authenticated: true,
    isAdmin: req.user.isAdmin,
    name: req.user.name,
    email: req.user.email,
  };
});

// ─── Modular routes ───────────────────────────────────────────────────────────
await subsidiaryRoutes(server, prisma);
await workshopRoutes(server, prisma);
await teamRoutes(server, prisma);
await employeeRoutes(server, prisma);
await projectRoutes(server, prisma);
await assignmentRoutes(server, prisma);
await absenceRoutes(server, prisma);
await manufacturingOrderRoutes(server, prisma);
await taskRoutes(server, prisma);
await planningRoutes(server, prisma);
await syncRoutes(server, prisma);
await warehouseRoutes(server, prisma);
await clientRoutes(server, prisma);
await affaireRoutes(server, prisma);
await timeEntryRoutes(server, prisma);
await calendarRoutes(server, prisma);
planRoutes(server, prisma);
dessinateurRoutes(server, prisma);
questionRoutes(server, prisma);
attachmentRoutes(server, prisma, UPLOADS_DIR);

// ─── Fabric sync cron ─────────────────────────────────────────────────────────
const syncCron = process.env.FABRIC_SYNC_CRON || '0 * * * *';
if (process.env.FABRIC_CLIENT_ID && process.env.FABRIC_CLIENT_ID !== 'VOTRE_CLIENT_ID') {
  cron.schedule(syncCron, async () => {
    server.log.info('🔄  Fabric sync started (cron)');
    const result = await runFabricSync(prisma);
    server.log.info({ result }, '✅  Fabric sync done');
  });
  server.log.info(`🕐  Fabric sync cron scheduled: ${syncCron}`);
}

// ─── SQLite backup cron (every day at 02:00) ─────────────────────────────────
const backupCron = process.env.BACKUP_CRON || '0 2 * * *';
cron.schedule(backupCron, async () => {
  server.log.info('💾  SQLite backup started (cron)');
  const result = await runBackup(prisma);
  if (result) server.log.info({ file: result.file, sizeKB: Math.round(result.sizeBytes / 1024) }, '✅  Backup done');
});
server.log.info(`💾  SQLite backup cron scheduled: ${backupCron}`);

// Manual backup endpoint (admin only)
server.post('/backup', async (req, reply) => {
  const result = await runBackup(prisma);
  if (!result) return reply.code(500).send({ message: 'Backup failed' });
  return { ok: true, file: result.file, sizeBytes: result.sizeBytes };
});

// List all backups
server.get('/backups', async () => {
  return listBackups();
});

// Restore a backup (requires password)
server.post('/backups/restore', async (req, reply) => {
  const body = req.body as { file?: string; password?: string };
  if (!body.file || !body.password) {
    return reply.code(400).send({ message: 'file and password are required' });
  }
  if (!verifyRestorePassword(body.password)) {
    return reply.code(403).send({ message: 'Mot de passe incorrect' });
  }
  const result = await restoreBackup(prisma, body.file);
  if (!result.ok) return reply.code(500).send(result);
  return result;
});

// ─── Start ────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';

try {
  await server.listen({ port, host });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
