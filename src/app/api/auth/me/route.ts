import { NextResponse } from "next/server";
import {
  DEV_EMAIL_COOKIE,
  emailFromCookieHeader,
  encodeDevEmail,
} from "@/lib/auth/dev-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function setSessionCookie(res: NextResponse, email: string | null) {
  res.cookies.set({
    name: DEV_EMAIL_COOKIE,
    value: email ? encodeDevEmail(email) : "",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: email ? 60 * 60 * 12 : 0,
  });
}

export async function GET(request: Request) {
  const email = emailFromCookieHeader(request.headers.get("cookie"));
  return NextResponse.json({
    email,
    source: email ? "dev" : null,
  });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, null);
  return res;
}

export async function POST(request: Request) {
  const cookieEmail = emailFromCookieHeader(request.headers.get("cookie"));
  return NextResponse.json({
    email: cookieEmail,
    source: cookieEmail ? "dev" : null,
  });
}
