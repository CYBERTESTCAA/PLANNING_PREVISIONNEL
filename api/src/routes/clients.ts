import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

export async function clientRoutes(server: FastifyInstance, prisma: PrismaClient) {
  // GET /clients?subsidiaryId=xxx
  server.get('/clients', async (req) => {
    const query = req.query as { subsidiaryId?: string; search?: string };
    const where: any = {};
    if (query.subsidiaryId) where.subsidiaryId = query.subsidiaryId;
    if (query.search) {
      where.OR = [
        { code: { contains: query.search } },
        { name: { contains: query.search } },
      ];
    }
    return prisma.client.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      take: 200,
    });
  });

  // GET /clients/:id
  server.get('/clients/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const row = await prisma.client.findUnique({
      where: { id },
      include: { projects: { select: { id: true, code: true, label: true, status: true } } },
    });
    if (!row) return reply.code(404).send({ message: 'Not found' });
    return row;
  });
}
