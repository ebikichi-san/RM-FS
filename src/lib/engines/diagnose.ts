import { prisma } from "@/lib/prisma";
import { describeDepartmentMapping } from "@/lib/catalog/departments";
import { GAP_ALERT_THRESHOLD, scoreFromAnswer } from "@/lib/domain";
import { computeDiagnosis } from "@/lib/engines/compute";
import { persistDiagnosisResult } from "@/lib/engines/diagnosis-persist";
import { computeGapIndex } from "@/lib/engines/gap";
import { runAutonomousCycle } from "@/lib/engines/pdca";
import { evaluateSpecialistJudgment } from "@/lib/engines/red-card";
import { responseJudgmentWeight } from "@/lib/engines/ownership";
import type { DepartmentSummary } from "@/lib/engines/report-payload";
import {
  applyGapRecovery,
  applyTaskRecovery,
  computeDomainScores,
  computeOverallScore,
  statusFromScore,
} from "@/lib/engines/scoring";
import { generateActionTasks, recoveryFromDoneTasks, domainFromOriginCode, pickAssigneeId } from "@/lib/engines/tasks";
import type { submitAssessmentSchema } from "@/lib/validations/assessment";
import type { z } from "zod";

export type SubmitInput = z.infer<typeof submitAssessmentSchema>;

export async function submitAssessment(input: SubmitInput & { userId?: string }) {
  const projectId = input.projectId ?? "demo";
  const project = await prisma.assessmentProject.findUnique({
    where: { id: projectId },
    include: { tenant: true },
  });
  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const mapping = describeDepartmentMapping(input.departmentName ?? "");
  const department = await prisma.departmentMaster.upsert({
    where: {
      tenantId_name: { tenantId: project.tenantId, name: mapping.name },
    },
    update: { systemCategory: mapping.systemCategory, isFreeText: mapping.isFreeText },
    create: {
      tenantId: project.tenantId,
      name: mapping.name,
      industryPreset: input.industryPreset,
      systemCategory: mapping.systemCategory,
      isFreeText: mapping.isFreeText,
    },
  });

  const existingUser = input.userId
    ? await prisma.user.findUnique({ where: { id: input.userId } })
    : null;
  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          positionLevel: input.positionLevel,
          employmentType: input.employmentType,
          departmentId: department.id,
        },
      })
    : await prisma.user.create({
        data: {
          tenantId: project.tenantId,
          displayName: input.displayName,
          role: "RESPONDENT",
          positionLevel: input.positionLevel,
          employmentType: input.employmentType,
          departmentId: department.id,
        },
      });

  const questions = await prisma.question.findMany();
  const byCode = new Map(questions.map((q) => [q.code, q]));

  const session = await prisma.responseSession.create({
    data: {
      projectId: project.id,
      userId: user.id,
      departmentId: department.id,
      positionLevel: input.positionLevel,
      employmentType: input.employmentType,
      completedAt: new Date(),
      responses: {
        create: input.answers.map((a) => {
          const q = byCode.get(a.questionCode);
          if (!q) throw new Error(`UNKNOWN_QUESTION:${a.questionCode}`);
          return {
            questionId: q.id,
            answerValue: a.answerValue,
            score: scoreFromAnswer(a.answerValue),
            gapFlag: a.answerValue === "UNKNOWN",
          };
        }),
      },
    },
  });

  const report = await rebuildProjectDiagnosis(project.id);
  await refreshQuestionMetrics();
  const diagnosis = computeDiagnosis({
    departmentName: mapping.name,
    positionLevel: input.positionLevel,
    answers: input.answers,
  });
  const persisted = await persistDiagnosisResult({
    projectId: project.id,
    sessionId: session.id,
    userId: user.id,
    departmentName: mapping.name,
    positionLevel: input.positionLevel,
    answers: input.answers,
    diagnosis,
  });
  const unknownRate =
    input.answers.length === 0
      ? 0
      : input.answers.filter((a) => a.answerValue === "UNKNOWN").length / input.answers.length;
  await runAutonomousCycle({
    tenantId: project.tenantId,
    projectId: project.id,
    unknownRate,
    gapIndex: Math.max(report.gapIndex, diagnosis.gapIndex),
  });

  return { sessionId: session.id, projectId: project.id, report, diagnosis, persisted };
}

export async function rebuildProjectDiagnosis(projectId: string) {
  const project = await prisma.assessmentProject.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      sessions: {
        include: {
          department: true,
          responses: { include: { question: true } },
        },
      },
      tasks: true,
    },
  });

  const questions = await prisma.question.findMany();
  const allResponses = project.sessions.flatMap((s) =>
    s.responses.map((r) => {
      const judgment = responseJudgmentWeight({
        questionCode: r.question.code,
        systemCategory: s.department.systemCategory,
        answerValue: r.answerValue,
        importanceLevel: r.question.importanceLevel,
      });
      return {
        domainId: r.question.domainId,
        score: r.score,
        importanceLevel: r.question.importanceLevel,
        judgmentWeight: judgment.weight,
        isOwner: judgment.isOwner,
        questionCode: r.question.code,
        answerValue: r.answerValue,
        department: s.department.name,
        systemCategory: s.department.systemCategory,
        positionLevel: s.positionLevel,
      };
    }),
  );

  const consensusAnswers = questions.map((q) => {
    const answers = allResponses.filter((r) => r.questionCode === q.code);
    const owners = answers.filter((a) => a.isOwner);
    const source = owners.length > 0 ? owners : [];
    const fail = source.some((a) => a.answerValue === "NO" || a.answerValue === "UNKNOWN");
    return {
      questionCode: q.code,
      answerValue: (fail ? "NO" : source.length ? "YES" : "UNKNOWN") as "YES" | "NO" | "UNKNOWN",
      domainId: q.domainId,
    };
  });

  let domains = computeDomainScores(allResponses);
  const doneTasks = project.tasks.filter((t) => t.status === "DONE");
  const recoveryByDomain: Record<number, number> = {};
  for (const task of doneTasks) {
    const { domainId } = domainFromOriginCode(task.originQuestionCode);
    if (!domainId) continue;
    recoveryByDomain[domainId] = (recoveryByDomain[domainId] ?? 0) + task.recoveryPoints;
  }
  domains = applyTaskRecovery(domains, recoveryByDomain);
  const recoveryBonus = doneTasks.reduce((s, t) => s + t.recoveryPoints * 0.15, 0);

  const specialist = evaluateSpecialistJudgment({
    rows: allResponses.map((r) => ({
      questionCode: r.questionCode,
      answerValue: r.answerValue,
      department: r.department,
      systemCategory: r.systemCategory,
    })),
  });
  const redCards = specialist.redCards;
  const blackBoxRisks = specialist.blackBoxRisks;
  const gap = computeGapIndex({
    questions: questions.map((q) => ({ code: q.code, title: q.title, domainId: q.domainId })),
    rows: allResponses.map((r) => ({
      questionCode: r.questionCode,
      department: r.department,
      positionLevel: r.positionLevel,
      answer: r.answerValue,
      systemCategory: r.systemCategory,
      isOwner: r.isOwner,
    })),
  });
  const closedGap = recoveryFromDoneTasks(doneTasks);
  const roleDomainGaps = gap.roleDomainGaps.map((g) => {
    const gapIndex = applyGapRecovery(g.gapIndex, closedGap.byDomain[g.domainId] ?? 0);
    return { ...g, gapIndex, highAlert: gapIndex >= GAP_ALERT_THRESHOLD };
  });
  const domainGaps = gap.domainGaps.map((g) => {
    const gapIndex = applyGapRecovery(g.gapIndex, closedGap.byDomain[g.domainId] ?? 0);
    return { ...g, gapIndex, highAlert: gapIndex >= GAP_ALERT_THRESHOLD };
  });
  const roleGapIndex = applyGapRecovery(gap.roleGapIndex, closedGap.org);
  const ownerGapIndex = applyGapRecovery(gap.gapIndex, closedGap.org * 0.6);
  const highAlert = roleGapIndex >= GAP_ALERT_THRESHOLD || ownerGapIndex >= GAP_ALERT_THRESHOLD;

  const overallScore = computeOverallScore(domains, recoveryBonus);
  const overallStatus = statusFromScore(overallScore, redCards.length > 0);

  const departmentNames = [...new Set(allResponses.map((r) => r.department).filter(Boolean))];
  const departmentSummaries: DepartmentSummary[] = departmentNames.map((name) => {
    const rows = allResponses.filter((r) => r.department === name);
    const category = rows[0]?.systemCategory ?? "OTHER";
    const deptDomains = applyTaskRecovery(computeDomainScores(rows), recoveryByDomain);
    const deptGap = computeGapIndex({
      questions: questions.map((q) => ({ code: q.code, title: q.title, domainId: q.domainId })),
      rows: rows.map((r) => ({
        questionCode: r.questionCode,
        department: r.department,
        positionLevel: r.positionLevel,
        answer: r.answerValue,
        systemCategory: r.systemCategory,
        isOwner: r.isOwner,
      })),
    });
    const deptSpecialist = evaluateSpecialistJudgment({
      rows: rows.map((r) => ({
        questionCode: r.questionCode,
        answerValue: r.answerValue,
        department: r.department,
        systemCategory: r.systemCategory,
      })),
    });
    const score = computeOverallScore(deptDomains, recoveryBonus);
    const status = statusFromScore(score, deptSpecialist.redCards.length > 0);
    return {
      name,
      category,
      respondentCount: project.sessions.filter((s) => s.department.name === name).length,
      overallScore: score,
      overallStatus: status,
      gapIndex: applyGapRecovery(deptGap.gapIndex, closedGap.org * 0.6),
      highAlert: applyGapRecovery(deptGap.gapIndex, closedGap.org * 0.6) >= GAP_ALERT_THRESHOLD,
      redCardForced: deptSpecialist.redCards.length > 0,
      domains: deptDomains,
      redCards: deptSpecialist.redCards,
      blackBoxRisks: deptSpecialist.blackBoxRisks,
    };
  });

  const generated = generateActionTasks({
    answers: consensusAnswers,
    domains,
    redCards,
    domainGaps: roleDomainGaps,
    roleGapIndex,
    highGap: highAlert,
  });

  const keepCodes = new Set(generated.map((t) => t.originQuestionCode));
  for (const task of project.tasks) {
    if (task.status === "TODO" && !keepCodes.has(task.originQuestionCode)) {
      await prisma.actionTask.delete({ where: { id: task.id } });
    }
  }
  const tenantUsers = await prisma.user.findMany({
    where: { OR: [{ tenantId: project.tenantId }, { role: "RESPONDENT" }] },
    include: { department: true },
  });
  const existingByCode = new Map(project.tasks.map((t) => [t.originQuestionCode, t]));
  for (const task of generated) {
    const assigneeId = pickAssigneeId(task.originQuestionCode, tenantUsers);
    const existing = existingByCode.get(task.originQuestionCode);
    if (existing) {
      if (existing.status !== "DONE") {
        await prisma.actionTask.update({
          where: { id: existing.id },
          data: {
            title: task.title,
            recommendedRole: task.recommendedRole,
            stepsJson: JSON.stringify(task.steps),
            priority: task.priority,
            recoveryPoints: task.recoveryPoints,
            assignedUserId: existing.assignedUserId ?? assigneeId,
          },
        });
      }
      continue;
    }
    await prisma.actionTask.create({
      data: {
        projectId,
        originQuestionCode: task.originQuestionCode,
        title: task.title,
        priority: task.priority,
        difficulty: task.difficulty,
        estimatedHours: task.estimatedHours,
        recommendedRole: task.recommendedRole,
        stepsJson: JSON.stringify(task.steps),
        recoveryPoints: task.recoveryPoints,
        assignedUserId: assigneeId,
      },
    });
  }

  const report = await prisma.diagnosticReport.create({
    data: {
      projectId,
      overallScore,
      overallStatus,
      gapIndex: ownerGapIndex,
      highAlert,
      redCardForced: redCards.length > 0,
      domainScoresJson: JSON.stringify({ domains, departmentSummaries }),
      redCardsJson: JSON.stringify({ redCards, blackBoxRisks }),
      gapBreakdownJson: JSON.stringify({
        execStaff: gap.breakdown,
        ownerOther: gap.ownerOther,
        domainGaps,
        roleDomainGaps,
        roleGapIndex,
      }),
    },
  });

  return {
    id: report.id,
    overallScore,
    overallStatus,
    gapIndex: ownerGapIndex,
    highAlert,
    redCardForced: redCards.length > 0,
    domains,
    redCards,
    blackBoxRisks,
    departmentSummaries,
    gapBreakdown: gap.breakdown,
    ownerOther: gap.ownerOther,
    domainGaps,
    roleDomainGaps,
    roleGapIndex,
  };
}

async function refreshQuestionMetrics() {
  const questions = await prisma.question.findMany({
    include: { responses: true },
  });
  for (const q of questions) {
    const n = q.responses.length;
    const unknownRate = n === 0 ? 0 : q.responses.filter((r) => r.gapFlag).length / n;
    const existing = await prisma.questionPerformanceMetric.findFirst({
      where: { questionId: q.id },
    });
    if (existing) {
      await prisma.questionPerformanceMetric.update({
        where: { id: existing.id },
        data: { unknownRate, sampleSize: n, dropOffRate: 0, gapRate: unknownRate },
      });
    } else {
      await prisma.questionPerformanceMetric.create({
        data: {
          questionId: q.id,
          unknownRate,
          sampleSize: n,
          dropOffRate: 0,
          gapRate: unknownRate,
        },
      });
    }
  }
}
