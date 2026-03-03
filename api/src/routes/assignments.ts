import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const AssignmentCreateSchema = z.object({
  employeeId: z.string().uuid(),
  projectId: z.string().uuid(),
  manufacturingOrderId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(['AM', 'PM', 'FULL']).default('FULL'),
  timeSpentMinutes: z.number().int().min(0).nullable().optional(),
  comment: z.string().nullable().optional(),
});

const AssignmentBulkSchema = z.object({
  employeeId: z.string().uuid(),
  projectIds: z.array(z.string().uuid()).min(1),
  manufacturingOrderId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(['AM', 'PM', 'FULL']).default('FULL'),
  timeSpentMinutes: z.number().int().min(0).nullable().optional(),
  comment: z.string().nullable().optional(),
});

const include = {
  project: true,
  manufacturingOrder: true,
};

export async function assignmentRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // List — filter by employeeId, date range, projectId, workshopId
  app.get('/assignments', async (req) => {
    const q = req.query as {
      employeeId?: string;
      projectId?: string;
      workshopId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    return prisma.assignment.findMany({
      where: {
        employeeId: q.employeeId || undefined,
        projectId: q.projectId || undefined,
        project: q.workshopId ? { workshopId: q.workshopId } : undefined,
        date: {
          gte: q.dateFrom ? new Date(q.dateFrom) : undefined,
          lte: q.dateTo ? new Date(q.dateTo) : undefined,
        },
      },
      include,
      orderBy: [{ date: 'asc' }, { slot: 'asc' }],
    });
  });

  app.get('/assignments/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const row = await prisma.assignment.findUnique({ where: { id }, include });
    if (!row) return reply.code(404).send({ message: 'Not found' });
    return row;
  });

  // Single assignment
  app.post('/assignments', async (req, reply) => {
    const parsed = AssignmentCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;
    const created = await prisma.assignment.create({
      data: {
        employeeId: d.employeeId,
        projectId: d.projectId,
        manufacturingOrderId: d.manufacturingOrderId ?? null,
        date: new Date(d.date),
        slot: d.slot,
        timeSpentMinutes: d.timeSpentMinutes ?? null,
        comment: d.comment ?? null,
      },
      include,
    });
    return reply.code(201).send(created);
  });

  // Bulk — create N assignments (one per projectId), same person/date/slot
  app.post('/assignments/bulk', async (req, reply) => {
    const parsed = AssignmentBulkSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;
    const created = await prisma.$transaction(
      d.projectIds.map(projectId =>
        prisma.assignment.create({
          data: {
            employeeId: d.employeeId,
            projectId,
            manufacturingOrderId: d.manufacturingOrderId ?? null,
            date: new Date(d.date),
            slot: d.slot,
            timeSpentMinutes: d.timeSpentMinutes ?? null,
            comment: d.comment ?? null,
          },
          include,
        })
      )
    );
    return reply.code(201).send(created);
  });

  app.patch('/assignments/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const parsed = AssignmentCreateSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    try {
      const d = parsed.data;
      const updated = await prisma.assignment.update({
        where: { id },
        data: {
          ...d,
          date: d.date ? new Date(d.date) : undefined,
        },
        include,
      });
      return updated;
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });

  app.delete('/assignments/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      await prisma.assignment.delete({ where: { id } });
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });
}
