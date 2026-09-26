import { NextResponse } from "next/server";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { resolveViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { userUpsertSchema } from "@/lib/validations/assessment";

export async function GET(request: Request) {
  const viewer = await resolveViewer(request);
  const users = await prisma.user.findMany({
    where: viewer.capabilities.canManageUsers
      ? { OR: [{ tenantId: viewer.tenantId }, { role: "PARTNER_CONSULTANT" }] }
      : { id: viewer.id },
    include: { department: true },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      email: viewer.capabilities.canManageUsers ? u.email : null,
      role: u.role,
      roleLabel: ROLE_LABEL[u.role],
      departmentId: u.departmentId,
      departmentName: u.department?.name ?? null,
      positionLevel: u.positionLevel,
      accessEnabled: u.accessEnabled,
    })),
  );
}

export async function POST(request: Request) {
  const viewer = await resolveViewer(request);
  if (!viewer.capabilities.canManageUsers) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const parsed = userUpsertSchema.parse(await request.json());
  const project = await prisma.assessmentProject.findUnique({ where: { id: parsed.projectId } });
  if (!project) return NextResponse.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });
  const tenantId =
    parsed.role === "PARTNER_CONSULTANT"
      ? (await ensurePartnerTenant()).id
      : project.tenantId;
  const user = await prisma.user.create({
    data: {
      tenantId,
      displayName: parsed.displayName,
      email: parsed.email || null,
      role: parsed.role,
      departmentId: parsed.role === "PARTNER_CONSULTANT" ? null : parsed.departmentId ?? null,
      positionLevel:
        parsed.positionLevel ??
        (parsed.role === "CLIENT_ADMIN" ? "EXECUTIVE" : parsed.role === "PARTNER_CONSULTANT" ? "MANAGER" : "STAFF"),
      employmentType: "REGULAR",
    },
    include: { department: true },
  });
  return NextResponse.json({
    ...user,
    roleLabel: ROLE_LABEL[user.role],
    departmentName: user.department?.name ?? null,
  });
}

async function ensurePartnerTenant() {
  return prisma.tenant.upsert({
    where: { id: "tenant_partner" },
    update: {},
    create: { id: "tenant_partner", name: "外部パートナー", type: "PARTNER" },
  });
}
