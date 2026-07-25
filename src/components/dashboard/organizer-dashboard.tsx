"use client";

import React from "react";
import { trpc } from "@/lib/trpc";
import { ErrorBoundary } from "@/components/error-boundary";
import { ActionCenter } from "./action-center";
import { DashboardKpiStrip } from "./dashboard-kpi-strip";
import { RegistrationTrendChart } from "./registration-trend-chart";
import { UpcomingEventsSpotlight } from "./upcoming-events-spotlight";
import { RecentRegistrationsList } from "./recent-registrations-list";

export function OrganizerDashboard() {
  const { data, isLoading } = trpc.event.getOrganizerDashboard.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Unable to load dashboard data.</p>
      </div>
    );
  }

  const memberRole = data.workspace.memberRole;
  const hasFinancialAccess = memberRole === "PLATFORM_ADMIN" ||
    ["OWNER", "MANAGER", "FINANCE"].includes(memberRole);

  // Check if new organizer with no events
  const isNewOrganizer = data.kpi.activeEvents === 0 &&
    data.kpi.totalRegistrations === 0 &&
    data.upcomingEvents.length === 0;

  if (isNewOrganizer && memberRole !== "CHECKIN_STAFF") {
    return (
      <div className="space-y-6">
        <div className="text-center py-16 bg-linear-to-br from-primary-50/50 to-white dark:from-primary-950/20 dark:to-neutral-900 border border-primary-200 dark:border-primary-900/50 rounded-3xl">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-3">
            Selamat Datang ke NexRun
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
            Anda belum mencipta sebarang acara lagi. Mulakan dengan mencipta acara pertama anda untuk mula menjual tiket dan mengurus pendaftaran pelari.
          </p>
          {(memberRole === "OWNER" || memberRole === "MANAGER") && (
            <a href="/dashboard/events/create">
              <button className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm">
                Cipta Event Pertama
              </button>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Zone 1: Action Center */}
      <ErrorBoundary>
        <ActionCenter actionItems={data.actionItems} memberRole={memberRole} />
      </ErrorBoundary>

      {/* Zone 2: KPI Strip */}
      <ErrorBoundary>
        <DashboardKpiStrip kpi={data.kpi} memberRole={memberRole} hasFinancialAccess={hasFinancialAccess} />
      </ErrorBoundary>

      {/* Zone 3 & 4: Charts and Spotlight */}
      {memberRole !== "CHECKIN_STAFF" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ErrorBoundary>
            <RegistrationTrendChart
              trend={memberRole === "FINANCE" && data.revenueTrend ? data.revenueTrend : data.registrationTrend}
              isRevenue={memberRole === "FINANCE" && !!data.revenueTrend}
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <UpcomingEventsSpotlight
              events={data.upcomingEvents}
              memberRole={memberRole}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Zone 5: Recent Registrations */}
      {memberRole !== "FINANCE" && memberRole !== "CHECKIN_STAFF" && (
        <ErrorBoundary>
          <RecentRegistrationsList registrations={data.recentRegistrations} />
        </ErrorBoundary>
      )}
    </div>
  );
}
