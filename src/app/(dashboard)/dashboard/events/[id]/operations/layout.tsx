"use client";

import React, { use, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { LayoutDashboard, Users, CheckSquare, BarChart3, ChevronLeft, Shirt, Award, FileText, Printer } from "lucide-react";

export default function OperationsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; [key: string]: string | undefined }>;
}) {
  const resolvedParams = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const tabsRef = useRef<HTMLDivElement>(null);

  // Find event details from list query
  const { data: events = [] } = trpc.event.getDashboardEvents.useQuery();
  const {
    data: permissions,
    isLoading: isPermissionsLoading,
    error: permissionsError,
  } = trpc.event.getEventPermissions.useQuery({ eventId: resolvedParams.id });
  const event = events.find((e) => e.id === resolvedParams.id);

  const overviewHref = `/dashboard/events/${resolvedParams.id}/operations`;

  const tabs = [
    {
      name: "Overview",
      href: overviewHref,
      icon: LayoutDashboard,
      permission: "overview" as const,
    },
    {
      name: "Participant Roster",
      href: `/dashboard/events/${resolvedParams.id}/operations/participants`,
      icon: Users,
      permission: "participants" as const,
    },
    {
      name: "On-Site Check-In",
      href: `/dashboard/events/${resolvedParams.id}/operations/checkin`,
      icon: CheckSquare,
      permission: "checkIn" as const,
    },
    {
      name: "Financial Reports",
      href: `/dashboard/events/${resolvedParams.id}/operations/finance`,
      icon: BarChart3,
      permission: "finance" as const,
    },
    {
      name: "T-Shirt & Merch",
      href: `/dashboard/events/${resolvedParams.id}/operations/tshirts`,
      icon: Shirt,
      permission: "participants" as const,
    },
    {
      name: "Vouchers",
      href: `/dashboard/events/${resolvedParams.id}/operations/vouchers`,
      icon: Award,
      permission: "eventManagement" as const,
    },
    {
      name: "Templates",
      href: `/dashboard/events/${resolvedParams.id}/operations/templates`,
      icon: FileText,
      permission: "eventManagement" as const,
    },
    {
      name: "Documents",
      href: `/dashboard/events/${resolvedParams.id}/operations/documents`,
      icon: Printer,
      permission: "eventManagement" as const,
    },
  ];

  // Overview is visible to anyone who can see at least one other operations tab.
  const canSeeOverview = Boolean(
    permissions && (permissions.participants || permissions.checkIn || permissions.finance || permissions.eventManagement)
  );
  const permits = (tab: (typeof tabs)[number]) =>
    tab.permission === "overview" ? canSeeOverview : Boolean(permissions?.[tab.permission]);

  const visibleTabs = permissions ? tabs.filter((tab) => permits(tab)) : [];
  // Match the most specific (longest) href first so the index "Overview" route
  // (a prefix of every other tab's href) never shadows a deeper tab match.
  const requestedTab = [...tabs]
    .sort((a, b) => b.href.length - a.href.length)
    .find((tab) => (tab.permission === "overview" ? pathname === tab.href : pathname.startsWith(tab.href)));
  const fallbackTab = visibleTabs[0];
  const shouldRedirect =
    Boolean(permissionsError) ||
    (!isPermissionsLoading && permissions !== undefined && (!requestedTab || !permits(requestedTab) || !fallbackTab));

  useEffect(() => {
    if (!shouldRedirect) return;
    router.replace(fallbackTab?.href ?? "/dashboard/events");
  }, [fallbackTab?.href, router, shouldRedirect]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      tabsRef.current
        ?.querySelector<HTMLElement>('[aria-current="page"]')
        ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  if (isPermissionsLoading || shouldRedirect || !permissions || !fallbackTab) {
    return (
      <div className="flex min-h-64 items-center justify-center" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        <span className="sr-only">Checking event operation access</span>
      </div>
    );
  }

  const currentTab = requestedTab || fallbackTab;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Back Navigation */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-500 print:hidden">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline transition"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Manage Events</span>
        </Link>
        <span className="text-neutral-300 dark:text-neutral-700">/</span>
        <Link
          href={fallbackTab.href}
          className="text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition truncate max-w-50 sm:max-w-none"
        >
          {event?.title || "Event Operations"}
        </Link>
        <span className="text-neutral-300 dark:text-neutral-700">/</span>
        <span className="text-neutral-900 dark:text-neutral-100 font-extrabold">
          {currentTab?.name || "Event operations"}
        </span>
      </nav>

      {/* Event Header Banner */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="min-w-0">
          <span className="text-xs font-extrabold text-primary-500 uppercase tracking-widest block">
            Organizer Operations Control Center
          </span>
          <h1 className="mt-1 overflow-wrap-anywhere text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
            {event?.title || "Event Operations"}
          </h1>
          {event?.venue && (
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 font-medium">
              Venue: {event.venue}, {event.state} &bull; Date: {event.eventDate ? new Date(event.eventDate).toLocaleDateString("en-MY", { dateStyle: "long" }) : "-"}
            </p>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div
        ref={tabsRef}
        role="region"
        aria-label="Event operation sections"
        tabIndex={0}
        className="overflow-x-auto overscroll-x-contain border-b border-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-neutral-800 print:hidden"
      >
        <div className="flex min-w-max gap-2">
          {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
                isActive
                  ? "border-primary-500 text-primary-500 font-bold"
                  : "border-transparent text-neutral-500 hover:text-neutral-850"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </Link>
          );
          })}
        </div>
      </div>

      {/* Sub page render */}
      <div className="py-2">{children}</div>
    </div>
  );
}
