import { prisma } from "@/lib/prisma";
import { DEPARTMENT_PRESETS } from "@/lib/catalog/departments";
import { QUESTIONS, RED_CARD_RULES, RISK_DOMAINS } from "@/lib/catalog/questions";

export const DEMO_PROJECT_SLUG = "demo";

export async function ensureCatalog() {
  for (const domain of RISK_DOMAINS) {
    await prisma.riskDomain.upsert({
      where: { id: domain.id },
      update: { nameJa: domain.nameJa, nameEn: domain.nameEn, code: domain.code, weight: domain.weight },
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
}

export async function ensureDemoWorkspace() {
  await ensureCatalog();

  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant_demo" },
    update: {},
    create: {
      id: "tenant_demo",
      name: "デモホールディングス",
      type: "DIRECT",
    },
  });

  for (const dept of DEPARTMENT_PRESETS) {
    await prisma.departmentMaster.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: dept.name } },
      update: { systemCategory: dept.systemCategory, industryPreset: dept.industry },
      create: {
        tenantId: tenant.id,
        name: dept.name,
        industryPreset: dept.industry,
        systemCategory: dept.systemCategory,
      },
    });
  }

  const keiei = await prisma.departmentMaster.findFirst({
    where: { tenantId: tenant.id, name: "経営企画" },
  });
  const jinji = await prisma.departmentMaster.findFirst({
    where: { tenantId: tenant.id, name: "人事労務" },
  });
  const joho = await prisma.departmentMaster.findFirst({
    where: { tenantId: tenant.id, name: "情報システム" },
  });

  const partnerTenant = await prisma.tenant.upsert({
    where: { id: "tenant_partner" },
    update: {},
    create: { id: "tenant_partner", name: "外部パートナー", type: "PARTNER" },
  });

  await prisma.user.upsert({
    where: { id: "user_demo_admin" },
    update: { departmentId: keiei?.id, role: "CLIENT_ADMIN", displayName: "経営層（管理者）" },
    create: {
      id: "user_demo_admin",
      tenantId: tenant.id,
      email: "admin@demo.local",
      displayName: "経営層（管理者）",
      role: "CLIENT_ADMIN",
      positionLevel: "EXECUTIVE",
      employmentType: "REGULAR",
      departmentId: keiei?.id,
    },
  });
  await prisma.user.upsert({
    where: { id: "user_demo_field" },
    update: { departmentId: jinji?.id, role: "RESPONDENT", displayName: "現場メンバー（人事労務）" },
    create: {
      id: "user_demo_field",
      tenantId: tenant.id,
      email: "field@demo.local",
      displayName: "現場メンバー（人事労務）",
      role: "RESPONDENT",
      positionLevel: "STAFF",
      employmentType: "REGULAR",
      departmentId: jinji?.id,
    },
  });
  await prisma.user.upsert({
    where: { id: "user_demo_it" },
    update: { departmentId: joho?.id, role: "RESPONDENT", displayName: "現場メンバー（情報システム）" },
    create: {
      id: "user_demo_it",
      tenantId: tenant.id,
      email: "it@demo.local",
      displayName: "現場メンバー（情報システム）",
      role: "RESPONDENT",
      positionLevel: "STAFF",
      employmentType: "REGULAR",
      departmentId: joho?.id,
    },
  });
  await prisma.user.upsert({
    where: { id: "user_demo_consultant" },
    update: { role: "PARTNER_CONSULTANT", displayName: "外部コンサルタント", departmentId: null },
    create: {
      id: "user_demo_consultant",
      tenantId: partnerTenant.id,
      email: "consultant@partner.local",
      displayName: "外部コンサルタント",
      role: "PARTNER_CONSULTANT",
      positionLevel: "MANAGER",
      employmentType: "REGULAR",
    },
  });

  await prisma.user.upsert({
    where: { id: "user_ebikichi" },
    update: { displayName: "エビキチ", role: "SYSTEM_ADMIN", accessEnabled: true },
    create: {
      id: "user_ebikichi",
      tenantId: tenant.id,
      email: process.env.ADMIN_EMAIL?.trim() || "ebikichi@demo.local",
      displayName: "エビキチ",
      role: "SYSTEM_ADMIN",
      positionLevel: "EXECUTIVE",
      employmentType: "REGULAR",
      accessEnabled: true,
    },
  });

  const project = await prisma.assessmentProject.upsert({
    where: { id: DEMO_PROJECT_SLUG },
    update: {},
    create: {
      id: DEMO_PROJECT_SLUG,
      tenantId: tenant.id,
      name: "2026年度 全社リスク診断",
    },
  });

  return { tenant, project };
}
