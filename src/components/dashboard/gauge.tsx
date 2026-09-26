"use client";

import { cn } from "@/lib/utils";

export function ScoreGauge({
  score,
  label,
  tone,
}: {
  score: number;
  label: string;
  tone: "red" | "yellow" | "green";
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const color =
    tone === "red" ? "#fb7185" : tone === "yellow" ? "#fbbf24" : "#34d399";

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{Math.round(clamped)}</span>
          <span className="text-[11px] text-slate-400">/ 100</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-400">組織健全度</p>
        <p
          className={cn(
            "mt-1 text-3xl font-semibold tracking-tight",
            tone === "red" && "text-rose-300",
            tone === "yellow" && "text-amber-200",
            tone === "green" && "text-emerald-300",
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
