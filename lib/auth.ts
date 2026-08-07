import { isAuthConfigured } from "./supabase/config";
import { createSupabaseServerClient } from "./supabase/server";
import { getAccountRepository } from "@/services/persistence";

/**
 * Resolves the signed-in account id (if any) from the request's real
 * Supabase Auth session. Server-only — used by route handlers that require
 * a signed-in account (app/api/saved-searches/*, app/api/auth/me,
 * app/api/account/*).
 *
 * `supabase.auth.getUser()` re-validates the session against Supabase's
 * Auth server on every call (unlike `getSession()`, which only decodes the
 * local cookie) — the correct, documented way to authorize a request
 * server-side, not just read a locally-trusted value.
 *
 * Returns null (never throws) when Supabase Auth isn't configured, there's
 * no session, or the session is invalid/expired — callers already treat
 * null as "not signed in," so this keeps that exact contract regardless of
 * why there's no account.
 */
export async function getSessionAccountId(): Promise<string | null> {
  if (!isAuthConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;

  const account = await getAccountRepository().findOrCreateByAuthUser(user.id, user.email);
  return account.id;
}
