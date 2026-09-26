import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decodeDevEmail, DEV_EMAIL_COOKIE, isDevAuthFallbackEnabled } from "@/lib/auth/dev-cookie";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

const PUBLIC_PREFIXES = ["/login", "/auth", "/api/access/request", "/api/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = publicEnv.supabaseUrl;
  const anonKey = publicEnv.supabaseAnonKey;
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  let user: { email?: string | null } | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (err) {
    console.warn("[middleware] supabase getUser failed", err);
  }
  const devEmail = isDevAuthFallbackEnabled()
    ? decodeDevEmail(request.cookies.get(DEV_EMAIL_COOKIE)?.value)
    : null;
  const signedIn = Boolean(user || devEmail);

  const { pathname } = request.nextUrl;
  if (!signedIn && !isPublicPath(pathname) && !pathname.startsWith("/_next")) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (signedIn && pathname === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }
  return response;
}
