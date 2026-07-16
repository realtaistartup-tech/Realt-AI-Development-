import type { Account } from "@/types";
import type { AccountRepository } from "../types";
import { getSupabaseClient } from "./client";

interface AccountRow {
  id: string;
  email: string;
  created_at: string;
}

const UNIQUE_VIOLATION = "23505";

function toAccount(row: AccountRow): Account {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export class SupabaseAccountRepository implements AccountRepository {
  async findOrCreateByEmail(email: string): Promise<Account> {
    const normalized = email.trim().toLowerCase();
    const client = getSupabaseClient();

    const { data: existing, error: selectError } = await client
      .from("accounts")
      .select("id, email, created_at")
      .eq("email", normalized)
      .maybeSingle();

    if (selectError) {
      throw new Error(`Failed to look up account: ${selectError.message}`);
    }
    if (existing) {
      return toAccount(existing as AccountRow);
    }

    const { data: created, error: insertError } = await client
      .from("accounts")
      .insert({ email: normalized })
      .select("id, email, created_at")
      .single();

    if (insertError) {
      // Two concurrent sign-ins for the same brand-new email can both reach
      // this insert; the unique constraint on email rejects the loser, so
      // fetch the row the winner created instead of surfacing an error for
      // what is, from the caller's perspective, a completely normal case.
      if (insertError.code === UNIQUE_VIOLATION) {
        const { data: raceWinner, error: raceError } = await client
          .from("accounts")
          .select("id, email, created_at")
          .eq("email", normalized)
          .single();
        if (raceError || !raceWinner) {
          throw new Error(`Failed to create account: ${insertError.message}`);
        }
        return toAccount(raceWinner as AccountRow);
      }
      throw new Error(`Failed to create account: ${insertError.message}`);
    }

    return toAccount(created as AccountRow);
  }

  async findById(id: string): Promise<Account | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("accounts")
      .select("id, email, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to look up account: ${error.message}`);
    }
    return data ? toAccount(data as AccountRow) : null;
  }
}
