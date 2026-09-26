import { NextResponse } from "next/server";
import { ensureDemoWorkspace } from "@/lib/bootstrap";
import { resolveViewer } from "@/lib/auth/viewer";
import { describeDepartmentMapping, SYSTEM_CATEGORY_LABELS } from "@/lib/catalog/departments";
import { prisma } from "@/lib/prisma";
import { departmentUpsertSchema } from "@/lib/validations/assessment";

export async function GET(request: Request) {
  await ensureDemoWorkspace();
  const viewer = await resolveViewer(request);
  const projectId = new URL(request.url).searchParams.get("projectId") ?? "demo";
  const project = await prisma.assessmentProject.findUnique({ where: { id: projectId } });
  const tenantId = project?.tenantId ?? viewer.tenantId;
  const departments = await prisma.departmentMaster.findMany({
    where: { tenantId },
    include: { users: { select: { id: true, displayName: true, role: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(
    departments.map((d) => ({
      ...d,
      categoryLabel: SYSTEM_CATEGORY_LABELS[d.systemCategory],
      memberCount: d.users.length,
      members: viewer.view === "partner" ? [] : d.users.map((u) => ({ id: u.id, displayName: u.displayName, role: u.role })),
      users: undefined,
    })),
  );
}

export async function POST(request: Request) {
  await ensureDemoWorkspace();
  const viewer = await resolveViewer(request);
  if (!viewer.capabilities.canEditDepartments) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const parsed = departmentUpsertSchema.parse(await request.json());
  const mapping = describeDepartmentMapping(parsed.name);
  const project = await prisma.assessmentProject.findUnique({
    where: { id: parsed.projectId },
  });
  if (!project) {
    return NextResponse.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });
  }
  const department = await prisma.departmentMaster.upsert({
    where: { tenantId_name: { tenantId: project.tenantId, name: mapping.name } },
    update: { systemCategory: mapping.systemCategory, isFreeText: mapping.isFreeText },
    create: {
      tenantId: project.tenantId,
      name: mapping.name,
      systemCategory: mapping.systemCategory,
      isFreeText: mapping.isFreeText,
    },
  });
  return NextResponse.json({
    ...department,
    categoryLabel: SYSTEM_CATEGORY_LABELS[department.systemCategory],
  });
}
