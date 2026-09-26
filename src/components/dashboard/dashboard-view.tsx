"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DomainRadar, GapRadar } from "@/components/dashboard/radar";
import { ScoreGauge } from "@/components/dashboard/gauge";
import { HERO_SUBTEXT, HERO_TITLE } from "@/lib/copy";
import { orgDangerLevel } from "@/lib/domain";
import type { LiveDiagnosis } from "@/lib/engines/compute";
import { useAssessmentStore } from "@/lib/store/assessment";
import { apiFetch, useSessionStore } from "@/lib/store/session";

function DashboardHero({ titleClassName }: { titleClassName?: string }) {
  return (
    <div>
      <h1 className={titleClassName ?? "text-2xl font-semibold tracking-tight"}>{HERO_TITLE}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">{HERO_SUBTEXT}</p>
    </div>
  );
}

type RedCard = { code: string; questionCode: string; description: string };
type DomainGap = { domainId: number; nameJa: string; gapIndex: number; highAlert: boolean };
type DomainScore = { domainId: number; nameJa: string; score: number };

type ReportSlice = {
  overallScore: number;
  overallStatus: string;
  gapIndex: number;
  roleGapIndex?: number;
  highAlert?: boolean;
  redCardForced?: boolean;
  domains: DomainScore[];
  domainGaps?: DomainGap[];
  roleDomainGaps?: DomainGap[];
  redCards: RedCard[];
};

function pickSlice(
  data: ReportSlice,
  mine: LiveDiagnosis | null,
  scope: string,
): ReportSlice {
  if (scope === "mine" && mine) {
    return {
      overallScore: mine.overallScore,
      overallStatus: mine.overallStatus,
      gapIndex: mine.gapIndex,
      roleGapIndex: mine.roleGapIndex,
      highAlert: mine.highAlert,
      redCardForced: mine.redCardForced,
      domains: mine.domains,
      domainGaps: mine.domainGaps,
      roleDomainGaps: mine.roleDomainGaps,
      redCards: mine.redCards,
    };
  }
  return data;
}

export function DashboardView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const userId = useSessionStore((s) => s.userId);
  const searchParams = useSearchParams();
  const department = searchParams.get("department") ?? "all";
  const scopeParam = searchParams.get("scope");
  const lastResult = useAssessmentStore((s) => s.lastResult);
  const storedMine = lastResult?.projectId === projectId ? lastResult.diagnosis : null;

  const report = useQuery({
    queryKey: ["report", projectId, userId, department],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/reports/${projectId}?department=${encodeURIComponent(department)}`,
      );
      if (!res.ok) throw new Error("report failed");
      return res.json();
    },
  });

  const rebuild = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/reports/${projectId}`, { method: "POST" });
      if (!res.ok) throw new Error("rebuild failed");
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["report", projectId] });
    },
  });

  if (report.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <DashboardHero />
        <p className="text-slate-400">集計中…</p>
      </div>
    );
  }
  if (report.isError) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-10">
        <DashboardHero />
        <p className="text-rose-300">読み込みに失敗しました。</p>
        <Button onClick={() => report.refetch()}>再試行</Button>
      </div>
    );
  }

  const data = report.data;
  const apiMine = (data?.latestDiagnosis as LiveDiagnosis | null) ?? null;
  const mine = storedMine ?? apiMine;
  const hasOrg = Boolean(data && data.respondentCount > 0);
  if (!hasOrg && !mine) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-16">
        <DashboardHero titleClassName="text-xl font-medium" />
        <p className="text-slate-400">診断結果はまだありません</p>
        <Button onClick={() => router.push(`/assess/${projectId}`)}>診断を開始</Button>
      </div>
    );
  }

  const scope = scopeParam ?? (mine ? "mine" : "org");
  const viewData = pickSlice(data as ReportSlice, mine, scope);
  const redCards = (viewData.redCards ?? []) as RedCard[];
  const roleGaps = ((viewData.roleDomainGaps?.length ? viewData.roleDomainGaps : viewData.domainGaps) ??
    []) as DomainGap[];
  const blindSpots = roleGaps.filter((g) => g.highAlert || g.gapIndex >= 36);
  const danger = orgDangerLevel({
    overallStatus: viewData.overallStatus,
    redCardForced: Boolean(viewData.redCardForced || redCards.length),
    gapIndex: viewData.roleGapIndex ?? viewData.gapIndex ?? 0,
  });
  const gapIndex = Math.round(viewData.roleGapIndex ?? viewData.gapIndex ?? 0);
  const view = data.viewer?.view as string | undefined;
  const canRebuild = Boolean(data.viewer?.capabilities?.canRebuild);
  const isField = view === "field";
  const isPartner = view === "partner";

  const pushScope = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", next);
    router.push(`/dashboard/${projectId}?${params.toString()}`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <DashboardHero />
        </div>
        <div className="flex items-center gap-2">
          {mine && hasOrg && !isField ? (
            <div className="flex rounded-lg border border-white/10 p-0.5 text-xs">
              <button
                type="button"
                className={`rounded-md px-2 py-1.5 ${scope === "mine" ? "bg-sky-400/20 text-sky-100" : "text-slate-400"}`}
                onClick={() => pushScope("mine")}
              >
                今回の診断
              </button>
              <button
                type="button"
                className={`rounded-md px-2 py-1.5 ${scope === "org" ? "bg-sky-400/20 text-sky-100" : "text-slate-400"}`}
                onClick={() => pushScope("org")}
              >
                組織全体
              </button>
            </div>
          ) : null}
          {!isField && (data.departments ?? []).length > 1 && scope === "org" ? (
            <select
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm"
              value={department}
              onChange={(e) =>
                router.push(
                  `/dashboard/${projectId}?scope=org&department=${encodeURIComponent(e.target.value)}`,
                )
              }
            >
              <option value="all">全社</option>
              {(data.departments ?? []).map((d: { name: string }) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : null}
          {canRebuild ? (
            <Button variant="outline" onClick={() => rebuild.mutate()} disabled={rebuild.isPending}>
              再集計
            </Button>
          ) : null}
          <Button onClick={() => router.push(`/tasks?projectId=${projectId}`)}>
            {isField ? "担当タスク" : "改善タスク"}
          </Button>
        </div>
      </div>

      {scope === "mine" && mine ? (
        <p className="text-xs text-slate-500">
          あなたの回答から算出した今回の診断です（健全度・重大リスク・認知ギャップは回答に連動します）。
        </p>
      ) : null}

      {isPartner ? (
        <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          外部コンサルタントビューです。回答者の生データ・個別回答はマスクしています。
        </p>
      ) : null}

      {redCards.length > 0 ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-200">
            <AlertTriangle className="h-4 w-4" />
            重大リスク（即応）
          </p>
          <ul className="space-y-2">
            {redCards.map((rc) => (
              <li key={rc.code} className="text-sm text-rose-50">
                {rc.questionCode}　{rc.description}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Card className="flex flex-wrap items-center justify-between gap-8">
        <ScoreGauge score={viewData.overallScore ?? 0} label={danger.label} tone={danger.tone} />
        <div className="min-w-[10rem]">
          <p className="text-sm text-slate-400">認識ギャップ</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {gapIndex}
            <span className="ml-1 text-lg font-normal text-slate-400">%</span>
          </p>
          <p className="mt-1 max-w-[12rem] text-xs leading-5 text-slate-500">
            {scope === "mine"
              ? "未把握（わからない）と担当領域の認知ギャップ"
              : "経営認識と現場実態の視点の相違"}
          </p>
        </div>
        {blindSpots.length > 0 ? (
          <div className="min-w-[10rem]">
            <p className="text-sm text-slate-400">要補強領域</p>
            <p className="mt-1 text-sm leading-6 text-rose-200">
              {blindSpots.map((g) => g.nameJa).join(" / ")}
            </p>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-medium text-slate-300">視点の相違（7領域）</h2>
          <GapRadar domains={roleGaps} />
          <ul className="mt-1 space-y-1 text-sm">
            {roleGaps.map((g) => (
              <li key={g.domainId} className="flex justify-between text-slate-400">
                <span>{g.nameJa}</span>
                <span className={g.gapIndex >= 36 ? "text-rose-300" : "tabular-nums text-slate-200"}>
                  {g.gapIndex}%
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-medium text-slate-300">領域別リスク指標</h2>
          <DomainRadar domains={(viewData.domains ?? []) as DomainScore[]} />
          <ul className="mt-1 space-y-1 text-sm">
            {((viewData.domains ?? []) as DomainScore[]).map((d) => (
              <li key={d.domainId} className="flex justify-between text-slate-400">
                <span>{d.nameJa}</span>
                <span className="tabular-nums text-slate-200">{Math.round(d.score)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
