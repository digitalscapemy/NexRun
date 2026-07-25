import { describe, expect, it } from "vitest";
import {
  MockPaymentScenario,
  OrganizerFeeStatus,
  PaymentStatus,
} from "@/generated/prisma";
import {
  createActivationInvoiceNumber,
  resolveActivationAttemptOutcome,
} from "../event-activation-service";

describe("event activation commerce service", () => {
  it("creates a deterministic invoice number from the immutable event id", () => {
    expect(createActivationInvoiceNumber("cmrkca24u00085oug2m590ceb")).toBe(
      "NR-ACT-CMRKCA24U00085OUG2M590CEB"
    );
  });

  it("maps every simulated gateway outcome to a valid invoice state", () => {
    expect(resolveActivationAttemptOutcome(MockPaymentScenario.SUCCESS)).toMatchObject({
      paymentStatus: PaymentStatus.SUCCESS,
      organizerFeeStatus: OrganizerFeeStatus.PAID,
      failureReason: null,
      isTerminal: true,
    });
    expect(resolveActivationAttemptOutcome(MockPaymentScenario.PENDING)).toMatchObject({
      paymentStatus: PaymentStatus.PROCESSING,
      organizerFeeStatus: OrganizerFeeStatus.PROCESSING,
      failureReason: null,
      isTerminal: false,
    });
    for (const scenario of [
      MockPaymentScenario.DECLINED,
      MockPaymentScenario.TIMEOUT,
      MockPaymentScenario.CANCELLED,
    ]) {
      const outcome = resolveActivationAttemptOutcome(scenario);
      expect(outcome.organizerFeeStatus).toBe(OrganizerFeeStatus.PENDING);
      expect(outcome.failureReason).toBeTruthy();
      expect(outcome.isTerminal).toBe(true);
    }
  });
});
