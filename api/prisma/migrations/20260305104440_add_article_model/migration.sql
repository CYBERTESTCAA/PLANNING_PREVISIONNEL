-- AlterTable
ALTER TABLE "Subsidiary" ADD COLUMN "address" TEXT;
ALTER TABLE "Subsidiary" ADD COLUMN "city" TEXT;
ALTER TABLE "Subsidiary" ADD COLUMN "email" TEXT;
ALTER TABLE "Subsidiary" ADD COLUMN "phone" TEXT;
ALTER TABLE "Subsidiary" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Subsidiary" ADD COLUMN "siret" TEXT;

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manufacturingOrderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "designation" TEXT,
    "quantity" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Article_manufacturingOrderId_fkey" FOREIGN KEY ("manufacturingOrderId") REFERENCES "ManufacturingOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "durationMs" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "subsidiaries" INTEGER NOT NULL DEFAULT 0,
    "workshops" INTEGER NOT NULL DEFAULT 0,
    "employees" INTEGER NOT NULL DEFAULT 0,
    "projects" INTEGER NOT NULL DEFAULT 0,
    "mfgOrders" INTEGER NOT NULL DEFAULT 0,
    "clients" INTEGER NOT NULL DEFAULT 0,
    "affaires" INTEGER NOT NULL DEFAULT 0,
    "timeEntries" INTEGER NOT NULL DEFAULT 0,
    "calendarDays" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT NOT NULL DEFAULT '[]',
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual'
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subsidiaryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Affaire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "clientId" TEXT,
    "subsidiaryCode" TEXT,
    "status" TEXT,
    "dateCreation" DATETIME,
    "dateAccord" DATETIME,
    "dateSignature" DATETIME,
    "commercialName" TEXT,
    "technicienName" TEXT,
    "caPrevu" REAL,
    "tauxReussite" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Affaire_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT,
    "date" DATETIME NOT NULL,
    "hours" REAL NOT NULL DEFAULT 0,
    "cost" REAL DEFAULT 0,
    "ofCode" TEXT,
    "articleCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "dayName" TEXT,
    "weekNumber" TEXT,
    "monthName" TEXT,
    "year" INTEGER,
    "isWorkDay" BOOLEAN NOT NULL DEFAULT true,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "holidayName" TEXT
);

-- CreateTable
CREATE TABLE "SubsidiarySchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subsidiaryId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "hours" TEXT NOT NULL,
    CONSTRAINT "SubsidiarySchedule_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dessinateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "societe" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "hk" TEXT NOT NULL,
    "numPhase" TEXT,
    "numPhaseOF" TEXT,
    "codeOF" TEXT,
    "numPlan" TEXT,
    "cart1" TEXT,
    "cart2" TEXT,
    "cart3" TEXT,
    "cart4" TEXT,
    "cart5" TEXT,
    "cart6" TEXT,
    "cart7" TEXT,
    "dessinateurId" TEXT,
    "fabricationType" TEXT,
    "etatAvancement" TEXT NOT NULL DEFAULT 'A_FAIRE',
    "datePrevisionnelle" DATETIME,
    "dateValidation" DATETIME,
    "numFiche" TEXT,
    "dateFicheFab" DATETIME,
    "sousTraitance" TEXT,
    "etatUsinage" TEXT,
    "responsableMontage" TEXT,
    "dateDepartAtelier" DATETIME,
    "paletisation" TEXT,
    "dateLivraisonChantier" DATETIME,
    "commentaires" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Plan_dessinateurId_fkey" FOREIGN KEY ("dessinateurId") REFERENCES "Dessinateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanIndice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "indice" TEXT NOT NULL,
    "dateIndice" DATETIME NOT NULL,
    "commentaire" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanIndice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "zone" TEXT,
    "question" TEXT NOT NULL,
    "auteur" TEXT,
    "destinataire" TEXT,
    "dateQuestion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reponse" TEXT,
    "dateReponse" DATETIME,
    "avancement" TEXT NOT NULL DEFAULT 'NON_TRAITE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Absence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "slot" TEXT NOT NULL DEFAULT 'FULL',
    "type" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Absence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Absence" ("comment", "createdAt", "date", "employeeId", "id", "type", "updatedAt") SELECT "comment", "createdAt", "date", "employeeId", "id", "type", "updatedAt" FROM "Absence";
DROP TABLE "Absence";
ALTER TABLE "new_Absence" RENAME TO "Absence";
CREATE UNIQUE INDEX "Absence_employeeId_date_slot_key" ON "Absence"("employeeId", "date", "slot");
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subsidiaryId" TEXT NOT NULL,
    "workshopId" TEXT,
    "teamId" TEXT,
    "code" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "matriculeRH" TEXT,
    "service" TEXT,
    "qualification" TEXT,
    "isInterim" BOOLEAN NOT NULL DEFAULT false,
    "hireDate" DATETIME,
    "managerCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Employee_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("code", "createdAt", "firstName", "id", "isActive", "lastName", "subsidiaryId", "teamId", "updatedAt", "workshopId") SELECT "code", "createdAt", "firstName", "id", "isActive", "lastName", "subsidiaryId", "teamId", "updatedAt", "workshopId" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE INDEX "Employee_workshopId_idx" ON "Employee"("workshopId");
CREATE UNIQUE INDEX "Employee_subsidiaryId_code_key" ON "Employee"("subsidiaryId", "code");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workshopId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "contractStart" DATETIME,
    "contractEnd" DATETIME,
    "plannedStart" DATETIME,
    "plannedEnd" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'A_PLANIFIER',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "affaireId" TEXT,
    "montantVente" REAL,
    "quantiteCommandee" REAL,
    "isSoldee" BOOLEAN NOT NULL DEFAULT false,
    "isInterne" BOOLEAN NOT NULL DEFAULT false,
    "commercialName" TEXT,
    "technicienName" TEXT,
    "responsableName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_affaireId_fkey" FOREIGN KEY ("affaireId") REFERENCES "Affaire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("code", "color", "contractEnd", "contractStart", "createdAt", "id", "isActive", "label", "plannedEnd", "plannedStart", "progressPct", "status", "updatedAt", "workshopId") SELECT "code", "color", "contractEnd", "contractStart", "createdAt", "id", "isActive", "label", "plannedEnd", "plannedStart", "progressPct", "status", "updatedAt", "workshopId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");
CREATE INDEX "Project_affaireId_idx" ON "Project"("affaireId");
CREATE UNIQUE INDEX "Project_workshopId_code_key" ON "Project"("workshopId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Article_manufacturingOrderId_idx" ON "Article"("manufacturingOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_manufacturingOrderId_code_key" ON "Article"("manufacturingOrderId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Client_subsidiaryId_code_key" ON "Client"("subsidiaryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Affaire_code_key" ON "Affaire"("code");

-- CreateIndex
CREATE INDEX "TimeEntry_employeeId_date_idx" ON "TimeEntry"("employeeId", "date");

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");

-- CreateIndex
CREATE INDEX "TimeEntry_date_idx" ON "TimeEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDay_date_key" ON "CalendarDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SubsidiarySchedule_subsidiaryId_dayOfWeek_key" ON "SubsidiarySchedule"("subsidiaryId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Plan_projectId_idx" ON "Plan"("projectId");

-- CreateIndex
CREATE INDEX "Plan_etatAvancement_idx" ON "Plan"("etatAvancement");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_projectId_hk_key" ON "Plan"("projectId", "hk");

-- CreateIndex
CREATE INDEX "PlanIndice_planId_idx" ON "PlanIndice"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanIndice_planId_indice_key" ON "PlanIndice"("planId", "indice");

-- CreateIndex
CREATE INDEX "Question_projectId_idx" ON "Question"("projectId");

-- CreateIndex
CREATE INDEX "Question_avancement_idx" ON "Question"("avancement");
