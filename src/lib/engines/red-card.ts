import { QUESTIONS, RED_CARD_RULES } from "@/lib/catalog/questions";
import { isOwnerDepartment, ownerLabels } from "@/lib/engines/ownership";

export type RedCardHit = {
  code: string;
  questionCode: string;
  description: string;
  answer: string;
  source: "owner";
  ownerDepartments: string[];
};

export type BlackBoxRisk = {
  questionCode: string;
  questionTitle: string;
  description: string;
  otherDepartments: string[];
  unknownCount: number;
  ownerCategories: string[];
  ownerLabels: string;
};

export function evaluateSpecialistJudgment(params: {
  rows: {
    questionCode: string;
    answerValue: "YES" | "NO" | "UNKNOWN";
    department: string;
    systemCategory: string;
  }[];
}): { redCards: RedCardHit[]; blackBoxRisks: BlackBoxRisk[] } {
  const redCards: RedCardHit[] = [];
  const blackBoxRisks: BlackBoxRisk[] = [];

  for (const rule of RED_CARD_RULES) {
    const rows = params.rows.filter((r) => r.questionCode === rule.questionCode);
    const owners = rows.filter((r) => isOwnerDepartment(r.systemCategory, rule.questionCode));
    const others = rows.filter((r) => !isOwnerDepartment(r.systemCategory, rule.questionCode));
    const ownerFail = owners.find(
      (r) => r.answerValue === "NO" || (rule.triggerOnUnknown && r.answerValue === "UNKNOWN"),
    );
    if (ownerFail) {
      redCards.push({
        code: rule.code,
        questionCode: rule.questionCode,
        description: rule.description,
        answer: ownerFail.answerValue,
        source: "owner",
        ownerDepartments: [...new Set(owners.map((o) => o.department))],
      });
      continue;
    }
    const unknownOthers = others.filter((r) => r.answerValue === "UNKNOWN");
    if (unknownOthers.length > 0) {
      const q = QUESTIONS.find((item) => item.code === rule.questionCode);
      blackBoxRisks.push({
        questionCode: rule.questionCode,
        questionTitle: q?.title ?? rule.questionCode,
        description: "担当部署以外が「わからない」と回答。情報共有不足による未把握リスク",
        otherDepartments: [...new Set(unknownOthers.map((r) => r.department))],
        unknownCount: unknownOthers.length,
        ownerCategories: q?.ownerCategories ?? [],
        ownerLabels: ownerLabels(rule.questionCode),
      });
    }
  }

  const specialistCodes = QUESTIONS.filter(
    (q) => !q.isRedCardTrigger && q.importanceLevel >= 4,
  ).map((q) => q.code);
  for (const code of specialistCodes) {
    const rows = params.rows.filter((r) => r.questionCode === code);
    const unknownOthers = rows.filter(
      (r) => !isOwnerDepartment(r.systemCategory, code) && r.answerValue === "UNKNOWN",
    );
    if (unknownOthers.length === 0) continue;
    if (blackBoxRisks.some((b) => b.questionCode === code)) continue;
    const q = QUESTIONS.find((item) => item.code === code);
    blackBoxRisks.push({
      questionCode: code,
      questionTitle: q?.title ?? code,
      description: "専門領域の担当部署以外が内容を把握できていない（情報共有の不足）",
      otherDepartments: [...new Set(unknownOthers.map((r) => r.department))],
      unknownCount: unknownOthers.length,
      ownerCategories: q?.ownerCategories ?? [],
      ownerLabels: ownerLabels(code),
    });
  }

  return { redCards, blackBoxRisks };
}

export function evaluateRedCards(
  answers: { questionCode: string; answerValue: "YES" | "NO" | "UNKNOWN" }[],
): RedCardHit[] {
  return evaluateSpecialistJudgment({
    rows: answers.map((a) => ({
      ...a,
      department: "全体",
      systemCategory: "BACKOFFICE",
    })),
  }).redCards;
}
