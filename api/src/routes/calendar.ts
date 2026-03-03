import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

export async function calendarRoutes(server: FastifyInstance, prisma: PrismaClient) {
  // GET /calendar?from=yyyy-mm-dd&to=yyyy-mm-dd
  server.get('/calendar', async (req) => {
    const query = req.query as { from?: string; to?: string; year?: string };
    const where: any = {};
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }
    if (query.year) {
      where.year = parseInt(query.year, 10);
    }
    return prisma.calendarDay.findMany({
      where,
      orderBy: [{ date: 'asc' }],
    });
  });

  // GET /calendar/holidays?year=2026
  server.get('/calendar/holidays', async (req) => {
    const query = req.query as { year?: string };
    const where: any = { isHoliday: true };
    if (query.year) where.year = parseInt(query.year, 10);
    return prisma.calendarDay.findMany({
      where,
      orderBy: [{ date: 'asc' }],
    });
  });

  // GET /subsidiary-schedules?subsidiaryId=xxx
  server.get('/subsidiary-schedules', async (req) => {
    const query = req.query as { subsidiaryId?: string };
    const where: any = {};
    if (query.subsidiaryId) where.subsidiaryId = query.subsidiaryId;
    return prisma.subsidiarySchedule.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }],
    });
  });
}
