import { GAP_ALERT_THRESHOLD, MIN_CLUSTER_SIZE, QUESTIONS_PER_DOMAIN } from "@/lib/domain";
import { RISK_DOMAINS } from "@/lib/catalog/questions";
import { isOwnerDepartment } from "@/lib/engines/ownership";

export type GapRow = {
  questionCode: string;
  questionTitle: string;
  department: string;
  executiveAnswer: string | null;
  staffAnswer: string | null;
  differs: boolean;
  masked: boolean;
  sampleSize: number;
};

export type OwnerOtherGapRow = {
  questionCode: string;
  questionTitle: string;
  domainId: number;
  ownerAnswer: string | null;
  otherAnswer: string | null;
  differs: boolean;
  masked: boolean;
  ownerSample: number;
  otherSample: number;
};

export type DomainGap = {
  domainId: number;
  nameJa: string;
  gapIndex: number;
  differCount: number;
  comparable: number;
  highAlert: boolean;
};

function majority(answers: string[]): string | null {
  if (answers.length === 0) return null;
  const counts = new Map<string, number>();
  for (const a of answers) counts.set(a, (counts.get(a) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function computeGapIndex(params: {
  questions: { code: string; title: string; domainId?: number }[];
  rows: {
    questionCode: string;
    department: string;
    positionLevel: "EXECUTIVE" | "MANAGER" | "STAFF";
    answer: string;
    systemCategory?: string;
    isOwner?: boolean;
  }[];
}) {
  const questions = params.questions;
  const rows = params.rows.map((r) => ({
    ...r,
    isOwner:
      r.isOwner ??
      (r.systemCategory ? isOwnerDepartment(r.systemCategory, r.questionCode) : false),
  }));

  let ownerOtherDiffer = 0;
  let ownerOtherComparable = 0;
  const ownerOther: OwnerOtherGapRow[] = [];

  const byDomain = new Map<number, { differ: number; comparable: number }>();
  for (const d of RISK_DOMAINS) byDomain.set(d.id, { differ: 0, comparable: 0 });

  for (const q of questions) {
    const qRows = rows.filter((r) => r.questionCode === q.code);
    const ownerAnswers = qRows.filter((r) => r.isOwner).map((r) => r.answer);
    const otherAnswers = qRows.filter((r) => !r.isOwner).map((r) => r.answer);
    const ownerMaj = majority(ownerAnswers);
    const otherMaj = majority(otherAnswers);
    const ownerSample = ownerAnswers.length;
    const otherSample = otherAnswers.length;
    const masked =
      (ownerSample > 0 && ownerSample < MIN_CLUSTER_SIZE) ||
      (otherSample > 0 && otherSample < MIN_CLUSTER_SIZE);
    const differs = Boolean(ownerMaj && otherMaj && ownerMaj !== otherMaj);
    if (ownerMaj && otherMaj) {
      ownerOtherComparable += 1;
      if (differs) ownerOtherDiffer += 1;
      const domainId = q.domainId ?? Number(q.code.split("-")[0]?.replace("Q", "") ?? 0);
      const bucket = byDomain.get(domainId);
      if (bucket) {
        bucket.comparable += 1;
        if (differs) bucket.differ += 1;
      }
    }
    ownerOther.push({
      questionCode: q.code,
      questionTitle: q.title,
      domainId: q.domainId ?? 0,
      ownerAnswer: masked ? null : ownerMaj,
      otherAnswer: masked ? null : otherMaj,
      differs,
      masked,
      ownerSample,
      otherSample,
    });
  }

  const denom = questions.length || 1;
  const ownerOtherIndex = Math.round((ownerOtherDiffer / denom) * 1000) / 10;

  const domainGaps: DomainGap[] = RISK_DOMAINS.map((d) => {
    const b = byDomain.get(d.id)!;
    const gapIndex = Math.round((b.differ / QUESTIONS_PER_DOMAIN) * 1000) / 10;
    return {
      domainId: d.id,
      nameJa: d.nameJa,
      gapIndex,
      differCount: b.differ,
      comparable: b.comparable,
      highAlert: gapIndex >= GAP_ALERT_THRESHOLD,
    };
  });

  const roleByDomain = new Map<number, { differ: number; comparable: number }>();
  for (const d of RISK_DOMAINS) roleByDomain.set(d.id, { differ: 0, comparable: 0 });

  const byQuestion = new Map<string, { exec: string[]; staff: string[] }>();
  for (const q of questions) byQuestion.set(q.code, { exec: [], staff: [] });
  for (const row of rows) {
    const bucket = byQuestion.get(row.questionCode);
    if (!bucket) continue;
    if (row.positionLevel === "EXECUTIVE") bucket.exec.push(row.answer);
    else bucket.staff.push(row.answer);
  }

  let roleDiffer = 0;
  const breakdown: GapRow[] = [];
  const departments = [...new Set(rows.map((r) => r.department))];
  for (const q of questions) {
    const bucket = byQuestion.get(q.code)!;
    const execMaj = majority(bucket.exec);
    const staffMaj = majority(bucket.staff);
    const domainId = q.domainId ?? Number(q.code.split("-")[0]?.replace("Q", "") ?? 0);
    if (execMaj && staffMaj) {
      const roleBucket = roleByDomain.get(domainId);
      if (roleBucket) {
        roleBucket.comparable += 1;
        if (execMaj !== staffMaj) roleBucket.differ += 1;
      }
      if (execMaj !== staffMaj) roleDiffer += 1;
    }
    for (const dept of departments) {
      const deptRows = rows.filter((r) => r.department === dept && r.questionCode === q.code);
      const sampleSize = deptRows.length;
      const masked = sampleSize > 0 && sampleSize < MIN_CLUSTER_SIZE;
      const exec = majority(
        deptRows.filter((r) => r.positionLevel === "EXECUTIVE").map((r) => r.answer),
      );
      const staff = majority(
        deptRows.filter((r) => r.positionLevel !== "EXECUTIVE").map((r) => r.answer),
      );
      breakdown.push({
        questionCode: q.code,
        questionTitle: q.title,
        department: dept,
        executiveAnswer: masked ? null : exec,
        staffAnswer: masked ? null : staff,
        differs: Boolean(exec && staff && exec !== staff),
        masked,
        sampleSize,
      });
    }
  }

  const roleGapIndex = Math.round((roleDiffer / denom) * 1000) / 10;
  const roleDomainGaps: DomainGap[] = RISK_DOMAINS.map((d) => {
    const b = roleByDomain.get(d.id)!;
    const gapIndex = Math.round((b.differ / QUESTIONS_PER_DOMAIN) * 1000) / 10;
    return {
      domainId: d.id,
      nameJa: d.nameJa,
      gapIndex,
      differCount: b.differ,
      comparable: b.comparable,
      highAlert: gapIndex >= GAP_ALERT_THRESHOLD,
    };
  });

  return {
    gapIndex: ownerOtherIndex,
    roleGapIndex,
    comparableQuestions: ownerOtherComparable,
    differCount: ownerOtherDiffer,
    highAlert: ownerOtherIndex >= GAP_ALERT_THRESHOLD || roleGapIndex >= GAP_ALERT_THRESHOLD,
    breakdown,
    ownerOther,
    domainGaps,
    roleDomainGaps,
  };
}
