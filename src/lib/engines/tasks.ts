import { QUESTIONS, RISK_DOMAINS, DOMAIN_OWNERS } from "@/lib/catalog/questions";
import { LOW_DOMAIN_THRESHOLD, TASK_GAP_THRESHOLD } from "@/lib/domain";
import type { DomainGap } from "@/lib/engines/gap";
import type { DomainScore } from "@/lib/engines/scoring";
import type { RedCardHit } from "@/lib/engines/red-card";

export type GeneratedTask = {
  originQuestionCode: string;
  title: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  difficulty: number;
  estimatedHours: number;
  recommendedRole: string;
  steps: string[];
  recoveryPoints: number;
  domainId: number;
};

const MAX_TASKS = 12;
const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };

function domainName(domainId: number) {
  return RISK_DOMAINS.find((d) => d.id === domainId)?.nameJa ?? "全社";
}

export function domainFromOriginCode(code: string): { domainId: number; nameJa: string } {
  const gap = code.match(/^GAP-D(\d+)$/);
  if (gap) {
    const domainId = Number(gap[1]);
    return { domainId, nameJa: domainName(domainId) };
  }
  if (code.startsWith("GAP")) return { domainId: 0, nameJa: "全社（視点の相違）" };
  const q = QUESTIONS.find((item) => item.code === code);
  if (q) return { domainId: q.domainId, nameJa: domainName(q.domainId) };
  return { domainId: 0, nameJa: "全社" };
}

export function pickAssigneeId(
  originQuestionCode: string,
  users: { id: string; role: string; department: { systemCategory: string } | null }[],
) {
  const { domainId } = domainFromOriginCode(originQuestionCode);
  if (domainId === 0) {
    return users.find((u) => u.role === "CLIENT_ADMIN")?.id ?? null;
  }
  const cats = DOMAIN_OWNERS[domainId] ?? [];
  const inDept = users.find(
    (u) => u.role === "RESPONDENT" && u.department && cats.includes(u.department.systemCategory as (typeof cats)[number]),
  );
  return inDept?.id ?? users.find((u) => u.role === "RESPONDENT")?.id ?? null;
}

export function taskVisibleTo(
  task: { assignedUserId: string | null; originQuestionCode: string },
  viewer: { id: string; view: string; departmentCategory: string | null },
) {
  if (viewer.view !== "field") return true;
  if (task.assignedUserId === viewer.id) return true;
  if (!task.assignedUserId && viewer.departmentCategory) {
    const { domainId } = domainFromOriginCode(task.originQuestionCode);
    if (domainId === 0) return false;
    const cats = DOMAIN_OWNERS[domainId] ?? [];
    return cats.includes(viewer.departmentCategory as (typeof cats)[number]);
  }
  return false;
}

export function generateActionTasks(params: {
  answers: { questionCode: string; answerValue: "YES" | "NO" | "UNKNOWN"; domainId: number }[];
  domains: DomainScore[];
  redCards: RedCardHit[];
  domainGaps?: DomainGap[];
  roleGapIndex?: number;
  highGap?: boolean;
}): GeneratedTask[] {
  const questionByCode = new Map(QUESTIONS.map((q) => [q.code, q]));
  const selected = new Map<string, GeneratedTask>();

  const failedInDomain = (domainId: number) =>
    params.answers
      .filter((a) => a.domainId === domainId && a.answerValue !== "YES")
      .map((a) => questionByCode.get(a.questionCode))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
      .sort((a, b) => b.importanceLevel - a.importanceLevel);

  const pushFromQuestion = (
    code: string,
    opts?: { forceCritical?: boolean; priority?: GeneratedTask["priority"] },
  ) => {
    const q = questionByCode.get(code);
    if (!q || selected.has(code)) return;
    selected.set(code, {
      originQuestionCode: q.code,
      title: q.taskTitle,
      priority: opts?.forceCritical ? "CRITICAL" : opts?.priority ?? q.taskPriority,
      difficulty: q.taskDifficulty,
      estimatedHours: q.estimatedHours,
      recommendedRole: q.recommendedRole,
      steps: q.steps,
      recoveryPoints: q.isRedCardTrigger ? 12 : 8,
      domainId: q.domainId,
    });
  };

  for (const hit of params.redCards) {
    pushFromQuestion(hit.questionCode, { forceCritical: true });
  }

  const domainGaps = params.domainGaps ?? [];
  for (const g of domainGaps) {
    if (g.gapIndex < TASK_GAP_THRESHOLD) continue;
    const code = `GAP-D${g.domainId}`;
    selected.set(code, {
      originQuestionCode: code,
      title: `${g.nameJa}：経営認識と現場実態の認識ギャップの解消`,
      priority: g.gapIndex >= 36 ? "CRITICAL" : "HIGH",
      difficulty: 2,
      estimatedHours: 6,
      recommendedRole: "経営企画 / 部門責任者",
      steps: [
        `${g.nameJa}について、経営認識と現場実態の差分を匿名化したうえで共有する`,
        "未把握事項を事実確認し、周知不足と運用不足を切り分ける",
        "90日の補強オーナーと完了定義を決める",
        "説明会または統制の導入を実施し、証跡を残す",
      ],
      recoveryPoints: 7,
      domainId: g.domainId,
    });
    const top = failedInDomain(g.domainId)[0];
    if (top) pushFromQuestion(top.code, { priority: "HIGH" });
  }

  if ((params.roleGapIndex ?? 0) >= TASK_GAP_THRESHOLD || params.highGap) {
    selected.set("GAP-ORG", {
      originQuestionCode: "GAP-ORG",
      title: "全社の視点の相違（認識ギャップ）のすり合わせ",
      priority: (params.roleGapIndex ?? 0) >= 36 ? "CRITICAL" : "HIGH",
      difficulty: 2,
      estimatedHours: 4,
      recommendedRole: "経営企画 / 部門責任者",
      steps: [
        "7領域の経営認識と現場実態の差分を匿名化して共有する",
        "未把握領域の事実確認",
        "周知不足と運用不足の切り分け",
        "90日の補強オーナーの指名",
      ],
      recoveryPoints: 6,
      domainId: 0,
    });
  }

  for (const domain of params.domains) {
    if (domain.score >= LOW_DOMAIN_THRESHOLD) continue;
    const take = failedInDomain(domain.domainId).slice(0, 2);
    for (const q of take) {
      pushFromQuestion(q.code, {
        priority: domain.score < 30 || q.isRedCardTrigger ? "CRITICAL" : "HIGH",
      });
    }
  }

  if (selected.size < 4) {
    const weakest = [...params.domains].sort((a, b) => a.score - b.score).slice(0, 2);
    for (const domain of weakest) {
      if (domain.score >= 90) continue;
      for (const q of failedInDomain(domain.domainId).slice(0, 2)) {
        pushFromQuestion(q.code, { priority: "MEDIUM" });
      }
    }
  }

  return [...selected.values()]
    .sort((a, b) => rank[a.priority] - rank[b.priority] || b.recoveryPoints - a.recoveryPoints)
    .slice(0, MAX_TASKS);
}

export function recoveryFromDoneTasks(
  tasks: { originQuestionCode: string; recoveryPoints: number }[],
) {
  let org = 0;
  const byDomain: Record<number, number> = {};
  for (const task of tasks) {
    const { domainId } = domainFromOriginCode(task.originQuestionCode);
    if (task.originQuestionCode.startsWith("GAP-D")) {
      byDomain[domainId] = (byDomain[domainId] ?? 0) + task.recoveryPoints * 0.7;
      org += task.recoveryPoints * 0.4;
    } else if (task.originQuestionCode.startsWith("GAP")) {
      org += task.recoveryPoints * 0.55;
    } else {
      org += task.recoveryPoints * 0.15;
      if (domainId) {
        byDomain[domainId] = (byDomain[domainId] ?? 0) + task.recoveryPoints * 0.25;
      }
    }
  }
  return { org, byDomain };
}
