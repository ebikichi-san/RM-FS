import { prisma } from "@/lib/prisma";
import { ensureDemoWorkspace } from "@/lib/bootstrap";
import { withAccessAdmin } from "@/lib/auth/access";
import {
  capabilities,
  DEFAULT_USER_ID,
  ROLE_LABEL,
  viewFromRole,
} from "@/lib/auth/roles";
import type { ViewerRole } from "@/lib/domain";

export type Viewer = {
  id: string;
  tenantId: string;
  displayName: string;
  email: string | null;
  role: ViewerRole;
  roleLabel: string;
  departmentId: string | null;
  departmentName: string | null;
  departmentCategory: string | null;
  view: ReturnType<typeof viewFromRole>;
  capabilities: ReturnType<typeof capabilities>;
};

export function parseUserId(request: Request) {
  const header = request.headers.get("x-user-id")?.trim();
  if (header) return header;
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)rmfs_uid=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function resolveViewer(request: Request): Promise<Viewer> {
  await ensureDemoWorkspace();
  const requested = parseUserId(request) ?? DEFAULT_USER_ID;
  const user =
    (await prisma.user.findUnique({
      where: { id: requested },
      include: { department: true },
    })) ??
    (await prisma.user.findUnique({
      where: { id: DEFAULT_USER_ID },
      include: { department: true },
    }));
  if (!user) {
    throw new Error("VIEWER_MISSING");
  }
  const role = user.role as ViewerRole;
  return {
    id: user.id,
    tenantId: user.tenantId,
    displayName: user.displayName,
    email: user.email,
    role,
    roleLabel: ROLE_LABEL[role],
    departmentId: user.departmentId,
    departmentName: user.department?.name ?? null,
    departmentCategory: user.department?.systemCategory ?? null,
    view: viewFromRole(role),
    capabilities: withAccessAdmin(capabilities(role), user),
  };
}

export function publicViewer(viewer: Viewer) {
  return {
    id: viewer.id,
    displayName: viewer.displayName,
    role: viewer.role,
    roleLabel: viewer.roleLabel,
    departmentId: viewer.departmentId,
    departmentName: viewer.departmentName,
    view: viewer.view,
    capabilities: viewer.capabilities,
  };
}
