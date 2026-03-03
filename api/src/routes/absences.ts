import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const AbsenceCreateSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(['AM', 'PM', 'FULL']).default('FULL'),
  type: z.enum(['CP', 'RTT', 'MALADIE', 'FORMATION', 'AUTRE']),
  comment: z.string().nullable().optional(),
});

export async function absenceRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/absences', async (req) => {
    const q = req.query as { employeeId?: string; dateFrom?: string; dateTo?: string; workshopId?: string };
    return prisma.absence.findMany({
      where: {
        employeeId: q.employeeId || undefined,
        employee: q.workshopId ? { workshopId: q.workshopId } : undefined,
        date: {
          gte: q.dateFrom ? new Date(q.dateFrom) : undefined,
          lte: q.dateTo ? new Date(q.dateTo) : undefined,
        },
      },
      include: { employee: true },
      orderBy: [{ date: 'asc' }],
    });
  });

  app.post('/absences', async (req, reply) => {
    const parsed = AbsenceCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;
    const slot = d.slot || 'FULL';
    // Upsert: replace if already exists for same person+date+slot
    const created = await prisma.absence.upsert({
      where: { employeeId_date_slot: { employeeId: d.employeeId, date: new Date(d.date), slot } },
      create: {
        employeeId: d.employeeId,
        date: new Date(d.date),
        slot,
        type: d.type,
        comment: d.comment ?? null,
      },
      update: {
        type: d.type,
        comment: d.comment ?? null,
      },
    });
    return reply.code(201).send(created);
  });

  app.delete('/absences/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      await prisma.absence.delete({ where: { id } });
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });

  // Convenience: delete by employee + date + slot
  app.delete('/absences', async (req, reply) => {
    const q = req.query as { employeeId?: string; date?: string; slot?: string };
    if (!q.employeeId || !q.date) return reply.code(400).send({ message: 'employeeId and date required' });
    const slot = (q.slot as 'AM' | 'PM' | 'FULL') || 'FULL';
    try {
      await prisma.absence.delete({
        where: { employeeId_date_slot: { employeeId: q.employeeId, date: new Date(q.date), slot } },
      });
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });
}
