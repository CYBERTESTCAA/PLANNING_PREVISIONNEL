import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

export async function timeEntryRoutes(server: FastifyInstance, prisma: PrismaClient) {
  // GET /time-entries?employeeId=xxx&projectId=xxx&from=yyyy-mm-dd&to=yyyy-mm-dd
  server.get('/time-entries', async (req) => {
    const query = req.query as {
      employeeId?: string;
      projectId?: string;
      from?: string;
      to?: string;
      limit?: string;
    };
    const where: any = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }
    const take = Math.min(parseInt(query.limit || '500', 10), 5000);
    return prisma.timeEntry.findMany({
      where,
      include: {
        employee: { select: { id: true, code: true, firstName: true, lastName: true } },
        project: { select: { id: true, code: true, label: true } },
      },
      orderBy: [{ date: 'desc' }],
      take,
    });
  });

  // GET /time-entries/summary?projectId=xxx — aggregated hours per employee
  server.get('/time-entries/summary', async (req) => {
    const query = req.query as { projectId?: string; employeeId?: string; from?: string; to?: string };
    const where: any = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      select: { employeeId: true, projectId: true, hours: true, cost: true },
    });

    // Aggregate by employeeId
    const byEmployee: Record<string, { hours: number; cost: number; count: number }> = {};
    let totalHours = 0;
    let totalCost = 0;
    for (const e of entries) {
      const key = e.employeeId;
      if (!byEmployee[key]) byEmployee[key] = { hours: 0, cost: 0, count: 0 };
      byEmployee[key].hours += e.hours;
      byEmployee[key].cost += e.cost ?? 0;
      byEmployee[key].count++;
      totalHours += e.hours;
      totalCost += e.cost ?? 0;
    }

    return { totalHours, totalCost, totalEntries: entries.length, byEmployee };
  });
}
