import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { getSupabaseClient, isSupabaseConfigured } from "@/services/persistence/supabase/client";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  locale: z.string().max(10).optional(),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().optional(),
});

export async function POST(request: Request) {
  const { allowed } = await checkRateLimit(
    `waitlist:${getClientKey(request)}`,
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "The waitlist is not available right now." }, { status: 503 });
  }

  const { error } = await getSupabaseClient()
    .from("waitlist")
    .insert({ email: parsed.data.email, locale: parsed.data.locale ?? null });

  // 23505 = already on the list: treat as success, without revealing it.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
