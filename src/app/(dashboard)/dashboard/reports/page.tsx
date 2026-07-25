"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { ROLES, type RoleType } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Calendar, Users, BarChart3 } from "lucide-react";

function ReportsPortalPageContent() {
  const { data: session } = useSession();
  const userRole = (session?.user?.role as RoleType) || ROLES.USER;
  const isOrganizer = userRole === ROLES.ORGANIZER;
  const isPlatformAdmin = userRole === ROLES.ADMIN || userRole === ROLES.DEVELOPER;
  const { data: workspace } = trpc.settings.getMyWorkspaceContext.useQuery(undefined, {
    enabled: isOrganizer,
    retry: false,
  });
  const canViewFinancialReports =
    isPlatformAdmin ||
    (workspace?.selectedOrganization?.status === "APPROVED" &&
      ["OWNER", "MANAGER", "FINANCE"].includes(workspace.selectedOrganization.memberRole));
  const { data: events, isLoading } = trpc.event.getDashboardEvents.useQuery();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary-500" />
          <span>{canViewFinancialReports ? "Participant Roster & Financial Reports" : "Participant Roster & Exports"}</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {canViewFinancialReports
            ? "Select an event to view participant rosters, export CSV datasets, and audit financial aggregates."
            : "Select an event to view participant rosters and export CSV datasets for race operations."}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2" aria-label="Loading...">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Event Reports Available"
          description="Reports will appear after an event manager creates an event and registrations begin."
          action={{
            label: "Create Event",
            href: "/dashboard/events/create",
          }}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {events.map((ev) => (
            <Card
              key={ev.id}
              className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-150 flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                    {ev.title}
                  </CardTitle>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                    ev.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}>
                    {ev.status}
                  </span>
                </div>
                <CardDescription className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                  <Calendar className="h-3.5 w-3.5 text-primary-500" />
                  <span>{new Date(ev.eventDate).toLocaleDateString("en-MY", { dateStyle: "medium" })}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-2 space-y-4">
                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 border border-neutral-100 dark:border-neutral-800">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Users className="h-4 w-4 text-primary-500" /> Active Runners
                  </span>
                  <span className="font-extrabold text-neutral-900 dark:text-neutral-100 text-sm">
                    {ev._count.registrations}
                  </span>
                </div>

                <div className={`pt-2 border-t ${canViewFinancialReports ? "grid grid-cols-2 gap-2" : "flex"}`}>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full text-xs font-bold py-2.5 rounded-xl border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Link href={`/dashboard/events/${ev.id}/operations/participants`}>
                      <Users className="h-3.5 w-3.5 mr-1 text-primary-500" /> Participant List
                    </Link>
                  </Button>
                  {canViewFinancialReports && (
                    <Button
                      asChild
                      className="w-full bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm"
                    >
                      <Link href={`/dashboard/events/${ev.id}/operations/finance`}>
                        <BarChart3 className="h-3.5 w-3.5 mr-1" /> Financial Report
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPortalPage() {
  return (
    <ErrorBoundary>
      <ReportsPortalPageContent />
    </ErrorBoundary>
  );
}
