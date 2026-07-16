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
  order() {
    return this;
  }
  insert() {
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

  it("returns the existing account when the email is already found", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    mockFrom.mockReturnValueOnce(
      new FakeQueryBuilder({
        data: { id: "acc-1", email: "person@example.com", created_at: "2026-01-01T00:00:00Z" },
        error: null,
      }),
    );

    const repo = new SupabaseAccountRepository();
    const account = await repo.findOrCreateByEmail("Person@Example.com");

    expect(account).toEqual({ id: "acc-1", email: "person@example.com", createdAt: "2026-01-01T00:00:00Z" });
  });

  it("creates a new account when no existing row is found", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    mockFrom
      .mockReturnValueOnce(new FakeQueryBuilder({ data: null, error: null })) // select: not found
      .mockReturnValueOnce(
        new FakeQueryBuilder({
          data: { id: "acc-2", email: "new@example.com", created_at: "2026-01-02T00:00:00Z" },
          error: null,
        }),
      ); // insert

    const repo = new SupabaseAccountRepository();
    const account = await repo.findOrCreateByEmail("new@example.com");

    expect(account.id).toBe("acc-2");
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("falls back to reading the row on a concurrent unique-constraint race", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    mockFrom
      .mockReturnValueOnce(new FakeQueryBuilder({ data: null, error: null })) // select: not found yet
      .mockReturnValueOnce(
        new FakeQueryBuilder({ data: null, error: { code: "23505", message: "duplicate key" } }),
      ) // insert: lost the race
      .mockReturnValueOnce(
        new FakeQueryBuilder({
          data: { id: "acc-3", email: "race@example.com", created_at: "2026-01-03T00:00:00Z" },
          error: null,
        }),
      ); // re-select: read the winner's row

    const repo = new SupabaseAccountRepository();
    const account = await repo.findOrCreateByEmail("race@example.com");

    expect(account.id).toBe("acc-3");
  });

  it("throws a descriptive error when the lookup fails for a non-race reason", async () => {
    const { SupabaseAccountRepository } = await loadRepositories();
    mockFrom.mockReturnValueOnce(
      new FakeQueryBuilder({ data: null, error: { code: "500", message: "connection reset" } }),
    );

    const repo = new SupabaseAccountRepository();
    await expect(repo.findOrCreateByEmail("fails@example.com")).rejects.toThrow(/connection reset/);
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
