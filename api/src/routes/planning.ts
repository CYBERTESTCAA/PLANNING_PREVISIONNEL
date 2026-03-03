import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

/**
 * GET /planning?workshopId=X&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD[&teamId=Y]
 *
 * Returns a single payload with everything the frontend needs for one period:
 *   { employees, assignments, absences, tasks }
 * The frontend builds PersonPlanningData[] from this.
 */
export async function planningRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/planning', async (req, reply) => {
    const q = req.query as {
      workshopId?: string;
      teamId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    if (!q.workshopId) return reply.code(400).send({ message: 'workshopId is required' });
    if (!q.dateFrom || !q.dateTo) return reply.code(400).send({ message: 'dateFrom and dateTo are required' });

    const dateFrom = new Date(q.dateFrom);
    const dateTo = new Date(q.dateTo);

    const [employees, assignments, absences, tasks] = await Promise.all([
      prisma.employee.findMany({
        where: {
          workshopId: q.workshopId,
          teamId: q.teamId || undefined,
          isActive: true,
        },
        include: { team: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),

      prisma.assignment.findMany({
        where: {
          project: { workshopId: q.workshopId },
          date: { gte: dateFrom, lte: dateTo },
          employee: q.teamId ? { teamId: q.teamId } : { workshopId: q.workshopId },
        },
        include: {
          project: true,
          manufacturingOrder: true,
        },
        orderBy: [{ date: 'asc' }, { slot: 'asc' }],
      }),

      prisma.absence.findMany({
        where: {
          employee: { workshopId: q.workshopId },
          date: { gte: dateFrom, lte: dateTo },
          ...(q.teamId ? { employee: { teamId: q.teamId } } : {}),
        },
        orderBy: [{ date: 'asc' }],
      }),

      prisma.task.findMany({
        where: {
          employee: { workshopId: q.workshopId },
          ...(q.teamId ? { employee: { teamId: q.teamId } } : {}),
        },
        include: {
          project: { select: { id: true, code: true, label: true, color: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    return { employees, assignments, absences, tasks };
  });
}
