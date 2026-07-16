import type { SavedSearch, UserPriorities } from "@/types";
import type { SavedSearchRepository } from "../types";
import { getSupabaseClient } from "./client";

interface SavedSearchRow {
  id: string;
  account_id: string;
  priorities: UserPriorities;
  created_at: string;
}

function toSavedSearch(row: SavedSearchRow): SavedSearch {
  return {
    id: row.id,
    accountId: row.account_id,
    priorities: row.priorities,
    createdAt: row.created_at,
  };
}

export class SupabaseSavedSearchRepository implements SavedSearchRepository {
  async create(accountId: string, priorities: UserPriorities): Promise<SavedSearch> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("saved_searches")
      .insert({ account_id: accountId, priorities })
      .select("id, account_id, priorities, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to save search: ${error.message}`);
    }
    return toSavedSearch(data as SavedSearchRow);
  }

  async listByAccount(accountId: string): Promise<SavedSearch[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("saved_searches")
      .select("id, account_id, priorities, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list saved searches: ${error.message}`);
    }
    return ((data as SavedSearchRow[] | null) ?? []).map(toSavedSearch);
  }

  async findById(id: string): Promise<SavedSearch | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("saved_searches")
      .select("id, account_id, priorities, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to look up saved search: ${error.message}`);
    }
    return data ? toSavedSearch(data as SavedSearchRow) : null;
  }

  async delete(id: string, accountId: string): Promise<boolean> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("saved_searches")
      .delete()
      .eq("id", id)
      .eq("account_id", accountId)
      .select("id");

    if (error) {
      throw new Error(`Failed to delete saved search: ${error.message}`);
    }
    return (data?.length ?? 0) > 0;
  }
}
