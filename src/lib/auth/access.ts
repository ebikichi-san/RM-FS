import { ACCESS_ADMIN_NAME, capabilities } from "@/lib/auth/roles";

export function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

export function isAccessAdmin(input: { displayName?: string | null; role?: string | null; email?: string | null }) {
  const name = (input.displayName ?? "").trim();
  if (name === ACCESS_ADMIN_NAME) return true;
  if (input.role === "SYSTEM_ADMIN") return true;
  const email = normalizeEmail(input.email);
  const local = email.split("@")[0] ?? "";
  return local === ACCESS_ADMIN_NAME.toLowerCase();
}

export function withAccessAdmin(caps: ReturnType<typeof capabilities>, viewer: Parameters<typeof isAccessAdmin>[0]) {
  return {
    ...caps,
    canManageAccess: isAccessAdmin(viewer),
  };
}
