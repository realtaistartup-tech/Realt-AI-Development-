import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Verifies getSessionAccountId()'s own resolution logic against a mocked
 * Supabase server client and a mocked account repository — same approach
 * as tests/unit/supabase-persistence.test.ts, for the same reason (this
 * sandbox blocks outbound calls to supabase.co, so nothing here proves the
 * live Supabase Auth integration works end to end).
 */

const mockGetUser = vi.fn();
const mockFindOrCreateByAuthUser = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/services/persistence", () => ({
  getAccountRepository: () => ({ findOrCreateByAuthUser: mockFindOrCreateByAuthUser }),
}));

async function loadAuth() {
  return import("@/lib/auth");
}

describe("getSessionAccountId", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    mockGetUser.mockReset();
    mockFindOrCreateByAuthUser.mockReset();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns null without calling Supabase when auth isn't configured", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    const { getSessionAccountId } = await loadAuth();

    expect(await getSessionAccountId()).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("returns null when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { getSessionAccountId } = await loadAuth();

    expect(await getSessionAccountId()).toBeNull();
  });

  it("returns null when Supabase reports an invalid/expired session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid token" } });
    const { getSessionAccountId } = await loadAuth();

    expect(await getSessionAccountId()).toBeNull();
  });

  it("returns null when the authenticated user has no email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "auth-1", email: undefined } }, error: null });
    const { getSessionAccountId } = await loadAuth();

    expect(await getSessionAccountId()).toBeNull();
    expect(mockFindOrCreateByAuthUser).not.toHaveBeenCalled();
  });

  it("resolves to the app's own account id for a valid session", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-1", email: "person@example.com" } },
      error: null,
    });
    mockFindOrCreateByAuthUser.mockResolvedValue({
      id: "acc-1",
      email: "person@example.com",
      createdAt: "2026-01-01T00:00:00Z",
    });

    const { getSessionAccountId } = await loadAuth();

    expect(await getSessionAccountId()).toBe("acc-1");
    expect(mockFindOrCreateByAuthUser).toHaveBeenCalledWith("auth-1", "person@example.com");
  });
});
