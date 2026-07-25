import type { Prisma, PrismaClient } from "@/generated/prisma";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import {
  calculatePlatformFees,
  normalizeFeePercentage,
} from "@/server/engines/registration-engine";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export interface FeeSchedule {
  adminFeePercentage: number;
  processingFeePercentage: number;
  eventActivationFeeSen: number;
}

export async function getActiveFeeSchedule(db: DatabaseClient): Promise<FeeSchedule> {
  const settings = await db.platformSetting.findMany({
    where: {
      key: { in: ["adminFeePercentage", "processingFeePercentage", "eventActivationFeeSen"] },
    },
    select: { key: true, value: true },
  });

  const values = new Map(settings.map((setting) => [setting.key, Number(setting.value)]));
  const adminFeePercentage = values.get("adminFeePercentage");
  const processingFeePercentage = values.get("processingFeePercentage");
  const eventActivationFeeSen = values.get("eventActivationFeeSen");

  return {
    adminFeePercentage: normalizeFeePercentage(
      Number(adminFeePercentage),
      DEFAULT_SETTINGS.ADMIN_FEE_PERCENTAGE,
    ),
    processingFeePercentage: normalizeFeePercentage(
      Number(processingFeePercentage),
      DEFAULT_SETTINGS.PROCESSING_FEE_PERCENTAGE,
    ),
    eventActivationFeeSen:
      Number.isInteger(eventActivationFeeSen) && Number(eventActivationFeeSen) >= 100
        ? Number(eventActivationFeeSen)
        : DEFAULT_SETTINGS.EVENT_ACTIVATION_FEE_SEN,
  };
}

export function calculateOrderPricing(
  subtotalSen: number,
  discountSen: number,
  fees: FeeSchedule
) {
  return calculatePlatformFees(
    subtotalSen,
    discountSen,
    fees.adminFeePercentage,
    fees.processingFeePercentage
  );
}
