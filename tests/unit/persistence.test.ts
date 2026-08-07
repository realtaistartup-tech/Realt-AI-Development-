import { describe, expect, it } from "vitest";

import { MockAccountRepository } from "@/services/persistence/mock/account-repository";
import { MockPropertyRepository } from "@/services/persistence/mock/property-repository";
import { MockSavedSearchRepository } from "@/services/persistence/mock/saved-search-repository";
import { MOCK_PROPERTIES } from "@/lib/mock-properties";
import type { UserPriorities } from "@/types";

function makePriorities(overrides: Partial<UserPriorities> = {}): UserPriorities {
  return {
    budgetMin: 3_000_000,
    budgetMax: 5_000_000,
    commuteMaxMinutes: 30,
    commuteMode: "transit",
    minBedrooms: 2,
    minBathrooms: 1,
    mustHaves: [],
    dealBreakers: [],
    lifestyleTags: [],
    weights: [],
    ...overrides,
  };
}

describe("MockAccountRepository", () => {
  it("creates a new account on first sign-in", async () => {
    const repo = new MockAccountRepository();
    const account = await repo.findOrCreateByAuthUser("auth-1", "person@example.com");
    expect(account.email).toBe("person@example.com");
    expect(account.id).toBeTruthy();
  });

  it("returns the same account on repeat sign-in by the same auth user, case-insensitively", async () => {
    const repo = new MockAccountRepository();
    const first = await repo.findOrCreateByAuthUser("auth-1", "Person@Example.com");
    const second = await repo.findOrCreateByAuthUser("auth-1", "person@example.com");
    expect(second.id).toBe(first.id);
    expect(second.email).toBe("person@example.com");
  });

  it("links to the existing account when the same email signs in under a different auth user id", async () => {
    const repo = new MockAccountRepository();
    const first = await repo.findOrCreateByAuthUser("auth-1", "shared@example.com");
    const second = await repo.findOrCreateByAuthUser("auth-2", "shared@example.com");
    expect(second.id).toBe(first.id);
  });

  it("finds an account by id after creation", async () => {
    const repo = new MockAccountRepository();
    const created = await repo.findOrCreateByAuthUser("auth-1", "a@example.com");
    const found = await repo.findById(created.id);
    expect(found).toEqual(created);
  });

  it("returns null for an unknown id", async () => {
    const repo = new MockAccountRepository();
    expect(await repo.findById("does-not-exist")).toBeNull();
  });

  it("stores and retrieves housing preferences for an account", async () => {
    const repo = new MockAccountRepository();
    const account = await repo.findOrCreateByAuthUser("auth-1", "prefs@example.com");
    expect(await repo.getPreferences(account.id)).toBeNull();

    const preferences = makePriorities({ budgetMax: 4_500_000 });
    await repo.updatePreferences(account.id, preferences);
    expect(await repo.getPreferences(account.id)).toEqual(preferences);
  });
});

describe("MockSavedSearchRepository", () => {
  it("creates and retrieves a saved search by id", async () => {
    const repo = new MockSavedSearchRepository();
    const priorities = makePriorities();
    const saved = await repo.create("account-1", priorities);
    expect(saved.accountId).toBe("account-1");
    expect(saved.priorities).toEqual(priorities);

    const found = await repo.findById(saved.id);
    expect(found).toEqual(saved);
  });

  it("lists only the requesting account's saved searches, newest first", async () => {
    const repo = new MockSavedSearchRepository();
    const first = await repo.create("account-1", makePriorities({ budgetMax: 4_000_000 }));
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await repo.create("account-1", makePriorities({ budgetMax: 5_000_000 }));
    await repo.create("account-2", makePriorities({ budgetMax: 6_000_000 }));

    const results = await repo.listByAccount("account-1");
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe(second.id);
    expect(results[1].id).toBe(first.id);
  });

  it("only deletes a saved search when the requesting account owns it", async () => {
    const repo = new MockSavedSearchRepository();
    const saved = await repo.create("account-1", makePriorities());

    const deletedByWrongAccount = await repo.delete(saved.id, "account-2");
    expect(deletedByWrongAccount).toBe(false);
    expect(await repo.findById(saved.id)).not.toBeNull();

    const deletedByOwner = await repo.delete(saved.id, "account-1");
    expect(deletedByOwner).toBe(true);
    expect(await repo.findById(saved.id)).toBeNull();
  });
});

describe("MockPropertyRepository", () => {
  it("returns the full mock property catalog", async () => {
    const repo = new MockPropertyRepository();
    const properties = await repo.listAll();
    expect(properties).toEqual(MOCK_PROPERTIES);
  });
});
