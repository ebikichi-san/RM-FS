-- CreateTable
CREATE TABLE "DiagnosisResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "departmentName" TEXT NOT NULL,
    "positionLevel" TEXT NOT NULL,
    "overallScore" REAL NOT NULL,
    "overallStatus" TEXT NOT NULL,
    "gapIndex" REAL NOT NULL,
    "roleGapIndex" REAL NOT NULL,
    "highAlert" BOOLEAN NOT NULL,
    "redCardForced" BOOLEAN NOT NULL,
    "unknownCount" INTEGER NOT NULL,
    "unknownRate" REAL NOT NULL,
    "answeredCount" INTEGER NOT NULL,
    "answersJson" TEXT NOT NULL,
    "domainsJson" TEXT NOT NULL,
    "domainGapsJson" TEXT NOT NULL,
    "redCardsJson" TEXT NOT NULL,
    "blackBoxRisksJson" TEXT NOT NULL,
    "diagnosisJson" TEXT NOT NULL,
    "supabaseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DiagnosisResult_projectId_userId_createdAt_idx" ON "DiagnosisResult"("projectId", "userId", "createdAt");
