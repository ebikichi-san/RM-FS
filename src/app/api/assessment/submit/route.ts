import { NextResponse } from "next/server";
import { resolveViewer } from "@/lib/auth/viewer";
import { ensureDemoWorkspace } from "@/lib/bootstrap";
import { submitAssessment } from "@/lib/engines/diagnose";
import { submitAssessmentSchema } from "@/lib/validations/assessment";

export async function POST(request: Request) {
  try {
    await ensureDemoWorkspace();
    const viewer = await resolveViewer(request);
    const json = await request.json();
    const parsed = submitAssessmentSchema.parse({
      ...json,
      displayName: viewer.displayName || json.displayName,
    });
    const result = await submitAssessment({
      ...parsed,
      userId: viewer.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SUBMIT_FAILED";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
