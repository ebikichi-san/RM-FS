import { NextResponse } from "next/server";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { resolveViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { userPatchSchema } from "@/lib/validations/assessment";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await resolveViewer(request);
  if (!viewer.capabilities.canManageUsers) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const { id } = await context.params;
  const parsed = userPatchSchema.parse(await request.json());
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const user = await prisma.user.update({
    where: { id },
    data: {
      displayName: parsed.displayName ?? current.displayName,
      email: parsed.email === undefined ? current.email : parsed.email || null,
      role: parsed.role ?? current.role,
      departmentId:
        (parsed.role ?? current.role) === "PARTNER_CONSULTANT"
          ? null
          : parsed.departmentId === undefined
            ? current.departmentId
            : parsed.departmentId,
      positionLevel: parsed.positionLevel ?? current.positionLevel,
      accessEnabled: parsed.accessEnabled ?? current.accessEnabled,
    },
    include: { department: true },
  });
  return NextResponse.json({
    ...user,
    roleLabel: ROLE_LABEL[user.role],
    departmentName: user.department?.name ?? null,
  });
}
