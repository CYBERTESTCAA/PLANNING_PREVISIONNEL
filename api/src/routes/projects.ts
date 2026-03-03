import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const ProjectCreateSchema = z.object({
  workshopId: z.string().uuid(),
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
  color: z.string().trim().min(1),
  contractStart: z.string().nullable().optional(),
  contractEnd: z.string().nullable().optional(),
  plannedStart: z.string().nullable().optional(),
  plannedEnd: z.string().nullable().optional(),
  status: z.enum(['A_PLANIFIER', 'EN_COURS', 'BLOQUE', 'TERMINE']).optional(),
  progressPct: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

const toDate = (s: string | null | undefined): Date | null =>
  s ? new Date(s) : null;

export async function projectRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/projects', async (req) => {
    const q = req.query as { workshopId?: string; isActive?: string };
    return prisma.project.findMany({
      where: {
        workshopId: q.workshopId || undefined,
        isActive: q.isActive === 'true' ? true : q.isActive === 'false' ? false : undefined,
      },
      include: { manufacturingOrders: true },
      orderBy: [{ code: 'asc' }],
    });
  });

  app.get('/projects/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const row = await prisma.project.findUnique({
      where: { id },
      include: { manufacturingOrders: true },
    });
    if (!row) return reply.code(404).send({ message: 'Not found' });
    return row;
  });

  app.post('/projects', async (req, reply) => {
    const parsed = ProjectCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;
    const created = await prisma.project.create({
      data: {
        workshopId: d.workshopId,
        code: d.code,
        label: d.label,
        color: d.color,
        contractStart: toDate(d.contractStart),
        contractEnd: toDate(d.contractEnd),
        plannedStart: toDate(d.plannedStart),
        plannedEnd: toDate(d.plannedEnd),
        status: d.status ?? 'A_PLANIFIER',
        progressPct: d.progressPct ?? 0,
        isActive: d.isActive ?? true,
      },
    });
    return reply.code(201).send(created);
  });

  app.patch('/projects/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const parsed = ProjectCreateSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;
    try {
      const updated = await prisma.project.update({
        where: { id },
        data: {
          ...d,
          contractStart: d.contractStart === undefined ? undefined : toDate(d.contractStart),
          contractEnd: d.contractEnd === undefined ? undefined : toDate(d.contractEnd),
          plannedStart: d.plannedStart === undefined ? undefined : toDate(d.plannedStart),
          plannedEnd: d.plannedEnd === undefined ? undefined : toDate(d.plannedEnd),
        },
      });
      return updated;
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });

  app.delete('/projects/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      await prisma.project.delete({ where: { id } });
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });
}
