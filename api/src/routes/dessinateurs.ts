import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const DessinateurSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  societe: z.string().min(1),
});

export default function dessinateurRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // List dessinateurs (active by default, ?all=true for archived too)
  app.get('/dessinateurs', async (req) => {
    const q = req.query as { all?: string };
    const where = q.all === 'true' ? {} : { isActive: true };
    return prisma.dessinateur.findMany({ where, orderBy: { nom: 'asc' } });
  });

  // Create
  app.post('/dessinateurs', async (req, reply) => {
    const parsed = DessinateurSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;
    const dessinateur = await prisma.dessinateur.create({ data: { nom: d.nom, prenom: d.prenom, societe: d.societe } });
    return reply.code(201).send(dessinateur);
  });

  // Update
  app.patch('/dessinateurs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Partial<{ nom: string; prenom: string; societe: string; isActive: boolean }>;
    const dessinateur = await prisma.dessinateur.update({ where: { id }, data: body });
    return dessinateur;
  });

  // Toggle archive
  app.patch('/dessinateurs/:id/toggle', async (req) => {
    const { id } = req.params as { id: string };
    const current = await prisma.dessinateur.findUnique({ where: { id } });
    if (!current) throw new Error('Not found');
    return prisma.dessinateur.update({ where: { id }, data: { isActive: !current.isActive } });
  });

  // Delete
  app.delete('/dessinateurs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.dessinateur.delete({ where: { id } });
    return reply.code(204).send();
  });
}
