import { NextResponse } from "next/server";
import { resolveViewer } from "@/lib/auth/viewer";
import { describeDepartmentMapping, SYSTEM_CATEGORY_LABELS } from "@/lib/catalog/departments";
import { prisma } from "@/lib/prisma";
import { departmentPatchSchema } from "@/lib/validations/assessment";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const viewer = await resolveViewer(request);
  if (!viewer.capabilities.canEditDepartments) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const parsed = departmentPatchSchema.parse(await request.json());
  const mapping = describeDepartmentMapping(parsed.name);
  const current = await prisma.departmentMaster.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const clash = await prisma.departmentMaster.findFirst({
    where: {
      tenantId: current.tenantId,
      name: mapping.name,
      NOT: { id },
    },
  });
  if (clash) {
    return NextResponse.json({ error: "NAME_TAKEN" }, { status: 409 });
  }
  const department = await prisma.departmentMaster.update({
    where: { id },
    data: {
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
