import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const WorkshopCreateSchema = z.object({
  subsidiaryId: z.string().uuid(),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  themeColor: z.string().trim().min(1).optional(),
});

export async function workshopRoutes(server: FastifyInstance, prisma: PrismaClient) {
  server.get('/workshops', async (req) => {
    const subsidiaryId = (req.query as { subsidiaryId?: string }).subsidiaryId;
    return prisma.workshop.findMany({
      where: subsidiaryId ? { subsidiaryId } : undefined,
      orderBy: [{ code: 'asc' }],
    });
  });

  server.post('/workshops', async (req, reply) => {
    const parsed = WorkshopCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

    const created = await prisma.workshop.create({
      data: {
        subsidiaryId: parsed.data.subsidiaryId,
        code: parsed.data.code,
        name: parsed.data.name,
        themeColor: parsed.data.themeColor ?? null,
      },
    });

    return reply.code(201).send(created);
  });

  server.get('/workshops/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const row = await prisma.workshop.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ message: 'Not found' });
    return row;
  });

  server.patch('/workshops/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const parsed = WorkshopCreateSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

    try {
      const updated = await prisma.workshop.update({ where: { id }, data: parsed.data });
      return updated;
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });

  server.delete('/workshops/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      await prisma.workshop.delete({ where: { id } });
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });
}
