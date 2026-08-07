import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthConfig } from "./config";

/**
 * Server-side Supabase Auth client, bound to the request's cookies via the
 * `@supabase/ssr` adapter — this is what resolves "who is signed in" from
 * inside route handlers (see lib/auth.ts#getSessionAccountId). Uses the
 * anon key, same as the browser client: reading/verifying the current
 * user's own session doesn't need elevated privileges. Never uses
 * SUPABASE_SECRET_KEY — that stays reserved for the data-access client.
 *
 * The `setAll` write is wrapped in try/catch per Supabase's documented
 * pattern: it can be called from contexts (e.g. a Server Component render)
 * where Next.js doesn't allow mutating cookies, which is fine to ignore
 * there — every place this app actually needs to persist a refreshed
 * session is a route handler, where cookie writes are allowed.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = getAuthConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a context that can't set cookies (e.g. rendering a
          // Server Component) — safe to ignore, see doc comment above.
        }
      },
    },
  });
}
