import crypto from "node:crypto";
import {
  MockPaymentScenario,
  OrganizerFeeStatus,
  PaymentStatus,
} from "@/generated/prisma";

export const ACTIVATION_FEE_PROVIDER = "NEXRUN_SIMULATED_GATEWAY";

export type ActivationAttemptOutcome = {
  paymentStatus: PaymentStatus;
  organizerFeeStatus: OrganizerFeeStatus;
  failureReason: string | null;
  isTerminal: boolean;
};

export function createActivationInvoiceNumber(eventId: string) {
  return `NR-ACT-${eventId.toUpperCase()}`;
}

export function resolveActivationAttemptOutcome(
  scenario: MockPaymentScenario
): ActivationAttemptOutcome {
  switch (scenario) {
    case MockPaymentScenario.SUCCESS:
      return {
        paymentStatus: PaymentStatus.SUCCESS,
        organizerFeeStatus: OrganizerFeeStatus.PAID,
        failureReason: null,
        isTerminal: true,
      };
    case MockPaymentScenario.PENDING:
      return {
        paymentStatus: PaymentStatus.PROCESSING,
        organizerFeeStatus: OrganizerFeeStatus.PROCESSING,
        failureReason: null,
        isTerminal: false,
      };
    case MockPaymentScenario.DECLINED:
      return {
        paymentStatus: PaymentStatus.FAILED,
        organizerFeeStatus: OrganizerFeeStatus.PENDING,
        failureReason: "The payment was declined. Please use another payment method or contact your bank.",
        isTerminal: true,
      };
    case MockPaymentScenario.TIMEOUT:
      return {
        paymentStatus: PaymentStatus.FAILED,
        organizerFeeStatus: OrganizerFeeStatus.PENDING,
        failureReason: "The payment provider timed out. You may retry safely.",
        isTerminal: true,
      };
    case MockPaymentScenario.CANCELLED:
      return {
        paymentStatus: PaymentStatus.CANCELLED,
        organizerFeeStatus: OrganizerFeeStatus.PENDING,
        failureReason: "The payment was cancelled before it was completed.",
        isTerminal: true,
      };
  }
}

export function createActivationPaymentReference() {
  return `SIM-ACT-${Date.now()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}
