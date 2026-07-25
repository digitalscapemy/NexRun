"use client";

import React from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Shirt, Calendar, Users, ArrowRight } from "lucide-react";

function TshirtsPortalPageContent() {
  const { data: events, isLoading } = trpc.event.getDashboardEvents.useQuery();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
          <Shirt className="h-8 w-8 text-primary-500" />
          <span>T-Shirt & Merchandise Orders</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Select an event to view aggregated size distributions (XS - 4XL), correct sizing typos before printing, and prepare vendor batch sheets.
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
          icon={Shirt}
          title="No Merchandise Orders Yet"
          description="Once runners register and select their event tee sizes, batch aggregates will appear here."
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
                    <Users className="h-4 w-4 text-primary-500" /> Total Shirt Orders
                  </span>
                  <span className="font-extrabold text-neutral-900 dark:text-neutral-100 text-sm">
                    {ev._count.registrations}
                  </span>
                </div>

                <div className="pt-2 border-t flex justify-end">
                  <Button
                    asChild
                    className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Link href={`/dashboard/events/${ev.id}/operations/tshirts`}>
                      Manage Size Batches <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TshirtsPortalPage() {
  return (
    <ErrorBoundary>
      <TshirtsPortalPageContent />
    </ErrorBoundary>
  );
}
