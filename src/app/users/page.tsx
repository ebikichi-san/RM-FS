"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/store/session";

type UserRow = {
  id: string;
  displayName: string;
  email: string | null;
  role: "CLIENT_ADMIN" | "RESPONDENT" | "PARTNER_CONSULTANT" | "SYSTEM_ADMIN";
  roleLabel: string;
  departmentId: string | null;
  departmentName: string | null;
  accessEnabled?: boolean;
};

type Dept = { id: string; name: string };

export default function UsersPage() {
  const qc = useQueryClient();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () => (await apiFetch("/api/session")).json(),
  });
  const canManage = Boolean(session.data?.viewer?.capabilities?.canManageUsers);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRow["role"]>("RESPONDENT");
  const [departmentId, setDepartmentId] = useState("");
  const users = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiFetch("/api/users")).json() as Promise<UserRow[]>,
  });
  const depts = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await apiFetch("/api/departments?projectId=demo")).json() as Promise<Dept[]>,
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          role,
          departmentId: role === "PARTNER_CONSULTANT" ? null : departmentId || null,
          projectId: "demo",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      setDisplayName("");
      await qc.invalidateQueries({ queryKey: ["users"] });
      await qc.invalidateQueries({ queryKey: ["departments"] });
      await qc.invalidateQueries({ queryKey: ["session"] });
    },
  });

  const patchDept = useMutation({
    mutationFn: async ({ id, departmentId: next }: { id: string; departmentId: string | null }) => {
      const res = await apiFetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["users"] });
      await qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const patchAccess = useMutation({
    mutationFn: async ({ id, accessEnabled }: { id: string; accessEnabled: boolean }) => {
      const res = await apiFetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessEnabled }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">ユーザーと権限</h1>
        <p className="mt-2 text-sm text-slate-400">
          経営層/管理者、現場メンバー、外部コンサルタントの役割を部署マスタと紐付けます。
        </p>
      </div>
      {canManage ? (
      <Card className="space-y-3">
        <label className="block text-sm">
          表示名
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          ロール
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRow["role"])}
          >
            <option value="CLIENT_ADMIN">経営層 / 管理者</option>
            <option value="RESPONDENT">現場メンバー</option>
            <option value="PARTNER_CONSULTANT">外部コンサルタント</option>
          </select>
        </label>
        {role !== "PARTNER_CONSULTANT" ? (
          <label className="block text-sm">
            部署
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">未設定</option>
              {(depts.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button disabled={!displayName.trim() || create.isPending} onClick={() => create.mutate()}>
          ユーザーを追加
        </Button>
        {create.isError ? <p className="text-sm text-rose-300">追加できませんでした。</p> : null}
      </Card>
      ) : (
        <p className="text-sm text-slate-400">ユーザー管理は経営層／管理者のみが操作できます。</p>
      )}
      <Card>
        <h2 className="mb-3 font-semibold">登録ユーザー</h2>
        <ul className="space-y-3 text-sm">
          {(Array.isArray(users.data) ? users.data : []).map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div>
                <p>{u.displayName}</p>
                <p className="text-xs text-slate-400">
                  {u.roleLabel}
                  {u.email ? ` · ${u.email}` : ""}
                </p>
              </div>
              {canManage && u.role !== "PARTNER_CONSULTANT" ? (
                <select
                  className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1"
                  value={u.departmentId ?? ""}
                  onChange={(e) =>
                    patchDept.mutate({ id: u.id, departmentId: e.target.value || null })
                  }
                >
                  <option value="">未設定</option>
                  {(depts.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-slate-500">{u.departmentName ?? "部署なし"}</span>
              )}
              {canManage ? (
                <button
                  type="button"
                  className={`rounded-lg border px-2 py-1 text-xs ${
                    u.accessEnabled === false ? "border-rose-400 text-rose-200" : "border-white/10 text-slate-300"
                  }`}
                  onClick={() => patchAccess.mutate({ id: u.id, accessEnabled: u.accessEnabled === false })}
                >
                  {u.accessEnabled === false ? "アクセスOFF" : "アクセスON"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
