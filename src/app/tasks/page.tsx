import { Suspense } from "react";
import { TasksPageClient } from "./client";

export default function TasksPage() {
  return (
    <Suspense fallback={<p className="p-6 text-slate-400">読み込み中…</p>}>
      <TasksPageClient />
    </Suspense>
  );
}
