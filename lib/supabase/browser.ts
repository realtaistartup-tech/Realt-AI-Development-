"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthConfig } from "./config";

let client: SupabaseClient | undefined;

/**
 * Browser-side Supabase Auth client — used for sign up, sign in, OAuth
 * redirects, sign out, and password reset requests, all initiated directly
 * from the client (this is Supabase Auth's documented pattern; the anon
 * key is safe here). It never touches application data tables — that stays
 * server-only via services/persistence/supabase/client.ts.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;
  const { url, anonKey } = getAuthConfig();
  client = createBrowserClient(url, anonKey);
  return client;
}
