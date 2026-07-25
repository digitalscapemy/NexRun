import { describe, expect, it } from "vitest";
import { OrderStatus } from "@/generated/prisma";
import {
  getCheckoutStatusMessage,
  hasActiveCheckoutReservation,
  isRecoverableOrderStatus,
} from "../checkout-service";

describe("checkout recovery service", () => {
  it("allows only recoverable order states to resume checkout", () => {
    expect(isRecoverableOrderStatus(OrderStatus.PENDING)).toBe(true);
    expect(isRecoverableOrderStatus(OrderStatus.PROCESSING)).toBe(true);
    expect(isRecoverableOrderStatus(OrderStatus.FAILED)).toBe(true);
    expect(isRecoverableOrderStatus(OrderStatus.PAID)).toBe(false);
    expect(isRecoverableOrderStatus(OrderStatus.CANCELLED)).toBe(false);
  });

  it("requires an unexpired reservation before checkout can continue", () => {
    const now = new Date("2026-07-19T08:00:00.000Z");
    expect(
      hasActiveCheckoutReservation(OrderStatus.PENDING, new Date("2026-07-19T08:01:00.000Z"), now)
    ).toBe(true);
    expect(
      hasActiveCheckoutReservation(OrderStatus.PENDING, new Date("2026-07-19T07:59:59.000Z"), now)
    ).toBe(false);
    expect(hasActiveCheckoutReservation(OrderStatus.PAID, new Date("2026-07-19T08:01:00.000Z"), now)).toBe(false);
  });

  it("returns participant-safe status guidance", () => {
    expect(getCheckoutStatusMessage(OrderStatus.FAILED)).toMatch(/retry/i);
    expect(getCheckoutStatusMessage(OrderStatus.EXPIRED)).toMatch(/expired/i);
    expect(getCheckoutStatusMessage(OrderStatus.PAID)).toMatch(/confirmed/i);
  });
});
