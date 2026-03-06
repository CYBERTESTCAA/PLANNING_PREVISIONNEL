import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const TeamCreateSchema = z.object({
  workshopId: z.string().uuid(),
  name: z.string().trim().min(1),
  isActive: z.boolean().optional(),
});

export async function teamRoutes(server: FastifyInstance, prisma: PrismaClient) {
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
}
