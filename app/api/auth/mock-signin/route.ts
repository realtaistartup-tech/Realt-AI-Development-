import { NextResponse } from "next/server";

import { mockSignInRequestSchema } from "@/lib/validation";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { createSessionCookieValue, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { getAccountRepository } from "@/services/persistence";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

/**
 * Mock authentication: no password, no verification email actually sent.
 * Entering an email immediately signs in, creating the mock account on
 * first use. This stands in for a real passwordless flow (e.g. Supabase
 * Auth's email OTP/magic link) — deliberately the same UX shape, so
 * swapping in the real thing later doesn't change how a user signs in,
 * only what happens on the server while they wait.
 */
export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const { allowed } = await checkRateLimit(`auth:${clientKey}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = mockSignInRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const account = await getAccountRepository().findOrCreateByEmail(parsed.data.email);

  const response = NextResponse.json({ account: { id: account.id, email: account.email } });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(account.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
