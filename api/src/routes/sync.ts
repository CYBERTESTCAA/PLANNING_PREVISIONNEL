import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { runFabricSync, getSyncProgress, type SyncResult } from '../services/fabricSync.js';

let syncInProgress = false;

export async function syncRoutes(server: FastifyInstance, prisma: PrismaClient) {
  // POST /sync/fabric — déclencher manuellement une synchro
  server.post('/sync/fabric', async (request, reply) => {
    if (syncInProgress) {
      return reply.status(409).send({ error: 'Une synchronisation est déjà en cours' });
    }
    syncInProgress = true;
    const startTime = Date.now();
    const q = request.query as { triggeredBy?: string };
    const triggeredBy = q.triggeredBy || 'manual';

    // Create a SyncLog entry
    let logId: string | null = null;
    try {
      const log = await (prisma as any).syncLog.create({ data: { triggeredBy, status: 'RUNNING' } });
      logId = log.id;
    } catch { /* SyncLog table may not exist yet */ }

    try {
      const delta = (request.query as any).delta === '1' || (request.query as any).delta === 'true';
      const result = await runFabricSync(prisma, delta);
      const durationMs = Date.now() - startTime;

      // Update the SyncLog
      if (logId) {
        try {
          await (prisma as any).syncLog.update({
            where: { id: logId },
            data: {
              finishedAt: new Date(),
              durationMs,
              status: result.errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
              subsidiaries: result.subsidiaries,
              workshops: result.workshops,
              employees: result.employees,
              projects: result.projects,
              mfgOrders: result.manufacturingOrders,
              clients: result.clients ?? 0,
              affaires: result.affaires ?? 0,
              timeEntries: result.timeEntries ?? 0,
              calendarDays: result.calendarDays ?? 0,
              errors: JSON.stringify(result.errors),
            },
          });
        } catch { /* ignore */ }
      }

      return { ...result, syncedAt: new Date().toISOString(), durationMs };
    } catch (err: any) {
      if (logId) {
        try {
          await (prisma as any).syncLog.update({
            where: { id: logId },
            data: { finishedAt: new Date(), durationMs: Date.now() - startTime, status: 'FAILED', errors: JSON.stringify([err.message]) },
          });
        } catch { /* ignore */ }
      }
      return reply.status(500).send({ error: err.message });
    } finally {
      syncInProgress = false;
    }
  });

  // GET /sync/progress — real-time progress during sync
  server.get('/sync/progress', async () => {
    const progress = getSyncProgress();
    return { inProgress: syncInProgress, progress };
  });

  // GET /sync/status — état de la dernière synchro
  server.get('/sync/status', async () => {
    let last = null;
    try {
      last = await (prisma as any).syncLog.findFirst({ orderBy: { startedAt: 'desc' } });
    } catch { /* SyncLog table may not exist */ }
    return { inProgress: syncInProgress, last, progress: getSyncProgress() };
  });

  // GET /sync/history — historique des synchros
  server.get('/sync/history', async (req) => {
    const q = req.query as { limit?: string };
    const take = Math.min(parseInt(q.limit || '20', 10), 100);
    try {
      return await (prisma as any).syncLog.findMany({ orderBy: { startedAt: 'desc' }, take });
    } catch {
      return [];
    }
  });

  // POST /sync/cleanup — supprimer les filiales dupliquées et remettre à zéro les données
  // Les 5 filiales actives : 9MAR, 5MAR, 14STBARTH, 1GUA, 1SUISSE
  server.post('/sync/cleanup', async (_request, reply) => {
    const KEEP_CODES = ['9MAR', '5MAR', '14STBARTH', '1GUA', '1SUISSE'];
    try {
      // 1. Find subsidiaries to delete (not in KEEP_CODES)
      const allSubs = await prisma.subsidiary.findMany();
      const toDelete = allSubs.filter(s => !KEEP_CODES.includes(s.code));
      const toDeleteIds = toDelete.map(s => s.id);

      // 2. Find workshops linked to subsidiaries to delete
      const workshopsToDelete = await prisma.workshop.findMany({
        where: { subsidiaryId: { in: toDeleteIds } },
      });
      const workshopIdsToDelete = workshopsToDelete.map(w => w.id);

      // 3. Delete assignments for employees in those subsidiaries
      const employeesToDelete = await prisma.employee.findMany({
        where: { subsidiaryId: { in: toDeleteIds } },
        select: { id: true },
      });
      const empIdsToDelete = employeesToDelete.map(e => e.id);

      const delAssignments = await prisma.assignment.deleteMany({
        where: { employeeId: { in: empIdsToDelete } },
      });
      const delAbsences = await prisma.absence.deleteMany({
        where: { employeeId: { in: empIdsToDelete } },
      });

      // 4. Delete projects in those workshops
      const projectsToDelete = await prisma.project.findMany({
        where: { workshopId: { in: workshopIdsToDelete } },
        select: { id: true },
      });
      const projIdsToDelete = projectsToDelete.map(p => p.id);

      await prisma.manufacturingOrder.deleteMany({
        where: { projectId: { in: projIdsToDelete } },
      });
      await prisma.assignment.deleteMany({
        where: { projectId: { in: projIdsToDelete } },
      });
      const delProjects = await prisma.project.deleteMany({
        where: { workshopId: { in: workshopIdsToDelete } },
      });

      // 5. Delete employees, teams, workshops, and subsidiaries
      const delEmployees = await prisma.employee.deleteMany({
        where: { subsidiaryId: { in: toDeleteIds } },
      });
      await prisma.team.deleteMany({
        where: { workshopId: { in: workshopIdsToDelete } },
      });
      const delWorkshops = await prisma.workshop.deleteMany({
        where: { subsidiaryId: { in: toDeleteIds } },
      });
      // Delete clients linked to duplicate subsidiaries
      await prisma.client.deleteMany({
        where: { subsidiaryId: { in: toDeleteIds } },
      });
      const delSubs = await prisma.subsidiary.deleteMany({
        where: { id: { in: toDeleteIds } },
      });

      return {
        deleted: {
          subsidiaries: delSubs.count,
          subsidiaryNames: toDelete.map(s => `${s.code} (${s.name})`),
          workshops: delWorkshops.count,
          employees: delEmployees.count,
          projects: delProjects.count,
          assignments: delAssignments.count,
          absences: delAbsences.count,
        },
        kept: KEEP_CODES,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
