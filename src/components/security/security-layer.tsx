"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { ContentGuard } from "@/components/security/content-guard";
import { ConfidentialWatermark } from "@/components/security/watermark";
import { DEV_EMAIL_STORAGE } from "@/lib/auth/dev-cookie";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export function SecurityLayer({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const publicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/auth/"));
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const stored = window.localStorage.getItem(DEV_EMAIL_STORAGE);
    if (stored) setEmail(stored);

    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        const payload = (await res.json()) as { email?: string | null };
        if (!mounted) return;
        const userEmail = payload.email ?? stored ?? null;
        setEmail(userEmail);
        if (userEmail) {
          window.localStorage.setItem(DEV_EMAIL_STORAGE, userEmail);
        } else {
          window.localStorage.removeItem(DEV_EMAIL_STORAGE);
        }
        setReady(true);
        if (userEmail && publicPage && pathname === "/login") {
          const next = new URLSearchParams(window.location.search).get("next") ?? "/";
          router.replace(next.startsWith("/") ? next : "/");
          return;
        }
        if (!userEmail && !publicPage) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setReady(true);
        if (!stored && !publicPage) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      });
    return () => {
      mounted = false;
    };
  }, [pathname, publicPage, router]);

  if (!ready && !email) {
    return <p className="p-6 text-slate-400">認証を確認しています…</p>;
  }

  if (publicPage && !email) {
    return (
      <ContentGuard>
        <ConfidentialWatermark email={null} />
        {children}
      </ContentGuard>
    );
  }

  if (!email) {
    return <p className="p-6 text-slate-400">ログイン画面へ移動します…</p>;
  }

  if (publicPage) {
    return (
      <ContentGuard>
        <ConfidentialWatermark email={email} />
        {children}
      </ContentGuard>
    );
  }

  return (
    <ContentGuard>
      <ConfidentialWatermark email={email} />
      <AppHeader authEmail={email} />
      {children}
    </ContentGuard>
  );
}
