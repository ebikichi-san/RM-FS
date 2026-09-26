import { NextResponse } from "next/server";
import { ensureDemoWorkspace } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import {
  ASSESSMENT_DURATION_SECONDS,
  TARGET_QUESTION_COUNT,
  compareQuestionCode,
} from "@/lib/domain";
import { QUESTIONS } from "@/lib/catalog/questions";
import { SYSTEM_CATEGORY_LABELS } from "@/lib/catalog/departments";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  await ensureDemoWorkspace();
  const { projectId } = await context.params;
  const questions = await prisma.question.findMany({
    include: { domain: true },
  });
  questions.sort((a, b) => compareQuestionCode(a.code, b.code));

  const departments = await prisma.departmentMaster.findMany({
    where: {
      tenant: { projects: { some: { id: projectId } } },
      NOT: { name: "" },
    },
    orderBy: { name: "asc" },
  });
  const unique = departments.filter((d) => /^[\p{L}\p{N}]/u.test(d.name));
  const byCode = new Map(QUESTIONS.map((q) => [q.code, q]));
  const grouped = [1, 2, 3, 4, 5, 6, 7].map((domainId) => {
    const qs = questions.filter((q) => q.domainId === domainId);
    qs.sort((a, b) => compareQuestionCode(a.code, b.code));
    const sample = qs[0];
    return {
      domainId,
      domainName: sample?.domain.nameJa ?? `領域${domainId}`,
      domainWeight: sample?.domain.weight ?? 1,
      paceSeconds: Math.round(600 / 7),
      questions: qs.map((q) => ({
        code: q.code,
        title: q.title,
        text: q.text,
        domainId: q.domainId,
        domainName: q.domain.nameJa,
        domainWeight: q.domain.weight,
        importanceLevel: q.importanceLevel,
        isRedCardTrigger: q.isRedCardTrigger,
        ownerCategories: byCode.get(q.code)?.ownerCategories ?? [],
      })),
    };
  });
  return NextResponse.json({
    projectId,
    timeLimitSeconds: ASSESSMENT_DURATION_SECONDS,
    targetQuestionCount: TARGET_QUESTION_COUNT,
    domains: grouped,
    questions: grouped.flatMap((d) => d.questions),
    departments: unique.map((d) => ({
      ...d,
      categoryLabel: SYSTEM_CATEGORY_LABELS[d.systemCategory],
    })),
  });
}
