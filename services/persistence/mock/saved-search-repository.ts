import { randomUUID } from "node:crypto";

import type { SavedSearch, UserPriorities } from "@/types";
import type { SavedSearchRepository } from "../types";

/**
 * In-memory mock — see the comment on MockAccountRepository for why, and
 * what changes when a real Supabase-backed implementation replaces this.
 */
export class MockSavedSearchRepository implements SavedSearchRepository {
  private readonly byId = new Map<string, SavedSearch>();

  async create(accountId: string, priorities: UserPriorities): Promise<SavedSearch> {
    const savedSearch: SavedSearch = {
      id: randomUUID(),
      accountId,
      priorities,
      createdAt: new Date().toISOString(),
    };
    this.byId.set(savedSearch.id, savedSearch);
    return savedSearch;
  }

  async listByAccount(accountId: string): Promise<SavedSearch[]> {
    return [...this.byId.values()]
      .filter((search) => search.accountId === accountId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string): Promise<SavedSearch | null> {
    return this.byId.get(id) ?? null;
  }

  async delete(id: string, accountId: string): Promise<boolean> {
    const existing = this.byId.get(id);
    if (!existing || existing.accountId !== accountId) return false;
    this.byId.delete(id);
    return true;
  }
}
