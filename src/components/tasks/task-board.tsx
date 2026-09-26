"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch, useSessionStore } from "@/lib/store/session";

const PRIORITY_LABEL = {
  CRITICAL: "高",
  HIGH: "中",
  MEDIUM: "低",
} as const;

const PRIORITY_TONE = {
  CRITICAL: "red",
  HIGH: "yellow",
  MEDIUM: "neutral",
} as const;

const STATUS_LABEL = {
  TODO: "未対応",
  IN_PROGRESS: "対応中",
  DONE: "完了",
} as const;

type TaskStatus = keyof typeof STATUS_LABEL;
type TaskPriority = keyof typeof PRIORITY_LABEL;

type TaskItem = {
  id: string;
  title: string;
  priority: TaskPriority;
  estimatedHours: number;
  recommendedRole: string;
  status: TaskStatus;
  originQuestionCode: string;
  steps: string[];
  recoveryPoints: number;
  domainNameJa: string;
  assignedUserName?: string | null;
  canPatch?: boolean;
};

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export function TaskBoard({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const userId = useSessionStore((s) => s.userId);
  const [flash, setFlash] = useState<string | null>(null);
  const tasks = useQuery({
    queryKey: ["tasks", projectId, userId],
    queryFn: async () => {
      const res = await apiFetch(`/api/tasks?projectId=${projectId}`);
      if (!res.ok) throw new Error("tasks failed");
      return res.json();
    },
  });
  const report = useQuery({
    queryKey: ["report", projectId, userId],
    queryFn: async () => (await apiFetch(`/api/reports/${projectId}`)).json(),
  });

  const generate = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/tasks/generate?projectId=${projectId}`, { method: "POST" });
      if (!res.ok) throw new Error("generate failed");
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      await qc.invalidateQueries({ queryKey: ["report", projectId] });
    },
  });

  const patch = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const res = await apiFetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("patch failed");
      return res.json();
    },
    onSuccess: async (data) => {
      const scoreUp = Number(data.scoreDelta ?? 0);
      const gapDown = Number(data.gapDelta ?? 0);
      if (data.task?.status === "DONE" && (scoreUp !== 0 || gapDown !== 0)) {
        const scoreBit =
          scoreUp > 0 ? `健全度 +${Math.round(scoreUp * 10) / 10}` : null;
        const gapBit =
          gapDown < 0 ? `認識ギャップ ${Math.round(Math.abs(gapDown) * 10) / 10}pt 縮小` : null;
        setFlash([scoreBit, gapBit].filter(Boolean).join("　"));
        setTimeout(() => setFlash(null), 2600);
      } else if (data.task?.status === "TODO" && scoreUp < 0) {
        setFlash(`未対応に戻したためスコア ${Math.round(scoreUp * 10) / 10}`);
        setTimeout(() => setFlash(null), 2200);
      }
      await qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      await qc.invalidateQueries({ queryKey: ["report", projectId] });
    },
  });

  const score = Math.round(report.data?.overallScore ?? 0);
  const gap = Math.round(report.data?.roleGapIndex ?? report.data?.gapIndex ?? 0);
  const list = (Array.isArray(tasks.data) ? tasks.data : []) as TaskItem[];
  const canRebuild = Boolean(report.data?.viewer?.capabilities?.canRebuild);
  const isField = report.data?.viewer?.view === "field";
  const isPartner = report.data?.viewer?.view === "partner";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isField ? "担当タスク" : "改善タスク"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            {isField
              ? "部署に紐づく改善アクションです。完了すると組織の健全度が更新されます。"
              : isPartner
                ? "マスク済みの改善一覧です。ステータス変更はクライアント側で実施します。"
                : "認識ギャップが大きい領域やリスク指標の低い領域から、補強アクションを自動抽出します。"}
          </p>
        </div>
        {canRebuild ? (
          <Button variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? "生成中…" : "診断から再生成"}
          </Button>
        ) : null}
      </div>

      <Card className="relative overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-[14rem] flex-1">
            <p className="text-sm text-slate-400">健全度スコア</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{score}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-400">認識ギャップ</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {gap}
              <span className="ml-1 text-lg font-normal text-slate-400">%</span>
            </p>
          </div>
          <div className="text-sm text-slate-400">
            未対応 {list.filter((t) => t.status === "TODO").length}　対応中{" "}
            {list.filter((t) => t.status === "IN_PROGRESS").length}　完了{" "}
            {list.filter((t) => t.status === "DONE").length}
          </div>
        </div>
        {flash ? (
          <p className="mt-4 animate-pulse rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-200">
            {flash}
          </p>
        ) : null}
      </Card>

      {tasks.isLoading ? <p className="text-slate-400">タスクを読み込み中…</p> : null}
      {tasks.isError ? (
        <p className="text-rose-300">読み込みに失敗しました。</p>
      ) : null}

      {!tasks.isLoading && list.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-300">まだ改善タスクがありません。</p>
          <Button className="mt-4" onClick={() => generate.mutate()} disabled={generate.isPending}>
            診断結果から生成
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((status) => {
          const items = list.filter((t) => t.status === status);
          return (
            <div key={status} className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-400">
                {STATUS_LABEL[status]}
                <span className="ml-2 text-slate-600">{items.length}</span>
              </h2>
              {items.length === 0 ? <p className="text-sm text-slate-600">なし</p> : null}
              {items.map((task) => (
                <Card key={task.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium leading-snug">{task.title}</h3>
                    <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {task.domainNameJa}
                    {task.assignedUserName ? `　·　担当 ${task.assignedUserName}` : ""}
                    {task.recommendedRole ? `　·　${task.recommendedRole}` : ""}
                    {`　·　完了時 +${task.recoveryPoints}`}
                  </p>
                  <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-300">
                    {task.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  {task.canPatch ? (
                  <div className="flex flex-wrap gap-2">
                    {status !== "TODO" ? (
                      <Button
                        variant="ghost"
                        onClick={() => patch.mutate({ id: task.id, status: "TODO" })}
                        disabled={patch.isPending}
                      >
                        未対応
                      </Button>
                    ) : null}
                    {status !== "IN_PROGRESS" ? (
                      <Button
                        variant="outline"
                        onClick={() => patch.mutate({ id: task.id, status: "IN_PROGRESS" })}
                        disabled={patch.isPending}
                      >
                        対応中
                      </Button>
                    ) : null}
                    {status !== "DONE" ? (
                      <Button
                        onClick={() => patch.mutate({ id: task.id, status: "DONE" })}
                        disabled={patch.isPending}
                      >
                        完了して更新
                      </Button>
                    ) : null}
                  </div>
                  ) : (
                    <p className="text-xs text-slate-500">閲覧のみ</p>
                  )}
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
