import type { PrismaClient } from "@/generated/prisma";
import { OrderStatus } from "@/generated/prisma";

export async function releaseExpiredReservations(db: PrismaClient, now = new Date()) {
  return db.$transaction(async (tx) => {
    const expiredOrders = await tx.order.updateMany({
      where: {
        expiresAt: { lte: now },
        status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.FAILED] },
      },
      data: { status: OrderStatus.EXPIRED },
    });
    const expiredReservations = await tx.inventoryReservation.updateMany({
      where: { expiresAt: { lte: now }, status: "RESERVED" },
      data: { status: "EXPIRED" },
    });
    return { expiredOrders: expiredOrders.count, expiredReservations: expiredReservations.count };
  });
}
