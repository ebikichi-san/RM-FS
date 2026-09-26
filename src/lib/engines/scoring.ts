import { RISK_DOMAINS } from "@/lib/catalog/questions";
import { LOW_DOMAIN_THRESHOLD, QUESTIONS_PER_DOMAIN, statusFromScore } from "@/lib/domain";

export type DomainScore = {
  domainId: number;
  code: string;
  nameJa: string;
  score: number;
  ownerScore: number | null;
  otherScore: number | null;
  questionCoverage: number;
  ownerSample: number;
  otherSample: number;
  confidence: "high" | "medium" | "low";
  weight: number;
  importanceWeighted: boolean;
};

export function weightedAverage(items: { value: number; weight: number }[]): number {
  const weightSum = items.reduce((s, i) => s + i.weight, 0);
  if (weightSum <= 0) return 0;
  return items.reduce((s, i) => s + i.value * i.weight, 0) / weightSum;
}

function confidenceOf(ownerSample: number, coverage: number): "high" | "medium" | "low" {
  if (ownerSample >= 3 && coverage >= 0.8) return "high";
  if (ownerSample >= 1 && coverage >= 0.5) return "medium";
  return "low";
}

export function computeDomainScores(
  responses: {
    domainId: number;
    score: number;
    importanceLevel?: number;
    judgmentWeight?: number;
    isOwner?: boolean;
    questionCode?: string;
  }[],
): DomainScore[] {
  return RISK_DOMAINS.map((domain) => {
    const rows = responses.filter((r) => r.domainId === domain.id);
    const ownerRows = rows.filter((r) => r.isOwner);
    const otherRows = rows.filter((r) => r.isOwner === false);
    const toItems = (list: typeof rows) =>
      list.map((r) => ({
        value: r.score,
        weight: r.judgmentWeight ?? r.importanceLevel ?? 1,
      }));
    const blended = weightedAverage(toItems(rows));
    const ownerScore = ownerRows.length ? weightedAverage(toItems(ownerRows)) : null;
    const otherScore = otherRows.length ? weightedAverage(toItems(otherRows)) : null;
    const uniqueQuestions = new Set(rows.map((r) => r.questionCode).filter(Boolean)).size;
    const questionCoverage = Math.min(1, uniqueQuestions / QUESTIONS_PER_DOMAIN);
    const precise =
      ownerScore != null && otherScore != null
        ? ownerScore * 0.75 + otherScore * 0.25
        : ownerScore ?? blended;
    return {
      domainId: domain.id,
      code: domain.code,
      nameJa: domain.nameJa,
      score: Math.round(precise * 10) / 10,
      ownerScore: ownerScore == null ? null : Math.round(ownerScore * 10) / 10,
      otherScore: otherScore == null ? null : Math.round(otherScore * 10) / 10,
      questionCoverage: Math.round(questionCoverage * 100) / 100,
      ownerSample: ownerRows.length,
      otherSample: otherRows.length,
      confidence: confidenceOf(ownerRows.length, questionCoverage),
      weight: domain.weight,
      importanceWeighted: true,
    };
  });
}

export function computeOverallScore(domains: DomainScore[], recoveryBonus = 0): number {
  const covered = domains.map((d) => ({
    value: d.score,
    weight: d.weight * Math.max(0.35, d.questionCoverage),
  }));
  const weighted = weightedAverage(covered);
  return Math.min(100, Math.round((weighted + recoveryBonus) * 10) / 10);
}

export function applyTaskRecovery(
  domains: DomainScore[],
  recoveryByDomain: Record<number, number>,
): DomainScore[] {
  return domains.map((d) => ({
    ...d,
    score: Math.min(100, Math.round((d.score + (recoveryByDomain[d.domainId] ?? 0)) * 10) / 10),
    ownerScore:
      d.ownerScore == null
        ? null
        : Math.min(100, Math.round((d.ownerScore + (recoveryByDomain[d.domainId] ?? 0)) * 10) / 10),
  }));
}

export function applyGapRecovery(gapIndex: number, recoveredPoints: number) {
  return Math.max(0, Math.round((gapIndex - recoveredPoints) * 10) / 10);
}

export function lowScoringDomains(domains: DomainScore[]) {
  return domains.filter((d) => d.score < LOW_DOMAIN_THRESHOLD);
}

export { statusFromScore };
