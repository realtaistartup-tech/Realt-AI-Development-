/**
 * Third-party sign-in providers. Supabase is the OAuth intermediary — the
 * app never talks to Google/Microsoft/Apple directly, only calls
 * `supabase.auth.signInWithOAuth({ provider })`; the actual client
 * ID/secret for each provider is configured in the Supabase Dashboard
 * (Authentication → Providers), not in this codebase.
 *
 * Each provider only shows up in the UI once its own env flag is set to
 * "true" — flipping the flag is a deliberate, explicit step (not inferred
 * from Supabase config, which this app has no way to introspect), so a
 * provider is never presented as available before someone has actually
 * finished configuring it end-to-end. This is why Apple can be added later
 * with a single new entry here plus one new env flag — no restructuring.
 */
export type SupabaseOAuthProvider = "google" | "azure" | "apple";

export interface OAuthProviderDefinition {
  /** Supabase's own provider identifier, passed to signInWithOAuth(). */
  id: SupabaseOAuthProvider;
  /** i18n key under account.dialog.continueWith.* */
  labelKey: "google" | "microsoft" | "apple";
  enabled: boolean;
}

export const OAUTH_PROVIDERS: OAuthProviderDefinition[] = [
  {
    id: "google",
    labelKey: "google",
    enabled: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true",
  },
  {
    id: "azure", // Supabase's provider id for Microsoft / Entra ID is "azure"
    labelKey: "microsoft",
    enabled: process.env.NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED === "true",
  },
  // Apple: intentionally not implemented yet (requires a paid Apple
  // Developer account). Adding it later is exactly this:
  // { id: "apple", labelKey: "apple", enabled: process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true" },
];

export function getEnabledOAuthProviders(): OAuthProviderDefinition[] {
  return OAUTH_PROVIDERS.filter((provider) => provider.enabled);
}
