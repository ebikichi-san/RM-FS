export const DEV_EMAIL_COOKIE = "rmfs_dev_email";
export const DEV_EMAIL_STORAGE = "rmfs_auth_email";

export function isDevAuthFallbackEnabled() {
  if (process.env.NODE_ENV === "production") {
    return process.env.AUTH_DEV_FALLBACK === "true";
  }
  return (
    process.env.AUTH_DEV_FALLBACK !== "false" &&
    process.env.NEXT_PUBLIC_AUTH_DEV_FALLBACK !== "false"
  );
}

export function encodeDevEmail(email: string) {
  return encodeURIComponent(email.trim().toLowerCase());
}

export function decodeDevEmail(value?: string | null) {
  if (!value) return null;
  let current = value.trim();
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(current.replace(/\+/g, " "));
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current.toLowerCase() || null;
}

export function emailFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${DEV_EMAIL_COOKIE}=([^;]+)`));
  return decodeDevEmail(match?.[1] ?? null);
}
