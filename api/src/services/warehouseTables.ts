/**
 * Warehouse Tables — Parse dbo/Tables/*.sql and create mirror tables in SQLite.
 *
 * Each SQL Server CREATE TABLE is converted to a SQLite-compatible
 * CREATE TABLE IF NOT EXISTS with a "wh_" prefix to avoid conflicts
 * with Prisma-managed tables.
 *
 * The raw Fabric rows are stored as-is so they can be queried locally.
 */
import { PrismaClient } from '@prisma/client';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WarehouseColumnDef {
  /** Original column name from SQL Server, e.g. "Code entreprise" */
  originalName: string;
  /** SQLite-safe quoted name, e.g. "Code entreprise" (double-quoted) */
  quotedName: string;
  /** SQLite type: TEXT | INTEGER | REAL */
  sqliteType: string;
}

export interface WarehouseTableDef {
  /** Original SQL Server table name, e.g. "Entreprise" */
  originalName: string;
  /** SQLite table name with prefix, e.g. "wh_Entreprise" */
  sqliteName: string;
  /** Column definitions */
  columns: WarehouseColumnDef[];
  /** Source .sql file path */
  sourceFile: string;
}

// ─── SQL Server → SQLite type mapping ────────────────────────────────────────

function mapSqlType(sqlServerType: string): string {
  const t = sqlServerType.toLowerCase().trim();
  if (t.startsWith('int')) return 'INTEGER';
  if (t.startsWith('float')) return 'REAL';
  if (t.startsWith('decimal')) return 'REAL';
  if (t.startsWith('numeric')) return 'REAL';
  if (t.startsWith('bit')) return 'INTEGER';
  if (t.startsWith('money') || t.startsWith('smallmoney')) return 'REAL';
  if (t.startsWith('bigint') || t.startsWith('smallint') || t.startsWith('tinyint')) return 'INTEGER';
  // varchar, nvarchar, char, nchar, text, ntext, date, datetime, datetime2, uniqueidentifier → TEXT
  return 'TEXT';
}

// ─── Parse a single .sql file ────────────────────────────────────────────────

function parseSqlFile(content: string, filePath: string): WarehouseTableDef | null {
  // Match: CREATE TABLE [dbo].[Table Name] (
  const tableMatch = content.match(/CREATE\s+TABLE\s+\[(?:dbo|[^\]]*)\]\.\[([^\]]+)\]/i);
  if (!tableMatch) return null;

  const originalName = tableMatch[1];
  // Sanitize for SQLite table name: replace spaces/special chars with _
  const safeName = originalName
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip accents
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const sqliteName = `wh_${safeName}`;

  // Extract column definitions: [Column Name] type ...
  const columns: WarehouseColumnDef[] = [];
  const colRegex = /\[([^\]]+)\]\s+([\w]+(?:\([^)]*\))?)/g;

  // Get the content between the first ( and the last )
  const bodyStart = content.indexOf('(');
  const bodyEnd = content.lastIndexOf(')');
  if (bodyStart < 0 || bodyEnd < 0) return null;
  const body = content.slice(bodyStart + 1, bodyEnd);

  let match: RegExpExecArray | null;
  while ((match = colRegex.exec(body)) !== null) {
    const colName = match[1];
    const sqlType = match[2];
    // Skip if it looks like a constraint keyword matched accidentally
    if (['dbo'].includes(colName.toLowerCase())) continue;

    columns.push({
      originalName: colName,
      quotedName: `"${colName.replace(/"/g, '""')}"`,
      sqliteType: mapSqlType(sqlType),
    });
  }

  if (columns.length === 0) return null;

  return { originalName, sqliteName, columns, sourceFile: filePath };
}

// ─── Discover all .sql files and parse them ──────────────────────────────────

export async function discoverWarehouseTableDefs(): Promise<WarehouseTableDef[]> {
  // Try multiple candidate paths (dev mode, dist mode, monorepo root)
  const candidates = [
    resolve(__dirname, '..', '..', '..', 'dbo', 'Tables'),        // api/src/services → project root
    resolve(__dirname, '..', '..', '..', '..', 'dbo', 'Tables'),   // api/dist/services → project root
    join(process.cwd(), 'dbo', 'Tables'),                          // cwd = project root
    join(process.cwd(), '..', 'dbo', 'Tables'),                    // cwd = api/
  ];

  for (const dir of candidates) {
    try {
      const files = await readdir(dir);
      if (files.some(f => f.toLowerCase().endsWith('.sql'))) {
        return parseFilesInDir(dir, files);
      }
    } catch {
      // Try next candidate
    }
  }

  console.warn('[warehouse] dbo/Tables directory not found in any candidate path, skipping');
  return [];
}

async function parseFilesInDir(dir: string, files: string[]): Promise<WarehouseTableDef[]> {
  const sqlFiles = files.filter(f => f.toLowerCase().endsWith('.sql'));
  const defs: WarehouseTableDef[] = [];

  for (const file of sqlFiles) {
    const fullPath = join(dir, file);
    const content = await readFile(fullPath, 'utf-8');
    const def = parseSqlFile(content, fullPath);
    if (def) defs.push(def);
  }

  return defs;
}

// ─── Create all warehouse tables in SQLite ───────────────────────────────────

export async function ensureWarehouseTables(prisma: PrismaClient): Promise<WarehouseTableDef[]> {
  const defs = await discoverWarehouseTableDefs();

  for (const def of defs) {
    const columnsSql = def.columns
      .map(c => `  ${c.quotedName} ${c.sqliteType}`)
      .join(',\n');

    const createSql = `CREATE TABLE IF NOT EXISTS "${def.sqliteName}" (\n  "_rowid" INTEGER PRIMARY KEY AUTOINCREMENT,\n  "_synced_at" TEXT,\n${columnsSql}\n)`;

    try {
      await prisma.$executeRawUnsafe(createSql);
    } catch (err: any) {
      console.error(`[warehouse] Failed to create table ${def.sqliteName}: ${err.message}`);
    }
  }

  console.log(`[warehouse] ${defs.length} warehouse tables ensured in SQLite`);
  return defs;
}

// ─── Insert rows into a warehouse table ──────────────────────────────────────

export async function upsertWarehouseRows(
  prisma: PrismaClient,
  def: WarehouseTableDef,
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const nowIso = new Date().toISOString();
  let inserted = 0;

  // Clear previous data (full sync)
  await prisma.$executeRawUnsafe(`DELETE FROM "${def.sqliteName}"`);

  // Build column list for INSERT
  const allCols = ['"_synced_at"', ...def.columns.map(c => c.quotedName)];
  const placeholders = allCols.map(() => '?').join(', ');
  const insertSql = `INSERT INTO "${def.sqliteName}" (${allCols.join(', ')}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values: unknown[] = [nowIso];
    for (const col of def.columns) {
      // Try exact match first, then case-insensitive
      let val = row[col.originalName];
      if (val === undefined) {
        const key = Object.keys(row).find(k => k.toLowerCase() === col.originalName.toLowerCase());
        val = key ? row[key] : null;
      }
      if (val instanceof Date) {
        values.push(val.toISOString());
      } else if (val === undefined || val === null) {
        values.push(null);
      } else {
        values.push(val);
      }
    }

    try {
      await prisma.$executeRawUnsafe(insertSql, ...values);
      inserted++;
    } catch (err: any) {
      // Log first error only to avoid spam
      if (inserted === 0) {
        console.error(`[warehouse] Insert error in ${def.sqliteName}: ${err.message}`);
      }
    }
  }

  return inserted;
}

// ─── List warehouse tables with row counts ───────────────────────────────────

export async function getWarehouseTableStats(prisma: PrismaClient): Promise<Array<{ table: string; originalName: string; rowCount: number }>> {
  const defs = await discoverWarehouseTableDefs();
  const stats: Array<{ table: string; originalName: string; rowCount: number }> = [];

  for (const def of defs) {
    try {
      const result = await prisma.$queryRawUnsafe<[{ cnt: bigint | number }]>(
        `SELECT COUNT(*) as cnt FROM "${def.sqliteName}"`
      );
      const cnt = result[0]?.cnt;
      stats.push({
        table: def.sqliteName,
        originalName: def.originalName,
        rowCount: typeof cnt === 'bigint' ? Number(cnt) : (cnt ?? 0),
      });
    } catch {
      stats.push({ table: def.sqliteName, originalName: def.originalName, rowCount: -1 });
    }
  }

  return stats;
}
