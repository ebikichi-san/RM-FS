-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isolationLevel" TEXT NOT NULL DEFAULT 'chinese_wall',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DepartmentMaster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industryPreset" TEXT,
    "systemCategory" TEXT NOT NULL,
    "isFreeText" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DepartmentMaster_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "positionLevel" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskDomain" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "nameJa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "domainId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "importanceLevel" INTEGER NOT NULL DEFAULT 3,
    "isRedCardTrigger" BOOLEAN NOT NULL DEFAULT false,
    "redCardReason" TEXT,
    "taskTitle" TEXT NOT NULL,
    "taskPriority" TEXT NOT NULL,
    "taskDifficulty" INTEGER NOT NULL DEFAULT 2,
    "estimatedHours" REAL NOT NULL,
    "recommendedRole" TEXT NOT NULL,
    "taskStepsJson" TEXT NOT NULL,
    CONSTRAINT "Question_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "RiskDomain" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RedCardRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "questionCode" TEXT NOT NULL,
    "triggerOnUnknown" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AssessmentProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentProject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResponseSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "departmentId" TEXT NOT NULL,
    "positionLevel" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResponseSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AssessmentProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResponseSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ResponseSession_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentMaster" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerValue" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "gapFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ResponseSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessmentResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiagnosticReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "overallScore" REAL NOT NULL,
    "overallStatus" TEXT NOT NULL,
    "gapIndex" REAL NOT NULL,
    "highAlert" BOOLEAN NOT NULL,
    "redCardForced" BOOLEAN NOT NULL,
    "domainScoresJson" TEXT NOT NULL,
    "redCardsJson" TEXT NOT NULL,
    "gapBreakdownJson" TEXT NOT NULL,
    "viewerMasked" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiagnosticReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AssessmentProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActionTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "originQuestionCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "estimatedHours" REAL NOT NULL,
    "recommendedRole" TEXT NOT NULL,
    "stepsJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "recoveryPoints" REAL NOT NULL DEFAULT 8,
    "assignedUserId" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AssessmentProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActionTask_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiLearningLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "stage" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiLearningLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionPerformanceMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "dropOffRate" REAL NOT NULL DEFAULT 0,
    "unknownRate" REAL NOT NULL DEFAULT 0,
    "gapRate" REAL NOT NULL DEFAULT 0,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuestionPerformanceMetric_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskEfficacyScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "beforeScore" REAL NOT NULL,
    "afterScore" REAL NOT NULL,
    "delta" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskEfficacyScore_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ActionTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentMaster_tenantId_name_key" ON "DepartmentMaster"("tenantId", "name");

-- CreateIndex
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RiskDomain_code_key" ON "RiskDomain"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Question_code_key" ON "Question"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RedCardRule_code_key" ON "RedCardRule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResponse_sessionId_questionId_key" ON "AssessmentResponse"("sessionId", "questionId");
