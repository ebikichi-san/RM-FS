import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/access";
import { sendSupabaseLoginEmail } from "@/lib/auth/send-login-email";
import { prisma } from "@/lib/prisma";
import { ensureDemoWorkspace } from "@/lib/bootstrap";
import { siteOrigin } from "@/lib/env";

export async function POST(request: Request) {
  const body = z.object({ email: z.string().email(), next: z.string().optional() }).parse(await request.json());
  const email = normalizeEmail(body.email);
  await ensureDemoWorkspace();
  const total = await prisma.accessGrant.count();
  if (total > 0) {
    const grant = await prisma.accessGrant.findUnique({ where: { email } });
    if (!grant?.enabled) {
      return NextResponse.json(
        {
          ok: false,
          error: "NOT_INVITED",
          message: "このメールアドレスは招待されていないか、アクセスが無効です。",
        },
        { status: 403 },
      );
    }
  }

  const origin = siteOrigin(request.url);
  const nextPath = body.next && body.next.startsWith("/") ? body.next : "/";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const result = await sendSupabaseLoginEmail(email, redirectTo);
  if (!result.ok) {
    console.error("[api.auth.otp] failed", { email, result });
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json({ ok: true, method: result.method });
}
