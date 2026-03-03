/// <reference types="node" />
/**
 * Reset script — supprime toutes les données dans l'ordre correct (FK).
 * Run: npx tsx prisma/reset.ts
 * Puis re-lancer la synchro Fabric : curl.exe -X POST http://localhost:3001/sync/fabric
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Suppression des données en cours…');

  await prisma.task.deleteMany({});
  console.log('  ✓ Tasks');
  await prisma.absence.deleteMany({});
  console.log('  ✓ Absences');
  await prisma.assignment.deleteMany({});
  console.log('  ✓ Assignments');
  await prisma.manufacturingOrder.deleteMany({});
  console.log('  ✓ ManufacturingOrders');
  await prisma.project.deleteMany({});
  console.log('  ✓ Projects');
  await prisma.employee.deleteMany({});
  console.log('  ✓ Employees');
  await prisma.team.deleteMany({});
  console.log('  ✓ Teams');
  await prisma.workshop.deleteMany({});
  console.log('  ✓ Workshops');
  await prisma.subsidiary.deleteMany({});
  console.log('  ✓ Subsidiaries');

  console.log('\n✅  Base vidée. Lancez maintenant la synchro Fabric :');
  console.log('    curl.exe -X POST http://localhost:3001/sync/fabric\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
