import { TRPCError } from "@trpc/server";

export interface CategoryData {
  priceSen: number;
  earlyBirdPriceSen: number | null;
  earlyBirdDeadline: Date | null;
  gender: string;
  ageMin: number;
  ageMax: number;
}

export interface ParticipantData {
  gender: "MALE" | "FEMALE";
  dateOfBirth: Date | string;
}

/**
 * Calculates the active ticket price for a category, taking Early Bird into account.
 * All amounts returned in integer sen.
 */
export function getActiveTicketPriceSen(category: CategoryData, referenceDate = new Date()): number {
  if (category.earlyBirdPriceSen !== null && category.earlyBirdDeadline !== null) {
    if (referenceDate <= new Date(category.earlyBirdDeadline)) {
      return category.earlyBirdPriceSen;
    }
  }
  return category.priceSen;
}

/**
 * Validates participant eligibility (gender and age) against the category rules.
 * Throws TRPCError if ineligible.
 */
export function validateEligibility(
  participant: ParticipantData,
  category: CategoryData,
  ageReferenceDate: Date | string
): void {
  // 1. Gender check
  if (category.gender !== "ALL" && category.gender !== participant.gender) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Ineligible gender. Category requires ${category.gender}, participant is ${participant.gender}.`,
    });
  }

  // 2. Age check
  const birthDate = new Date(participant.dateOfBirth);
  const refDate = new Date(ageReferenceDate);
  if (!Number.isFinite(birthDate.getTime()) || !Number.isFinite(refDate.getTime()) || birthDate > refDate) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Participant date of birth is invalid." });
  }
  
  let age = refDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = refDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < category.ageMin || age > category.ageMax) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Ineligible age. Category requires age ${category.ageMin}-${category.ageMax}, participant is ${age} years old on reference date.`,
    });
  }
}

export interface FeeCalculationResult {
  ticketSubtotalSen: number;
  discountedSubtotalSen: number;
  adminFeeSen: number;
  processingFeeSen: number;
  totalPaidSen: number;
  organizerNetSen: number;
  simulatedGatewayCostSen: number;
  platformProfitSen: number;
}

export function normalizeFeePercentage(value: number, fallback = 3): number {
  return Number.isInteger(value) && value >= 0 && value <= 50 ? value : fallback;
}

/**
 * Calculates platform fees and payouts based on ticket subtotal and voucher discounts.
 * 
 * Financial flow:
 * - Processing fee is charged to the participant to cover the simulated payment gateway cost.
 * - Admin fee is deducted from the organizer payout as NexRun platform profit.
 * - Participant pays = discounted subtotal + processing fee.
 * - Organizer receives = discounted subtotal - admin fee.
 *
 * This preserves the accounting invariant:
 * participant payment = organizer payout + simulated gateway cost + platform profit.
 */
export function calculatePlatformFees(
  subtotalSen: number,
  discountSen: number,
  adminFeePercentage = 3,
  processingFeePercentage = 3
): FeeCalculationResult {
  const safeSubtotal = Math.max(0, Math.round(subtotalSen));
  const safeDiscount = Math.min(safeSubtotal, Math.max(0, Math.round(discountSen)));
  const netSubtotal = safeSubtotal - safeDiscount;
  const safeAdminFeePercentage = normalizeFeePercentage(adminFeePercentage);
  const safeProcessingFeePercentage = normalizeFeePercentage(processingFeePercentage);

  // Math.round() on each fee independently is intentional. A ±1 sen difference per order
  // is acceptable — the platform absorbs or gains at most 1 sen. adminFeeSen + organizerNetSen
  // may differ from discountedSubtotalSen by 1 sen due to this rounding (by design).
  const adminFeeSen = Math.round((netSubtotal * safeAdminFeePercentage) / 100);
  const processingFeeSen = Math.round((netSubtotal * safeProcessingFeePercentage) / 100);

  const totalPaidSen = netSubtotal + processingFeeSen;
  const organizerNetSen = Math.max(0, netSubtotal - adminFeeSen);

  return {
    ticketSubtotalSen: safeSubtotal,
    discountedSubtotalSen: netSubtotal,
    adminFeeSen,
    processingFeeSen,
    totalPaidSen,
    organizerNetSen,
    simulatedGatewayCostSen: processingFeeSen,
    platformProfitSen: adminFeeSen,
  };
}
export default calculatePlatformFees;
