import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

let cached: SupabaseClient | null | undefined;

export function createSupabaseDataClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = publicEnv.supabaseUrl;
  const key = serverEnv.supabaseServiceRoleKey || publicEnv.supabaseAnonKey;
  if (!url || !key) {
    cached = null;
    return cached;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
