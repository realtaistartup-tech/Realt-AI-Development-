import { NextResponse } from "next/server";

import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { isAiConfigured } from "@/services/ai/client";
import { intakeTurnRequestSchema, lastIntakeError, runIntakeTurn } from "@/services/ai/intake-turn";

const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const { allowed } = await checkRateLimit(
    `intake:${getClientKey(request)}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = intakeTurnRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await runIntakeTurn(parsed.data);
  // null = no AI available; the client falls back to its built-in flow.
  return NextResponse.json(
    {
      result,
      configured: isAiConfigured(),
      ...(process.env.NODE_ENV !== "production" && !result ? { debug: lastIntakeError } : {}),
    },
    { status: 200 },
  );
}
