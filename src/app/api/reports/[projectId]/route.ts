import { NextResponse } from "next/server";
import { ensureDemoWorkspace } from "@/lib/bootstrap";
import { resolveViewer, publicViewer } from "@/lib/auth/viewer";
import { computeDiagnosis } from "@/lib/engines/compute";
import { asLiveDiagnosis, loadLatestDiagnosis } from "@/lib/engines/diagnosis-persist";
import { rebuildProjectDiagnosis } from "@/lib/engines/diagnose";
import { maskReport } from "@/lib/engines/access";
import {
  parseDomainPayload,
  parseGapPayload,
  parseRedCardPayload,
} from "@/lib/engines/report-payload";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  await ensureDemoWorkspace();
  const viewer = await resolveViewer(request);
  const { projectId } = await context.params;
  const url = new URL(request.url);
  const departmentFilter =
    viewer.view === "field" ? "all" : (url.searchParams.get("department") ?? "all");

  const project = await prisma.assessmentProject.findUnique({
    where: { id: projectId },
    include: {
      reports: { orderBy: { generatedAt: "desc" }, take: 1 },
      tasks: true,
      sessions: {
        include: {
          department: true,
          responses: { include: { question: true } },
        },
      },
      tenant: { include: { learningLogs: { orderBy: { createdAt: "desc" }, take: 8 } } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let latest = project.reports[0];
  let { domains, departmentSummaries } = parseDomainPayload(latest?.domainScoresJson);
  let gapPayload = parseGapPayload(latest?.gapBreakdownJson);
  if (
    project.sessions.length > 0 &&
    (departmentSummaries.length === 0 || gapPayload.roleDomainGaps.length === 0)
  ) {
    await rebuildProjectDiagnosis(projectId);
    latest =
      (await prisma.diagnosticReport.findFirst({
        where: { projectId },
        orderBy: { generatedAt: "desc" },
      })) ?? latest;
    const refreshed = parseDomainPayload(latest?.domainScoresJson);
    domains = refreshed.domains;
    departmentSummaries = refreshed.departmentSummaries;
    gapPayload = parseGapPayload(latest?.gapBreakdownJson);
  }
  const { redCards, blackBoxRisks } = parseRedCardPayload(latest?.redCardsJson);
  const selected =
    departmentFilter !== "all"
      ? departmentSummaries.find((d) => d.name === departmentFilter)
      : null;

  const sessionsNewestFirst = [...project.sessions].sort(
    (a, b) => (b.completedAt ?? b.createdAt).getTime() - (a.completedAt ?? a.createdAt).getTime(),
  );
  const mine = sessionsNewestFirst.find((s) => s.userId === viewer.id) ?? null;
  const stored = await loadLatestDiagnosis(projectId, viewer.id);
  const latestDiagnosis = stored
    ? asLiveDiagnosis(stored)
    : mine
      ? computeDiagnosis({
          departmentName: mine.department.name,
          positionLevel: mine.positionLevel,
          answers: mine.responses.map((r) => ({
            questionCode: r.question.code,
            answerValue: r.answerValue as "YES" | "NO" | "UNKNOWN",
          })),
        })
      : null;

  const payload = {
    projectId: project.id,
    projectName: project.name,
    tenantName: project.tenant.name,
    departmentFilter,
    departments: departmentSummaries.map((d) => ({
      name: d.name,
      category: d.category,
      respondentCount: d.respondentCount,
      overallScore: d.overallScore,
      gapIndex: d.gapIndex,
    })),
    respondentCount: selected?.respondentCount ?? project.sessions.length,
    overallScore: selected?.overallScore ?? latest?.overallScore ?? 0,
    overallStatus: selected?.overallStatus ?? latest?.overallStatus ?? "YELLOW",
    gapIndex: selected?.gapIndex ?? latest?.gapIndex ?? 0,
    roleGapIndex: gapPayload.roleGapIndex ?? 0,
    highAlert: selected?.highAlert ?? latest?.highAlert ?? false,
    redCardForced: selected?.redCardForced ?? latest?.redCardForced ?? false,
    domains: selected?.domains ?? domains,
    domainGaps: gapPayload.domainGaps,
    roleDomainGaps: gapPayload.roleDomainGaps,
    redCards: selected?.redCards ?? redCards,
    blackBoxRisks: selected?.blackBoxRisks ?? blackBoxRisks,
    gapBreakdown:
      departmentFilter === "all"
        ? gapPayload.execStaff
        : gapPayload.execStaff.filter((row) => row.department === departmentFilter),
    ownerOtherGap: gapPayload.ownerOther,
    taskCounts: {
      total: project.tasks.length,
      done: project.tasks.filter((t) => t.status === "DONE").length,
    },
    rawResponses: project.sessions.flatMap((s) =>
      s.responses.map((r) => ({
        sessionId: s.id,
        department: s.department.name,
        positionLevel: s.positionLevel,
        employmentType: s.employmentType,
        questionCode: r.question.code,
        answerValue: r.answerValue,
      })),
    ),
    sessions: project.sessions.map((s) => ({
      id: s.id,
      department: s.department.name,
      category: s.department.systemCategory,
      positionLevel: s.positionLevel,
      employmentType: s.employmentType,
    })),
    learningLogs: project.tenant.learningLogs,
    latestSessionId: mine?.id ?? stored?.sessionId ?? null,
    latestDiagnosis,
    diagnosisSource: stored?.source ?? (latestDiagnosis ? "computed" : null),
    viewerRole: viewer.role,
    viewer: publicViewer(viewer),
  };

  return NextResponse.json(maskReport(payload, viewer));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  await ensureDemoWorkspace();
  const viewer = await resolveViewer(request);
  if (!viewer.capabilities.canRebuild) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const { projectId } = await context.params;
  const report = await rebuildProjectDiagnosis(projectId);
  return NextResponse.json(maskReport({ ...report, projectId }, viewer));
}
