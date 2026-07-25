import {
  LayoutDashboard,
  Calendar,
  FileSpreadsheet,
  Shirt,
  Award,
  CreditCard,
  Building2,
  Settings,
  Ticket,
  User,
  Users,
  ShieldCheck,
  Wrench,
  ClipboardList,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { ROLES, type RoleType } from "./constants";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: RoleType[];
  section?: "MAIN" | "PERSONAL" | "EVENTS" | "WORKSPACE" | "ADMIN";
  badge?: string;
}

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  // 1. MAIN
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: [ROLES.DEVELOPER, ROLES.ADMIN, ROLES.ORGANIZER, ROLES.USER],
    section: "MAIN",
  },

  // 2. PERSONAL
  {
    title: "My Profile",
    href: "/dashboard/profile",
    icon: User,
    roles: [ROLES.USER, ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "PERSONAL",
  },
  {
    title: "My Registrations",
    href: "/dashboard/registrations",
    icon: Ticket,
    roles: [ROLES.USER, ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "PERSONAL",
  },

  // 3. EVENTS
  {
    title: "Events",
    href: "/dashboard/events",
    icon: Calendar,
    roles: [ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "EVENTS",
  },
  {
    title: "Check-In Scanner",
    href: "/dashboard/check-in",
    icon: ShieldCheck,
    roles: [ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "EVENTS",
  },
  {
    title: "Participant Reports",
    href: "/dashboard/reports",
    icon: FileSpreadsheet,
    roles: [ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "EVENTS",
  },
  {
    title: "T-Shirt Orders",
    href: "/dashboard/tshirts",
    icon: Shirt,
    roles: [ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "EVENTS",
  },
  {
    title: "Vouchers",
    href: "/dashboard/vouchers",
    icon: Award,
    roles: [ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "EVENTS",
  },

  // 4. WORKSPACE
  {
    title: "Organizer Workspace",
    href: "/dashboard/organizer-onboarding",
    icon: Building2,
    roles: [ROLES.USER, ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "WORKSPACE",
  },
  {
    title: "Activation Fees",
    href: "/dashboard/event-fees",
    icon: CreditCard,
    roles: [ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "WORKSPACE",
  },
  {
    title: "Settlements",
    href: "/dashboard/settlements",
    icon: CreditCard,
    roles: [ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "WORKSPACE",
  },
  {
    title: "Settings Hub",
    href: "/dashboard/settings",
    icon: Settings,
    roles: [ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER],
    section: "WORKSPACE",
  },
  {
    title: "Activity Log",
    href: "/dashboard/activity-log",
    icon: ClipboardList,
    roles: [ROLES.ORGANIZER],
    section: "WORKSPACE",
  },

  // 5. ADMIN
  {
    title: "User Management",
    href: "/dashboard/users",
    icon: Users,
    roles: [ROLES.ADMIN, ROLES.DEVELOPER],
    section: "ADMIN",
  },
  {
    title: "Control Center",
    href: "/dashboard/developer-settings",
    icon: Wrench,
    roles: [ROLES.ADMIN, ROLES.DEVELOPER],
    section: "ADMIN",
  },
  {
    title: "Broadcast Message",
    href: "/dashboard/broadcast",
    icon: Megaphone,
    roles: [ROLES.ADMIN, ROLES.DEVELOPER, ROLES.ORGANIZER],
    section: "ADMIN",
  },
  {
    title: "Audit Log",
    href: "/dashboard/audit-log",
    icon: ClipboardList,
    roles: [ROLES.ADMIN, ROLES.DEVELOPER],
    section: "ADMIN",
  },
];
