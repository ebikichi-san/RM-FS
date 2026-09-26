import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth/access";
import { ensureDemoWorkspace } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const loginDenied = new URL("/login", origin);
  loginDenied.searchParams.set("denied", "1");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(loginDenied);
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = normalizeEmail(user?.email);
    if (!email) return NextResponse.redirect(loginDenied);
    await ensureDemoWorkspace();
    const total = await prisma.accessGrant.count();
    const existing = await prisma.accessGrant.findUnique({ where: { email } });
    if (total === 0) {
      await prisma.accessGrant.create({
        data: { email, enabled: true, label: "初期管理者" },
      });
    } else if (!existing?.enabled) {
      await supabase.auth.signOut();
      return NextResponse.redirect(loginDenied);
    }
  }
  return NextResponse.redirect(new URL(next, origin));
}
