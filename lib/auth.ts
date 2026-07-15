import { cookies } from "next/headers";

import { readAccountIdFromCookieValue, SESSION_COOKIE_NAME } from "./session";

/**
 * Resolves the signed-in mock account id (if any) from the request's
 * session cookie. Server-only — used by route handlers that require a
 * signed-in account (app/api/saved-searches/*, app/api/auth/me).
 */
export async function getSessionAccountId(): Promise<string | null> {
  const cookieStore = await cookies();
  return readAccountIdFromCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}
