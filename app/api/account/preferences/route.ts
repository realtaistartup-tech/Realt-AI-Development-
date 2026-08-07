import { NextResponse } from "next/server";

import { userPrioritiesSchema } from "@/lib/validation";
import { getSessionAccountId } from "@/lib/auth";
import { getAccountRepository } from "@/services/persistence";

/**
 * Durable, per-account storage for housing preferences — replaces relying
 * only on sessionStorage (hooks/use-priorities-store.ts, still used for the
 * anonymous onboarding-to-report handoff, which keeps working unchanged).
 * Not wired into any UI yet; that's the Settings > Housing Preferences
 * page, a later stage.
 */
export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const preferences = await getAccountRepository().getPreferences(accountId);
  return NextResponse.json({ preferences });
}

export async function PUT(request: Request) {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = userPrioritiesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await getAccountRepository().updatePreferences(accountId, parsed.data);
  return NextResponse.json({ ok: true });
}
