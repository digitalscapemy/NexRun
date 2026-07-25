"use client";

import React, { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatStatus } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RegistrationTrendChart } from "@/components/dashboard/registration-trend-chart";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton, DashboardStatSkeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import {
  Users,
  DollarSign,
  Target,
  CheckSquare,
  ArrowRight,
  Pencil,
  CreditCard,
  Printer,
  BarChart3,
  Award,
} from "lucide-react";

const STATUS_BANNER: Record<
  string,
  { color: string; message: (ctx: { registrationCloseDate: Date; activeRegistrations: number; finisherCount: number }) => string }
> = {
  DRAFT: {
    color: "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700",
    message: () => "Draft — not yet submitted for approval.",
  },
  PENDING_APPROVAL: {
    color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
    message: () => "Under admin review. You'll be notified once a decision is made.",
  },
  NEEDS_CHANGES: {
    color: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/50",
    message: () => "Admin requested changes. Review the notes and resubmit.",
  },
  AWAITING_EVENT_FEE: {
    color: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800 font-bold",
    message: () => "Pay the activation invoice to publish this event.",
  },
  PUBLISHED: {
    color: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
    message: (ctx) => `Event active · Registration closes ${ctx.registrationCloseDate.toLocaleDateString("en-MY", { dateStyle: "medium" })}.`,
  },
  REGISTRATION_CLOSED: {
    color: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/50",
    message: (ctx) => `Registration closed · ${ctx.activeRegistrations} participant${ctx.activeRegistrations === 1 ? "" : "s"} registered.`,
  },
  COMPLETED: {
    color: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50",
    message: (ctx) => `Event completed · ${ctx.activeRegistrations} participants · ${ctx.finisherCount} finishers.`,
  },
  CANCELLED: {
    color: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50 line-through",
    message: () => "This event has been cancelled.",
  },
};

function fillRateColor(percent: number | null) {
  if (percent === null) return "bg-primary-400";
  if (percent >= 100) return "bg-rose-500";
  if (percent >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function EventOperationsOverviewPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ErrorBoundary>
      <EventOperationsOverviewContent params={props.params} />
    </ErrorBoundary>
  );
}

function EventOperationsOverviewContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.operational.getEventOverview.useQuery({
    eventId: resolvedParams.id,
  });
  const { data: permissions } = trpc.event.getEventPermissions.useQuery({ eventId: resolvedParams.id });

  const lifecycleMutation = trpc.event.advanceEventLifecycle.useMutation({
    onSuccess: () => {
      toast.success("Event lifecycle updated.");
      utils.operational.getEventOverview.invalidate({ eventId: resolvedParams.id });
      utils.event.getDashboardEvents.invalidate();
    },
    onError: (err) => toast.error(err.message || "Unable to update this event."),
  });

  const handleLifecycle = (action: "CLOSE_REGISTRATION" | "COMPLETE") => {
    const message = action === "CLOSE_REGISTRATION" ? "close registration" : "mark this event as completed";
    if (!confirm(`Are you sure you want to ${message}?`)) return;
    lifecycleMutation.mutate({ eventId: resolvedParams.id, action });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatSkeleton />
          <DashboardStatSkeleton />
          <DashboardStatSkeleton />
          <DashboardStatSkeleton />
        </div>
        <div className="h-64 w-full bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h2 className="text-xl font-bold">Overview Error</h2>
        <p className="mt-2 text-sm text-neutral-500">Failed to load event overview data.</p>
      </div>
    );
  }

  const { event, stats, finance, registrationTrend, categories } = data;
  const banner = STATUS_BANNER[event.status];
  const registrationBaseHref = `/dashboard/events/${resolvedParams.id}/operations`;

  return (
    <div className="space-y-6">
      {/* ZONE 1 — Status banner */}
      {banner && (
        <div className={`rounded-2xl border p-4 text-sm font-semibold ${banner.color}`}>
          <span className="mr-2 rounded-md bg-white/60 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide dark:bg-black/20">
            {formatStatus(event.status)}
          </span>
          {banner.message({
            registrationCloseDate: new Date(event.registrationCloseDate),
            activeRegistrations: stats.activeRegistrations,
            finisherCount: stats.finisherCount,
          })}
        </div>
      )}

      {/* ZONE 2 — KPI summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">Registered</span>
            <Users className="h-5 w-5 text-primary-500" />
          </div>
          <p className="text-2xl font-black text-neutral-900 dark:text-neutral-50">{stats.activeRegistrations}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {stats.totalCapacity !== null
              ? `of ${stats.totalCapacity} total slots`
              : "unlimited capacity"}
          </p>
        </Card>

        {finance && (
          <Card className="border border-primary-200 dark:border-primary-900/50 bg-linear-to-br from-primary-50/50 to-white dark:from-primary-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary-600 dark:text-primary-400">Net Revenue</span>
              <DollarSign className="h-5 w-5 text-primary-500" />
            </div>
            <p className="text-2xl font-black text-neutral-900 dark:text-neutral-50">{formatCurrency(finance.organizerNetSen)}</p>
            <p className="mt-1 text-xs text-neutral-500">Gross {formatCurrency(finance.totalPaidSen)} · {finance.ordersCount} orders</p>
          </Card>
        )}

        {stats.fillRatePercent !== null && (
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">Fill Rate</span>
              <Target className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-neutral-900 dark:text-neutral-50">{stats.fillRatePercent}%</p>
            <p className="mt-1 text-xs text-neutral-500">across active categories</p>
          </Card>
        )}

        {["PUBLISHED", "REGISTRATION_CLOSED", "COMPLETED"].includes(event.status) && (
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">
                {event.status === "COMPLETED" ? "Finishers" : "Checked In"}
              </span>
              <CheckSquare className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-neutral-900 dark:text-neutral-50">
              {event.status === "COMPLETED" ? stats.finisherCount : stats.checkedIn}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              of {stats.activeRegistrations} registered
            </p>
          </Card>
        )}
      </div>

      {/* ZONE 3 & 4 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RegistrationTrendChart trend={registrationTrend} />

        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm">
          <h3 className="mb-4 text-base font-extrabold text-neutral-900 dark:text-neutral-100">Category Fill Rates</h3>
          {categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">No active categories. Add categories when editing the event.</p>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {category.name} <span className="text-neutral-400">({category.distance}KM)</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-neutral-500">
                      {category.maxSlots !== null
                        ? `${category.currentRegistrations} / ${category.maxSlots}`
                        : `${category.currentRegistrations} registered (unlimited)`}
                      {category.isSoldOut && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          SOLD OUT
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className={`h-full rounded-full ${fillRateColor(category.fillRatePercent)}`}
                      style={{ width: category.fillRatePercent !== null ? `${Math.min(100, category.fillRatePercent)}%` : "100%" }}
                    />
                  </div>
                </div>
              ))}
              {permissions?.participants && (
                <Link
                  href={`${registrationBaseHref}/participants`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline dark:text-primary-400"
                >
                  View all participants <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ZONE 5 — Quick actions */}
      <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm">
        <h3 className="mb-4 text-base font-extrabold text-neutral-900 dark:text-neutral-100">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          {permissions?.participants && (
            <Link href={`${registrationBaseHref}/participants`}>
              <Button variant="outline" className="gap-2 rounded-xl text-xs font-bold">
                <Users className="h-3.5 w-3.5" /> View Roster
              </Button>
            </Link>
          )}
          {permissions?.eventManagement && (
            <Link href={`/dashboard/events/${resolvedParams.id}/edit`}>
              <Button variant="outline" className="gap-2 rounded-xl text-xs font-bold">
                <Pencil className="h-3.5 w-3.5" /> Edit Event
              </Button>
            </Link>
          )}
          {permissions?.checkIn && ["PUBLISHED", "REGISTRATION_CLOSED"].includes(event.status) && (
            <Link href={`${registrationBaseHref}/checkin`}>
              <Button variant="outline" className="gap-2 rounded-xl text-xs font-bold">
                <CheckSquare className="h-3.5 w-3.5" /> Open Check-in Desk
              </Button>
            </Link>
          )}
          {permissions?.eventManagement && event.status === "PUBLISHED" && (
            <Button
              variant="outline"
              onClick={() => handleLifecycle("CLOSE_REGISTRATION")}
              disabled={lifecycleMutation.isPending}
              className="gap-2 rounded-xl text-xs font-bold"
            >
              Close Registration
            </Button>
          )}
          {permissions?.eventManagement && event.status === "REGISTRATION_CLOSED" && (
            <Button
              variant="outline"
              onClick={() => handleLifecycle("COMPLETE")}
              disabled={lifecycleMutation.isPending}
              className="gap-2 rounded-xl text-xs font-bold"
            >
              Mark Event Completed
            </Button>
          )}
          {permissions?.eventManagement && event.status === "COMPLETED" && (
            <Link href={`${registrationBaseHref}/documents`}>
              <Button variant="outline" className="gap-2 rounded-xl text-xs font-bold">
                <Printer className="h-3.5 w-3.5" /> Generate Documents
              </Button>
            </Link>
          )}
          {permissions?.finance && (
            <Link href={`${registrationBaseHref}/finance`}>
              <Button variant="outline" className="gap-2 rounded-xl text-xs font-bold">
                <BarChart3 className="h-3.5 w-3.5" /> Financial Reports
              </Button>
            </Link>
          )}
          {event.status === "AWAITING_EVENT_FEE" && permissions?.eventManagement && (
            <Link href="/dashboard/event-fees">
              <Button className="gap-2 rounded-xl bg-orange-600 text-xs font-bold text-white hover:bg-orange-700">
                <CreditCard className="h-3.5 w-3.5" /> Pay Activation Fee
              </Button>
            </Link>
          )}
          {event.status === "COMPLETED" && permissions?.participants && (
            <Link href={`${registrationBaseHref}/participants`}>
              <Button variant="outline" className="gap-2 rounded-xl text-xs font-bold">
                <Award className="h-3.5 w-3.5" /> Confirm Finishers
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
