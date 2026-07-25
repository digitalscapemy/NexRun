"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { ROLES, type RoleType } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Shield,
  Compass,
  Wrench,
  Calendar,
  Ticket,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { OrganizerDashboard } from "@/components/dashboard/organizer-dashboard";
import { AdminAnalytics } from "@/components/dashboard/admin-analytics";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DashboardStatSkeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardPageContent />
    </ErrorBoundary>
  );
}

function DashboardPageContent() {
  const { data: session } = useSession();
  const userRole = (session?.user?.role as RoleType) || ROLES.USER;
  const userName = session?.user?.name || "User";

  const { data: stats, isLoading } = trpc.event.getDashboardStats.useQuery();
  const isOrganizer = userRole === ROLES.ORGANIZER;
  const { data: workspace } = trpc.settings.getMyWorkspaceContext.useQuery(undefined, {
    enabled: isOrganizer,
    retry: false,
  });
  const hasApprovedWorkspace = workspace?.selectedOrganization?.status === "APPROVED";

  const renderRoleOverview = () => {
    if (isLoading) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <DashboardStatSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (userRole === ROLES.DEVELOPER || userRole === ROLES.ADMIN) {
      return (
        <div className="space-y-8">
          {/* Analytics Section */}
          <AdminAnalytics />

          {/* Pending Approval Notice */}
          {(stats?.pendingEventsCount || 0) > 0 && (
            <Card className="border-2 border-warning-500/40 bg-warning-500/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-warning-600 dark:text-warning-400 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-sm">
                    {stats?.pendingEventsCount} Event(s) Awaiting Admin Moderation
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Organizers have submitted draft events. Review and approve to publish them on the active races portal.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/events">
                <Button size="sm" className="bg-warning-600 hover:bg-warning-700 text-white font-bold rounded-xl shrink-0">
                  Review Events <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </Card>
          )}

          {/* Quick Actions & Recent Activity Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <h3 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary-500" /> Recent System Registrations
                </h3>
                <Link href="/dashboard/events" className="text-xs font-bold text-primary-500 hover:underline">
                  View All &rarr;
                </Link>
              </div>

              {!stats?.recentRegistrations || stats.recentRegistrations.length === 0 ? (
                <p className="text-sm text-neutral-400 py-6 text-center italic">
                  No recent registrations recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                  {stats.recentRegistrations.map((reg) => (
                    <div key={reg.id || reg.registrationCode} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                          {reg.participantProfile?.fullName || "Runner"}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {reg.event?.title} &bull; <strong className="text-primary-600 dark:text-primary-400">{reg.ticketCategory?.name}</strong>
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                        {reg.registrationCode}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900 shadow-sm space-y-4">
              <h3 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                {userRole === ROLES.DEVELOPER ? (
                  <>
                    <Wrench className="h-4 w-4 text-purple-500" /> Developer Mode
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 text-rose-500" /> Admin Control Hub
                  </>
                )}
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {userRole === ROLES.DEVELOPER
                  ? "Full 100% privileges enabled. You can inspect all events, moderate submissions, and access debug logs across all portals."
                  : "Review events, moderate organizer verification requests, and monitor gross platform sales."}
              </p>
              <div className="space-y-2 pt-2">
                <Link href="/dashboard/events" className="block">
                  <Button variant="outline" className="w-full justify-between font-bold text-xs rounded-xl h-10">
                    <span>Manage & Moderate Events</span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                  </Button>
                </Link>
                <Link href="/dashboard/settings" className="block">
                  <Button variant="outline" className="w-full justify-between font-bold text-xs rounded-xl h-10">
                    <span>Platform & System Settings</span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    if (userRole === ROLES.ORGANIZER) {
      // Check if workspace is unapproved - keep onboarding CTA
      if (!hasApprovedWorkspace) {
        return (
          <div className="text-center py-16 bg-linear-to-br from-primary-50/50 to-white dark:from-primary-950/20 dark:to-neutral-900 border border-primary-200 dark:border-primary-900/50 rounded-3xl">
            <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-3">
              Complete Your Organizer Profile
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
              Your organizer application is pending approval. Complete your profile to start creating events.
            </p>
            <Link href="/dashboard/organizer-onboarding">
              <Button className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm">
                Complete Organizer Setup
              </Button>
            </Link>
          </div>
        );
      }

      // Render new dashboard for approved workspaces
      return <OrganizerDashboard />;
    }

    // Default: USER Role Hub
    return (
      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <Card className="border border-primary-200 dark:border-primary-900/50 bg-linear-to-br from-primary-50/50 to-white dark:from-primary-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                Total Registrations
              </span>
              <Ticket className="h-5 w-5 text-primary-500" />
            </div>
            <p className="text-3xl font-black text-neutral-900 dark:text-neutral-50">
              {stats?.totalRegistrations || 0}
            </p>
            <p className="mt-1 text-xs text-neutral-500">All registered race tickets</p>
          </Card>

          <Card className="border border-blue-200 dark:border-blue-900/50 bg-linear-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Upcoming Races
              </span>
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-black text-neutral-900 dark:text-neutral-50">
              {stats?.upcomingCount || 0}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Races scheduled ahead</p>
          </Card>

          <Card className="border border-emerald-200 dark:border-emerald-900/50 bg-linear-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Completed Runs
              </span>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-neutral-900 dark:text-neutral-50">
              {stats?.completedCount || 0}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Finisher certificate eligible</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary-500" /> My Recent Registrations & E-Tickets
              </h3>
              <Link href="/dashboard/registrations" className="text-xs font-bold text-primary-500 hover:underline">
                View All E-Tickets &rarr;
              </Link>
            </div>

            {!stats?.recentRegistrations || stats.recentRegistrations.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-neutral-500">You have not registered for any races yet.</p>
                <Link href="/">
                  <Button className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl px-6">
                    Explore Active Races
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                {stats.recentRegistrations.map((reg) => (
                  <div key={reg.id || reg.registrationCode} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                        {reg.event?.title}
                      </span>
                      <span className="text-xs text-neutral-500">
                        Category: <strong className="text-primary-600 dark:text-primary-400">{reg.ticketCategory?.name}</strong> &bull; Code: {reg.registrationCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/verify/registration/${reg.registrationCode}`}>
                        <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl h-8">
                          QR E-Ticket
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900 shadow-sm space-y-4">
            <h3 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <Compass className="h-4 w-4 text-primary-500" /> Runner Shortcuts
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Explore upcoming running events around Malaysia, access your official QR E-Tickets for REPC check-in, and download your finisher e-certificates.
            </p>
            <div className="space-y-2 pt-2">
              <Link href="/" className="block">
                <Button className="w-full justify-between bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl h-10 shadow-sm">
                  <span>Explore Active Races</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard/registrations" className="block">
                <Button variant="outline" className="w-full justify-between font-bold text-xs rounded-xl h-10">
                  <span>My Registrations & E-Tickets</span>
                  <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-linear-to-r from-neutral-900 to-neutral-800 dark:from-neutral-950 dark:to-neutral-900 text-white p-6 sm:p-8 rounded-3xl shadow-md">
        <div className="space-y-1">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> NexRun Portal Overview
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Welcome, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300">
            Current Active Role: <strong className="text-primary-300 uppercase font-mono">{userRole}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/10 text-xs font-bold uppercase tracking-wider text-white">
            {userRole} Dashboard
          </span>
        </div>
      </div>

      {renderRoleOverview()}
    </div>
  );
}
