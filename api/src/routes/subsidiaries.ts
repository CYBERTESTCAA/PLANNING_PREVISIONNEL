import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const SubsidiaryCreateSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

export async function subsidiaryRoutes(server: FastifyInstance, prisma: PrismaClient) {
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
}
