import { describe, expect, it } from "vitest";
import {
  extractBearerToken,
  resolveRequestIp,
  secretsMatch,
} from "../request";

describe("internal request security", () => {
  it("accepts only a strict bearer token", () => {
    expect(extractBearerToken("Bearer valid-token")).toBe("valid-token");
    expect(extractBearerToken("bearer valid-token")).toBeNull();
    expect(extractBearerToken("Bearer token with spaces")).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });

  it("compares secrets without direct string equality", () => {
    const secret = "s".repeat(40);
    expect(secretsMatch(secret, secret)).toBe(true);
    expect(secretsMatch(secret, `${secret}x`)).toBe(false);
    expect(secretsMatch(secret, null)).toBe(false);
  });

  it("ignores spoofable forwarding headers unless the proxy is trusted", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.8",
      "x-forwarded-for": "198.51.100.20, 10.0.0.2",
    });

    expect(resolveRequestIp(headers, false)).toBe("untrusted-client");
    expect(resolveRequestIp(headers, true)).toBe("203.0.113.8");
  });

  it("rejects malformed forwarded addresses", () => {
    const headers = new Headers({ "x-forwarded-for": "not-an-ip" });
    expect(resolveRequestIp(headers, true)).toBe("unknown-client");
  });
});
