import { describe, expect, it } from "vitest";
import {
  calculatePlatformFees,
  getActiveTicketPriceSen,
  normalizeFeePercentage,
  validateEligibility,
} from "../registration-engine";

const category = {
  priceSen: 6500,
  earlyBirdPriceSen: 5000,
  earlyBirdDeadline: new Date("2026-08-31T23:59:59.000Z"),
  gender: "ALL",
  ageMin: 18,
  ageMax: 70,
};

describe("registration pricing", () => {
  it("uses early-bird price through the exact deadline", () => {
    expect(getActiveTicketPriceSen(category, new Date("2026-08-31T23:59:59.000Z"))).toBe(5000);
  });

  it("uses standard price after the early-bird deadline", () => {
    expect(getActiveTicketPriceSen(category, new Date("2026-09-01T00:00:00.000Z"))).toBe(6500);
  });

  it("preserves the complete money-flow invariant across common values", () => {
    for (let subtotal = 0; subtotal <= 100_000; subtotal += 997) {
      for (const discount of [0, 1, Math.floor(subtotal / 3), subtotal, subtotal + 500]) {
        const result = calculatePlatformFees(subtotal, discount, 3, 3);
        expect(result.totalPaidSen).toBe(
          result.organizerNetSen + result.platformProfitSen + result.simulatedGatewayCostSen
        );
        expect(Number.isInteger(result.totalPaidSen)).toBe(true);
        expect(result.totalPaidSen).toBeGreaterThanOrEqual(0);
        expect(result.organizerNetSen).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("clamps invalid negative and excessive discounts safely", () => {
    expect(calculatePlatformFees(10_000, -500).discountedSubtotalSen).toBe(10_000);
    expect(calculatePlatformFees(10_000, 20_000).discountedSubtotalSen).toBe(0);
  });

  it("falls back from fractional, negative, and excessive fee settings", () => {
    expect(normalizeFeePercentage(3)).toBe(3);
    expect(normalizeFeePercentage(3.5)).toBe(3);
    expect(normalizeFeePercentage(-1)).toBe(3);
    expect(normalizeFeePercentage(51)).toBe(3);

    const result = calculatePlatformFees(10_000, 0, -10, 200);
    expect(result.adminFeeSen).toBe(300);
    expect(result.processingFeeSen).toBe(300);
  });
});

describe("participant eligibility", () => {
  it("accepts a participant on the minimum-age birthday", () => {
    expect(() =>
      validateEligibility(
        { gender: "FEMALE", dateOfBirth: "2008-12-31T00:00:00.000Z" },
        category,
        "2026-12-31T00:00:00.000Z"
      )
    ).not.toThrow();
  });

  it("rejects a participant one day below the minimum age", () => {
    expect(() =>
      validateEligibility(
        { gender: "MALE", dateOfBirth: "2009-01-01T00:00:00.000Z" },
        category,
        "2026-12-31T00:00:00.000Z"
      )
    ).toThrow(/age/i);
  });

  it("rejects a category gender mismatch", () => {
    expect(() =>
      validateEligibility(
        { gender: "FEMALE", dateOfBirth: "1990-01-01T00:00:00.000Z" },
        { ...category, gender: "MALE" },
        "2026-12-31T00:00:00.000Z"
      )
    ).toThrow(/gender/i);
  });

  it("rejects impossible birth dates", () => {
    expect(() =>
      validateEligibility(
        { gender: "MALE", dateOfBirth: "not-a-date" },
        category,
        "2026-12-31T00:00:00.000Z"
      )
    ).toThrow(/invalid/i);
  });
});
