import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
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
import { timeEntryRoutes } from './routes/time-entries.js';
import { calendarRoutes } from './routes/calendar.js';
import { runFabricSync } from './services/fabricSync.js';
import { ensureWarehouseTables } from './services/warehouseTables.js';
import { runBackup } from './services/backup.js';
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

const server = Fastify({
  logger: true,
});

await server.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: false,
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
  if (!req.user) return { authenticated: false, isAdmin: false };
  return {
    authenticated: true,
    isAdmin: req.user.isAdmin,
    name: req.user.name,
    email: req.user.email,
  };
});

const SubsidiaryCreateSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

server.get('/subsidiaries', async () => {
  return prisma.subsidiary.findMany({ orderBy: [{ code: 'asc' }] });
});

server.post('/subsidiaries', async (req, reply) => {
  const parsed = SubsidiaryCreateSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

  const created = await prisma.subsidiary.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
    },
  });

  return reply.code(201).send(created);
});

server.get('/subsidiaries/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  const row = await prisma.subsidiary.findUnique({ where: { id } });
  if (!row) return reply.code(404).send({ message: 'Not found' });
  return row;
});

server.patch('/subsidiaries/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  const parsed = SubsidiaryCreateSchema.partial().safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

  try {
    const updated = await prisma.subsidiary.update({ where: { id }, data: parsed.data });
    return updated;
  } catch {
    return reply.code(404).send({ message: 'Not found' });
  }
});

server.delete('/subsidiaries/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  try {
    await prisma.subsidiary.delete({ where: { id } });
    return reply.code(204).send();
  } catch {
    return reply.code(404).send({ message: 'Not found' });
  }
});

const WorkshopCreateSchema = z.object({
  subsidiaryId: z.string().uuid(),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  themeColor: z.string().trim().min(1).optional(),
});

server.get('/workshops', async (req) => {
  const subsidiaryId = (req.query as { subsidiaryId?: string }).subsidiaryId;
  return prisma.workshop.findMany({
    where: subsidiaryId ? { subsidiaryId } : undefined,
    orderBy: [{ code: 'asc' }],
  });
});

server.post('/workshops', async (req, reply) => {
  const parsed = WorkshopCreateSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

  const created = await prisma.workshop.create({
    data: {
      subsidiaryId: parsed.data.subsidiaryId,
      code: parsed.data.code,
      name: parsed.data.name,
      themeColor: parsed.data.themeColor ?? null,
    },
  });

  return reply.code(201).send(created);
});

server.get('/workshops/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  const row = await prisma.workshop.findUnique({ where: { id } });
  if (!row) return reply.code(404).send({ message: 'Not found' });
  return row;
});

server.patch('/workshops/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  const parsed = WorkshopCreateSchema.partial().safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

  try {
    const updated = await prisma.workshop.update({ where: { id }, data: parsed.data });
    return updated;
  } catch {
    return reply.code(404).send({ message: 'Not found' });
  }
});

server.delete('/workshops/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  try {
    await prisma.workshop.delete({ where: { id } });
    return reply.code(204).send();
  } catch {
    return reply.code(404).send({ message: 'Not found' });
  }
});

const TeamCreateSchema = z.object({
  workshopId: z.string().uuid(),
  name: z.string().trim().min(1),
  isActive: z.boolean().optional(),
});

server.get('/teams', async (req) => {
  const workshopId = (req.query as { workshopId?: string }).workshopId;
  return prisma.team.findMany({
    where: workshopId ? { workshopId } : undefined,
    orderBy: [{ name: 'asc' }],
  });
});

server.post('/teams', async (req, reply) => {
  const parsed = TeamCreateSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

  const created = await prisma.team.create({
    data: {
      workshopId: parsed.data.workshopId,
      name: parsed.data.name,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return reply.code(201).send(created);
});

server.patch('/teams/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  const parsed = TeamCreateSchema.partial().safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

  try {
    const updated = await prisma.team.update({ where: { id }, data: parsed.data });
    return updated;
  } catch {
    return reply.code(404).send({ message: 'Not found' });
  }
});

server.delete('/teams/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  try {
    await prisma.team.delete({ where: { id } });
    return reply.code(204).send();
  } catch {
    return reply.code(404).send({ message: 'Not found' });
  }
});

const EmployeeCreateSchema = z.object({
  subsidiaryId: z.string().uuid(),
  workshopId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
  code: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  isActive: z.boolean().optional(),
});

server.get('/employees', async (req) => {
  const query = req.query as { subsidiaryId?: string; workshopId?: string; teamId?: string; unassigned?: string };
  const workshopFilter = query.workshopId !== undefined
    ? { workshopId: query.workshopId || null }
    : query.unassigned === 'true'
      ? { workshopId: null }
      : {};
  return prisma.employee.findMany({
    where: {
      subsidiaryId: query.subsidiaryId,
      teamId: query.teamId,
      ...workshopFilter,
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
});

server.post('/employees', async (req, reply) => {
  const parsed = EmployeeCreateSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

  const created = await prisma.employee.create({
    data: {
      subsidiaryId: parsed.data.subsidiaryId,
      workshopId: parsed.data.workshopId ?? null,
      teamId: parsed.data.teamId ?? null,
      code: parsed.data.code,
      lastName: parsed.data.lastName,
      firstName: parsed.data.firstName,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return reply.code(201).send(created);
});

server.patch('/employees/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  const parsed = EmployeeCreateSchema.partial().safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...parsed.data,
        workshopId: parsed.data.workshopId === undefined ? undefined : parsed.data.workshopId ?? null,
        teamId: parsed.data.teamId === undefined ? undefined : parsed.data.teamId ?? null,
      },
    });
    return updated;
  } catch {
    return reply.code(404).send({ message: 'Not found' });
  }
});

server.delete('/employees/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  try {
    await prisma.employee.delete({ where: { id } });
    return reply.code(204).send();
  } catch {
    return reply.code(404).send({ message: 'Not found' });
  }
});

// Bulk assign employees to a workshop
const BulkAssignWorkshopSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
  workshopId: z.string().uuid(),
});

server.post('/employees/bulk-assign-workshop', async (req, reply) => {
  const parsed = BulkAssignWorkshopSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

  const { employeeIds, workshopId } = parsed.data;
  const workshop = await prisma.workshop.findUnique({ where: { id: workshopId } });
  if (!workshop) return reply.code(404).send({ message: 'Workshop not found' });

  const result = await prisma.employee.updateMany({
    where: { id: { in: employeeIds } },
    data: { workshopId },
  });

  return { updated: result.count, workshopId };
});

// Bulk assign ALL unassigned employees of a subsidiary to a workshop
const BulkAssignUnassignedSchema = z.object({
  subsidiaryId: z.string().uuid(),
  workshopId: z.string().uuid(),
});

server.post('/employees/bulk-assign-unassigned', async (req, reply) => {
  const parsed = BulkAssignUnassignedSchema.safeParse(req.body);
  if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

  const { subsidiaryId, workshopId } = parsed.data;
  const result = await prisma.employee.updateMany({
    where: { subsidiaryId, workshopId: null },
    data: { workshopId },
  });

  return { updated: result.count, workshopId };
});

// ─── Modular routes ───────────────────────────────────────────────────────────
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

// ─── Start ────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';

try {
  await server.listen({ port, host });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
