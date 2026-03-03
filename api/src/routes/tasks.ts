import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const TaskCreateSchema = z.object({
  employeeId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const TaskRespondSchema = z.object({
  status: z.enum(['DONE', 'NOT_DONE']),
  responseComment: z.string().nullable().optional(),
});

const include = {
  employee: { select: { id: true, firstName: true, lastName: true, code: true } },
  project: { select: { id: true, code: true, label: true, color: true } },
};

export async function taskRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // List tasks — filter by employee, project, status, workshopId
  app.get('/tasks', async (req) => {
    const q = req.query as {
      employeeId?: string;
      projectId?: string;
      workshopId?: string;
      status?: string;
    };
    return prisma.task.findMany({
      where: {
        employeeId: q.employeeId || undefined,
        projectId: q.projectId || undefined,
        employee: q.workshopId ? { workshopId: q.workshopId } : undefined,
        status: q.status as 'PENDING' | 'DONE' | 'NOT_DONE' | undefined,
      },
      include,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  });

  app.get('/tasks/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const row = await prisma.task.findUnique({ where: { id }, include });
    if (!row) return reply.code(404).send({ message: 'Not found' });
    return row;
  });

  app.post('/tasks', async (req, reply) => {
    const parsed = TaskCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;
    const created = await prisma.task.create({
      data: {
        employeeId: d.employeeId,
        projectId: d.projectId ?? null,
        title: d.title,
        description: d.description ?? null,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
      },
      include,
    });
    return reply.code(201).send(created);
  });

  app.patch('/tasks/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const parsed = TaskCreateSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;
    try {
      const updated = await prisma.task.update({
        where: { id },
        data: {
          ...d,
          dueDate: d.dueDate === undefined ? undefined : (d.dueDate ? new Date(d.dueDate) : null),
        },
        include,
      });
      return updated;
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });

  // Respond to a task (employee marks DONE / NOT_DONE + optional comment)
  app.patch('/tasks/:id/respond', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const parsed = TaskRespondSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;
    try {
      const updated = await prisma.task.update({
        where: { id },
        data: {
          status: d.status,
          responseComment: d.responseComment ?? null,
          respondedAt: new Date(),
        },
        include,
      });
      return updated;
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });

  app.delete('/tasks/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      await prisma.task.delete({ where: { id } });
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });
}
