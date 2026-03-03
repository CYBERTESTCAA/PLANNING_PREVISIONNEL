import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

export async function affaireRoutes(server: FastifyInstance, prisma: PrismaClient) {
  // GET /affaires?subsidiaryCode=xxx&search=xxx
  server.get('/affaires', async (req) => {
    const query = req.query as { subsidiaryCode?: string; search?: string };
    const where: any = {};
    if (query.subsidiaryCode) where.subsidiaryCode = query.subsidiaryCode;
    if (query.search) {
      where.OR = [
        { code: { contains: query.search } },
        { label: { contains: query.search } },
      ];
    }
    return prisma.affaire.findMany({
      where,
      include: { client: { select: { id: true, code: true, name: true } } },
      orderBy: [{ code: 'asc' }],
      take: 200,
    });
  });

  // GET /affaires/:id
  server.get('/affaires/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const row = await prisma.affaire.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, code: true, name: true } },
        projects: { select: { id: true, code: true, label: true, status: true } },
      },
    });
    if (!row) return reply.code(404).send({ message: 'Not found' });
    return row;
  });
}
