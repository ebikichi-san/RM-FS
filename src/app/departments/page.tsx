"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/store/session";

type Dept = {
  id: string;
  name: string;
  categoryLabel: string;
  isFreeText: boolean;
  memberCount: number;
  members: { id: string; displayName: string; role: string }[];
};

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const list = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await apiFetch("/api/departments?projectId=demo");
      return res.json() as Promise<Dept[]>;
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, projectId: "demo" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      setName("");
      await qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
  const patch = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const res = await apiFetch(`/api/departments/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName, projectId: "demo" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: async () => {
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">部署マスタ</h1>
        <p className="mt-2 text-sm text-slate-400">
          ユーザーを部署に紐付けると、領域ごとの認識ギャップと担当タスクの抽出精度が上がります。
        </p>
      </div>
      <Card className="space-y-3">
        <label className="block text-sm">
          部署名を追加
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 再生可能エネルギー事業部"
          />
        </label>
        <Button disabled={!name.trim() || add.isPending} onClick={() => add.mutate()}>
          マスタに登録
        </Button>
        {add.isError ? <p className="text-sm text-rose-300">登録に失敗しました（同名の可能性）</p> : null}
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">登録済み</h2>
        <ul className="space-y-2 text-sm">
          {(list.data ?? []).map((d) => (
            <li key={d.id} className="border-b border-white/5 py-2">
              {editingId === d.id ? (
                <div className="flex w-full flex-wrap items-center gap-2">
                  <input
                    className="min-w-[12rem] flex-1 rounded-lg border border-white/10 bg-slate-950 px-2 py-1"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                  <Button disabled={!editingName.trim() || patch.isPending} onClick={() => patch.mutate()}>
                    保存
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingId(null)}>
                    キャンセル
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p>
                      {d.name}
                      <span className="ml-2 text-slate-400">
                        {d.categoryLabel}
                        {d.isFreeText ? " · 自由設定" : ""}
                        {` · ${d.memberCount}名`}
                      </span>
                    </p>
                    {d.members?.length ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {d.members.map((m) => m.displayName).join("、")}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-600">ユーザー未割当</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(d.id);
                      setEditingName(d.name);
                    }}
                  >
                    編集
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
