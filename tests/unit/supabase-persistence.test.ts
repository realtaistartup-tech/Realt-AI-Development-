import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These tests verify the repositories' own logic — result mapping, error
 * wrapping, the unique-violation race-condition fallback, ownership checks
 * on delete — against a mocked Supabase client. They cannot and do not
 * prove the live integration works against a real Supabase project; this
 * sandbox's network policy blocks outbound calls to supabase.co (see
 * docs/supabase-setup.md), so live verification is done by whoever runs
 * this against the real project.
 */

interface FakeResult {
  data: unknown;
  error: unknown;
}

class FakeQueryBuilder implements PromiseLike<FakeResult> {
  constructor(private readonly result: FakeResult) {}
  select() {
    return this;
  }
  eq() {
    return this;
  }
  is() {
    return this;
  }
  order() {
    return this;
  }
  insert() {
    return this;
  }
  update() {
    return this;
  }
  delete() {
    return this;
  }
  single() {
    return this;
  }
  maybeSingle() {
    return this;
  }
  then<TResult1 = FakeResult, TResult2 = never>(
    onfulfilled?: ((value: FakeResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

const mockFrom = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mockFrom }),
}));

async function loadRepositories() {
  const { SupabaseAccountRepository } = await import(
    "@/services/persistence/supabase/account-repository"
  );
  const { SupabaseSavedSearchRepository } = await import(
    "@/services/persistence/supabase/saved-search-repository"
  );
  return { SupabaseAccountRepository, SupabaseSavedSearchRepository };
}

describe("SupabaseAccountRepository", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
    process.env = { ...originalEnv, SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "secret" };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns the existing account when it's already linked to this auth user", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    mockFrom.mockReturnValueOnce(
      new FakeQueryBuilder({
        data: { id: "acc-1", email: "person@example.com", created_at: "2026-01-01T00:00:00Z" },
        error: null,
      }),
    );

    const repo = new SupabaseAccountRepository();
    const account = await repo.findOrCreateByAuthUser("auth-1", "Person@Example.com");

    expect(account).toEqual({ id: "acc-1", email: "person@example.com", createdAt: "2026-01-01T00:00:00Z" });
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("links a pre-existing (pre-migration) account by email instead of creating a duplicate", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    mockFrom
      .mockReturnValueOnce(new FakeQueryBuilder({ data: null, error: null })) // not linked by auth_user_id
      .mockReturnValueOnce(
        new FakeQueryBuilder({
          data: { id: "acc-legacy", email: "legacy@example.com", created_at: "2025-01-01T00:00:00Z" },
          error: null,
        }),
      ) // found by email, auth_user_id still null
      .mockReturnValueOnce(
        new FakeQueryBuilder({
          data: { id: "acc-legacy", email: "legacy@example.com", created_at: "2025-01-01T00:00:00Z" },
          error: null,
        }),
      ); // update: link it

    const repo = new SupabaseAccountRepository();
    const account = await repo.findOrCreateByAuthUser("auth-2", "legacy@example.com");

    expect(account.id).toBe("acc-legacy");
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  it("creates a new account when neither a linked row nor a pre-existing email row is found", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    mockFrom
      .mockReturnValueOnce(new FakeQueryBuilder({ data: null, error: null })) // not linked
      .mockReturnValueOnce(new FakeQueryBuilder({ data: null, error: null })) // no pre-existing email row
      .mockReturnValueOnce(
        new FakeQueryBuilder({
          data: { id: "acc-2", email: "new@example.com", created_at: "2026-01-02T00:00:00Z" },
          error: null,
        }),
      ); // insert

    const repo = new SupabaseAccountRepository();
    const account = await repo.findOrCreateByAuthUser("auth-3", "new@example.com");

    expect(account.id).toBe("acc-2");
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  it("falls back to reading the row on a concurrent unique-constraint race", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    mockFrom
      .mockReturnValueOnce(new FakeQueryBuilder({ data: null, error: null })) // not linked
      .mockReturnValueOnce(new FakeQueryBuilder({ data: null, error: null })) // no pre-existing email row
      .mockReturnValueOnce(
        new FakeQueryBuilder({ data: null, error: { code: "23505", message: "duplicate key" } }),
      ) // insert: lost the race
      .mockReturnValueOnce(
        new FakeQueryBuilder({
          data: { id: "acc-3", email: "race@example.com", created_at: "2026-01-03T00:00:00Z" },
          error: null,
        }),
      ); // re-select by auth_user_id: read the winner's row

    const repo = new SupabaseAccountRepository();
    const account = await repo.findOrCreateByAuthUser("auth-4", "race@example.com");

    expect(account.id).toBe("acc-3");
  });

  it("throws a descriptive error when the lookup fails for a non-race reason", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    mockFrom.mockReturnValueOnce(
      new FakeQueryBuilder({ data: null, error: { code: "500", message: "connection reset" } }),
    );

    const repo = new SupabaseAccountRepository();
    await expect(repo.findOrCreateByAuthUser("auth-5", "fails@example.com")).rejects.toThrow(
      /connection reset/,
    );
  });

  it("finds an account by id, and returns null when missing", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    mockFrom.mockReturnValueOnce(
      new FakeQueryBuilder({
        data: { id: "acc-4", email: "found@example.com", created_at: "2026-01-04T00:00:00Z" },
        error: null,
      }),
    );
    const repo = new SupabaseAccountRepository();
    expect(await repo.findById("acc-4")).toEqual({
      id: "acc-4",
      email: "found@example.com",
      createdAt: "2026-01-04T00:00:00Z",
    });

    mockFrom.mockReturnValueOnce(new FakeQueryBuilder({ data: null, error: null }));
    expect(await repo.findById("missing")).toBeNull();
  });

  it("reads stored preferences, and null when none are set", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    const preferences = {
      budgetMin: 2_000_000,
      budgetMax: 3_500_000,
      commuteMaxMinutes: 25,
      commuteMode: "transit" as const,
      minBedrooms: 2,
      minBathrooms: 1,
      mustHaves: [],
      dealBreakers: [],
      lifestyleTags: [],
      weights: [],
    };
    mockFrom.mockReturnValueOnce(new FakeQueryBuilder({ data: { preferences }, error: null }));
    const repo = new SupabaseAccountRepository();
    expect(await repo.getPreferences("acc-5")).toEqual(preferences);

    mockFrom.mockReturnValueOnce(new FakeQueryBuilder({ data: { preferences: null }, error: null }));
    expect(await repo.getPreferences("acc-6")).toBeNull();
  });

  it("writes preferences, and throws a descriptive error on failure", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    const repo = new SupabaseAccountRepository();
    const preferences = {
      budgetMin: 2_000_000,
      budgetMax: 3_500_000,
      commuteMaxMinutes: 25,
      commuteMode: "transit" as const,
      minBedrooms: 2,
      minBathrooms: 1,
      mustHaves: [],
      dealBreakers: [],
      lifestyleTags: [],
      weights: [],
    };

    mockFrom.mockReturnValueOnce(new FakeQueryBuilder({ data: null, error: null }));
    await expect(repo.updatePreferences("acc-5", preferences)).resolves.toBeUndefined();

    mockFrom.mockReturnValueOnce(
      new FakeQueryBuilder({ data: null, error: { message: "row not found" } }),
    );
    await expect(repo.updatePreferences("acc-missing", preferences)).rejects.toThrow(/row not found/);
  });
});

describe("SupabaseSavedSearchRepository", () => {
  const originalEnv = { ...process.env };
  const priorities = {
    budgetMin: 3_000_000,
    budgetMax: 5_000_000,
    commuteMaxMinutes: 30,
    commuteMode: "transit" as const,
    minBedrooms: 2,
    minBathrooms: 1,
    mustHaves: [],
    dealBreakers: [],
    lifestyleTags: [],
    weights: [],
  };

  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
    process.env = { ...originalEnv, SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "secret" };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("creates a saved search and maps the row back", async () => {
    const { SupabaseSavedSearchRepository } = await loadRepositories();
    mockFrom.mockReturnValueOnce(
      new FakeQueryBuilder({
        data: { id: "s-1", account_id: "acc-1", priorities, created_at: "2026-01-01T00:00:00Z" },
        error: null,
      }),
    );

    const repo = new SupabaseSavedSearchRepository();
    const saved = await repo.create("acc-1", priorities);

    expect(saved).toEqual({
      id: "s-1",
      accountId: "acc-1",
      priorities,
      createdAt: "2026-01-01T00:00:00Z",
    });
  });

  it("lists saved searches for an account", async () => {
    const { SupabaseSavedSearchRepository } = await loadRepositories();
    mockFrom.mockReturnValueOnce(
      new FakeQueryBuilder({
        data: [
          { id: "s-2", account_id: "acc-1", priorities, created_at: "2026-01-02T00:00:00Z" },
          { id: "s-1", account_id: "acc-1", priorities, created_at: "2026-01-01T00:00:00Z" },
        ],
        error: null,
      }),
    );

    const repo = new SupabaseSavedSearchRepository();
    const results = await repo.listByAccount("acc-1");

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("s-2");
  });

  it("deletes only when a row was actually removed", async () => {
    const { SupabaseSavedSearchRepository } = await loadRepositories();
    const repo = new SupabaseSavedSearchRepository();

    mockFrom.mockReturnValueOnce(new FakeQueryBuilder({ data: [{ id: "s-1" }], error: null }));
    expect(await repo.delete("s-1", "acc-1")).toBe(true);

    mockFrom.mockReturnValueOnce(new FakeQueryBuilder({ data: [], error: null }));
    expect(await repo.delete("s-1", "wrong-account")).toBe(false);
  });

  it("throws a descriptive error when the query fails", async () => {
    const { SupabaseSavedSearchRepository } = await loadRepositories();
    mockFrom.mockReturnValueOnce(
      new FakeQueryBuilder({ data: null, error: { message: "network error" } }),
    );
    const repo = new SupabaseSavedSearchRepository();
    await expect(repo.listByAccount("acc-1")).rejects.toThrow(/network error/);
  });
});
