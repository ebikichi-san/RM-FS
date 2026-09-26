import { createClient } from "@supabase/supabase-js";
import { isDevAuthFallbackEnabled, jsonErrorMessage, readJsonSafe } from "@/lib/auth/dev-session";
import { getSupabasePublicConfig } from "@/lib/supabase/client";

type OtpAttempt = {
  method: string;
  status: number;
  body: unknown;
};

function failResult(attempts: OtpAttempt[], message: string) {
  return {
    ok: false as const,
    error: "SUPABASE_OTP_FAILED",
    message,
    attempts,
    fallbackAvailable: isDevAuthFallbackEnabled(),
  };
}

function isRateLimited(status: number, body: unknown) {
  if (status === 429) return true;
  const code =
    body && typeof body === "object"
      ? String((body as { code?: unknown; error_code?: unknown }).error_code ?? (body as { code?: unknown }).code ?? "")
      : "";
  const msg = jsonErrorMessage(body, "").toLowerCase();
  return code.includes("rate_limit") || msg.includes("rate limit");
}

export async function sendSupabaseLoginEmail(email: string, redirectTo: string) {
  const { url, anonKey } = getSupabasePublicConfig();
  if (!url || !anonKey) {
    console.error("[auth.otp] missing supabase env", {
      hasUrl: Boolean(url),
      hasKey: Boolean(anonKey),
      keyPrefix: anonKey.slice(0, 16),
    });
    return {
      ok: false as const,
      error: "SUPABASE_ENV_MISSING",
      message: "Supabase の URL または匿名キーが設定されていません。",
      fallbackAvailable: isDevAuthFallbackEnabled(),
    };
  }

  const attempts: OtpAttempt[] = [];

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
    });
    if (!error) {
      console.info("[auth.otp] supabase-js signInWithOtp succeeded", { email });
      return { ok: true as const, method: "supabase-js" };
    }
    const failed = { message: error.message, code: error.code, status: error.status };
    attempts.push({ method: "supabase-js", status: error.status ?? 0, body: failed });
    console.warn("[auth.otp] supabase-js signInWithOtp failed", failed);
    if (isRateLimited(error.status ?? 0, failed)) {
      return failResult(attempts, "メール送信の上限に達しています。しばらく待つか、開発用ログインを使ってください。");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    attempts.push({ method: "supabase-js", status: 0, body: { message } });
    console.warn("[auth.otp] supabase-js threw", err);
    if (message.toLowerCase().includes("rate limit")) {
      return failResult(attempts, "メール送信の上限に達しています。しばらく待つか、開発用ログインを使ってください。");
    }
  }

  const endpoints = [
    {
      method: "otp",
      href: `${url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`,
      body: { email, create_user: true },
    },
    {
      method: "magiclink",
      href: `${url}/auth/v1/magiclink?redirect_to=${encodeURIComponent(redirectTo)}`,
      body: { email },
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint.href, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(endpoint.body),
      });
      const parsed = await readJsonSafe(res);
      const body = parsed.json ?? parsed.text;
      attempts.push({ method: endpoint.method, status: res.status, body });
      console.info("[auth.otp] gotrue response", { method: endpoint.method, status: res.status, body });
      if (res.ok) return { ok: true as const, method: endpoint.method };
      if (isRateLimited(res.status, body)) {
        return failResult(attempts, "メール送信の上限に達しています。しばらく待つか、開発用ログインを使ってください。");
      }
    } catch (err) {
      attempts.push({
        method: endpoint.method,
        status: 0,
        body: { message: err instanceof Error ? err.message : String(err) },
      });
      console.warn("[auth.otp] gotrue fetch threw", endpoint.method, err);
    }
  }

  return failResult(
    attempts,
    jsonErrorMessage(
      attempts.at(-1)?.body,
      "Magic Link / OTP の送信に失敗しました。Supabase の Authentication で Email プロバイダと Redirect URLs（http://localhost:3000/**）を有効にしてください。",
    ),
  );
}
