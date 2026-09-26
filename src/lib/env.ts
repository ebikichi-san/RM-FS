function trim(value: string | undefined) {
  return value?.trim() ?? "";
}

export const publicEnv = {
  appName: trim(process.env.NEXT_PUBLIC_APP_NAME) || "RM-FS",
  siteUrl: trim(process.env.NEXT_PUBLIC_SITE_URL),
  supabaseUrl: trim(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  accessAdminName: trim(process.env.NEXT_PUBLIC_ACCESS_ADMIN_NAME) || "エビキチ",
};

export const serverEnv = {
  databaseUrl: trim(process.env.DATABASE_URL),
  supabaseServiceRoleKey: trim(process.env.SUPABASE_SERVICE_ROLE_KEY),
  adminEmail: trim(process.env.ADMIN_EMAIL),
};

export function isSupabaseConfigured() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

export function siteOrigin(requestUrl: string) {
  return publicEnv.siteUrl || new URL(requestUrl).origin;
}
