import { describe, expect, it } from "vitest";
import { parseServerEnvironment } from "../env";

const validEnvironment = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/nexrun",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  UPLOADTHING_TOKEN: "u".repeat(32),
};

describe("server environment validation", () => {
  it("applies safe local defaults without exposing secret values", () => {
    const parsed = parseServerEnvironment(validEnvironment);

    expect(parsed.MOCK_PAYMENT_MODE).toBe(true);
    expect(parsed.TRUST_PROXY_HEADERS).toBe(false);
    expect(parsed.DATABASE_POOL_MAX).toBe(10);
  });

  it("rejects weak authentication and cron secrets", () => {
    expect(() =>
      parseServerEnvironment({ ...validEnvironment, BETTER_AUTH_SECRET: "too-short" }),
    ).toThrow(/BETTER_AUTH_SECRET/);
    expect(() =>
      parseServerEnvironment({ ...validEnvironment, CRON_SECRET: "too-short" }),
    ).toThrow(/CRON_SECRET/);
  });

  it("rejects non-PostgreSQL databases and non-HTTP application URLs", () => {
    expect(() =>
      parseServerEnvironment({ ...validEnvironment, DATABASE_URL: "file:./local.db" }),
    ).toThrow(/DATABASE_URL/);
    expect(() =>
      parseServerEnvironment({ ...validEnvironment, NEXT_PUBLIC_APP_URL: "ftp://example.com" }),
    ).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});
