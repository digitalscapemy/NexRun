import { OrderStatus } from "@/generated/prisma";

export const RECOVERABLE_ORDER_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.PROCESSING,
  OrderStatus.FAILED,
] as const;

export function isRecoverableOrderStatus(status: OrderStatus) {
  return RECOVERABLE_ORDER_STATUSES.includes(
    status as (typeof RECOVERABLE_ORDER_STATUSES)[number]
  );
}

export function hasActiveCheckoutReservation(
  status: OrderStatus,
  expiresAt: Date | null,
  now = new Date()
) {
  return isRecoverableOrderStatus(status) && Boolean(expiresAt && expiresAt > now);
}

export function getCheckoutStatusMessage(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PENDING:
      return "Your slot reservation is active. Complete payment before it expires.";
    case OrderStatus.PROCESSING:
      return "Your payment is still processing. You may safely resume checkout.";
    case OrderStatus.FAILED:
      return "Your last payment was not completed. You may retry while the reservation is active.";
    case OrderStatus.EXPIRED:
      return "This slot reservation has expired. Start a new checkout to see current availability.";
    case OrderStatus.CANCELLED:
      return "This checkout was cancelled and its slot reservation was released.";
    case OrderStatus.PAID:
      return "Payment is complete. Your registrations are confirmed.";
    case OrderStatus.REFUNDED:
      return "This order has been refunded.";
  }
}
