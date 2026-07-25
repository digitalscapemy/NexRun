"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ms } from "date-fns/locale";

interface Registration {
  id: string;
  registrationCode: string;
  createdAt: string;
  participantName: string;
  eventTitle: string;
  eventSlug: string;
  categoryName: string;
}

interface RecentRegistrationsListProps {
  registrations: Registration[];
}

export function RecentRegistrationsList({ registrations }: RecentRegistrationsListProps) {
  if (registrations.length === 0) {
    return (
      <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4">
          <h3 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary-500" /> Recent Registrations
          </h3>
        </div>
        <p className="text-sm text-neutral-400 py-6 text-center italic">
          Tiada pendaftaran lagi. Kongsi pautan event untuk mula terima pendaftaran pelari.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4">
        <h3 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary-500" /> Recent Registrations
        </h3>
        <Link href="/dashboard/events" className="text-xs font-bold text-primary-500 hover:underline">
          Lihat Semua &rarr;
        </Link>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
        {registrations.map((reg) => (
          <Link
            key={reg.id}
            href={`/dashboard/events?search=${encodeURIComponent(reg.eventTitle)}`}
            className="py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-3 px-3 rounded-lg transition-colors"
          >
            <div className="flex-1 min-w-0">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 block truncate">
                {reg.participantName}
              </span>
              <span className="text-xs text-neutral-500 block truncate">
                {reg.eventTitle} &bull;{" "}
                <strong className="text-primary-600 dark:text-primary-400">{reg.categoryName}</strong>
              </span>
              <span className="text-xs text-neutral-400 block mt-0.5">
                {formatDistanceToNow(new Date(reg.createdAt), { addSuffix: true, locale: ms })}
              </span>
            </div>
            <span className="text-xs font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg ml-3 shrink-0">
              {reg.registrationCode}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
