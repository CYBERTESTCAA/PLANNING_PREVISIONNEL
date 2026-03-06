/// <reference types="node" />
/**
 * Fabric Warehouse → SQLite sync service
 *
 * Se connecte au SQL endpoint de Fabric (WH_OR_GROUPE_CAA) avec un Service Principal Azure AD.
 * Synchronise :
 *   1. Entreprise        → Subsidiary (+ auto-create Workshop)
 *   2. Client            → Client
 *   3. Affaire           → Affaire
 *   4. Salarié           → Employee (enriched: service, qualification, matricule, etc.)
 *   5. Commande client   → Project  (enriched: client, affaire, montants, personnel)
 *   6. Dépense temps     → ManufacturingOrder + TimeEntry (actual hours)
 *   7. Calendrier        → CalendarDay (holidays, working days)
 *   8. JoursFiliale      → SubsidiarySchedule
 *   9. Raw wh_* tables   → all 34 tables as-is
 */
import sql from 'mssql';
import { ClientSecretCredential } from '@azure/identity';
import { PrismaClient } from '@prisma/client';
import { ensureWarehouseTables, upsertWarehouseRows, type WarehouseTableDef } from './warehouseTables.js';

// ─── Mapping Etat avancement ERP → ProjectStatus Prisma ───────────────────────
const ETAT_TO_STATUS: Record<string, 'A_PLANIFIER' | 'EN_COURS' | 'BLOQUE' | 'TERMINE'> = {
  '0': 'A_PLANIFIER',
  '1': 'A_PLANIFIER',
  '2': 'EN_COURS',
  '3': 'EN_COURS',
  '4': 'BLOQUE',
  '5': 'TERMINE',
  '6': 'TERMINE',
};

function colorForCode(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) & 0xffff;
  }
  const hue = hash % 360;
  const sat = 60 + (hash % 20);
  const light = 42 + (hash % 14);
  return `${hue} ${sat}% ${light}%`;
}

function mapStatus(etat: string | null): 'A_PLANIFIER' | 'EN_COURS' | 'BLOQUE' | 'TERMINE' {
  if (!etat) return 'A_PLANIFIER';
  return ETAT_TO_STATUS[String(etat).trim()] ?? 'EN_COURS';
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function toFloat(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

// ─── Active subsidiaries filter ──────────────────────────────────────────────
// Only these 5 IdEntreprise codes are real production subsidiaries.
const ACTIVE_SUBSIDIARIES = new Set([
  '9MAR',       // CAA GUYANE
  '5MAR',       // CAA MARTINIQUE
  '14STBARTH',  // C2A ST BARTH
  '1GUA',       // CAA GUADELOUPE
  '1SUISSE',    // C2A Swiss Sàrl
]);

// Numeric Code entreprise → IdEntreprise mapping (per user specification)
// 3, 5 → Martinique / 7, 9 → Guyane / 14 → St Barth / 1 → Guadeloupe (default)
const CODE_TO_SUBSIDIARY: Record<number, string> = {
  3:  '5MAR',       // Martinique
  5:  '5MAR',       // Martinique
  6:  '1GUA',       // Guadeloupe
  7:  '9MAR',       // Guyane
  9:  '9MAR',       // Guyane
  14: '14STBARTH',  // St Barth
  1:  '1GUA',       // Guadeloupe (default for code 1)
};

// IdEntreprise string → active IdEntreprise redirect (for non-active subsidiaries)
const SUBSIDIARY_REDIRECT: Record<string, string> = {
  '7MAR':       '9MAR',       // CAA Guyane → CAA GUYANE
  '14MAR':      '14STBARTH',  // C2A ST BARTH duplicate
  '14ST BARTH': '14STBARTH',  // C2A ST BARTH duplicate (with space)
  '4MAR':       '5MAR',       // CONSEIL ANTILLES AGCT → CAA MARTINIQUE
  '3MAR':       '5MAR',       // any 3MAR variant → Martinique
};

// Maps Code entreprise (int) → subsidiary Prisma ID
type CodeEntrepriseMap = Record<string, string>;

// ─── Progress tracking ──────────────────────────────────────────────────────
export interface SyncProgress {
  step: number;
  totalSteps: number;
  stepLabel: string;
  stepDetail: string;
  percent: number;
  startedAt: string;
}

let _syncProgress: SyncProgress | null = null;
export function getSyncProgress(): SyncProgress | null { return _syncProgress; }
function setProgress(step: number, total: number, label: string, detail = '') {
  const percent = Math.round((step / total) * 100);
  _syncProgress = { step, totalSteps: total, stepLabel: label, stepDetail: detail, percent, startedAt: _syncProgress?.startedAt ?? new Date().toISOString() };
}

// ─── Connexion Fabric ─────────────────────────────────────────────────────────
async function getFabricPool(): Promise<sql.ConnectionPool> {
  const credential = new ClientSecretCredential(
    process.env.FABRIC_TENANT_ID!,
    process.env.FABRIC_CLIENT_ID!,
    process.env.FABRIC_CLIENT_SECRET!,
  );
  console.log('[sync] Acquiring OAuth token for Fabric SQL…');
  const tokenResponse = await credential.getToken(
    'https://database.windows.net/.default',
  );
  console.log('[sync] Token acquired, connecting to SQL endpoint:', process.env.FABRIC_SQL_ENDPOINT);
  const config: sql.config = {
    server: process.env.FABRIC_SQL_ENDPOINT!,
    port: 1433,
    database: process.env.FABRIC_DATABASE!,
    authentication: {
      type: 'azure-active-directory-access-token',
      options: { token: tokenResponse.token },
    },
    options: {
      encrypt: true,
      trustServerCertificate: false,
      connectTimeout: 30000,
      requestTimeout: 60000,
    },
  };
  const pool = await sql.connect(config);
  console.log('[sync] Connected to Fabric SQL.');
  return pool;
}

// ─── Résultat de synchro ──────────────────────────────────────────────────────
export interface SyncResult {
  subsidiaries: number;
  workshops: number;
  employees: number;
  projects: number;
  manufacturingOrders: number;
  clients: number;
  affaires: number;
  timeEntries: number;
  calendarDays: number;
  warehouseTables: Record<string, number>;
  errors: string[];
  durationMs: number;
  delta: boolean;
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────
export async function runFabricSync(prisma: PrismaClient, deltaOnly = false): Promise<SyncResult> {
  const TOTAL_STEPS = 9;
  const start = Date.now();
  _syncProgress = { step: 0, totalSteps: TOTAL_STEPS, stepLabel: 'Connexion…', stepDetail: '', percent: 0, startedAt: new Date().toISOString() };
  const result: SyncResult = {
    subsidiaries: 0, workshops: 0, employees: 0,
    projects: 0, manufacturingOrders: 0,
    clients: 0, affaires: 0, timeEntries: 0, calendarDays: 0,
    warehouseTables: {}, errors: [], durationMs: 0, delta: deltaOnly,
  };

  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await getFabricPool();

    setProgress(1, TOTAL_STEPS, 'Filiales', 'Entreprises → Subsidiaries');
    const codeMap = await syncEntreprises(pool, prisma, result);

    setProgress(2, TOTAL_STEPS, 'Clients', 'Client → Clients');
    await syncClients(pool, prisma, result, codeMap);

    setProgress(3, TOTAL_STEPS, 'Affaires', 'Affaire → Affaires');
    await syncAffaires(pool, prisma, result);

    setProgress(4, TOTAL_STEPS, 'Salariés', 'Salarié → Employees');
    await syncSalaries(pool, prisma, result, codeMap);

    setProgress(5, TOTAL_STEPS, 'Chantiers', 'Commande client → Projects');
    await syncCommandes(pool, prisma, result, codeMap);

    setProgress(6, TOTAL_STEPS, 'OF', 'Ordres de fabrication');
    await syncOF(pool, prisma, result);

    setProgress(7, TOTAL_STEPS, 'Temps passé', 'Dépense temps → TimeEntries');
    await syncTimeEntries(pool, prisma, result);

    setProgress(8, TOTAL_STEPS, 'Calendrier', 'Calendrier → CalendarDay');
    await syncCalendrier(pool, prisma, result);

    setProgress(9, TOTAL_STEPS, 'Horaires', 'JoursFiliale → SubsidiarySchedule');
    await syncJoursFiliale(pool, prisma, result);

    // Step 10 (syncAllWarehouseTables) disabled — too slow (30+ min on network)
    // Raw wh_* tables are not needed for core planning functionality

    setProgress(TOTAL_STEPS, TOTAL_STEPS, 'Terminé', `${result.employees} salariés, ${result.projects} chantiers`);
    console.log('[sync] All steps complete.');

  } catch (err: any) {
    result.errors.push(`Connexion Fabric échouée: ${err.message}`);
  } finally {
    if (pool) await pool.close();
    result.durationMs = Date.now() - start;
    _syncProgress = null;
  }

  return result;
}

// ─── 1. Entreprises ───────────────────────────────────────────────────────────
// Returns a map: Code entreprise (int as string) → subsidiary Prisma ID
async function syncEntreprises(
  pool: sql.ConnectionPool,
  prisma: PrismaClient,
  result: SyncResult,
): Promise<CodeEntrepriseMap> {
  const codeMap: CodeEntrepriseMap = {};
  try {
    const rows = await pool.request().query<{
      'Code entreprise'?: number;
      IdEntreprise: string;
      Entreprise: string;
      'Adresse 1'?: string;
      'Code postal'?: string;
      Ville?: string;
      'Téléphone 1'?: string;
      'EMail 1'?: string;
      Siret?: string;
    }>(`SELECT [Code entreprise], [IdEntreprise], [Entreprise],
              [Adresse 1], [Code postal], [Ville],
              [Téléphone 1], [EMail 1], [Siret]
        FROM [Entreprise]`);

    // First pass: upsert active subsidiaries and build IdEntreprise→subId lookup
    const activeSubIds: Record<string, string> = {};
    for (const row of rows.recordset) {
      const code = row.IdEntreprise?.trim();
      const name = row.Entreprise?.trim();
      if (!code || !name) continue;
      if (!ACTIVE_SUBSIDIARIES.has(code)) continue;

      const sub = await prisma.subsidiary.upsert({
        where: { code },
        update: {
          name,
          address: str(row['Adresse 1']),
          postalCode: str(row['Code postal']),
          city: str(row['Ville']),
          phone: str(row['Téléphone 1']),
          email: str(row['EMail 1']),
          siret: str(row['Siret']),
        },
        create: {
          code, name,
          address: str(row['Adresse 1']),
          postalCode: str(row['Code postal']),
          city: str(row['Ville']),
          phone: str(row['Téléphone 1']),
          email: str(row['EMail 1']),
          siret: str(row['Siret']),
        },
      });
      result.subsidiaries++;
      activeSubIds[code] = sub.id;

      // Map Code entreprise (int) → subsidiary ID
      if (row['Code entreprise'] != null) {
        codeMap[String(row['Code entreprise'])] = sub.id;
      }
      codeMap[code] = sub.id;

      await prisma.workshop.upsert({
        where: { subsidiaryId_code: { subsidiaryId: sub.id, code: 'PRINCIPAL' } },
        update: {},
        create: {
          subsidiaryId: sub.id,
          code: 'PRINCIPAL',
          name: `Atelier ${name}`,
          themeColor: '217 91% 50%',
        },
      });
      result.workshops++;
    }

    // Second pass: use CODE_TO_SUBSIDIARY explicit mapping for ALL numeric codes
    // This ensures correct routing regardless of warehouse IdEntreprise values
    for (const [numCode, targetIdEnt] of Object.entries(CODE_TO_SUBSIDIARY)) {
      if (activeSubIds[targetIdEnt]) {
        codeMap[String(numCode)] = activeSubIds[targetIdEnt];
      }
    }
    // Also map 1SUISSE explicitly (shares numeric code 1 with 1GUA,
    // but employees with Code entreprise=1 go to GUA by default;
    // for chantiers we use IdEntreprise to distinguish)
    if (activeSubIds['1SUISSE']) {
      codeMap['1SUISSE'] = activeSubIds['1SUISSE'];
    }

    // Third pass: redirect non-active IdEntreprise strings to active ones
    for (const row of rows.recordset) {
      const code = row.IdEntreprise?.trim();
      if (!code || ACTIVE_SUBSIDIARIES.has(code)) continue;
      const numericCode = row['Code entreprise'];

      const redirectTo = SUBSIDIARY_REDIRECT[code];
      if (redirectTo && activeSubIds[redirectTo]) {
        if (numericCode != null) codeMap[String(numericCode)] = activeSubIds[redirectTo];
        codeMap[code] = activeSubIds[redirectTo];
        console.log(`[sync] Redirect: ${code} (Code entreprise=${numericCode}) → ${redirectTo}`);
      } else if (numericCode != null && !codeMap[String(numericCode)]) {
        // Fallback for unknown non-active subsidiaries
        const fallback = Object.values(activeSubIds)[0];
        if (fallback) {
          codeMap[String(numericCode)] = fallback;
          codeMap[code] = fallback;
          console.log(`[sync] Redirect (fallback): ${code} (Code entreprise=${numericCode}) → first active subsidiary`);
        }
      }
    }
  } catch (err: any) {
    result.errors.push(`syncEntreprises: ${err.message}`);
  }
  console.log('[sync] Code entreprise → subsidiary mapping:', codeMap);
  return codeMap;
}

// ─── 2. Clients ───────────────────────────────────────────────────────────────
async function syncClients(
  pool: sql.ConnectionPool,
  prisma: PrismaClient,
  result: SyncResult,
  codeMap: CodeEntrepriseMap,
) {
  try {
    const rows = await pool.request().query<{
      IdClient: string;
      'Code client': string;
      Client: string;
      'Code entreprise'?: number;
      'Adresse 1'?: string;
      Ville?: string;
      'Code postal'?: string;
      'Téléphone 1'?: string;
      EMail?: string;
    }>(`SELECT [IdClient], [Code client], [Client],
              [Code entreprise],
              [Adresse 1], [Ville], [Code postal],
              [Téléphone 1], [EMail]
        FROM [Client]`);

    const fallbackSubId = Object.values(codeMap)[0];

    for (const row of rows.recordset) {
      const code = str(row['Code client']) || str(row.IdClient);
      const name = str(row.Client);
      if (!code || !name) continue;

      const codeEnt = row['Code entreprise'] != null ? String(row['Code entreprise']).trim() : undefined;
      const subsidiaryId = (codeEnt && codeMap[codeEnt]) ?? fallbackSubId;
      if (!subsidiaryId) continue;

      await prisma.client.upsert({
        where: { subsidiaryId_code: { subsidiaryId, code } },
        update: {
          name,
          groupName: null,
          address: str(row['Adresse 1']),
          city: str(row['Ville']),
          postalCode: str(row['Code postal']),
          phone: str(row['Téléphone 1']),
          email: str(row['EMail']),
        },
        create: {
          subsidiaryId, code, name,
          groupName: null,
          address: str(row['Adresse 1']),
          city: str(row['Ville']),
          postalCode: str(row['Code postal']),
          phone: str(row['Téléphone 1']),
          email: str(row['EMail']),
        },
      });
      result.clients++;
    }
  } catch (err: any) {
    result.errors.push(`syncClients: ${err.message}`);
  }
}

// ─── 3. Affaires ──────────────────────────────────────────────────────────────
async function syncAffaires(
  pool: sql.ConnectionPool,
  prisma: PrismaClient,
  result: SyncResult,
) {
  try {
    const rows = await pool.request().query<{
      IdAffaire: string;
      'Code affaire': string;
      Affaire: string;
      'Code entreprise'?: number;
      'Code client'?: string;
      'Date création'?: Date;
      'Date accord'?: Date;
      'Date signature'?: Date;
      'Code salarié commercial'?: string;
      'Code salarié technicien'?: string;
      'Situation dossier'?: string;
      'CA prévu'?: number;
      'Taux de réussite'?: number;
    }>(`SELECT [IdAffaire], [Code affaire], [Affaire],
              [Code entreprise], [Code client],
              [Date création], [Date accord], [Date signature],
              [Code salarié commercial], [Code salarié technicien],
              [Situation dossier], [CA prévu], [Taux de réussite]
        FROM [Affaire]`);

    // Build client index by code for linking
    const allClients = await prisma.client.findMany({ select: { id: true, code: true } });
    const clientByCode: Record<string, string> = {};
    for (const c of allClients) clientByCode[c.code] = c.id;

    // Build employee name index for commercial/technicien lookup
    const employeeNames = await prisma.employee.findMany({
      select: { code: true, firstName: true, lastName: true },
    });
    const empNameByCode: Record<string, string> = {};
    for (const e of employeeNames) {
      empNameByCode[e.code] = [e.firstName, e.lastName].filter(Boolean).join(' ');
    }

    for (const row of rows.recordset) {
      const code = str(row['Code affaire']);
      const label = str(row.Affaire) || code;
      if (!code) continue;

      const clientCode = str(row['Code client']);
      const clientId = clientCode ? clientByCode[clientCode] ?? null : null;
      const commercialCode = str(row['Code salarié commercial']);
      const technicienCode = str(row['Code salarié technicien']);

      await prisma.affaire.upsert({
        where: { code },
        update: {
          label: label!,
          clientId,
          subsidiaryCode: row['Code entreprise'] != null ? String(row['Code entreprise']).trim() : null,
          status: str(row['Situation dossier']),
          dateCreation: toDate(row['Date création']),
          dateAccord: toDate(row['Date accord']),
          dateSignature: toDate(row['Date signature']),
          commercialName: commercialCode ? empNameByCode[commercialCode] ?? commercialCode : null,
          technicienName: technicienCode ? empNameByCode[technicienCode] ?? technicienCode : null,
          caPrevu: toFloat(row['CA prévu']),
          tauxReussite: toFloat(row['Taux de réussite']),
        },
        create: {
          code,
          label: label!,
          clientId,
          subsidiaryCode: row['Code entreprise'] != null ? String(row['Code entreprise']).trim() : null,
          status: str(row['Situation dossier']),
          dateCreation: toDate(row['Date création']),
          dateAccord: toDate(row['Date accord']),
          dateSignature: toDate(row['Date signature']),
          commercialName: commercialCode ? empNameByCode[commercialCode] ?? commercialCode : null,
          technicienName: technicienCode ? empNameByCode[technicienCode] ?? technicienCode : null,
          caPrevu: toFloat(row['CA prévu']),
          tauxReussite: toFloat(row['Taux de réussite']),
        },
      });
      result.affaires++;
    }
  } catch (err: any) {
    result.errors.push(`syncAffaires: ${err.message}`);
  }
}

// ─── 4. Salariés (enriched) ──────────────────────────────────────────────────
async function syncSalaries(
  pool: sql.ConnectionPool,
  prisma: PrismaClient,
  result: SyncResult,
  codeMap: CodeEntrepriseMap,
) {
  try {
    type SalarieRow = {
      'IdSalarié': string;
      'Nom salarié': string;
      'Prénom salarié'?: string;
      'Code salarié'?: string;
      'Code entreprise'?: number;
      'Matricule RH'?: string;
      'Service'?: string;
      'Qualification'?: string;
      'Est intérimaire'?: string;
      'Est actif'?: string;
      'Date embauche'?: Date;
      'Code salarié responsable'?: string;
    };

    let rows: sql.IResult<SalarieRow>;
    try {
      rows = await pool.request().query<SalarieRow>(`SELECT
          [IdSalarié], [Nom salarié], [Prénom salarié], [Code salarié],
          [Code entreprise], [Matricule RH], [Service], [Qualification],
          [Est intérimaire], [Est actif], [Date embauche],
          [Code salarié responsable]
        FROM [Salarié]`);
    } catch (colErr: any) {
      // Fallback: [Code entreprise] may not exist on some SQL Server instances
      console.log(`[sync] Salarié: [Code entreprise] not available, retrying without it`);
      rows = await pool.request().query<SalarieRow>(`SELECT
          [IdSalarié], [Nom salarié], [Prénom salarié], [Code salarié],
          [Matricule RH], [Service], [Qualification],
          [Est intérimaire], [Est actif], [Date embauche],
          [Code salarié responsable]
        FROM [Salarié]`);
    }

    console.log(`[sync] Salarié query returned ${rows.recordset.length} rows`);

    const fallbackSubId = Object.values(codeMap)[0];
    if (!fallbackSubId) {
      result.errors.push('syncSalaries: aucune filiale trouvée dans le codeMap');
      return;
    }

    // Pre-load workshops by subsidiary for perf
    const workshopBySub: Record<string, string> = {};
    const allWorkshops = await prisma.workshop.findMany({ orderBy: { createdAt: 'asc' } });
    for (const w of allWorkshops) {
      if (!workshopBySub[w.subsidiaryId]) workshopBySub[w.subsidiaryId] = w.id;
    }

    const unmappedCodes = new Set<string>();
    const seenCodes = new Set<string>();

    // Build batch of employee data
    const batch: { code: string; subsidiaryId: string; workshopId: string | null; lastName: string; firstName: string; isActive: boolean; matriculeRH: string | null; service: string | null; qualification: string | null; isInterim: boolean; hireDate: Date | null; managerCode: string | null }[] = [];

    for (const row of rows.recordset) {
      const idSal = row['IdSalarié']?.trim();
      const lastName = row['Nom salarié']?.trim();
      if (!idSal || !lastName) continue;

      const code = row['Code salarié']?.trim() || idSal;
      if (seenCodes.has(code)) continue;
      seenCodes.add(code);

      const firstName = row['Prénom salarié']?.trim() ?? '';
      const codeEntreprise = row['Code entreprise'] != null ? String(row['Code entreprise']).trim() : undefined;

      const subsidiaryId = (codeEntreprise && codeMap[codeEntreprise]) ?? fallbackSubId;

      if (codeEntreprise && !codeMap[codeEntreprise]) {
        if (!unmappedCodes.has(codeEntreprise)) {
          unmappedCodes.add(codeEntreprise);
          console.log(`[sync] Warning: unmapped Code entreprise=${codeEntreprise} for employee ${code}`);
        }
      }

      const isActiveStr = str(row['Est actif']);
      const isActive = isActiveStr ? (isActiveStr.toLowerCase() === 'oui' || isActiveStr === '1') : true;
      const isInterimStr = str(row['Est intérimaire']);
      const isInterim = isInterimStr ? (isInterimStr.toLowerCase() === 'oui' || isInterimStr === '1') : false;

      const empData = {
        code, lastName, firstName, isActive,
        matriculeRH: str(row['Matricule RH']),
        service: str(row['Service']),
        qualification: str(row['Qualification']),
        isInterim,
        hireDate: toDate(row['Date embauche']),
        managerCode: str(row['Code salarié responsable']),
      };

      batch.push({
        ...empData,
        subsidiaryId,
        workshopId: null,
      });

      // Code entreprise=1 → duplicate into 1SUISSE so they're visible in both
      if (codeEntreprise === '1' && codeMap['1SUISSE'] && codeMap['1SUISSE'] !== subsidiaryId) {
        const suisseId = codeMap['1SUISSE'];
        batch.push({
          ...empData,
          subsidiaryId: suisseId,
          workshopId: null,
        });
      }
    }

    // Upsert employees — PRESERVES assignments, absences, and workshop assignments
    await prisma.timeEntry.deleteMany(); // time entries are re-synced from Fabric, safe to clear
    let upserted = 0;
    for (const emp of batch) {
      await prisma.employee.upsert({
        where: { subsidiaryId_code: { subsidiaryId: emp.subsidiaryId, code: emp.code } },
        update: {
          lastName: emp.lastName,
          firstName: emp.firstName,
          isActive: emp.isActive,
          matriculeRH: emp.matriculeRH,
          service: emp.service,
          qualification: emp.qualification,
          isInterim: emp.isInterim,
          hireDate: emp.hireDate,
          managerCode: emp.managerCode,
          // Do NOT overwrite workshopId or teamId — those are managed by the user
        },
        create: {
          subsidiaryId: emp.subsidiaryId,
          workshopId: emp.workshopId,
          code: emp.code,
          lastName: emp.lastName,
          firstName: emp.firstName,
          isActive: emp.isActive,
          matriculeRH: emp.matriculeRH,
          service: emp.service,
          qualification: emp.qualification,
          isInterim: emp.isInterim,
          hireDate: emp.hireDate,
          managerCode: emp.managerCode,
        },
      });
      upserted++;
    }
    result.employees = upserted;

    console.log(`[sync] syncSalaries: ${upserted} employees upserted, unmapped=[${[...unmappedCodes].join(',')}]`);
  } catch (err: any) {
    result.errors.push(`syncSalaries: ${err.message}`);
    console.error(`[sync] syncSalaries ERROR:`, err.message);
  }
}

// ─── 5. Commandes (enriched) → Projects ──────────────────────────────────────
async function syncCommandes(
  pool: sql.ConnectionPool,
  prisma: PrismaClient,
  result: SyncResult,
  codeMap: CodeEntrepriseMap,
) {
  try {
    const rows = await pool.request().query<{
      'Code commande': string;
      'Titre commande'?: string;
      'Code et titre commande'?: string;
      'Date commande'?: Date;
      'Date livraison'?: Date;
      'Etat avancement'?: string;
      IdEntreprise?: string;
      IdClient?: string;
      IdAffaire?: string;
      'Montant vente'?: number;
      'Quantité commandée'?: number;
      'Est soldée'?: string;
      'Est commande interne'?: string;
      'IdSalariéCommercial'?: string;
      'IdSalariéTechnicien'?: string;
      'IdSalariéResponsable'?: string;
    }>(`SELECT
        [Code commande], [Titre commande], [Code et titre commande],
        [Date commande], [Date livraison], [Etat avancement], [IdEntreprise],
        [IdClient], [IdAffaire],
        [Montant vente], [Quantité commandée],
        [Est soldée], [Est commande interne],
        [IdSalariéCommercial], [IdSalariéTechnicien], [IdSalariéResponsable]
      FROM [Commande client ligne]`);

    const workshopByEntreprise = await getWorkshopIndex(prisma);

    // Build lookup indices
    const allClients = await prisma.client.findMany({ select: { id: true, code: true } });
    const clientById: Record<string, string> = {};
    for (const c of allClients) clientById[c.code] = c.id;

    const allAffaires = await prisma.affaire.findMany({ select: { id: true, code: true } });
    const affaireByCode: Record<string, string> = {};
    for (const a of allAffaires) affaireByCode[a.code] = a.id;

    const employeeNames = await prisma.employee.findMany({
      select: { code: true, firstName: true, lastName: true },
    });
    const empNameByCode: Record<string, string> = {};
    for (const e of employeeNames) {
      empNameByCode[e.code] = [e.firstName, e.lastName].filter(Boolean).join(' ');
    }

    // Deduplicate + aggregate by Code commande
    const commandeMap = new Map<string, {
      label: string;
      contractStart: Date | null;
      contractEnd: Date | null;
      status: string;
      idEntreprise: string | null;
      clientId: string | null;
      affaireId: string | null;
      montantVente: number;
      quantiteCommandee: number;
      isSoldee: boolean;
      isInterne: boolean;
      commercialName: string | null;
      technicienName: string | null;
      responsableName: string | null;
    }>();

    for (const row of rows.recordset) {
      const code = row['Code commande']?.trim();
      if (!code) continue;

      if (!commandeMap.has(code)) {
        const label = row['Titre commande']?.trim()
          || row['Code et titre commande']?.trim().replace(code, '').trim()
          || code;

        // Resolve names from employee codes
        const commCode = str(row['IdSalariéCommercial']);
        const techCode = str(row['IdSalariéTechnicien']);
        const respCode = str(row['IdSalariéResponsable']);

        commandeMap.set(code, {
          label,
          contractStart: toDate(row['Date commande']),
          contractEnd: toDate(row['Date livraison']),
          status: mapStatus(row['Etat avancement'] ?? null),
          idEntreprise: str(row.IdEntreprise),
          clientId: null, // resolved below
          affaireId: null,
          montantVente: toFloat(row['Montant vente']) ?? 0,
          quantiteCommandee: toFloat(row['Quantité commandée']) ?? 0,
          isSoldee: str(row['Est soldée'])?.toLowerCase() === 'oui',
          isInterne: str(row['Est commande interne'])?.toLowerCase() === 'oui',
          commercialName: commCode ? empNameByCode[commCode] ?? commCode : null,
          technicienName: techCode ? empNameByCode[techCode] ?? techCode : null,
          responsableName: respCode ? empNameByCode[respCode] ?? respCode : null,
        });
      } else {
        // Aggregate montant and quantite across lines
        const existing = commandeMap.get(code)!;
        existing.montantVente += toFloat(row['Montant vente']) ?? 0;
        existing.quantiteCommandee += toFloat(row['Quantité commandée']) ?? 0;
      }
    }

    for (const [code, data] of commandeMap) {
      const workshop = (data.idEntreprise && workshopByEntreprise[data.idEntreprise])
        ?? Object.values(workshopByEntreprise)[0];
      if (!workshop) continue;

      await (prisma.project.upsert as Function)({
        where: { workshopId_code: { workshopId: workshop.id, code } },
        update: {
          label: data.label,
          color: colorForCode(code),
          contractStart: data.contractStart,
          contractEnd: data.contractEnd,
          status: data.status,
          clientId: data.clientId,
          affaireId: data.affaireId,
          montantVente: data.montantVente || null,
          quantiteCommandee: data.quantiteCommandee || null,
          isSoldee: data.isSoldee,
          isInterne: data.isInterne,
          commercialName: data.commercialName,
          technicienName: data.technicienName,
          responsableName: data.responsableName,
        },
        create: {
          workshopId: workshop.id, code,
          label: data.label,
          color: colorForCode(code),
          contractStart: data.contractStart,
          contractEnd: data.contractEnd,
          plannedStart: data.contractStart,
          plannedEnd: data.contractEnd,
          status: data.status,
          progressPct: 0,
          clientId: data.clientId,
          affaireId: data.affaireId,
          montantVente: data.montantVente || null,
          quantiteCommandee: data.quantiteCommandee || null,
          isSoldee: data.isSoldee,
          isInterne: data.isInterne,
          commercialName: data.commercialName,
          technicienName: data.technicienName,
          responsableName: data.responsableName,
        },
      });
      result.projects++;
    }
  } catch (err: any) {
    result.errors.push(`syncCommandes: ${err.message}`);
  }
}

// ─── 6a. OF → ManufacturingOrders + Articles ────────────────────────────────
async function syncOF(
  pool: sql.ConnectionPool,
  prisma: PrismaClient,
  result: SyncResult,
) {
  try {
    const rows = await pool.request().query<{
      'Code OF': string;
      'Code commande client': string;
      'IdArticle'?: string;
    }>(`SELECT DISTINCT [Code OF], [Code commande client], [IdArticle]
        FROM [Dépense temps passé]`);

    // Group by (projectCode, ofCode) → set of articles
    const ofMap = new Map<string, { projectCode: string; ofCode: string; articles: Set<string> }>();
    for (const row of rows.recordset) {
      const ofCode = row['Code OF']?.trim();
      const projectCode = row['Code commande client']?.trim();
      if (!ofCode || !projectCode) continue;
      const key = `${projectCode}::${ofCode}`;
      if (!ofMap.has(key)) ofMap.set(key, { projectCode, ofCode, articles: new Set() });
      const articleCode = row['IdArticle']?.trim();
      if (articleCode) ofMap.get(key)!.articles.add(articleCode);
    }

    for (const [, data] of ofMap) {
      const project = await prisma.project.findFirst({ where: { code: data.projectCode } });
      if (!project) continue;

      const mo = await prisma.manufacturingOrder.upsert({
        where: { projectId_code: { projectId: project.id, code: data.ofCode } },
        update: {},
        create: {
          project: { connect: { id: project.id } },
          code: data.ofCode,
          label: data.ofCode,
        },
      });
      result.manufacturingOrders++;

      // Upsert articles for this OF
      for (const articleCode of data.articles) {
        await (prisma.article as any).upsert({
          where: { manufacturingOrderId_code: { manufacturingOrderId: mo.id, code: articleCode } },
          update: {},
          create: {
            manufacturingOrderId: mo.id,
            code: articleCode,
            designation: articleCode,
          },
        });
      }
    }
  } catch (err: any) {
    result.errors.push(`syncOF: ${err.message}`);
  }
}

// ─── 6b. TimeEntries (actual hours) from Dépense temps passé ─────────────────
async function syncTimeEntries(
  pool: sql.ConnectionPool,
  prisma: PrismaClient,
  result: SyncResult,
) {
  try {
    const rows = await pool.request().query<{
      IdEntreprise?: string;
      Date: Date;
      'IdSalarié': string;
      IdArticle?: string;
      'Code commande client'?: string;
      'Code OF'?: string;
      'IdPostegestion'?: string;
      Temps?: number;
      'Coût'?: number;
    }>(`SELECT [IdEntreprise], [Date], [IdSalarié], [IdArticle],
              [Code commande client], [Code OF],
              [Temps], [Coût]
        FROM [Dépense temps passé]`);

    // Build employee index by IdSalarié (warehouse id) → Prisma employee.id
    // The IdSalarié in the warehouse is NOT the same as our employee.code
    // Our employee.code comes from [Code salarié] in the Salarié table
    // We need to map IdSalarié → Code salarié → employee.id
    // For simplicity, try matching by code (which we stored as Code salarié or IdSalarié)
    const allEmployees = await prisma.employee.findMany({ select: { id: true, code: true, subsidiaryId: true } });
    const empByCode: Record<string, string> = {};
    for (const e of allEmployees) empByCode[e.code] = e.id;

    // Build project index by code
    const allProjects = await prisma.project.findMany({ select: { id: true, code: true } });
    const projByCode: Record<string, string> = {};
    for (const p of allProjects) projByCode[p.code] = p.id;

    // Clear existing time entries (full re-sync)
    await prisma.timeEntry.deleteMany();

    // Batch insert for performance
    let batch: { employeeId: string; projectId: string | null; date: Date; hours: number; cost: number | null; ofCode: string | null; articleCode: string | null }[] = [];
    const BATCH_SIZE = 500;

    for (const row of rows.recordset) {
      const idSal = row['IdSalarié']?.trim();
      const date = toDate(row.Date);
      if (!idSal || !date) continue;

      const employeeId = empByCode[idSal];
      if (!employeeId) continue;

      const projectCode = str(row['Code commande client']);
      const projectId = projectCode ? projByCode[projectCode] ?? null : null;
      const hours = toFloat(row.Temps) ?? 0;
      const cost = toFloat(row['Coût']);

      batch.push({
        employeeId,
        projectId,
        date,
        hours,
        cost,
        ofCode: str(row['Code OF']),
        articleCode: str(row.IdArticle),
      });

      if (batch.length >= BATCH_SIZE) {
        await prisma.timeEntry.createMany({ data: batch });
        result.timeEntries += batch.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      await prisma.timeEntry.createMany({ data: batch });
      result.timeEntries += batch.length;
    }
  } catch (err: any) {
    result.errors.push(`syncTimeEntries: ${err.message}`);
  }
}

// ─── 7. Calendrier → CalendarDay ─────────────────────────────────────────────
async function syncCalendrier(
  pool: sql.ConnectionPool,
  prisma: PrismaClient,
  result: SyncResult,
) {
  try {
    const rows = await pool.request().query<{
      Date: Date;
      Jour?: string;
      Semaine?: string;
      Mois?: string;
      Année?: number;
      'Est ouvrable'?: boolean | number;
      'Est férié'?: boolean | number;
      'Jour férié'?: string;
    }>(`SELECT [Date], [Jour], [Semaine], [Mois], [Année],
              [Est ouvrable], [Est férié], [Jour férié]
        FROM [Calendrier]`);

    // Clear and re-insert
    await prisma.calendarDay.deleteMany();

    let batch: Parameters<typeof prisma.calendarDay.create>[0]['data'][] = [];
    const BATCH_SIZE = 500;

    for (const row of rows.recordset) {
      const date = toDate(row.Date);
      if (!date) continue;

      const isWorkDay = row['Est ouvrable'] != null ? Boolean(row['Est ouvrable']) : true;
      const isHoliday = row['Est férié'] != null ? Boolean(row['Est férié']) : false;

      batch.push({
        date,
        dayName: str(row.Jour),
        weekNumber: str(row.Semaine),
        monthName: str(row.Mois),
        year: row['Année'] ?? null,
        isWorkDay,
        isHoliday,
        holidayName: str(row['Jour férié']),
      });

      if (batch.length >= BATCH_SIZE) {
        await prisma.calendarDay.createMany({ data: batch });
        result.calendarDays += batch.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      await prisma.calendarDay.createMany({ data: batch });
      result.calendarDays += batch.length;
    }
  } catch (err: any) {
    result.errors.push(`syncCalendrier: ${err.message}`);
  }
}

// ─── 8. JoursFiliale → SubsidiarySchedule ────────────────────────────────────
async function syncJoursFiliale(
  pool: sql.ConnectionPool,
  prisma: PrismaClient,
  result: SyncResult,
) {
  try {
    const rows = await pool.request().query<{
      Filiale: string;
      Jour: string;
      Heure: string;
    }>(`SELECT [Filiale], [Jour], [Heure] FROM [JoursFiliale]`);

    // Match filiale name to subsidiary
    const allSubs = await prisma.subsidiary.findMany();
    const subByName: Record<string, string> = {};
    for (const s of allSubs) {
      subByName[s.name.toLowerCase()] = s.id;
      // Also try partial match
      const shortName = s.name.replace(/^Atelier\s+/i, '').toLowerCase();
      subByName[shortName] = s.id;
    }

    for (const row of rows.recordset) {
      const filiale = str(row.Filiale);
      const jour = str(row.Jour);
      const heure = str(row.Heure);
      if (!filiale || !jour || !heure) continue;

      // Try to find matching subsidiary
      const subsidiaryId = subByName[filiale.toLowerCase()]
        ?? Object.values(subByName).find(id =>
          filiale.toLowerCase().includes(allSubs.find(s => s.id === id)?.name.toLowerCase() ?? '___')
        );
      if (!subsidiaryId) continue;

      await prisma.subsidiarySchedule.upsert({
        where: { subsidiaryId_dayOfWeek: { subsidiaryId, dayOfWeek: jour } },
        update: { hours: heure },
        create: { subsidiaryId, dayOfWeek: jour, hours: heure },
      });
    }
  } catch (err: any) {
    result.errors.push(`syncJoursFiliale: ${err.message}`);
  }
}

// ─── 9. Raw warehouse tables → wh_* SQLite tables ──────────────────────────
async function syncAllWarehouseTables(
  pool: sql.ConnectionPool,
  prisma: PrismaClient,
  result: SyncResult,
) {
  try {
    const defs = await ensureWarehouseTables(prisma);
    if (defs.length === 0) return;

    const fabricTablesResult = await pool.request().query<{
      TABLE_SCHEMA: string;
      TABLE_NAME: string;
    }>(
      "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"
    );
    const fabricTableNames = new Set(
      fabricTablesResult.recordset.map(r => r.TABLE_NAME?.trim())
    );

    for (const def of defs) {
      if (!fabricTableNames.has(def.originalName)) {
        const found = [...fabricTableNames].find(
          n => n?.toLowerCase() === def.originalName.toLowerCase()
        );
        if (!found) continue;
      }

      const fabricName = [...fabricTableNames].find(
        n => n?.toLowerCase() === def.originalName.toLowerCase()
      ) ?? def.originalName;

      try {
        const escapedName = fabricName.replace(/]/g, ']]');
        const rows = await pool.request().query(`SELECT * FROM [${escapedName}]`);
        const records = rows.recordset as Record<string, unknown>[];
        const count = await upsertWarehouseRows(prisma, def, records);
        result.warehouseTables[def.sqliteName] = count;
      } catch (err: any) {
        result.errors.push(`syncWarehouse[${def.originalName}]: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.errors.push(`syncAllWarehouseTables: ${err.message}`);
  }
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────
async function getWorkshopIndex(prisma: PrismaClient) {
  const workshops = await prisma.workshop.findMany({ include: { subsidiary: true } });
  const index: Record<string, typeof workshops[0]> = {};
  for (const w of workshops) index[w.subsidiary.code] = w;
  return index;
}

async function getSubsidiaryIndex(prisma: PrismaClient) {
  const subsidiaries = await prisma.subsidiary.findMany();
  const index: Record<string, typeof subsidiaries[0]> = {};
  for (const s of subsidiaries) index[s.code] = s;
  return index;
}
