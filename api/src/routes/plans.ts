import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const PlanCreateSchema = z.object({
  projectId: z.string(),
  hk: z.string().optional().default(''),
  numPhase: z.string().optional(),
  numPhaseOF: z.string().optional(),
  codeOF: z.string().optional(),
  numPlan: z.string().optional(),
  cart1: z.string().optional(),
  cart2: z.string().optional(),
  cart3: z.string().optional(),
  cart4: z.string().optional(),
  cart5: z.string().optional(),
  cart6: z.string().optional(),
  cart7: z.string().optional(),
  dessinateurId: z.string().nullable().optional(),
  fabricationType: z.enum(['FILIALE', 'SOUS_TRAITANT', 'LES_DEUX']).nullable().optional(),
  etatAvancement: z.enum(['A_DIFFUSER', 'DIFFUSE_ARCHI', 'EN_ATTENTE', 'EN_COURS_PLAN', 'SUPPRIME', 'VALIDE', 'A_MODIFIER', 'A_FAIRE']).optional(),
  datePrevisionnelle: z.string().nullable().optional(),
  commentaires: z.string().nullable().optional(),
});

const PlanUpdateSchema = z.object({
  numPlan: z.string().nullable().optional(),
  cart1: z.string().nullable().optional(),
  cart2: z.string().nullable().optional(),
  cart3: z.string().nullable().optional(),
  cart4: z.string().nullable().optional(),
  cart5: z.string().nullable().optional(),
  cart6: z.string().nullable().optional(),
  cart7: z.string().nullable().optional(),
  dessinateurId: z.string().nullable().optional(),
  fabricationType: z.enum(['FILIALE', 'SOUS_TRAITANT', 'LES_DEUX']).nullable().optional(),
  etatAvancement: z.enum(['A_DIFFUSER', 'DIFFUSE_ARCHI', 'EN_ATTENTE', 'EN_COURS_PLAN', 'SUPPRIME', 'VALIDE', 'A_MODIFIER', 'A_FAIRE']).optional(),
  datePrevisionnelle: z.string().nullable().optional(),
  dateValidation: z.string().nullable().optional(),
  numFiche: z.string().nullable().optional(),
  dateFicheFab: z.string().nullable().optional(),
  sousTraitance: z.string().nullable().optional(),
  etatUsinage: z.enum(['EN_DEBIT', 'PROGRAMME', 'USINE']).nullable().optional(),
  responsableMontage: z.string().nullable().optional(),
  dateDepartAtelier: z.string().nullable().optional(),
  paletisation: z.string().nullable().optional(),
  dateLivraisonChantier: z.string().nullable().optional(),
  commentaires: z.string().nullable().optional(),
});

const IndiceCreateSchema = z.object({
  indice: z.string().min(1),
  dateIndice: z.string(),
  commentaire: z.string().nullable().optional(),
});

const planInclude = {
  dessinateur: true,
  indices: { orderBy: { dateIndice: 'asc' as const } },
  project: { select: { id: true, code: true, label: true, color: true, workshopId: true } },
};

export default function planRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // List plans for a project
  app.get('/plans', async (req) => {
    const q = req.query as { projectId?: string; workshopId?: string; etatAvancement?: string };
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.workshopId) where.project = { workshopId: q.workshopId };
    if (q.etatAvancement) where.etatAvancement = q.etatAvancement;

    return prisma.plan.findMany({
      where,
      include: planInclude,
      orderBy: [{ hk: 'asc' }],
    });
  });

  // Get single plan
  app.get('/plans/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const plan = await prisma.plan.findUnique({ where: { id }, include: planInclude });
    if (!plan) return reply.code(404).send({ message: 'Plan not found' });
    return plan;
  });

  // Create plan
  app.post('/plans', async (req, reply) => {
    const parsed = PlanCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;

    const plan = await prisma.plan.create({
      data: {
        projectId: d.projectId,
        hk: d.hk,
        numPhase: d.numPhase,
        numPhaseOF: d.numPhaseOF,
        codeOF: d.codeOF,
        numPlan: d.numPlan,
        cart1: d.cart1, cart2: d.cart2, cart3: d.cart3, cart4: d.cart4,
        cart5: d.cart5, cart6: d.cart6, cart7: d.cart7,
        dessinateurId: d.dessinateurId ?? null,
        fabricationType: d.fabricationType ?? null,
        etatAvancement: d.etatAvancement ?? 'A_FAIRE',
        datePrevisionnelle: d.datePrevisionnelle ? new Date(d.datePrevisionnelle) : null,
        commentaires: d.commentaires ?? null,
      },
      include: planInclude,
    });
    return reply.code(201).send(plan);
  });

  // Bulk create plans (import OF)
  app.post('/plans/bulk', async (req, reply) => {
    const body = req.body as { plans: z.infer<typeof PlanCreateSchema>[] };
    if (!Array.isArray(body.plans)) return reply.code(400).send({ message: 'plans array required' });

    const created = [];
    for (const d of body.plans) {
      const parsed = PlanCreateSchema.safeParse(d);
      if (!parsed.success) continue;
      const p = parsed.data;
      try {
        const plan = await prisma.plan.create({
          data: {
            projectId: p.projectId,
            hk: p.hk,
            numPhase: p.numPhase,
            numPhaseOF: p.numPhaseOF,
            codeOF: p.codeOF,
            numPlan: p.numPlan,
            dessinateurId: p.dessinateurId ?? null,
            fabricationType: p.fabricationType ?? null,
            etatAvancement: p.etatAvancement ?? 'A_FAIRE',
            datePrevisionnelle: p.datePrevisionnelle ? new Date(p.datePrevisionnelle) : null,
            commentaires: p.commentaires ?? null,
          },
          include: planInclude,
        });
        created.push(plan);
      } catch {
        // skip duplicates
      }
    }
    return reply.code(201).send(created);
  });

  // Update plan (inline edit)
  app.patch('/plans/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = PlanUpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });

    const d = parsed.data;
    const data: any = {};
    for (const [key, val] of Object.entries(d)) {
      if (val === undefined) continue;
      if (['datePrevisionnelle', 'dateValidation', 'dateFicheFab', 'dateDepartAtelier', 'dateLivraisonChantier'].includes(key)) {
        data[key] = val ? new Date(val as string) : null;
      } else {
        data[key] = val;
      }
    }

    const plan = await prisma.plan.update({ where: { id }, data, include: planInclude });
    return plan;
  });

  // Delete plan
  app.delete('/plans/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.plan.delete({ where: { id } });
    return reply.code(204).send();
  });

  // ─── Indices ─────────────────────────────────────────────────────────────────

  // Add indice to plan
  app.post('/plans/:id/indices', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = IndiceCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    const d = parsed.data;

    const indice = await prisma.planIndice.create({
      data: {
        planId: id,
        indice: d.indice,
        dateIndice: new Date(d.dateIndice),
        commentaire: d.commentaire ?? null,
      },
    });
    return reply.code(201).send(indice);
  });

  // Delete indice
  app.delete('/plan-indices/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.planIndice.delete({ where: { id } });
    return reply.code(204).send();
  });

  // ─── Dashboard stats for a project ────────────────────────────────────────

  app.get('/plans/stats/:projectId', async (req) => {
    const { projectId } = req.params as { projectId: string };

    const plans = await prisma.plan.findMany({
      where: { projectId },
      include: { indices: true },
    });

    const total = plans.length;
    const byEtat: Record<string, number> = {};
    let dessines = 0;
    let valides = 0;

    for (const p of plans) {
      byEtat[p.etatAvancement] = (byEtat[p.etatAvancement] || 0) + 1;
      if (p.indices.length > 0) dessines++;
      if (p.etatAvancement === 'VALIDE') valides++;
    }

    const questions = await prisma.question.groupBy({
      by: ['avancement'],
      where: { projectId },
      _count: true,
    });

    const questionStats: Record<string, number> = {};
    for (const q of questions) {
      questionStats[q.avancement] = q._count;
    }

    return {
      total,
      dessines,
      valides,
      pctDessines: total > 0 ? Math.round((dessines / total) * 100) : 0,
      pctValides: total > 0 ? Math.round((valides / total) * 100) : 0,
      byEtat,
      questions: questionStats,
    };
  });
}
