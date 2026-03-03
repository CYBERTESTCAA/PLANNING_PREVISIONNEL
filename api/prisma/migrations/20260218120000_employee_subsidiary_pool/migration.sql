-- Migration: Add subsidiaryId to Employee, make workshopId nullable
-- Employees are now linked directly to a Subsidiary.
-- workshopId becomes optional: workshops start EMPTY, admin assigns manually.

PRAGMA foreign_keys=OFF;

-- Create new Employee table with subsidiaryId (required) and workshopId (nullable)
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subsidiaryId" TEXT NOT NULL,
    "workshopId" TEXT,
    "teamId" TEXT,
    "code" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "Subsidiary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Employee_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employee_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy existing employees, deriving subsidiaryId from their current workshop.
-- workshopId is set to NULL: workshops start empty after this migration.
INSERT INTO "new_Employee" ("id", "subsidiaryId", "workshopId", "teamId", "code", "lastName", "firstName", "isActive", "createdAt", "updatedAt")
SELECT
    e."id",
    w."subsidiaryId",
    NULL,
    NULL,
    e."code",
    e."lastName",
    e."firstName",
    e."isActive",
    e."createdAt",
    e."updatedAt"
FROM "Employee" e
INNER JOIN "Workshop" w ON w."id" = e."workshopId";

DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";

-- New unique constraint: (subsidiaryId, code) instead of (workshopId, code)
CREATE UNIQUE INDEX "Employee_subsidiaryId_code_key" ON "Employee"("subsidiaryId", "code");
CREATE INDEX "Employee_workshopId_idx" ON "Employee"("workshopId");

PRAGMA foreign_keys=ON;
