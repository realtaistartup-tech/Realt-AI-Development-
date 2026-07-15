import { NextResponse } from "next/server";

import { saveSearchRequestSchema } from "@/lib/validation";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { getSessionAccountId } from "@/lib/auth";
import { getSavedSearchRepository } from "@/services/persistence";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const savedSearches = await getSavedSearchRepository().listByAccount(accountId);
  return NextResponse.json({ savedSearches });
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const { allowed } = await checkRateLimit(
    `saved-searches:${clientKey}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

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

  const parsed = saveSearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const savedSearch = await getSavedSearchRepository().create(accountId, parsed.data.priorities);
  return NextResponse.json({ savedSearch }, { status: 201 });
}
