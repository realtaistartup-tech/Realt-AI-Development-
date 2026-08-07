import type { Account, Property, SavedSearch, UserPriorities } from "@/types";

export interface AccountRepository {
  /**
   * Resolves the app's own `accounts` row for a real Supabase Auth user.
   * Three cases, in order: (1) already linked — the common case for every
   * sign-in after the first; (2) a pre-existing account row with this email
   * but no `authUserId` yet — the one-time migration-backfill case for
   * anyone who used the old mock-auth system, linked rather than
   * duplicated; (3) neither exists — a genuinely new account is created.
   */
  findOrCreateByAuthUser(authUserId: string, email: string): Promise<Account>;
  findById(id: string): Promise<Account | null>;
  getPreferences(id: string): Promise<UserPriorities | null>;
  updatePreferences(id: string, preferences: UserPriorities): Promise<void>;
}

export interface SavedSearchRepository {
  create(accountId: string, priorities: UserPriorities): Promise<SavedSearch>;
  listByAccount(accountId: string): Promise<SavedSearch[]>;
  findById(id: string): Promise<SavedSearch | null>;
  delete(id: string, accountId: string): Promise<boolean>;
}

export interface PropertyRepository {
  listAll(): Promise<Property[]>;
}
