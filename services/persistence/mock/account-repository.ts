import { randomUUID } from "node:crypto";

import type { Account } from "@/types";
import type { AccountRepository } from "../types";

/**
 * In-memory mock standing in for a real Supabase-backed implementation.
 * Data lives only in this server process's memory and is lost on restart
 * or redeploy — correct for the current pre-launch phase with no real
 * users, and explicitly not durable persistence. Swapping in Supabase
 * later means implementing this same interface against real queries;
 * nothing that calls `getAccountRepository()` needs to change.
 */
export class MockAccountRepository implements AccountRepository {
  private readonly byEmail = new Map<string, Account>();
  private readonly byId = new Map<string, Account>();

  async findOrCreateByEmail(email: string): Promise<Account> {
    const normalized = email.trim().toLowerCase();
    const existing = this.byEmail.get(normalized);
    if (existing) return existing;

    const account: Account = {
      id: randomUUID(),
      email: normalized,
      createdAt: new Date().toISOString(),
    };
    this.byEmail.set(normalized, account);
    this.byId.set(account.id, account);
    return account;
  }

  async findById(id: string): Promise<Account | null> {
    return this.byId.get(id) ?? null;
  }
}
