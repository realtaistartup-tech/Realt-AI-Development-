import { randomUUID } from "node:crypto";

import type { Account, UserPriorities } from "@/types";
import type { AccountRepository } from "../types";

/**
 * In-memory mock standing in for the real Supabase-backed implementation.
 * Data lives only in this server process's memory and is lost on restart
 * or redeploy — correct for local development without Supabase Auth
 * configured, and explicitly not durable persistence. Swapping in Supabase
 * later means implementing this same interface against real queries;
 * nothing that calls `getAccountRepository()` needs to change.
 */
export class MockAccountRepository implements AccountRepository {
  private readonly byAuthUserId = new Map<string, Account>();
  private readonly byEmail = new Map<string, Account>();
  private readonly byId = new Map<string, Account>();
  private readonly preferences = new Map<string, UserPriorities>();

  async findOrCreateByAuthUser(authUserId: string, email: string): Promise<Account> {
    const existingByAuthUser = this.byAuthUserId.get(authUserId);
    if (existingByAuthUser) return existingByAuthUser;

    const normalized = email.trim().toLowerCase();
    const preExistingByEmail = this.byEmail.get(normalized);
    if (preExistingByEmail) {
      const linked: Account = { ...preExistingByEmail };
      this.byAuthUserId.set(authUserId, linked);
      this.byEmail.set(normalized, linked);
      this.byId.set(linked.id, linked);
      return linked;
    }

    const account: Account = {
      id: randomUUID(),
      email: normalized,
      createdAt: new Date().toISOString(),
    };
    this.byAuthUserId.set(authUserId, account);
    this.byEmail.set(normalized, account);
    this.byId.set(account.id, account);
    return account;
  }

  async findById(id: string): Promise<Account | null> {
    return this.byId.get(id) ?? null;
  }

  async getPreferences(id: string): Promise<UserPriorities | null> {
    return this.preferences.get(id) ?? null;
  }

  async updatePreferences(id: string, preferences: UserPriorities): Promise<void> {
    this.preferences.set(id, preferences);
  }
}
