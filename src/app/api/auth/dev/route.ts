import { NextResponse } from "next/server";
import {
  decodeDevEmail,
  DEV_EMAIL_COOKIE,
  encodeDevEmail,
  isDevAuthFallbackEnabled,
} from "@/lib/auth/dev-cookie";
import { siteOrigin } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function setSessionCookie(res: NextResponse, email: string | null) {
  res.cookies.set({
    name: DEV_EMAIL_COOKIE,
    value: email ? encodeDevEmail(email) : "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: email ? 60 * 60 * 12 : 0,
  });
}

function parseEmail(raw: string) {
  const decoded = decodeDevEmail(raw) ?? raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded)) return null;
  return decoded;
}

async function readLoginBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { email?: string; next?: string };
    return { email: parseEmail(String(body.email ?? "")), next: body.next ?? "/", isForm: false };
  }
  const form = await request.formData();
  return {
    email: parseEmail(String(form.get("email") ?? "")),
    next: String(form.get("next") ?? "/"),
    isForm: true,
  };
}

export async function GET() {
  return NextResponse.json({ ok: true, expect: "POST", path: "/api/auth/dev" });
}

export async function POST(request: Request) {
  if (!isDevAuthFallbackEnabled()) {
    return NextResponse.json({ error: "DEV_FALLBACK_DISABLED" }, { status: 403 });
  }

  let email: string | null = null;
  let next = "/";
  let isForm = false;
  try {
    const parsed = await readLoginBody(request);
    email = parsed.email;
    next = parsed.next.startsWith("/") ? parsed.next : "/";
    isForm = parsed.isForm;
  } catch (err) {
    console.error("[api.auth.dev] invalid body", err);
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }

  const origin = siteOrigin(request.url);
  if (isForm) {
    const res = NextResponse.redirect(new URL(next, origin), 303);
    setSessionCookie(res, email);
    return res;
  }

  const res = NextResponse.json({ ok: true, email, mode: "dev", next });
  setSessionCookie(res, email);
  return res;
}
