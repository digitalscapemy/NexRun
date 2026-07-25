import { describe, expect, it } from "vitest";
import { AUTH_RATE_LIMIT_POLICY } from "../auth-rate-limit";

describe("authentication rate-limit policy", () => {
  it("keeps credential endpoints strict without starving session reads", () => {
    expect(AUTH_RATE_LIMIT_POLICY.customRules["/sign-in/email"].max).toBeLessThanOrEqual(8);
    expect(AUTH_RATE_LIMIT_POLICY.customRules["/sign-up/email"].max).toBeLessThanOrEqual(8);
    expect(AUTH_RATE_LIMIT_POLICY.customRules["/get-session"].max).toBeGreaterThan(
      AUTH_RATE_LIMIT_POLICY.max,
    );
    expect(AUTH_RATE_LIMIT_POLICY.customRules["/get-session"].max).toBeLessThanOrEqual(300);
  });
});
