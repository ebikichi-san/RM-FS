export {
  DEV_EMAIL_COOKIE,
  DEV_EMAIL_STORAGE,
  decodeDevEmail,
  encodeDevEmail,
  emailFromCookieHeader,
  isDevAuthFallbackEnabled,
} from "@/lib/auth/dev-cookie";

export async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return { text: "", json: null as unknown };
  try {
    return { text, json: JSON.parse(text) as unknown };
  } catch {
    return { text, json: null as unknown };
  }
}

export function jsonErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const row = payload as Record<string, unknown>;
  const msg = row.msg ?? row.message ?? row.error_description ?? row.error;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}
