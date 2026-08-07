/**
 * Real Supabase Auth requires two PUBLIC (browser-safe) values: the project
 * URL and the anon/publishable key. Neither is a secret — the anon key is
 * designed to be shipped to the browser and is what every Supabase Auth
 * call (sign up, sign in, OAuth redirect) goes through. This is a
 * completely separate pair from SUPABASE_URL/SUPABASE_SECRET_KEY (see
 * services/persistence/supabase/client.ts), which stays server-only and is
 * used only for direct database access, bypassing RLS. Auth verifies who
 * someone is; the secret-key client is what's still trusted to read/write
 * their data — that split is intentional, not an oversight.
 */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getAuthConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must both be set to use Supabase Auth.",
    );
  }
  return { url, anonKey };
}
