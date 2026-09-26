import { NextResponse } from "next/server";
import { ensureDemoWorkspace } from "@/lib/bootstrap";
import { resolveViewer } from "@/lib/auth/viewer";
import { rebuildProjectDiagnosis } from "@/lib/engines/diagnose";
import { domainFromOriginCode, taskVisibleTo } from "@/lib/engines/tasks";
import { prisma } from "@/lib/prisma";

function parseSteps(raw: string) {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  await ensureDemoWorkspace();
  const viewer = await resolveViewer(request);
  const projectId = new URL(request.url).searchParams.get("projectId") ?? "demo";
  const project = await prisma.assessmentProject.findUnique({
    where: { id: projectId },
    include: { tasks: true, sessions: true },
  });
  if (!project) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const staleCopy = project.tasks.some((t) =>
    /vs|経営層と現場|GAP Index是正|認知ギャップ是正|ブラックボックス/.test(`${t.title}\n${t.stepsJson}`),
  );
  if (
    viewer.capabilities.canRebuild &&
    project.sessions.length > 0 &&
    (project.tasks.length === 0 || project.tasks.length > 20 || staleCopy)
  ) {
    await rebuildProjectDiagnosis(projectId);
  }

  const tasks = await prisma.actionTask.findMany({
    where: { projectId },
    include: { assignedUser: { include: { department: true } } },
    orderBy: [{ createdAt: "asc" }],
  });
  const visible = tasks.filter((t) => taskVisibleTo(t, viewer));
  const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  const sorted = [...visible].sort((a, b) => rank[a.priority] - rank[b.priority]);
  return NextResponse.json(
    sorted.map((t) => {
      const domain = domainFromOriginCode(t.originQuestionCode);
      return {
        ...t,
        steps: parseSteps(t.stepsJson),
        domainId: domain.domainId,
        domainNameJa: domain.nameJa,
        assignedUserName: t.assignedUser?.displayName ?? null,
        assignedDepartmentName: t.assignedUser?.department?.name ?? null,
        canPatch: viewer.capabilities.canPatchAnyTask || t.assignedUserId === viewer.id,
      };
    }),
  );
}
