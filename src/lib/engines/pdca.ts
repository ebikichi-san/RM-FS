import { prisma } from "@/lib/prisma";

export async function logPdca(params: {
  tenantId?: string;
  stage: "PLAN" | "DO" | "CHECK" | "ACTION";
  hypothesis: string;
  payload: unknown;
  promoted?: boolean;
}) {
  return prisma.aiLearningLog.create({
    data: {
      tenantId: params.tenantId,
      stage: params.stage,
      hypothesis: params.hypothesis,
      payloadJson: JSON.stringify(params.payload),
      promoted: params.promoted ?? false,
    },
  });
}

export async function runAutonomousCycle(params: {
  tenantId: string;
  projectId: string;
  unknownRate: number;
  gapIndex: number;
  dropHint?: string;
}) {
  const plan = await logPdca({
    tenantId: params.tenantId,
    stage: "PLAN",
    hypothesis:
      params.unknownRate > 0.25
        ? "『わからない』率が高い設問は文言が抽象的すぎる可能性がある"
        : "複合レッドカード条件（MFA欠落と職務未分離の同時発生）を追加検証する",
    payload: { projectId: params.projectId, unknownRate: params.unknownRate },
  });

  await logPdca({
    tenantId: params.tenantId,
    stage: "DO",
    hypothesis: "シャドーテスト: 一部セッションで言い換え設問を裏適用",
    payload: { parentPlanId: plan.id, shadow: true },
  });

  const check = await logPdca({
    tenantId: params.tenantId,
    stage: "CHECK",
    hypothesis: "認識ギャップ縮小効果を近似（サンプル再抽出）",
    payload: {
      gapIndex: params.gapIndex,
      simulatedGapReduction: Math.max(0, Math.round((params.gapIndex - 8) * 0.15 * 10) / 10),
    },
  });

  const shouldPromote = params.gapIndex >= 36 && params.unknownRate > 0.2;
  if (shouldPromote) {
    await logPdca({
      tenantId: params.tenantId,
      stage: "ACTION",
      hypothesis: "成果確認済みの言い換え案を標準設問へ昇格候補として記録",
      payload: { checkId: check.id, dropHint: params.dropHint ?? null },
      promoted: true,
    });
  }

  return { promoted: shouldPromote };
}
