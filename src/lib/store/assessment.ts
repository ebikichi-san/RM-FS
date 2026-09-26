import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ASSESSMENT_DURATION_SECONDS } from "@/lib/domain";
import type { LiveDiagnosis } from "@/lib/engines/compute";

type Answer = "YES" | "NO" | "UNKNOWN";

type AssessmentState = {
  answers: Record<string, Answer>;
  startedAt: number | null;
  departmentName: string;
  positionLevel: "EXECUTIVE" | "MANAGER" | "STAFF";
  employmentType: "REGULAR" | "CONTRACT" | "DISPATCH" | "PART_TIME";
  lastResult: { projectId: string; sessionId?: string; diagnosis: LiveDiagnosis } | null;
  setAnswer: (code: string, value: Answer) => void;
  setMeta: (meta: {
    departmentName: string;
    positionLevel: AssessmentState["positionLevel"];
    employmentType: AssessmentState["employmentType"];
  }) => void;
  start: () => void;
  remainingSeconds: () => number;
  setLastResult: (result: AssessmentState["lastResult"]) => void;
  reset: () => void;
};

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      answers: {},
      startedAt: null,
      departmentName: "",
      positionLevel: "STAFF",
      employmentType: "REGULAR",
      lastResult: null,
      setAnswer: (code, value) =>
        set((s) => ({ answers: { ...s.answers, [code]: value } })),
      setMeta: (meta) => set(meta),
      start: () => set({ startedAt: Date.now(), answers: {} }),
      remainingSeconds: () => {
        const startedAt = get().startedAt;
        if (!startedAt) return ASSESSMENT_DURATION_SECONDS;
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        return Math.max(0, ASSESSMENT_DURATION_SECONDS - elapsed);
      },
      setLastResult: (lastResult) => set({ lastResult }),
      reset: () => set({ answers: {}, startedAt: null }),
    }),
    {
      name: "rmfs-assessment",
      partialize: (s) => ({
        answers: s.answers,
        startedAt: s.startedAt,
        departmentName: s.departmentName,
        positionLevel: s.positionLevel,
        employmentType: s.employmentType,
        lastResult: s.lastResult,
      }),
    },
  ),
);
