import type { EventStatus, OrganizationStatus } from "@/generated/prisma";

export type PublicEventTab = "UPCOMING" | "PAST";

export const PUBLIC_EVENT_STATUSES = [
  "PUBLISHED",
  "REGISTRATION_CLOSED",
  "COMPLETED",
] as const satisfies readonly EventStatus[];

const PUBLIC_EVENT_STATUSES_BY_TAB = {
  UPCOMING: ["PUBLISHED", "REGISTRATION_CLOSED"],
  PAST: PUBLIC_EVENT_STATUSES,
} as const satisfies Record<PublicEventTab, readonly EventStatus[]>;

export const PUBLIC_EVENT_ORGANIZATION_STATUS = "APPROVED" as const satisfies OrganizationStatus;

export function isPublicEventStatus(status: EventStatus | string): status is (typeof PUBLIC_EVENT_STATUSES)[number] {
  return (PUBLIC_EVENT_STATUSES as readonly string[]).includes(status);
}

export function isPublicEventVisibleInTab({
  tab,
  status,
  organizationStatus,
  eventDate,
  now,
}: {
  tab: PublicEventTab;
  status: EventStatus | string;
  organizationStatus: OrganizationStatus | string;
  eventDate: Date;
  now: Date;
}) {
  if (organizationStatus !== PUBLIC_EVENT_ORGANIZATION_STATUS) return false;
  if (!(PUBLIC_EVENT_STATUSES_BY_TAB[tab] as readonly string[]).includes(status)) return false;
  return tab === "UPCOMING" ? eventDate >= now : eventDate < now;
}

export function getPublicEventQueryPolicy({
  tab,
  now,
  eventDateFrom,
  eventDateTo,
}: {
  tab: PublicEventTab;
  now: Date;
  eventDateFrom?: Date;
  eventDateTo?: Date;
}) {
  const eventDate = tab === "UPCOMING"
    ? {
        gte: eventDateFrom && eventDateFrom > now ? eventDateFrom : now,
        ...(eventDateTo ? { lte: eventDateTo } : {}),
      }
    : {
        lt: now,
        ...(eventDateFrom ? { gte: eventDateFrom } : {}),
        ...(eventDateTo ? { lte: eventDateTo } : {}),
      };

  return {
    statuses: PUBLIC_EVENT_STATUSES_BY_TAB[tab],
    organizationStatus: PUBLIC_EVENT_ORGANIZATION_STATUS,
    eventDate,
  };
}
