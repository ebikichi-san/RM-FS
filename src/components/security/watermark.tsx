"use client";

import { useEffect, useMemo, useState } from "react";

export function ConfidentialWatermark({ email }: { email: string | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const stamp = useMemo(() => {
    const time = now.toLocaleString("ja-JP", { hour12: false });
    const who = email?.trim() || "UNAUTHENTICATED";
    return `${who}  ·  ${time}  ·  CONFIDENTIAL`;
  }, [email, now]);

  const tiles = Array.from({ length: 36 }, (_, i) => i);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[40] overflow-hidden select-none"
    >
      <div className="absolute -left-1/4 -top-1/4 grid w-[150%] rotate-[-22deg] grid-cols-3 gap-y-16 opacity-[0.07]">
        {tiles.map((i) => (
          <p key={i} className="whitespace-nowrap text-center text-sm font-semibold tracking-[0.28em] text-white">
            {stamp}
          </p>
        ))}
      </div>
    </div>
  );
}
