"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Plus } from "lucide-react";

interface UpcomingEvent {
  eventId: string;
  title: string;
  slug: string;
  eventDate: string;
  daysUntil: number;
  registrations: number;
  totalMaxSlots: number | null;
  fillRatePercent: number | null;
}

interface UpcomingEventsSpotlightProps {
  events: UpcomingEvent[];
  memberRole: string;
}

export function UpcomingEventsSpotlight({ events, memberRole }: UpcomingEventsSpotlightProps) {
  const canManageEvents = ["OWNER", "MANAGER", "PLATFORM_ADMIN"].includes(memberRole);

  if (events.length === 0) {
    return (
      <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <h3 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base mb-4">
          Event Akan Datang
        </h3>
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <Calendar className="h-12 w-12 text-neutral-300 mb-3" />
          <p className="text-sm text-neutral-500 mb-3">Tiada event akan datang</p>
          {canManageEvents && (
            <Link href="/dashboard/events/create">
              <Button className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl px-4 py-2">
                <Plus className="h-4 w-4 mr-1.5" />
                Cipta Event Baharu
              </Button>
            </Link>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base">
          Event Akan Datang
        </h3>
        <Link href="/dashboard/events" className="text-xs font-bold text-primary-500 hover:underline">
          Lihat Semua &rarr;
        </Link>
      </div>
      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.eventId}
            className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-800/50"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 mb-1">
                  {event.title}
                </h4>
                <p className="text-xs text-neutral-500">
                  {new Date(event.eventDate).toLocaleDateString("ms-MY", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span className="text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2.5 py-1 rounded-lg shrink-0">
                {event.daysUntil} hari lagi
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-neutral-400" />
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                {event.registrations} pendaftaran
                {event.totalMaxSlots !== null && ` / ${event.totalMaxSlots} slot`}
              </span>
            </div>

            {event.fillRatePercent !== null && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    Fill Rate
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {event.fillRatePercent}%
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(event.fillRatePercent, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Link href={`/dashboard/events/${event.eventId}/participants`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-lg">
                  Roster
                </Button>
              </Link>
              <Link href={`/dashboard/events/${event.eventId}/check-in`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-lg">
                  Check-in
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
