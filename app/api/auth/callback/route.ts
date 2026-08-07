import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for both OAuth sign-in and password-recovery links —
 * Supabase's PKCE flow uses the same `?code=` exchange for either. Lives
 * outside the `[locale]` segment (registered as the OAuth redirect URI in
 * Google/Microsoft/Supabase must be a fixed path), so `next` carries the
 * locale-aware destination the caller actually wants to land on.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  // Only ever redirect to a same-origin relative path — never let `next`
  // become an open redirect to an attacker-controlled URL.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?authError=1`);
}
