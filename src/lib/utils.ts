import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amount in sen to MYR display string
 * @example formatCurrency(5150) -> "RM 51.50"
 */
export function formatCurrency(amountSen: number): string {
  const ringgit = amountSen / 100;
  return `RM ${ringgit.toFixed(2)}`;
}

export function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    PENDING_APPROVAL: "Pending review",
    NEEDS_CHANGES: "Changes requested",
    REGISTRATION_CLOSED: "Registration closed",
    PROCESSING: "Processing",
    UNSETTLED: "Unsettled",
    CHECKIN_STAFF: "Check-in staff",
  };
  return labels[status] ?? status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
