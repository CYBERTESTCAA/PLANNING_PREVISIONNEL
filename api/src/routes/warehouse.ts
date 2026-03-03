import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  getWarehouseTableStats,
  discoverWarehouseTableDefs,
} from '../services/warehouseTables.js';

export async function warehouseRoutes(server: FastifyInstance, prisma: PrismaClient) {
  // GET /warehouse/tables — list all warehouse tables with row counts
  server.get('/warehouse/tables', async () => {
    return getWarehouseTableStats(prisma);
  });

  // GET /warehouse/tables/:name — query rows from a specific warehouse table
  server.get('/warehouse/tables/:name', async (req, reply) => {
    const { name } = req.params as { name: string };
    const { limit, offset } = req.query as { limit?: string; offset?: string };

    // Validate table name exists
    const defs = await discoverWarehouseTableDefs();
    const def = defs.find(d => d.sqliteName === name || d.originalName === name);
    if (!def) {
      return reply.code(404).send({ message: `Table "${name}" not found` });
    }

    const lim = Math.min(Number(limit) || 100, 1000);
    const off = Number(offset) || 0;

    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${def.sqliteName}" LIMIT ${lim} OFFSET ${off}`
      );
      const countResult = await prisma.$queryRawUnsafe<[{ cnt: bigint | number }]>(
        `SELECT COUNT(*) as cnt FROM "${def.sqliteName}"`
      );
      const total = typeof countResult[0]?.cnt === 'bigint'
        ? Number(countResult[0].cnt)
        : (countResult[0]?.cnt ?? 0);

      return { table: def.sqliteName, originalName: def.originalName, total, rows };
    } catch (err: any) {
      return reply.code(500).send({ message: err.message });
    }
  });
}
