"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

const SHORT: Record<number, string> = {
  1: "労務",
  2: "IT",
  3: "財務",
  4: "BCP",
  5: "法務",
  6: "組織",
  7: "戦略",
};

export function DomainRadar({
  domains,
}: {
  domains: { domainId?: number; nameJa: string; score: number }[];
}) {
  const data = domains.map((d, i) => ({
    subject: SHORT[d.domainId ?? i + 1] ?? d.nameJa ?? "",
    score: d.score,
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#cbd5e1", fontSize: 12 }} tickFormatter={(v) => String(v ?? "")} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="score" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.28} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GapRadar({
  domains,
}: {
  domains: { domainId: number; nameJa: string; gapIndex: number }[];
}) {
  const data = domains.map((d) => ({
    subject: SHORT[d.domainId] ?? d.nameJa ?? "",
    gap: d.gapIndex,
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#cbd5e1", fontSize: 12 }} tickFormatter={(v) => String(v ?? "")} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="gap" stroke="#fb7185" fill="#fb7185" fillOpacity={0.28} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
