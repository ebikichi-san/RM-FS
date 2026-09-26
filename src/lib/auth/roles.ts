import type { UserRole } from "@/generated/prisma";
import type { ViewerRole } from "@/lib/domain";
import { publicEnv } from "@/lib/env";

export const SESSION_COOKIE = "rmfs_uid";
export const DEFAULT_USER_ID = "user_demo_admin";
export const ACCESS_ADMIN_NAME = publicEnv.accessAdminName;

export const ROLE_LABEL: Record<ViewerRole | UserRole, string> = {
  SYSTEM_ADMIN: "プラットフォーム管理者",
  CLIENT_ADMIN: "経営層 / 管理者",
  RESPONDENT: "現場メンバー",
  PARTNER_CONSULTANT: "外部コンサルタント",
};

export type AccessView = "admin" | "partner" | "field" | "platform";

export function viewFromRole(role: ViewerRole | UserRole): AccessView {
  if (role === "SYSTEM_ADMIN") return "platform";
  if (role === "PARTNER_CONSULTANT") return "partner";
  if (role === "RESPONDENT") return "field";
  return "admin";
}

export function capabilities(role: ViewerRole | UserRole) {
  const view = viewFromRole(role);
  return {
    view,
    canManageUsers: view === "admin" || view === "platform",
    canEditDepartments: view === "admin" || view === "platform",
    canRebuild: view === "admin" || view === "platform",
    canPatchAnyTask: view === "admin" || view === "platform",
    canPatchOwnTask: view === "field" || view === "admin" || view === "platform",
    canViewRaw: view === "platform",
    maskingApplied: view === "partner" || view === "field",
    canManageAccess: view === "platform",
  };
}
