import { NextResponse } from "next/server";
import { computeDiagnosis } from "@/lib/engines/compute";
import { submitAssessmentSchema } from "@/lib/validations/assessment";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = submitAssessmentSchema.parse(json);
    return NextResponse.json(computeDiagnosis(parsed));
  } catch (error) {
    const message = error instanceof Error ? error.message : "PREVIEW_FAILED";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
