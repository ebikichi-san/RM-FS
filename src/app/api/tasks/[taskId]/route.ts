import { NextResponse } from "next/server";
import { resolveViewer } from "@/lib/auth/viewer";
import { rebuildProjectDiagnosis } from "@/lib/engines/diagnose";
import { logPdca } from "@/lib/engines/pdca";
import { parseGapPayload } from "@/lib/engines/report-payload";
import { taskVisibleTo } from "@/lib/engines/tasks";
import { prisma } from "@/lib/prisma";
import { patchTaskSchema } from "@/lib/validations/assessment";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await context.params;
  const viewer = await resolveViewer(request);
  const body = patchTaskSchema.parse(await request.json());
  const before = await prisma.actionTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { tenantId: true } } },
  });
  if (!before) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const allowed =
    viewer.capabilities.canPatchAnyTask ||
    (viewer.capabilities.canPatchOwnTask && taskVisibleTo(before, viewer));
  if (!allowed || viewer.view === "partner") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const latest = await prisma.diagnosticReport.findFirst({
    where: { projectId: before.projectId },
    orderBy: { generatedAt: "desc" },
  });
  const beforeScore = latest?.overallScore ?? 0;
  const beforeGap =
    parseGapPayload(latest?.gapBreakdownJson).roleGapIndex ?? latest?.gapIndex ?? 0;

  const task = await prisma.actionTask.update({
    where: { id: taskId },
    data: {
      status: body.status,
      completedAt: body.status === "DONE" ? new Date() : null,
    },
  });

  const report = await rebuildProjectDiagnosis(before.projectId);
  const afterGap = report.roleGapIndex ?? report.gapIndex;
  const scoreDelta = report.overallScore - beforeScore;
  const gapDelta = afterGap - beforeGap;

  await prisma.taskEfficacyScore.create({
    data: {
      taskId: task.id,
      beforeScore,
      afterScore: report.overallScore,
      delta: scoreDelta,
    },
  });

  if (body.status === "DONE") {
    await logPdca({
      tenantId: before.project.tenantId,
      stage: "CHECK",
      hypothesis: `改善タスク「${task.title}」完了による健全度・認識ギャップの変化を記録`,
      payload: {
        taskId: task.id,
        scoreDelta,
        gapDelta,
        afterScore: report.overallScore,
        afterGap,
      },
    });
  }

  return NextResponse.json({
    task: { ...task, steps: JSON.parse(task.stepsJson) as string[] },
    report,
    beforeScore,
    afterScore: report.overallScore,
    beforeGap,
    afterGap,
    scoreDelta,
    gapDelta,
  });
}
