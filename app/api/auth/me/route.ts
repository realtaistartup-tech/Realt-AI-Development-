import { NextResponse } from "next/server";

import { getSessionAccountId } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccountRepository } from "@/services/persistence";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Names live in the Supabase Auth user's metadata: email sign-up writes
 * first_name / last_name / display_name; Google/Microsoft/Apple provide
 * full_name or name, which we split on the first space.
 */
async function readNames() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    let firstName = text(meta.first_name) ?? text(meta.given_name);
    let lastName = text(meta.last_name) ?? text(meta.family_name);
    const full = text(meta.full_name) ?? text(meta.name);
    if (!firstName && full) {
      const [first, ...rest] = full.split(/\s+/);
      firstName = first ?? null;
      lastName = lastName ?? (rest.join(" ") || null);
    }
    return { firstName, lastName, displayName: text(meta.display_name) ?? firstName };
  } catch {
    return { firstName: null, lastName: null, displayName: null };
  }
}

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ account: null });
  }

  const account = await getAccountRepository().findById(accountId);
  if (!account) {
    return NextResponse.json({ account: null });
  }

  const names = await readNames();
  return NextResponse.json({ account: { id: account.id, email: account.email, ...names } });
}
