export const ASSESSMENT_DURATION_SECONDS = 600;
export const TARGET_QUESTION_COUNT = 70;
export const QUESTIONS_PER_DOMAIN = 10;
export const DOMAIN_COUNT = 7;
export const SECONDS_PER_DOMAIN = Math.round(ASSESSMENT_DURATION_SECONDS / DOMAIN_COUNT);
export const SECONDS_PER_QUESTION = ASSESSMENT_DURATION_SECONDS / TARGET_QUESTION_COUNT;

export const ANSWER_POINTS = {
  YES: 100,
  NO: 0,
  UNKNOWN: 0,
} as const;

export const OWNER_RESPONSE_WEIGHT = 1;
export const OTHER_RESPONSE_WEIGHT = 0.35;
export const OTHER_UNKNOWN_WEIGHT = 0.12;
export const GAP_ALERT_THRESHOLD = 36;
export const TASK_GAP_THRESHOLD = 30;
export const LOW_DOMAIN_THRESHOLD = 40;
export const MIN_CLUSTER_SIZE = 3;

export type ViewerRole =
  | "SYSTEM_ADMIN"
  | "PARTNER_CONSULTANT"
  | "CLIENT_ADMIN"
  | "RESPONDENT";

export function scoreFromAnswer(answer: "YES" | "NO" | "UNKNOWN"): number {
  return ANSWER_POINTS[answer];
}

export function statusFromScore(score: number, redCardForced: boolean) {
  if (redCardForced) return "RED" as const;
  if (score >= 75) return "GREEN" as const;
  if (score >= 50) return "YELLOW" as const;
  return "RED" as const;
}

export function orgDangerLevel(params: {
  overallStatus: string;
  redCardForced: boolean;
  gapIndex: number;
}) {
  if (params.redCardForced || params.overallStatus === "RED" || params.gapIndex >= GAP_ALERT_THRESHOLD) {
    return { key: "danger" as const, label: "要対応", tone: "red" as const };
  }
  if (params.overallStatus === "YELLOW" || params.gapIndex >= 20) {
    return { key: "caution" as const, label: "要観察", tone: "yellow" as const };
  }
  return { key: "healthy" as const, label: "健全", tone: "green" as const };
}

export function compareQuestionCode(a: string, b: string) {
  const pa = a.match(/^Q(\d+)-(\d+)$/);
  const pb = b.match(/^Q(\d+)-(\d+)$/);
  if (!pa || !pb) return a.localeCompare(b);
  const d = Number(pa[1]) - Number(pb[1]);
  if (d !== 0) return d;
  return Number(pa[2]) - Number(pb[2]);
}
