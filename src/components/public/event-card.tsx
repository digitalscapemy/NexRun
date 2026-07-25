import React from "react";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface EventCardProps {
  event: {
    id: string;
    title: string;
    slug: string;
    bannerImageUrl: string;
    eventDate: Date | string;
    registrationOpenDate: Date | string;
    registrationCloseDate: Date | string;
    venue: string;
    state: string;
    status: string;
    categories: {
      id: string;
      name: string;
      distance: number;
      priceSen: number;
      earlyBirdPriceSen: number | null;
      earlyBirdDeadline: Date | string | null;
      maxSlots: number | null;
      currentRegistrations: number;
    }[];
    organization: {
      companyName: string;
    };
  };
}

export function EventCard({ event }: EventCardProps) {
  const now = new Date();
  const lowestPrice = event.categories.length > 0
    ? Math.min(...event.categories.map((category) =>
        category.earlyBirdPriceSen !== null && category.earlyBirdDeadline && now <= new Date(category.earlyBirdDeadline)
          ? category.earlyBirdPriceSen
          : category.priceSen
      ))
    : null;

  const distances = Array.from(new Set(event.categories.map((c) => c.distance))).sort((a, b) => b - a);

  const soldOut = event.categories.length > 0 && event.categories.every(
    (category) => category.maxSlots !== null && category.currentRegistrations >= category.maxSlots
  );

  const getStatusBadge = (status: string) => {
    if (status === "COMPLETED") return <span className="bg-info-500/10 text-info-600 dark:text-info-400 border border-info-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">Completed</span>;
    if (status === "REGISTRATION_CLOSED") return <span className="bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">Closed</span>;
    if (status === "CANCELLED") return <span className="bg-error-500/10 text-error-600 dark:text-error-400 border border-error-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">Cancelled</span>;
    if (soldOut) return <span className="bg-error-500/10 text-error-600 border border-error-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">Sold out</span>;
    if (now < new Date(event.registrationOpenDate)) return <span className="bg-info-500/10 text-info-600 border border-info-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">Opens soon</span>;
    if (now > new Date(event.registrationCloseDate)) return <span className="bg-neutral-500/10 text-neutral-600 border border-neutral-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">Closed</span>;
    switch (status) {
      case "PUBLISHED":
        return <span className="bg-success-500/10 text-success-600 dark:text-success-400 border border-success-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">Open</span>;
      default:
        return <span className="bg-warning-500/10 text-warning-600 dark:text-warning-400 border border-warning-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs transition-all duration-150 hover:-translate-y-1 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      {/* Banner */}
      <Link href={`/events/${event.slug}`} className="relative aspect-video w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.bannerImageUrl}
          alt={event.title}
          className="h-full w-full object-cover object-center transition group-hover:scale-105"
        />
        <div className="absolute top-4 left-4 flex gap-1">
          {getStatusBadge(event.status)}
        </div>
      </Link>

      {/* Details */}
      <div className="flex flex-1 flex-col p-5">
        {/* Distances tags */}
        <div className="flex flex-wrap gap-1.5">
          {distances.map((dist) => (
            <span
              key={dist}
              className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:text-neutral-400"
            >
              {dist}KM
            </span>
          ))}
        </div>

        <Link href={`/events/${event.slug}`} className="mt-3 block">
          <h3 className="line-clamp-1 text-base font-bold text-neutral-900 dark:text-neutral-50 group-hover:text-primary-500 transition">
            {event.title}
          </h3>
        </Link>
        <p className="mt-1 text-[11px] text-neutral-400">
          Hosted by {event.organization.companyName}
        </p>

        {/* Date / Location details */}
        <div className="mt-4 space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary-500" />
            <span>
              {new Date(event.eventDate).toLocaleDateString("en-MY", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary-500" />
            <span className="truncate">{event.venue}, {event.state}</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <div>
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Price</span>
            <span className="text-sm font-extrabold text-primary-500">
              {lowestPrice !== null ? `From ${formatCurrency(lowestPrice)}` : "Free"}
            </span>
          </div>
          <Link href={`/events/${event.slug}`}>
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-primary-500 transition">
              Details &rarr;
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
export default EventCard;
