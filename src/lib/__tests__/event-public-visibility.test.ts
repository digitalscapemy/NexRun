import { describe, expect, it } from "vitest";
import {
  getPublicEventQueryPolicy,
  isPublicEventVisibleInTab,
  isPublicEventStatus,
  PUBLIC_EVENT_ORGANIZATION_STATUS,
} from "@/lib/event-public-visibility";

const now = new Date("2026-07-25T02:00:00.000Z");

describe("public event visibility", () => {
  it("keeps only approved organizations in public discovery", () => {
    expect(PUBLIC_EVENT_ORGANIZATION_STATUS).toBe("APPROVED");
  });

  it("recognizes public lifecycle statuses and excludes private or cancelled states", () => {
    expect(isPublicEventStatus("PUBLISHED")).toBe(true);
    expect(isPublicEventStatus("REGISTRATION_CLOSED")).toBe(true);
    expect(isPublicEventStatus("COMPLETED")).toBe(true);
    expect(isPublicEventStatus("CANCELLED")).toBe(false);
    expect(isPublicEventStatus("DRAFT")).toBe(false);
  });

  it("applies the status, date, and organization matrix to each tab", () => {
    const pastDate = new Date("2025-11-19T22:00:00.000Z");
    const futureDate = new Date("2026-09-14T23:00:00.000Z");
    const visible = (input: Partial<Parameters<typeof isPublicEventVisibleInTab>[0]>) =>
      isPublicEventVisibleInTab({
        tab: "PAST",
        status: "COMPLETED",
        organizationStatus: "APPROVED",
        eventDate: pastDate,
        now,
        ...input,
      });

    expect(visible({})).toBe(true);
    expect(visible({ status: "PUBLISHED" })).toBe(true);
    expect(visible({ status: "REGISTRATION_CLOSED" })).toBe(true);
    expect(visible({ status: "CANCELLED" })).toBe(false);
    expect(visible({ organizationStatus: "SUSPENDED" })).toBe(false);
    expect(visible({ eventDate: futureDate })).toBe(false);
    expect(visible({ tab: "UPCOMING", status: "PUBLISHED", eventDate: futureDate })).toBe(true);
    expect(visible({ tab: "UPCOMING", status: "REGISTRATION_CLOSED", eventDate: futureDate })).toBe(true);
    expect(visible({ tab: "UPCOMING", status: "COMPLETED", eventDate: futureDate })).toBe(false);
  });

  it("keeps upcoming events public after registration closes", () => {
    const policy = getPublicEventQueryPolicy({ tab: "UPCOMING", now });
    expect(policy.statuses).toEqual(["PUBLISHED", "REGISTRATION_CLOSED"]);
    expect(policy.eventDate).toEqual({ gte: now });
  });

  it("includes completed events in the past archive", () => {
    const policy = getPublicEventQueryPolicy({ tab: "PAST", now });
    expect(policy.statuses).toEqual(["PUBLISHED", "REGISTRATION_CLOSED", "COMPLETED"]);
    expect(policy.eventDate).toEqual({ lt: now });
  });

  it("does not let an old from-date override the upcoming boundary", () => {
    const oldDate = new Date("2025-01-01T00:00:00.000Z");
    const policy = getPublicEventQueryPolicy({ tab: "UPCOMING", now, eventDateFrom: oldDate });
    expect(policy.eventDate).toEqual({ gte: now });
  });

  it("preserves explicit date filters inside the past boundary", () => {
    const from = new Date("2025-01-01T00:00:00.000Z");
    const to = new Date("2025-12-31T23:59:59.000Z");
    const policy = getPublicEventQueryPolicy({ tab: "PAST", now, eventDateFrom: from, eventDateTo: to });
    expect(policy.eventDate).toEqual({ lt: now, gte: from, lte: to });
  });
});
