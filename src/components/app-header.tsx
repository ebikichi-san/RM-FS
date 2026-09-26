"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { apiFetch, useSessionStore } from "@/lib/store/session";

type Identity = { id: string; displayName: string; role: string; departmentName: string | null };
type SessionPayload = {
  viewer: {
    id: string;
    displayName?: string;
    role: string;
    roleLabel: string;
    departmentName: string | null;
    view: string;
    capabilities: { canManageUsers: boolean; canEditDepartments: boolean; canManageAccess?: boolean };
  };
  identities: Identity[];
};

export function AppHeader({ authEmail }: { authEmail?: string | null }) {
  const userId = useSessionStore((s) => s.userId);
  const setUserId = useSessionStore((s) => s.setUserId);
  const session = useQuery({
    queryKey: ["session", userId],
    queryFn: async () => {
      const res = await apiFetch("/api/session");
      return res.json() as Promise<SessionPayload>;
    },
  });
  const viewer = session.data?.viewer;
  const canOrg = viewer?.capabilities.canManageUsers || viewer?.capabilities.canEditDepartments;
  const canAccess = Boolean(viewer?.capabilities.canManageAccess) || viewer?.displayName === "エビキチ";

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Shield className="h-5 w-5 text-sky-400" />
          RM-FS
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <Link href="/assess/demo" className="hover:text-white">
            診断
          </Link>
          <Link href="/dashboard/demo" className="hover:text-white">
            ダッシュボード
          </Link>
          <Link href="/tasks?projectId=demo" className="hover:text-white">
            タスク
          </Link>
          <Link href="/departments" className="hover:text-white">
            部署マスタ
          </Link>
          {canOrg ? (
            <Link href="/users" className="hover:text-white">
              ユーザー
            </Link>
          ) : null}
          {canAccess ? (
            <Link href="/access" className="hover:text-white">
              アクセス権限
            </Link>
          ) : null}
          <label className="flex items-center gap-2 text-xs text-slate-400">
            役割
            <select
              className="max-w-[14rem] rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-slate-100"
              value={userId}
              onChange={async (e) => {
                const id = e.target.value;
                setUserId(id);
                await apiFetch("/api/session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: id }),
                });
              }}
            >
              {(session.data?.identities ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
          </label>
          {authEmail ? (
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-white"
              onClick={async () => {
                window.localStorage.removeItem("rmfs_auth_email");
                await fetch("/api/auth/me", { method: "DELETE", credentials: "include" });
                window.location.href = "/login";
              }}
            >
              ログアウト
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
