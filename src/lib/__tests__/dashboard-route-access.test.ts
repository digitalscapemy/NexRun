import { describe, expect, it } from "vitest";
import {
  getOrganizerRoutePermission,
  isParticipantDashboardRoute,
  memberCanAccessOrganizerRoute,
} from "../dashboard-route-access";

describe("dashboard route access", () => {
  it("maps public participant dashboard pages separately from organizer work", () => {
    expect(isParticipantDashboardRoute("/dashboard")).toBe(true);
    expect(isParticipantDashboardRoute("/dashboard/registrations")).toBe(true);
    expect(isParticipantDashboardRoute("/dashboard/events")).toBe(false);
  });

  it("maps each event workspace route to its least-privileged membership permission", () => {
    expect(getOrganizerRoutePermission("/dashboard/events")).toBe("EVENT_MANAGEMENT");
    expect(getOrganizerRoutePermission("/dashboard/events/create")).toBe("EVENT_MANAGEMENT");
    expect(getOrganizerRoutePermission("/dashboard/events/event-1/operations/participants")).toBe("PARTICIPANTS");
    expect(getOrganizerRoutePermission("/dashboard/events/event-1/operations/checkin")).toBe("CHECK_IN");
    expect(getOrganizerRoutePermission("/dashboard/events/event-1/operations/finance")).toBe("FINANCE");
    expect(getOrganizerRoutePermission("/dashboard/events/event-1/operations/templates")).toBe("EVENT_MANAGEMENT");
  });

  it("allows only the memberships assigned to the requested workspace route", () => {
    expect(memberCanAccessOrganizerRoute("OWNER", "EVENT_MANAGEMENT")).toBe(true);
    expect(memberCanAccessOrganizerRoute("MANAGER", "EVENT_MANAGEMENT")).toBe(true);
    expect(memberCanAccessOrganizerRoute("OPERATIONS", "PARTICIPANTS")).toBe(true);
    expect(memberCanAccessOrganizerRoute("CHECKIN_STAFF", "CHECK_IN")).toBe(true);
    expect(memberCanAccessOrganizerRoute("FINANCE", "FINANCE")).toBe(true);
    expect(memberCanAccessOrganizerRoute("OPERATIONS", "FINANCE")).toBe(false);
    expect(memberCanAccessOrganizerRoute("CHECKIN_STAFF", "EVENT_MANAGEMENT")).toBe(false);
  });
});
