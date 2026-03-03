/// <reference types="node" />
/**
 * Seed script — creates a minimal set of reference data.
 * Run: npx tsx prisma/seed.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding database…');

  // ── Subsidiary ─────────────────────────────────────────────────────────────
  const subsidiary = await prisma.subsidiary.upsert({
    where: { code: 'CAA' },
    update: {},
    create: { code: 'CAA', name: 'Groupe CAA' },
  });
  console.log(`✓  Subsidiary: ${subsidiary.name}`);

  // ── Workshop ───────────────────────────────────────────────────────────────
  const workshop = await prisma.workshop.upsert({
    where: { subsidiaryId_code: { subsidiaryId: subsidiary.id, code: 'ATELIER1' } },
    update: {},
    create: {
      subsidiaryId: subsidiary.id,
      code: 'ATELIER1',
      name: 'Atelier principal',
      themeColor: '217 91% 50%',
    },
  });
  console.log(`✓  Workshop: ${workshop.name}`);

  // ── Teams ──────────────────────────────────────────────────────────────────
  const teamA = await prisma.team.upsert({
    where: { workshopId_name: { workshopId: workshop.id, name: 'Équipe A' } },
    update: {},
    create: { workshopId: workshop.id, name: 'Équipe A' },
  });
  const teamB = await prisma.team.upsert({
    where: { workshopId_name: { workshopId: workshop.id, name: 'Équipe B' } },
    update: {},
    create: { workshopId: workshop.id, name: 'Équipe B' },
  });
  console.log(`✓  Teams: ${teamA.name}, ${teamB.name}`);

  // ── Employees ──────────────────────────────────────────────────────────────
  const employees = [
    { code: 'EMP001', lastName: 'Martin', firstName: 'Jean', teamId: teamA.id },
    { code: 'EMP002', lastName: 'Dupont', firstName: 'Marie', teamId: teamA.id },
    { code: 'EMP003', lastName: 'Bernard', firstName: 'Luc', teamId: teamA.id },
    { code: 'EMP004', lastName: 'Petit', firstName: 'Sophie', teamId: teamB.id },
    { code: 'EMP005', lastName: 'Robert', firstName: 'Pierre', teamId: teamB.id },
  ];

  for (const e of employees) {
    await prisma.employee.upsert({
      where: { workshopId_code: { workshopId: workshop.id, code: e.code } },
      update: {},
      create: { workshopId: workshop.id, ...e },
    });
  }
  console.log(`✓  Employees: ${employees.length}`);

  // ── Projects ───────────────────────────────────────────────────────────────
  const today = new Date();
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const projectsData = [
    { code: 'F25001', label: 'Résidence Les Iris',        color: '217 91% 50%', status: 'EN_COURS'    as const, progressPct: 45, contractStart: addDays(today, -21), contractEnd: addDays(today, 21) },
    { code: 'F25002', label: 'Centre Commercial Nord',     color: '145 63% 42%', status: 'EN_COURS'    as const, progressPct: 30, contractStart: addDays(today, -14), contractEnd: addDays(today, 35) },
    { code: 'F25003', label: 'Immeuble Bureau Azur',       color: '340 75% 55%', status: 'A_PLANIFIER' as const, progressPct:  5, contractStart: today,              contractEnd: addDays(today, 56) },
    { code: 'F25004', label: 'École Primaire Voltaire',    color: '262 83% 58%', status: 'EN_COURS'    as const, progressPct: 80, contractStart: addDays(today, -28), contractEnd: addDays(today,  7) },
    { code: 'F25005', label: 'Hôpital Extension Sud',      color: '24 95% 53%',  status: 'EN_COURS'    as const, progressPct: 15, contractStart: today,              contractEnd: addDays(today, 70) },
    { code: 'F25006', label: 'Parking Souterrain Gare',    color: '199 89% 48%', status: 'A_PLANIFIER' as const, progressPct:  0, contractStart: addDays(today,  7),  contractEnd: addDays(today, 35) },
    { code: 'F25007', label: 'Maison Individuelle Dupont', color: '174 72% 46%', status: 'TERMINE'     as const, progressPct: 100, contractStart: addDays(today,-35), contractEnd: today },
    { code: 'F25008', label: 'Rénovation Mairie',          color: '0 84% 60%',   status: 'BLOQUE'      as const, progressPct: 20, contractStart: today,              contractEnd: addDays(today, 21) },
  ];

  for (const p of projectsData) {
    await prisma.project.upsert({
      where: { workshopId_code: { workshopId: workshop.id, code: p.code } },
      update: { status: p.status, progressPct: p.progressPct },
      create: {
        workshopId: workshop.id,
        code: p.code,
        label: p.label,
        color: p.color,
        contractStart: p.contractStart,
        contractEnd: p.contractEnd,
        plannedStart: p.contractStart,
        plannedEnd: p.contractEnd,
        status: p.status,
        progressPct: p.progressPct,
      },
    });
  }
  console.log(`✓  Projects: ${projectsData.length}`);

  console.log('\n✅  Seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
