import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const MOCreateSchema = z.object({
  projectId: z.string().uuid(),
  code: z.string().trim().min(1),
  label: z.string().trim().optional(),
});

export async function manufacturingOrderRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get('/manufacturing-orders', async (req) => {
    const q = req.query as { projectId?: string; workshopId?: string };
    return prisma.manufacturingOrder.findMany({
      where: {
        projectId: q.projectId || undefined,
        project: q.workshopId ? { workshopId: q.workshopId } : undefined,
      },
      include: {
        project: { select: { id: true, code: true, label: true, color: true } },
        articles: { orderBy: { code: 'asc' } },
      },
      orderBy: [{ code: 'asc' }],
    });
  });

  app.post('/manufacturing-orders', async (req, reply) => {
    const parsed = MOCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;
    const created = await prisma.manufacturingOrder.create({
      data: { projectId: d.projectId, code: d.code, label: d.label ?? null },
    });
    return reply.code(201).send(created);
  });

  app.patch('/manufacturing-orders/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const parsed = MOCreateSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    try {
      const updated = await prisma.manufacturingOrder.update({ where: { id }, data: parsed.data });
      return updated;
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });

  app.delete('/manufacturing-orders/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      await prisma.manufacturingOrder.delete({ where: { id } });
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });
}
