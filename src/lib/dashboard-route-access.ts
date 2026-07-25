const MEMBER_PERMISSIONS = {
  EVENT_MANAGEMENT: ["OWNER", "MANAGER"],
  PARTICIPANTS: ["OWNER", "MANAGER", "OPERATIONS"],
  FINANCE: ["OWNER", "MANAGER", "FINANCE"],
  CHECK_IN: ["OWNER", "MANAGER", "OPERATIONS", "CHECKIN_STAFF"],
} as const;

export type MemberPermission = keyof typeof MEMBER_PERMISSIONS;

export function getOrganizerRoutePermission(pathname: string): MemberPermission | null {
  if (pathname.startsWith("/dashboard/events/")) {
    if (pathname.includes("/operations/checkin")) return "CHECK_IN";
    if (pathname.includes("/operations/finance")) return "FINANCE";
    if (
      pathname.includes("/operations/participants") ||
      pathname.includes("/operations/tshirts")
    ) {
      return "PARTICIPANTS";
    }
    return "EVENT_MANAGEMENT";
  }
  if (pathname === "/dashboard/events") return "EVENT_MANAGEMENT";
  if (pathname === "/dashboard/event-fees" || pathname === "/dashboard/settlements") return "FINANCE";
  if (pathname === "/dashboard/check-in") return "CHECK_IN";
  if (pathname === "/dashboard/reports" || pathname === "/dashboard/tshirts") return "PARTICIPANTS";
  if (pathname === "/dashboard/vouchers" || pathname === "/dashboard/settings") return "EVENT_MANAGEMENT";
  return null;
}

export function isParticipantDashboardRoute(pathname: string) {
  return ["/dashboard", "/dashboard/profile", "/dashboard/registrations", "/dashboard/organizer-onboarding"].includes(pathname);
}

export function memberCanAccessOrganizerRoute(memberRole: string | null, permission: MemberPermission | null) {
  return (
    memberRole !== null &&
    permission !== null &&
    (MEMBER_PERMISSIONS[permission] as readonly string[]).includes(memberRole)
  );
}
