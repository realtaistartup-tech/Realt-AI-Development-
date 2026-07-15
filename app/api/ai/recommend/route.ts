import { NextResponse } from "next/server";

import { recommendationRequestSchema } from "@/lib/validation";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { getPropertyRepository } from "@/services/persistence";
import { detectPriorityConflicts, rankProperties } from "@/services/matching/score-engine";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const { allowed } = await checkRateLimit(`recommend:${clientKey}`, RATE_LIMIT, RATE_WINDOW_MS);
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

  const parsed = recommendationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { priorities } = parsed.data;
  const properties = await getPropertyRepository().listAll();
  const conflicts = detectPriorityConflicts(priorities);
  const results = rankProperties(properties, priorities);

  return NextResponse.json({ results, conflicts }, { status: 200 });
}
