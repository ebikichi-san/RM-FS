import { NextResponse } from "next/server";
import { z } from "zod";
import { isAccessAdmin, normalizeEmail } from "@/lib/auth/access";
import { resolveViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const viewer = await resolveViewer(request);
  if (!isAccessAdmin(viewer)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const grants = await prisma.accessGrant.findMany({ orderBy: { email: "asc" } });
  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    orderBy: { displayName: "asc" },
    select: { id: true, email: true, displayName: true, accessEnabled: true, role: true },
  });
  return NextResponse.json({ grants, users });
}

export async function POST(request: Request) {
  const viewer = await resolveViewer(request);
  if (!isAccessAdmin(viewer)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = z
    .object({
      email: z.string().email(),
      label: z.string().trim().max(80).optional(),
      enabled: z.boolean().optional(),
    })
    .parse(await request.json());
  const email = normalizeEmail(body.email);
  const grant = await prisma.accessGrant.upsert({
    where: { email },
    update: { label: body.label, enabled: body.enabled ?? true },
    create: { email, label: body.label, enabled: body.enabled ?? true },
  });
  return NextResponse.json(grant);
}

export async function PATCH(request: Request) {
  const viewer = await resolveViewer(request);
  if (!isAccessAdmin(viewer)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = z
    .object({
      email: z.string().email().optional(),
      userId: z.string().min(1).optional(),
      enabled: z.boolean(),
    })
    .parse(await request.json());
  if (body.userId) {
    const user = await prisma.user.update({
      where: { id: body.userId },
      data: { accessEnabled: body.enabled },
    });
    if (user.email) {
      await prisma.accessGrant.upsert({
        where: { email: normalizeEmail(user.email) },
        update: { enabled: body.enabled, label: user.displayName },
        create: { email: normalizeEmail(user.email), enabled: body.enabled, label: user.displayName },
      });
    }
    return NextResponse.json({ ok: true, userId: user.id, enabled: user.accessEnabled });
  }
  if (!body.email) {
    return NextResponse.json({ error: "EMAIL_OR_USER_REQUIRED" }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  const grant = await prisma.accessGrant.upsert({
    where: { email },
    update: { enabled: body.enabled },
    create: { email, enabled: body.enabled },
  });
  await prisma.user.updateMany({ where: { email }, data: { accessEnabled: body.enabled } });
  return NextResponse.json(grant);
}
