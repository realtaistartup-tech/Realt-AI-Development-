import type { Account, UserPriorities } from "@/types";
import type { AccountRepository } from "../types";
import { getSupabaseClient } from "./client";

interface AccountRow {
  id: string;
  email: string;
  created_at: string;
}

interface PreferencesRow {
  preferences: UserPriorities | null;
}

const UNIQUE_VIOLATION = "23505";

function toAccount(row: AccountRow): Account {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export class SupabaseAccountRepository implements AccountRepository {
  async findOrCreateByAuthUser(authUserId: string, email: string): Promise<Account> {
    const normalized = email.trim().toLowerCase();
    const client = getSupabaseClient();

    // 1. Already linked — the common case for every sign-in after the first.
    const { data: linked, error: linkedError } = await client
      .from("accounts")
      .select("id, email, created_at")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (linkedError) {
      throw new Error(`Failed to look up account: ${linkedError.message}`);
    }
    if (linked) {
      return toAccount(linked as AccountRow);
    }

    // 2. A pre-existing row with this email but no auth_user_id yet — the
    // one-time migration-backfill case for anyone who used the old
    // mock-auth system. Link it rather than creating a duplicate, so their
    // existing saved searches (which FK to this row's id) stay intact.
    const { data: unlinked, error: unlinkedError } = await client
      .from("accounts")
      .select("id, email, created_at")
      .eq("email", normalized)
      .is("auth_user_id", null)
      .maybeSingle();
    if (unlinkedError) {
      throw new Error(`Failed to look up account: ${unlinkedError.message}`);
    }
    if (unlinked) {
      const { data: updated, error: updateError } = await client
        .from("accounts")
        .update({ auth_user_id: authUserId })
        .eq("id", (unlinked as AccountRow).id)
        .select("id, email, created_at")
        .single();
      if (updateError) {
        throw new Error(`Failed to link account: ${updateError.message}`);
      }
      return toAccount(updated as AccountRow);
    }

    // 3. Neither exists — a genuinely new account.
    const { data: created, error: insertError } = await client
      .from("accounts")
      .insert({ auth_user_id: authUserId, email: normalized })
      .select("id, email, created_at")
      .single();

    if (insertError) {
      // Two concurrent requests for the same brand-new user (e.g. a
      // double-submitted callback) can both reach this insert; the unique
      // index on auth_user_id rejects the loser, so fetch the row the
      // winner created instead of surfacing an error for what is, from the
      // caller's perspective, a completely normal case.
      if (insertError.code === UNIQUE_VIOLATION) {
        const { data: raceWinner, error: raceError } = await client
          .from("accounts")
          .select("id, email, created_at")
          .eq("auth_user_id", authUserId)
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

  async getPreferences(id: string): Promise<UserPriorities | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("accounts")
      .select("preferences")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load preferences: ${error.message}`);
    }
    return (data as PreferencesRow | null)?.preferences ?? null;
  }

  async updatePreferences(id: string, preferences: UserPriorities): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client.from("accounts").update({ preferences }).eq("id", id);

    if (error) {
      throw new Error(`Failed to save preferences: ${error.message}`);
    }
  }
}
