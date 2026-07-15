import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "realt_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * This is a lightweight signed-cookie session for the current mock
 * authentication (see services/persistence and app/api/auth/*) — not a
 * substitute for real session management. It exists so a client can't
 * simply set `realt_session=<any-account-id>` and impersonate another mock
 * account; it is not a replacement for what Supabase Auth (or similar)
 * will provide once real accounts exist: password/OTP verification, token
 * rotation, revocation, and so on.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    console.error(
      "SESSION_SECRET is not set in production. Falling back to an insecure " +
        "development secret — sessions are not trustworthy until this is fixed.",
    );
  }
  return "dev-only-insecure-session-secret-do-not-use-in-production";
}

function sign(value: string): string {
  const signature = createHmac("sha256", getSecret()).update(value).digest("base64url");
  return `${value}.${signature}`;
}

function verify(signedValue: string): string | null {
  const separatorIndex = signedValue.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const value = signedValue.slice(0, separatorIndex);
  const providedSignature = signedValue.slice(separatorIndex + 1);
  const expectedSignature = createHmac("sha256", getSecret()).update(value).digest("base64url");

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }
  return value;
}

export function createSessionCookieValue(accountId: string): string {
  return sign(accountId);
}

export function readAccountIdFromCookieValue(cookieValue: string | undefined | null): string | null {
  if (!cookieValue) return null;
  return verify(cookieValue);
}
