import { describe, expect, it } from "vitest";

import { createSessionCookieValue, readAccountIdFromCookieValue } from "@/lib/session";

describe("session cookie signing", () => {
  it("round-trips an account id through sign and verify", () => {
    const cookieValue = createSessionCookieValue("account-123");
    expect(readAccountIdFromCookieValue(cookieValue)).toBe("account-123");
  });

  it("rejects a tampered account id", () => {
    const cookieValue = createSessionCookieValue("account-123");
    const [, signature] = cookieValue.split(".");
    const tampered = `account-456.${signature}`;
    expect(readAccountIdFromCookieValue(tampered)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const cookieValue = createSessionCookieValue("account-123");
    const [value] = cookieValue.split(".");
    const tampered = `${value}.not-a-real-signature`;
    expect(readAccountIdFromCookieValue(tampered)).toBeNull();
  });

  it("rejects a value with no signature separator", () => {
    expect(readAccountIdFromCookieValue("no-dot-here")).toBeNull();
  });

  it("returns null for missing input", () => {
    expect(readAccountIdFromCookieValue(undefined)).toBeNull();
    expect(readAccountIdFromCookieValue(null)).toBeNull();
    expect(readAccountIdFromCookieValue("")).toBeNull();
  });
});
