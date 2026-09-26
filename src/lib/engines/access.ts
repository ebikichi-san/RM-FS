import type { UserRole } from "@/generated/prisma";
import { capabilities, viewFromRole } from "@/lib/auth/roles";
import type { Viewer } from "@/lib/auth/viewer";
import type { ViewerRole } from "@/lib/domain";

export type AccessTier = "platform" | "partner" | "client" | "field";

export function tierFromRole(role: ViewerRole | UserRole): AccessTier {
  const view = viewFromRole(role);
  if (view === "platform") return "platform";
  if (view === "partner") return "partner";
  if (view === "field") return "field";
  return "client";
}

type GapBreakdownRow = {
  sampleSize?: number;
  masked: boolean;
  executiveAnswer?: string | null;
  staffAnswer?: string | null;
};

export function maskReport<T extends Record<string, unknown>>(
  payload: T,
  viewer: Viewer,
): T {
  const caps = viewer.capabilities;
  const clone = structuredClone(payload) as T & {
    learningLogs?: unknown;
    rawResponses?: unknown;
    sessions?: unknown;
    gapBreakdown?: GapBreakdownRow[];
    ownerOtherGap?: { masked: boolean; ownerAnswer?: string | null; otherAnswer?: string | null }[];
    blackBoxRisks?: unknown;
    departments?: { name: string }[];
    maskingApplied?: boolean;
    viewer?: unknown;
  };

  clone.viewer = {
    id: viewer.id,
    displayName: viewer.displayName,
    role: viewer.role,
    roleLabel: viewer.roleLabel,
    departmentName: viewer.departmentName,
    view: viewer.view,
    capabilities: caps,
  };
  clone.maskingApplied = caps.maskingApplied;

  if (caps.canViewRaw) {
    return clone;
  }

  delete clone.learningLogs;
  delete clone.rawResponses;

  if (viewer.view === "partner") {
    if (Array.isArray(clone.sessions)) {
      clone.sessions = (clone.sessions as { department?: string; category?: string }[]).map((s) => ({
        department: s.department,
        category: s.category,
        masked: true,
      }));
    }
    if (Array.isArray(clone.gapBreakdown)) {
      clone.gapBreakdown = clone.gapBreakdown.map((row) => ({
        ...row,
        executiveAnswer: null,
        staffAnswer: null,
        sampleSize: undefined,
        masked: true,
      }));
    }
    if (Array.isArray(clone.ownerOtherGap)) {
      clone.ownerOtherGap = clone.ownerOtherGap.map((row) => ({
        ...row,
        ownerAnswer: null,
        otherAnswer: null,
        masked: true,
      }));
    }
  }

  if (viewer.view === "field" || viewer.view === "admin") {
    delete clone.sessions;
  }

  if (viewer.view === "admin") {
    if (Array.isArray(clone.gapBreakdown)) {
      clone.gapBreakdown = clone.gapBreakdown.map((row) =>
        row.masked || (row.sampleSize ?? 0) < 3
          ? { ...row, executiveAnswer: null, staffAnswer: null, sampleSize: undefined, masked: true }
          : row,
      );
    }
    if (Array.isArray(clone.ownerOtherGap)) {
      clone.ownerOtherGap = clone.ownerOtherGap.map((row) =>
        row.masked ? { ...row, ownerAnswer: null, otherAnswer: null, masked: true } : row,
      );
    }
  }

  if (viewer.view === "field") {
    delete clone.gapBreakdown;
    delete clone.ownerOtherGap;
    delete clone.blackBoxRisks;
    delete clone.sessions;
    if (Array.isArray(clone.departments)) {
      clone.departments = [];
    }
  }

  return clone;
}

export { capabilities };
