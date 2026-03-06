import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const EmployeeCreateSchema = z.object({
  subsidiaryId: z.string().uuid(),
  workshopId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
  code: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  isActive: z.boolean().optional(),
});

const BulkAssignWorkshopSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1),
  workshopId: z.string().uuid(),
});

const BulkAssignUnassignedSchema = z.object({
  subsidiaryId: z.string().uuid(),
  workshopId: z.string().uuid(),
});

export async function employeeRoutes(server: FastifyInstance, prisma: PrismaClient) {
  server.get('/employees', async (req) => {
    const query = req.query as { subsidiaryId?: string; workshopId?: string; teamId?: string; unassigned?: string };
    const workshopFilter = query.workshopId !== undefined
      ? { workshopId: query.workshopId || null }
      : query.unassigned === 'true'
        ? { workshopId: null }
        : {};
    return prisma.employee.findMany({
      where: {
        subsidiaryId: query.subsidiaryId,
        teamId: query.teamId,
        ...workshopFilter,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  });

  server.post('/employees', async (req, reply) => {
    const parsed = EmployeeCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

    const created = await prisma.employee.create({
      data: {
        subsidiaryId: parsed.data.subsidiaryId,
        workshopId: parsed.data.workshopId ?? null,
        teamId: parsed.data.teamId ?? null,
        code: parsed.data.code,
        lastName: parsed.data.lastName,
        firstName: parsed.data.firstName,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return reply.code(201).send(created);
  });

  server.patch('/employees/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const parsed = EmployeeCreateSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

    try {
      const updated = await prisma.employee.update({
        where: { id },
        data: {
          ...parsed.data,
          workshopId: parsed.data.workshopId === undefined ? undefined : parsed.data.workshopId ?? null,
          teamId: parsed.data.teamId === undefined ? undefined : parsed.data.teamId ?? null,
        },
      });
      return updated;
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });

  server.delete('/employees/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      await prisma.employee.delete({ where: { id } });
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ message: 'Not found' });
    }
  });

  // Bulk assign employees to a workshop
  server.post('/employees/bulk-assign-workshop', async (req, reply) => {
    const parsed = BulkAssignWorkshopSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

    const { employeeIds, workshopId } = parsed.data;
    const workshop = await prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) return reply.code(404).send({ message: 'Workshop not found' });

    const result = await prisma.employee.updateMany({
      where: { id: { in: employeeIds } },
      data: { workshopId },
    });

    return { updated: result.count, workshopId };
  });

  // Bulk assign ALL unassigned employees of a subsidiary to a workshop
  server.post('/employees/bulk-assign-unassigned', async (req, reply) => {
    const parsed = BulkAssignUnassignedSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

    const { subsidiaryId, workshopId } = parsed.data;
    const result = await prisma.employee.updateMany({
      where: { subsidiaryId, workshopId: null },
      data: { workshopId },
    });

    return { updated: result.count, workshopId };
  });
}
