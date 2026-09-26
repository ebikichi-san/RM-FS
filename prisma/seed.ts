import { PrismaClient } from "../src/generated/prisma";
import { DEPARTMENT_PRESETS } from "../src/lib/catalog/departments";
import { QUESTIONS, RED_CARD_RULES, RISK_DOMAINS } from "../src/lib/catalog/questions";

const prisma = new PrismaClient();

async function main() {
  for (const domain of RISK_DOMAINS) {
    await prisma.riskDomain.upsert({
      where: { id: domain.id },
      update: domain,
      create: domain,
    });
  }
  for (const q of QUESTIONS) {
    await prisma.question.upsert({
      where: { code: q.code },
      update: {
        title: q.title,
        text: q.text,
        domainId: q.domainId,
        taskTitle: q.taskTitle,
        taskPriority: q.taskPriority,
        taskDifficulty: q.taskDifficulty,
        estimatedHours: q.estimatedHours,
        recommendedRole: q.recommendedRole,
        taskStepsJson: JSON.stringify(q.steps),
        isRedCardTrigger: q.isRedCardTrigger,
        redCardReason: q.redCardReason,
        importanceLevel: q.importanceLevel,
      },
      create: {
        code: q.code,
        domainId: q.domainId,
        title: q.title,
        text: q.text,
        importanceLevel: q.importanceLevel,
        isRedCardTrigger: q.isRedCardTrigger,
        redCardReason: q.redCardReason,
        taskTitle: q.taskTitle,
        taskPriority: q.taskPriority,
        taskDifficulty: q.taskDifficulty,
        estimatedHours: q.estimatedHours,
        recommendedRole: q.recommendedRole,
        taskStepsJson: JSON.stringify(q.steps),
      },
    });
  }
  for (const rule of RED_CARD_RULES) {
    await prisma.redCardRule.upsert({
      where: { code: rule.code },
      update: rule,
      create: rule,
    });
  }

  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant_demo" },
    update: {},
    create: { id: "tenant_demo", name: "デモホールディングス", type: "DIRECT" },
  });
  for (const dept of DEPARTMENT_PRESETS) {
    await prisma.departmentMaster.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: dept.name } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: dept.name,
        industryPreset: dept.industry,
        systemCategory: dept.systemCategory,
      },
    });
  }
  await prisma.assessmentProject.upsert({
    where: { id: "demo" },
    update: {},
    create: { id: "demo", tenantId: tenant.id, name: "2026年度 全社リスク診断" },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
