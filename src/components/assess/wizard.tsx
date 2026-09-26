"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEPARTMENT_PRESETS } from "@/lib/catalog/departments";
import { ASSESSMENT_DURATION_SECONDS } from "@/lib/domain";
import { computeDiagnosis } from "@/lib/engines/compute";
import { useAssessmentStore } from "@/lib/store/assessment";
import { apiFetch, useSessionStore } from "@/lib/store/session";

type Question = {
  code: string;
  title: string;
  text: string;
  domainId: number;
  domainName: string;
};

type DomainBlock = {
  domainId: number;
  domainName: string;
  questions: Question[];
};

type Dept = { name: string };

const POSITIONS = [
  { value: "EXECUTIVE", label: "経営" },
  { value: "MANAGER", label: "管理職" },
  { value: "STAFF", label: "現場実務" },
] as const;

const EMPLOYMENT = [
  { value: "REGULAR", label: "正社員" },
  { value: "CONTRACT", label: "契約" },
  { value: "DISPATCH", label: "派遣" },
  { value: "PART_TIME", label: "パート・アルバイト" },
] as const;

export function AssessmentWizard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"meta" | "domains">("meta");
  const [domainIndex, setDomainIndex] = useState(0);
  const [departmentName, setDepartmentName] = useState("");
  const [positionLevel, setPositionLevel] = useState<(typeof POSITIONS)[number]["value"]>("STAFF");
  const [employmentType, setEmploymentType] =
    useState<(typeof EMPLOYMENT)[number]["value"]>("REGULAR");
  const timedOutRef = useRef(false);
  const userId = useSessionStore((s) => s.userId);
  const session = useQuery({
    queryKey: ["session", userId],
    queryFn: async () => (await apiFetch("/api/session")).json(),
  });

  useEffect(() => {
    const v = session.data?.viewer as
      | { departmentName?: string | null; role?: string }
      | undefined;
    if (v?.departmentName && !departmentName) setDepartmentName(v.departmentName);
    if (v?.role === "CLIENT_ADMIN") setPositionLevel("EXECUTIVE");
    if (v?.role === "RESPONDENT") setPositionLevel("STAFF");
  }, [session.data, departmentName]);
  const setAnswer = useAssessmentStore((s) => s.setAnswer);
  const startSession = useAssessmentStore((s) => s.start);
  const setMeta = useAssessmentStore((s) => s.setMeta);
  const setLastResult = useAssessmentStore((s) => s.setLastResult);
  const resetAnswers = useAssessmentStore((s) => s.reset);
  const answers = useAssessmentStore((s) => s.answers);

  const bootstrap = useQuery({
    queryKey: ["questions", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/assessments/${projectId}/questions`);
      if (!res.ok) throw new Error("load failed");
      return res.json() as Promise<{
        questions: Question[];
        domains: DomainBlock[];
        departments: Dept[];
      }>;
    },
  });

  const domainBlocks = bootstrap.data?.domains ?? [];
  const questions = bootstrap.data?.questions ?? [];
  const currentDomain = domainBlocks[domainIndex];
  const answeredCount = questions.filter((q) => answers[q.code]).length;
  const total = questions.length || 70;
  const overallProgress = Math.round((answeredCount / total) * 100);

  const live = useMemo(
    () =>
      computeDiagnosis({
        departmentName: departmentName.trim() || "未設定",
        positionLevel,
        answers: Object.entries(answers).map(([questionCode, answerValue]) => ({
          questionCode,
          answerValue,
        })),
      }),
    [answers, departmentName, positionLevel],
  );

  const submit = useMutation({
    mutationFn: async (timedOut: boolean) => {
      const store = useAssessmentStore.getState();
      const payload = {
        projectId,
        departmentName: departmentName.trim(),
        positionLevel,
        employmentType,
        timedOut,
        elapsedSeconds: ASSESSMENT_DURATION_SECONDS - store.remainingSeconds(),
        answers: questions.map((q) => ({
          questionCode: q.code,
          answerValue: store.answers[q.code] ?? "UNKNOWN",
        })),
      };
      const res = await apiFetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{
        sessionId: string;
        projectId: string;
        diagnosis: ReturnType<typeof computeDiagnosis>;
      }>;
    },
    onSuccess: (data) => {
      const diagnosis =
        data.diagnosis ??
        computeDiagnosis({
          departmentName: departmentName.trim(),
          positionLevel,
          answers: questions.map((q) => ({
            questionCode: q.code,
            answerValue: useAssessmentStore.getState().answers[q.code] ?? "UNKNOWN",
          })),
        });
      setLastResult({
        projectId: data.projectId ?? projectId,
        sessionId: data.sessionId,
        diagnosis,
      });
      resetAnswers();
      router.push(`/dashboard/${projectId}?scope=mine`);
    },
  });

  useEffect(() => {
    if (phase !== "domains") return;
    const id = window.setInterval(() => {
      const left = useAssessmentStore.getState().remainingSeconds();
      if (left <= 0 && !timedOutRef.current) {
        timedOutRef.current = true;
        submit.mutate(true);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, submit]);

  const suggestions = useMemo(() => {
    const fromApi = bootstrap.data?.departments.map((d) => d.name) ?? [];
    const catalog = DEPARTMENT_PRESETS.map((d) => d.name);
    return [...new Set([...catalog, ...fromApi])].slice(0, 24);
  }, [bootstrap.data]);

  if (bootstrap.isLoading) {
    return <p className="mx-auto max-w-2xl p-6 text-slate-400">読み込み中…</p>;
  }
  if (bootstrap.isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-6">
        <p className="text-rose-300">読み込みに失敗しました。</p>
        <Button onClick={() => bootstrap.refetch()}>再試行</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      {phase === "domains" ? (
        <div className="mb-5 space-y-3">
          <div>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="tabular-nums text-slate-200">{overallProgress}%</span>
              <span className="tabular-nums text-slate-400">
                {answeredCount} / {total}問
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-sky-400 transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
          {live.answeredCount > 0 ? (
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-center">
              <div>
                <p className="text-[11px] text-slate-500">健全度</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-100">
                  {Math.round(live.overallScore)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">重大リスク</p>
                <p
                  className={`mt-0.5 text-lg font-semibold tabular-nums ${
                    live.redCards.length ? "text-rose-300" : "text-slate-100"
                  }`}
                >
                  {live.redCards.length}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">認知ギャップ</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-100">
                  {Math.round(live.gapIndex)}
                  <span className="text-xs font-normal text-slate-500">%</span>
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "meta" ? (
        <Card className="space-y-4">
          <h1 className="text-xl font-semibold">回答者属性</h1>
          <label className="block text-sm">
            部署
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              placeholder="部署名"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-sky-400"
                onClick={() => setDepartmentName(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {POSITIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`rounded-xl border px-2 py-2 text-sm ${
                  positionLevel === p.value ? "border-sky-400 bg-sky-400/10" : "border-white/10"
                }`}
                onClick={() => setPositionLevel(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EMPLOYMENT.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`rounded-xl border px-2 py-2 text-sm ${
                  employmentType === p.value ? "border-sky-400 bg-sky-400/10" : "border-white/10"
                }`}
                onClick={() => setEmploymentType(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={!departmentName?.trim()}
            onClick={() => {
              timedOutRef.current = false;
              setMeta({
                departmentName: departmentName.trim(),
                positionLevel,
                employmentType,
              });
              startSession();
              setDomainIndex(0);
              setPhase("domains");
            }}
          >
            開始
          </Button>
        </Card>
      ) : currentDomain ? (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-slate-200">{currentDomain.domainName}</h2>
          <ul className="space-y-3">
            {currentDomain.questions.map((q) => {
              const selected = answers[q.code];
              return (
                <li key={q.code} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <p className="mb-1 text-sm font-medium leading-snug">{q.title}</p>
                  <p className="mb-3 text-sm leading-relaxed text-slate-400">{q.text}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["YES", "YES", "primary"],
                        ["NO", "NO", "danger"],
                        ["UNKNOWN", "不明", "outline"],
                      ] as const
                    ).map(([value, label, variant]) => (
                      <Button
                        key={value}
                        variant={selected === value ? variant : "ghost"}
                        className={`h-10 text-sm ${selected === value ? "ring-2 ring-sky-400" : "border border-white/10"}`}
                        onClick={() => setAnswer(q.code, value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          {live.redCards.length > 0 ? (
            <p className="text-xs leading-5 text-rose-300">
              重大リスク検知: {live.redCards.map((r) => r.description).join(" / ")}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              disabled={domainIndex === 0}
              onClick={() => setDomainIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> 戻る
            </Button>
            {domainIndex + 1 < domainBlocks.length ? (
              <Button onClick={() => setDomainIndex((i) => i + 1)}>
                次へ <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={submit.isPending} onClick={() => submit.mutate(false)}>
                送信
              </Button>
            )}
          </div>
          {submit.isError ? (
            <p className="text-sm text-rose-300">
              送信に失敗しました。入力内容を確認して再試行してください。
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
