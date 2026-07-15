import type { Account, Property, SavedSearch, UserPriorities } from "@/types";

export interface AccountRepository {
  findOrCreateByEmail(email: string): Promise<Account>;
  findById(id: string): Promise<Account | null>;
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
