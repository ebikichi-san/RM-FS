"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/store/session";

type Grant = { id: string; email: string; label: string | null; enabled: boolean };
type AccessUser = {
  id: string;
  email: string | null;
  displayName: string;
  accessEnabled: boolean;
  role: string;
};

export default function AccessAdminPage() {
  const qc = useQueryClient();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () => (await apiFetch("/api/session")).json(),
  });
  const canManage = Boolean(
    session.data?.viewer?.capabilities?.canManageAccess || session.data?.viewer?.displayName === "エビキチ",
  );
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const data = useQuery({
    queryKey: ["access-grants"],
    enabled: canManage,
    queryFn: async () => {
      const res = await apiFetch("/api/access");
      if (!res.ok) throw new Error("forbidden");
      return res.json() as Promise<{ grants: Grant[]; users: AccessUser[] }>;
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, label: label || undefined, enabled: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      setEmail("");
      setLabel("");
      await qc.invalidateQueries({ queryKey: ["access-grants"] });
    },
  });

  const toggle = useMutation({
    mutationFn: async (payload: { email?: string; userId?: string; enabled: boolean }) => {
      const res = await apiFetch("/api/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["access-grants"] });
      await qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (session.isLoading) return <p className="p-6 text-slate-400">読み込み中…</p>;
  if (!canManage) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">アクセス権限</h1>
        <p className="mt-2 text-sm text-slate-400">この画面は管理者（エビキチ）のみ操作できます。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">アクセス権限</h1>
        <p className="mt-2 text-sm text-slate-400">
          招待メールの発行と、ユーザーごとのアクセスオン／オフを切り替えます。
        </p>
      </div>
      <Card className="space-y-3">
        <label className="block text-sm">
          招待するメールアドレス
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          表示ラベル（任意）
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <Button disabled={!email.trim() || invite.isPending} onClick={() => invite.mutate()}>
          招待して有効化
        </Button>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">招待メール</h2>
        <ul className="space-y-3 text-sm">
          {(data.data?.grants ?? []).map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <p>{g.email}</p>
                <p className="text-xs text-slate-400">{g.label ?? "ラベルなし"}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => toggle.mutate({ email: g.email, enabled: !g.enabled })}
              >
                {g.enabled ? "無効にする" : "有効にする"}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">登録ユーザー</h2>
        <ul className="space-y-3 text-sm">
          {(data.data?.users ?? []).map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <p>{u.displayName}</p>
                <p className="text-xs text-slate-400">{u.email ?? "メール未設定"}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => toggle.mutate({ userId: u.id, enabled: !u.accessEnabled })}
              >
                {u.accessEnabled ? "アクセスON" : "アクセスOFF"}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
