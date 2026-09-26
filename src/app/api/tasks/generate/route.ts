import { NextResponse } from "next/server";
import { ensureDemoWorkspace } from "@/lib/bootstrap";
import { resolveViewer } from "@/lib/auth/viewer";
import { rebuildProjectDiagnosis } from "@/lib/engines/diagnose";

export async function POST(request: Request) {
  await ensureDemoWorkspace();
  const viewer = await resolveViewer(request);
  if (!viewer.capabilities.canRebuild) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const projectId = new URL(request.url).searchParams.get("projectId") ?? "demo";
  const report = await rebuildProjectDiagnosis(projectId);
  return NextResponse.json({
    ok: true,
    projectId,
    overallScore: report.overallScore,
    gapIndex: report.roleGapIndex ?? report.gapIndex,
    taskHint: "generated",
  });
}
