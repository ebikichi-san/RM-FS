"use client";

import { FormEvent, useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEV_EMAIL_STORAGE } from "@/lib/auth/dev-cookie";

type OtpResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  fallbackAvailable?: boolean;
  attempts?: unknown;
  method?: string;
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "denied" | "error">("idle");
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [fallbackAvailable, setFallbackAvailable] = useState(false);

  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("denied") === "1") {
      setStatus("denied");
      setMessage("アクセス権限が無効か、招待されていません。");
    }
    const next = params.get("next");
    setNextPath(next && next.startsWith("/") ? next : "/");
  }, []);

  async function readJson(res: Response) {
    const text = await res.text();
    if (!text) return {} as OtpResponse;
    try {
      return JSON.parse(text) as OtpResponse;
    } catch {
      return { message: text } as OtpResponse;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    setDetail("");
    const normalized = email.trim().toLowerCase();
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, next }),
      });
      const payload = await readJson(res);
      setFallbackAvailable(Boolean(payload.fallbackAvailable) || process.env.NEXT_PUBLIC_AUTH_DEV_FALLBACK === "true");
      if (payload.attempts) {
        console.warn("[login] supabase otp attempts", payload.attempts);
      }
      if (!res.ok || !payload.ok) {
        setStatus(payload.error === "NOT_INVITED" ? "denied" : "error");
        setMessage(payload.message ?? "送信に失敗しました。");
        if (payload.error) setDetail(`code: ${payload.error}`);
        return;
      }
      setStatus("sent");
      setMessage(
        `招待メールを送信しました（${payload.method ?? "otp"}）。メール内のリンクからログインしてください。`,
      );
    } catch (err) {
      console.error("[login] submit failed", err);
      setStatus("error");
      setMessage("送信に失敗しました。ネットワークまたはサーバーログを確認してください。");
      setDetail(err instanceof Error ? err.message : String(err));
      setFallbackAvailable(true);
    }
  }

  const showFallback =
    process.env.NODE_ENV !== "production"
      ? process.env.NEXT_PUBLIC_AUTH_DEV_FALLBACK === "true" ||
        (fallbackAvailable && status === "error")
      : fallbackAvailable && status === "error";

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-8 flex items-center gap-2 font-semibold">
        <Shield className="h-5 w-5 text-sky-400" />
        RM-FS
      </div>
      <Card className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">招待制ログイン</h1>
          <p className="mt-2 text-sm text-slate-400">
            管理者から招待されたメールアドレスに、ログイン用のリンクを送信します。
          </p>
        </div>
        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm">
            メールアドレス
            <input
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <Button type="submit" className="w-full" disabled={status === "sending" || !email.trim()}>
            {status === "sending" ? "送信中…" : "ログインリンクを送る"}
          </Button>
        </form>
        {message ? (
          <p className={`text-sm ${status === "sent" ? "text-sky-300" : "text-rose-300"}`}>{message}</p>
        ) : null}
        {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
        {showFallback ? (
          <form
            method="POST"
            action="/api/auth/dev"
            className="space-y-2"
            onSubmit={() => {
              const normalized = email.trim().toLowerCase();
              if (normalized) window.localStorage.setItem(DEV_EMAIL_STORAGE, normalized);
            }}
          >
            <input type="hidden" name="email" value={email.trim().toLowerCase()} />
            <input type="hidden" name="next" value={nextPath} />
            <Button type="submit" variant="outline" className="w-full" disabled={!email.trim()}>
              開発用にこのメールで入る
            </Button>
          </form>
        ) : null}
      </Card>
    </main>
  );
}
