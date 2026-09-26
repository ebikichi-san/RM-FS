import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

export function getSupabasePublicConfig() {
  return { url: publicEnv.supabaseUrl, anonKey: publicEnv.supabaseAnonKey };
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const { url, anonKey } = getSupabasePublicConfig();
  if (!isSupabaseConfigured()) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required");
  }
  return createBrowserClient(url, anonKey);
}

export function createSupabaseAnonClient(): SupabaseClient {
  const { url, anonKey } = getSupabasePublicConfig();
  if (!isSupabaseConfigured()) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required");
  }
  return createClient(url, anonKey);
}
