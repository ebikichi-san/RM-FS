import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <Suspense fallback={<p className="p-6 text-slate-400">読み込み中…</p>}>
      <DashboardView projectId={projectId} />
    </Suspense>
  );
}
