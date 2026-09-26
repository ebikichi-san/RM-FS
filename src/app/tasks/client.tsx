"use client";

import { useSearchParams } from "next/navigation";
import { TaskBoard } from "@/components/dashboard/views";

export function TasksPageClient() {
  const projectId = useSearchParams().get("projectId") ?? "demo";
  return <TaskBoard projectId={projectId} />;
}
