"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Drawer } from "@base-ui/react/drawer";
import { Menu, X, ChevronRight, Home } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { DASHBOARD_NAV_ITEMS } from "@/lib/navigation";
import { ROLES, type RoleType } from "@/lib/constants";
import toast from "react-hot-toast";
import { NotificationMenu } from "@/components/layout/notification-menu";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { DashboardSidebar, type DashboardWorkspace } from "@/components/layout/dashboard-sidebar";
import { trpc } from "@/lib/trpc";
import {
  getOrganizerRoutePermission,
  isParticipantDashboardRoute,
  memberCanAccessOrganizerRoute,
} from "@/lib/dashboard-route-access";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, router, session?.user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMobileNavOpen(false), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (media.matches) setMobileNavOpen(false);
    };
    closeOnDesktop();
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  const userRole = (session?.user?.role as RoleType) || ROLES.USER;
  const utils = trpc.useUtils();
  const { data: workspace, isLoading: isWorkspaceLoading } = trpc.settings.getMyWorkspaceContext.useQuery(undefined, {
    enabled: !isPending && userRole !== ROLES.USER,
    retry: false,
  });
  const organization = workspace?.selectedOrganization;
  const memberRole = organization?.memberRole ?? null;
  const isPlatformAdmin = userRole === ROLES.ADMIN || userRole === ROLES.DEVELOPER;
  const selectWorkspace = trpc.settings.selectWorkspaceOrganization.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      router.refresh();
      toast.success("Workspace switched successfully.");
    },
    onError: (error) => toast.error(error.message || "Unable to switch workspace."),
  });

  const memberCanSee = (href: string) => {
    if (userRole !== ROLES.ORGANIZER) return true;
    if (["/dashboard", "/dashboard/profile", "/dashboard/registrations", "/dashboard/organizer-onboarding"].includes(href)) return true;
    if (organization?.status !== "APPROVED" || !memberRole) return false;
    if (href === "/dashboard/event-fees") return ["OWNER", "MANAGER", "FINANCE"].includes(memberRole);
    if (href === "/dashboard/check-in") return ["OWNER", "MANAGER", "OPERATIONS", "CHECKIN_STAFF"].includes(memberRole);
    if (["/dashboard/reports", "/dashboard/tshirts"].includes(href)) return ["OWNER", "MANAGER", "OPERATIONS"].includes(memberRole);
    if (href === "/dashboard/settlements") return ["OWNER", "MANAGER", "FINANCE"].includes(memberRole);
    if (["/dashboard/events", "/dashboard/vouchers", "/dashboard/settings", "/dashboard/activity-log"].includes(href)) return ["OWNER", "MANAGER"].includes(memberRole);
    return true;
  };

  const organizerRoutePermission = getOrganizerRoutePermission(pathname);
  const isParticipantRoute = isParticipantDashboardRoute(pathname);
  const organizerHasRoutePermission = memberCanAccessOrganizerRoute(memberRole, organizerRoutePermission);
  const dashboardRedirectDestination = !session?.user || isPlatformAdmin
    ? null
    : userRole === ROLES.USER
      ? isParticipantRoute ? null : "/events"
      : isParticipantRoute
        ? null
        : isWorkspaceLoading
          ? null
          : !organization || organization.status !== "APPROVED"
            ? "/dashboard/organizer-onboarding"
            : organizerHasRoutePermission ? null : "/dashboard";

  useEffect(() => {
    if (dashboardRedirectDestination) router.replace(dashboardRedirectDestination);
  }, [dashboardRedirectDestination, router]);

  const visibleNavItems = DASHBOARD_NAV_ITEMS.filter((item) => item.roles.includes(userRole) && memberCanSee(item.href));

  const handleSignOut = async () => {
    try {
      await signOut({ fetchOptions: { onSuccess: () => { toast.success("Successfully logged out."); router.push("/login"); } } });
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  if (isPending || !session?.user || ((userRole === ROLES.ORGANIZER && !isParticipantRoute && isWorkspaceLoading) || dashboardRedirectDestination)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" aria-label="Loading dashboard" />
      </div>
    );
  }

  const sidebarProps = {
    pathname,
    userName: session.user.name || "User",
    userRole,
    visibleNavItems,
    workspace: workspace as DashboardWorkspace | undefined,
    isWorkspaceLoading,
    isWorkspaceSwitching: selectWorkspace.isPending,
    onWorkspaceChange: (organizationId: string) => selectWorkspace.mutate({ organizationId }),
    onSignOut: handleSignOut,
  };

  return (
    <Drawer.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen} swipeDirection="left">
      <div className="flex min-h-screen min-w-0 overflow-x-clip bg-neutral-50 dark:bg-neutral-950 print:block print:bg-white">
        <aside className="dashboard-desktop-sidebar h-dvh w-64 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 print:hidden">
          <DashboardSidebar {...sidebarProps} id="workspace-organization-desktop" />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col print:block">
          <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-neutral-200 bg-white/80 px-2.5 backdrop-blur-md sm:px-6 dark:border-neutral-800 dark:bg-neutral-900/80 print:hidden">
            <Drawer.Trigger
              type="button"
              aria-label="Open navigation menu"
              aria-controls="dashboard-mobile-navigation"
              className="dashboard-mobile-only size-11 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Drawer.Trigger>

            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-neutral-500">
              <span className="hidden shrink-0 sm:inline">Dashboard</span>
              <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 sm:block" aria-hidden="true" />
              <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                {visibleNavItems.find((item) => item.href === pathname)?.title || "Overview"}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
              {isPlatformAdmin && <GlobalSearch />}
              <NotificationMenu />
              <Link href="/" aria-label="Public home" title="Public Home" className="flex size-11 items-center justify-center rounded-lg text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950/40">
                <Home className="h-4 w-4 sm:hidden" aria-hidden="true" />
                <span className="hidden text-xs font-semibold sm:inline">Public Home &rarr;</span>
              </Link>
            </div>
          </header>

          <main id="main-content" className="min-w-0 w-full flex-1 p-3 sm:p-6 lg:p-8 print:p-0">{children}</main>
        </div>
      </div>

      <Drawer.Portal>
        <Drawer.Backdrop data-testid="dashboard-drawer-backdrop" className="dashboard-mobile-only fixed inset-0 z-40 bg-neutral-950/60 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Drawer.Viewport className="dashboard-mobile-only pointer-events-none fixed inset-0 z-50">
          <Drawer.Popup
            id="dashboard-mobile-navigation"
            data-testid="dashboard-mobile-navigation"
            className="pointer-events-auto fixed inset-y-0 left-0 h-dvh max-h-dvh w-[min(20rem,calc(100vw-2rem))] touch-auto overflow-hidden bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-2xl outline-none [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-300 ease-out data-swiping:select-none data-ending-style:-translate-x-full data-starting-style:-translate-x-full data-ending-style:duration-[calc(var(--drawer-swipe-strength)*250ms)] dark:bg-neutral-900"
          >
            <Drawer.Title className="sr-only">Dashboard navigation</Drawer.Title>
            <DashboardSidebar
              {...sidebarProps}
              id="workspace-organization-mobile"
              onNavigate={() => setMobileNavOpen(false)}
              closeControl={
                <Drawer.Close
                  type="button"
                  aria-label="Close navigation menu"
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </Drawer.Close>
              }
            />
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
