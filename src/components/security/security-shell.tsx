"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const SecurityLayer = dynamic(
  () => import("@/components/security/security-layer").then((m) => m.SecurityLayer),
  {
    ssr: false,
    loading: () => <p className="p-6 text-slate-400">認証を確認しています…</p>,
  },
);

export function SecurityShell({ children }: { children: ReactNode }) {
  return <SecurityLayer>{children}</SecurityLayer>;
}
