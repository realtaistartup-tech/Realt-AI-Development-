import { MockAccountRepository } from "./mock/account-repository";
import { MockPropertyRepository } from "./mock/property-repository";
import { MockSavedSearchRepository } from "./mock/saved-search-repository";
import type { AccountRepository, PropertyRepository, SavedSearchRepository } from "./types";

export type { AccountRepository, PropertyRepository, SavedSearchRepository };

/**
 * Every repository is mocked in-memory for now — no Supabase project is
 * connected yet (see docs/roadmap-v1.md item #5). Each getter below is the
 * single place a real implementation gets swapped in later; nothing that
 * calls these functions needs to know or care which backend is behind
 * them, matching the same pattern used for AI (services/ai) and rate
 * limiting (lib/rate-limit).
 *
 * Singletons, not re-created per call, so data survives across requests
 * within this server process — but only within this process. It does not
 * survive a restart and does not coordinate across multiple instances.
 * That is the correct, honest limitation of a mock; real persistence is
 * what Supabase integration replaces this with.
 */
let accountRepository: AccountRepository | undefined;
export function getAccountRepository(): AccountRepository {
  if (!accountRepository) accountRepository = new MockAccountRepository();
  return accountRepository;
}

let savedSearchRepository: SavedSearchRepository | undefined;
export function getSavedSearchRepository(): SavedSearchRepository {
  if (!savedSearchRepository) savedSearchRepository = new MockSavedSearchRepository();
  return savedSearchRepository;
}

let propertyRepository: PropertyRepository | undefined;
export function getPropertyRepository(): PropertyRepository {
  if (!propertyRepository) propertyRepository = new MockPropertyRepository();
  return propertyRepository;
}
