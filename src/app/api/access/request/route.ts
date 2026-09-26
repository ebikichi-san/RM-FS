import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/access";
import { ensureDemoWorkspace } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  await ensureDemoWorkspace();
  const body = z.object({ email: z.string().email() }).parse(await request.json());
  const email = normalizeEmail(body.email);
  const total = await prisma.accessGrant.count();
  if (total === 0) {
    return NextResponse.json({ allowed: true, bootstrap: true });
  }
  const grant = await prisma.accessGrant.findUnique({ where: { email } });
  if (!grant) {
    return NextResponse.json(
      { allowed: false, error: "このメールアドレスは招待されていません。管理者（エビキチ）に権限を申請してください。" },
      { status: 403 },
    );
  }
  if (!grant.enabled) {
    return NextResponse.json(
      { allowed: false, error: "このアカウントのアクセス権限は無効です。管理者（エビキチ）に確認してください。" },
      { status: 403 },
    );
  }
  const user = await prisma.user.findFirst({ where: { email } });
  if (user && user.accessEnabled === false) {
    return NextResponse.json(
      { allowed: false, error: "このアカウントのアクセス権限は無効です。管理者（エビキチ）に確認してください。" },
      { status: 403 },
    );
  }
  return NextResponse.json({ allowed: true });
}
