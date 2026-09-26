import { QUESTIONS, RED_CARD_RULES, RISK_DOMAINS } from "@/lib/catalog/questions";
import { describeDepartmentMapping } from "@/lib/catalog/departments";
import {
  GAP_ALERT_THRESHOLD,
  QUESTIONS_PER_DOMAIN,
  orgDangerLevel,
  scoreFromAnswer,
  statusFromScore,
} from "@/lib/domain";
import { isOwnerDepartment, responseJudgmentWeight } from "@/lib/engines/ownership";
import type { DomainGap } from "@/lib/engines/gap";
import {
  evaluateSpecialistJudgment,
  type BlackBoxRisk,
  type RedCardHit,
} from "@/lib/engines/red-card";
import {
  computeDomainScores,
  computeOverallScore,
  type DomainScore,
} from "@/lib/engines/scoring";

export type DiagnosisAnswer = {
  questionCode: string;
  answerValue: "YES" | "NO" | "UNKNOWN";
};

export type DiagnosisInput = {
  departmentName: string;
  positionLevel: "EXECUTIVE" | "MANAGER" | "STAFF";
  answers: DiagnosisAnswer[];
};

export type LiveDiagnosis = {
  answeredCount: number;
  totalQuestions: number;
  unknownCount: number;
  unknownRate: number;
  overallScore: number;
  overallStatus: "GREEN" | "YELLOW" | "RED";
  gapIndex: number;
  roleGapIndex: number;
  highAlert: boolean;
  redCardForced: boolean;
  redCards: RedCardHit[];
  blackBoxRisks: BlackBoxRisk[];
  domains: DomainScore[];
  domainGaps: DomainGap[];
  roleDomainGaps: DomainGap[];
  danger: ReturnType<typeof orgDangerLevel>;
  mapping: { name: string; systemCategory: string; label: string };
  respondentCount: number;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function personalRedCards(
  answers: DiagnosisAnswer[],
  departmentName: string,
  existing: RedCardHit[],
): RedCardHit[] {
  const byCode = new Map(answers.map((a) => [a.questionCode, a.answerValue]));
  const extra: RedCardHit[] = [];
  for (const rule of RED_CARD_RULES) {
    if (existing.some((r) => r.code === rule.code)) continue;
    const answer = byCode.get(rule.questionCode);
    if (!answer) continue;
    const hit = answer === "NO" || (rule.triggerOnUnknown && answer === "UNKNOWN");
    if (!hit) continue;
    extra.push({
      code: rule.code,
      questionCode: rule.questionCode,
      description: rule.description,
      answer,
      source: "owner",
      ownerDepartments: [departmentName],
    });
  }
  return extra;
}

function domainUnknownGaps(answers: DiagnosisAnswer[]): DomainGap[] {
  return RISK_DOMAINS.map((d) => {
    const codes = QUESTIONS.filter((q) => q.domainId === d.id).map((q) => q.code);
    const rows = answers.filter((a) => codes.includes(a.questionCode));
    const unknown = rows.filter((a) => a.answerValue === "UNKNOWN").length;
    const gapIndex = round1((unknown / QUESTIONS_PER_DOMAIN) * 100);
    return {
      domainId: d.id,
      nameJa: d.nameJa,
      gapIndex,
      differCount: unknown,
      comparable: rows.length,
      highAlert: gapIndex >= GAP_ALERT_THRESHOLD,
    };
  });
}

/** 単一回答者の認知ギャップ: 「わからない」と、担当外の未把握を合成 */
function cognitiveGapIndex(params: {
  answers: DiagnosisAnswer[];
  systemCategory: string;
  positionLevel: DiagnosisInput["positionLevel"];
}): number {
  const { answers, systemCategory, positionLevel } = params;
  if (answers.length === 0) return 0;
  const unknownShare = answers.filter((a) => a.answerValue === "UNKNOWN").length / answers.length;

  const owned = answers.filter((a) => isOwnerDepartment(systemCategory, a.questionCode));
  const ownerUnknownShare =
    owned.length === 0
      ? unknownShare
      : owned.filter((a) => a.answerValue === "UNKNOWN").length / owned.length;

  const fieldCodes = QUESTIONS.filter((q) => q.domainId !== 7).map((q) => q.code);
  const strategyCodes = QUESTIONS.filter((q) => q.domainId === 7).map((q) => q.code);
  const focus =
    positionLevel === "EXECUTIVE"
      ? answers.filter((a) => fieldCodes.includes(a.questionCode))
      : answers.filter((a) => strategyCodes.includes(a.questionCode));
  const roleUnknownShare =
    focus.length === 0
      ? unknownShare
      : focus.filter((a) => a.answerValue === "UNKNOWN").length / focus.length;

  return round1((unknownShare * 0.45 + ownerUnknownShare * 0.3 + roleUnknownShare * 0.25) * 100);
}

export function computeDiagnosis(input: DiagnosisInput): LiveDiagnosis {
  const mapping = describeDepartmentMapping(input.departmentName);
  const byQuestion = new Map(QUESTIONS.map((q) => [q.code, q]));
  const answers = input.answers.filter((a) => byQuestion.has(a.questionCode));

  const scored = answers.map((a) => {
    const q = byQuestion.get(a.questionCode)!;
    const judgment = responseJudgmentWeight({
      questionCode: a.questionCode,
      systemCategory: mapping.systemCategory,
      answerValue: a.answerValue,
      importanceLevel: q.importanceLevel,
    });
    return {
      domainId: q.domainId,
      score: scoreFromAnswer(a.answerValue),
      importanceLevel: q.importanceLevel,
      judgmentWeight: judgment.weight,
      isOwner: judgment.isOwner,
      questionCode: a.questionCode,
      answerValue: a.answerValue,
      department: mapping.name,
      systemCategory: mapping.systemCategory,
    };
  });

  const domains = computeDomainScores(scored);
  const specialist = evaluateSpecialistJudgment({
    rows: scored.map((r) => ({
      questionCode: r.questionCode,
      answerValue: r.answerValue,
      department: r.department,
      systemCategory: r.systemCategory,
    })),
  });
  const redCards = [
    ...specialist.redCards,
    ...personalRedCards(answers, mapping.name, specialist.redCards),
  ];
  const domainGaps = domainUnknownGaps(answers);
  const gapIndex = cognitiveGapIndex({
    answers,
    systemCategory: mapping.systemCategory,
    positionLevel: input.positionLevel,
  });
  const overallScore = computeOverallScore(domains);
  const overallStatus = statusFromScore(overallScore, redCards.length > 0);
  const highAlert = gapIndex >= GAP_ALERT_THRESHOLD || domainGaps.some((g) => g.highAlert);
  const unknownCount = answers.filter((a) => a.answerValue === "UNKNOWN").length;

  return {
    answeredCount: answers.length,
    totalQuestions: QUESTIONS.length,
    unknownCount,
    unknownRate: answers.length === 0 ? 0 : round1(unknownCount / answers.length),
    overallScore,
    overallStatus,
    gapIndex,
    roleGapIndex: gapIndex,
    highAlert,
    redCardForced: redCards.length > 0,
    redCards,
    blackBoxRisks: specialist.blackBoxRisks,
    domains,
    domainGaps,
    roleDomainGaps: domainGaps,
    danger: orgDangerLevel({
      overallStatus,
      redCardForced: redCards.length > 0,
      gapIndex,
    }),
    mapping: {
      name: mapping.name,
      systemCategory: mapping.systemCategory,
      label: mapping.label,
    },
    respondentCount: answers.length > 0 ? 1 : 0,
  };
}
