import { QUESTIONS, type OwnerCategory } from "@/lib/catalog/questions";
import { SYSTEM_CATEGORY_LABELS } from "@/lib/catalog/departments";
import {
  OTHER_RESPONSE_WEIGHT,
  OTHER_UNKNOWN_WEIGHT,
  OWNER_RESPONSE_WEIGHT,
} from "@/lib/domain";

export function ownersForQuestion(questionCode: string): OwnerCategory[] {
  return QUESTIONS.find((q) => q.code === questionCode)?.ownerCategories ?? ["OTHER"];
}

export function isOwnerDepartment(
  systemCategory: string,
  questionCode: string,
): boolean {
  return ownersForQuestion(questionCode).includes(systemCategory as OwnerCategory);
}

export function responseJudgmentWeight(params: {
  questionCode: string;
  systemCategory: string;
  answerValue: "YES" | "NO" | "UNKNOWN";
  importanceLevel: number;
}): { weight: number; isOwner: boolean } {
  const isOwner = isOwnerDepartment(params.systemCategory, params.questionCode);
  if (isOwner) {
    return { weight: params.importanceLevel * OWNER_RESPONSE_WEIGHT, isOwner: true };
  }
  const factor = params.answerValue === "UNKNOWN" ? OTHER_UNKNOWN_WEIGHT : OTHER_RESPONSE_WEIGHT;
  return { weight: params.importanceLevel * factor, isOwner: false };
}

export function ownerLabels(questionCode: string): string {
  return ownersForQuestion(questionCode)
    .map((c) => SYSTEM_CATEGORY_LABELS[c])
    .join(" / ");
}
