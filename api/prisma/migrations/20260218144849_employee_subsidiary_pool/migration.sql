/*
  Warnings:

  - You are about to alter the column `isActive` on the `Employee` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `isActive` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `isActive` on the `Team` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subsidiaryId" TEXT NOT NULL,
    "workshopId" TEXT,
    "teamId" TEXT,
    "code" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("code", "color", "contractEnd", "contractStart", "createdAt", "id", "isActive", "label", "plannedEnd", "plannedStart", "progressPct", "status", "updatedAt", "workshopId") SELECT "code", "color", "contractEnd", "contractStart", "createdAt", "id", "isActive", "label", "plannedEnd", "plannedStart", "progressPct", "status", "updatedAt", "workshopId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_workshopId_code_key" ON "Project"("workshopId", "code");
CREATE TABLE "new_Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workshopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Team_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Team" ("createdAt", "id", "isActive", "name", "updatedAt", "workshopId") SELECT "createdAt", "id", "isActive", "name", "updatedAt", "workshopId" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
CREATE UNIQUE INDEX "Team_workshopId_name_key" ON "Team"("workshopId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
