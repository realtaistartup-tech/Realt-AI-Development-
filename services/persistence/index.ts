import { MockAccountRepository } from "./mock/account-repository";
import { MockPropertyRepository } from "./mock/property-repository";
import { MockSavedSearchRepository } from "./mock/saved-search-repository";
import { SupabaseAccountRepository } from "./supabase/account-repository";
import { SupabaseSavedSearchRepository } from "./supabase/saved-search-repository";
import { isSupabaseConfigured } from "./supabase/client";
import type { AccountRepository, PropertyRepository, SavedSearchRepository } from "./types";

export type { AccountRepository, PropertyRepository, SavedSearchRepository };

/**
 * Accounts and saved searches switch to real Supabase-backed repositories
 * automatically the moment SUPABASE_URL and SUPABASE_SECRET_KEY are both
 * set (see supabase/migrations/0001_init.sql and docs/supabase-setup.md
 * for the one-time setup) — no code changes required, matching the same
 * pattern used for AI (services/ai) and rate limiting (lib/rate-limit).
 * Without those two variables, both fall back to the in-memory mocks,
 * which is what runs in any environment that hasn't configured Supabase.
 *
 * Property data is a deliberate exception: it stays on the mock
 * implementation regardless of Supabase configuration, because there is
 * no real Swedish listings source connected yet (see docs/roadmap-v1.md
 * item #8) — wiring a Supabase properties table now would encode a schema
 * for data that doesn't exist yet, likely to be wrong once a real vendor
 * is chosen.
 */
let accountRepository: AccountRepository | undefined;
export function getAccountRepository(): AccountRepository {
  if (!accountRepository) {
    accountRepository = isSupabaseConfigured()
      ? new SupabaseAccountRepository()
      : new MockAccountRepository();
  }
  return accountRepository;
}

let savedSearchRepository: SavedSearchRepository | undefined;
export function getSavedSearchRepository(): SavedSearchRepository {
  if (!savedSearchRepository) {
    savedSearchRepository = isSupabaseConfigured()
      ? new SupabaseSavedSearchRepository()
      : new MockSavedSearchRepository();
  }
  return savedSearchRepository;
}

let propertyRepository: PropertyRepository | undefined;
export function getPropertyRepository(): PropertyRepository {
  if (!propertyRepository) propertyRepository = new MockPropertyRepository();
  return propertyRepository;
}
