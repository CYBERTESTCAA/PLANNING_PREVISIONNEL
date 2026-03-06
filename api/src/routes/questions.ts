import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const QuestionCreateSchema = z.object({
  projectId: z.string(),
  designation: z.string().min(1),
  zone: z.string().nullable().optional(),
  question: z.string().min(1),
  auteur: z.string().nullable().optional(),
  destinataire: z.string().nullable().optional(),
  dateQuestion: z.string().optional(),
});

const QuestionUpdateSchema = z.object({
  designation: z.string().optional(),
  zone: z.string().nullable().optional(),
  question: z.string().optional(),
  auteur: z.string().nullable().optional(),
  destinataire: z.string().nullable().optional(),
  reponse: z.string().nullable().optional(),
  dateReponse: z.string().nullable().optional(),
  avancement: z.enum(['NON_TRAITE', 'EN_COURS_Q', 'TERMINE']).optional(),
});

const questionInclude = {
  project: { select: { id: true, code: true, label: true, color: true } },
  attachments: { orderBy: { createdAt: 'asc' as const } },
};

export default function questionRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // List questions
  app.get('/questions', async (req) => {
    const q = req.query as { projectId?: string; workshopId?: string; avancement?: string };
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.workshopId) where.project = { workshopId: q.workshopId };
    if (q.avancement) where.avancement = q.avancement;

    return prisma.question.findMany({
      where,
      include: questionInclude,
      orderBy: [{ avancement: 'asc' }, { dateQuestion: 'desc' }],
    });
  });

  // Create question
  app.post('/questions', async (req, reply) => {
    const parsed = QuestionCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;

    const question = await prisma.question.create({
      data: {
        projectId: d.projectId,
        designation: d.designation,
        zone: d.zone ?? null,
        question: d.question,
        auteur: d.auteur ?? null,
        destinataire: d.destinataire ?? null,
        dateQuestion: d.dateQuestion ? new Date(d.dateQuestion) : new Date(),
      },
      include: questionInclude,
    });
    return reply.code(201).send(question);
  });

  // Update question
  app.patch('/questions/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = QuestionUpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

    const d = parsed.data;
    const data: any = {};
    for (const [key, val] of Object.entries(d)) {
      if (val === undefined) continue;
      if (key === 'dateReponse') {
        data[key] = val ? new Date(val as string) : null;
      } else {
        data[key] = val;
      }
    }

    // Auto-set dateReponse when marking as TERMINE with a response
    if (d.avancement === 'TERMINE' && d.reponse && !d.dateReponse) {
      data.dateReponse = new Date();
    }

    const question = await prisma.question.update({ where: { id }, data, include: questionInclude });
    return question;
  });

  // Delete question
  app.delete('/questions/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.question.delete({ where: { id } });
    return reply.code(204).send();
  });
}
