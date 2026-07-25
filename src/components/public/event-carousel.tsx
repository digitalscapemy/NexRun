"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface FeaturedEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  bannerImageUrl: string;
  eventDate: Date | string;
  venue: string;
  state: string;
  categories: { priceSen: number }[];
}

export function EventCarousel({ events }: { events: FeaturedEvent[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-neutral-900 text-white p-8 md:p-16 flex flex-col justify-center min-h-[320px] shadow-sm">
        <div className="absolute inset-0 bg-linear-to-br from-primary-600/45 via-neutral-900 to-neutral-950" />
        <div className="relative z-10 max-w-lg">
          <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
            Find your next starting line
          </h2>
          <p className="mt-4 text-neutral-200">
            Browse verified running events across Malaysia, compare categories, and keep every ticket in one account.
          </p>
          <a href="#events" className="mt-6 inline-flex rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-600">Explore events</a>
        </div>
      </div>
    );
  }

  const active = events[currentIndex];
  const lowestPrice = active.categories && active.categories.length > 0
    ? Math.min(...active.categories.map((c) => c.priceSen))
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-neutral-950 text-white min-h-[420px] md:min-h-[520px] 2xl:min-h-[580px] shadow-lg flex items-center transition-all duration-500">
      {/* Banner Background */}
      <div
        className="absolute inset-0 bg-cover bg-[center_35%] bg-no-repeat transition-all duration-500"
        style={{ backgroundImage: `url(${active.bannerImageUrl})` }}
      />
      <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/75 to-neutral-950/20" />

      {/* Content */}
      <div className="relative z-10 p-8 md:p-14 lg:p-16 2xl:p-20 max-w-2xl lg:max-w-3xl 2xl:max-w-4xl">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Featured Event
          </span>
          {lowestPrice !== null && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
              From {formatCurrency(lowestPrice)}
            </span>
          )}
        </div>

        <h2 className="mt-4 text-3xl font-extrabold md:text-5xl tracking-tight transition-all duration-300">
          {active.title}
        </h2>
        <p className="mt-4 text-neutral-300 line-clamp-3 text-sm md:text-base leading-relaxed">
          {active.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-neutral-300">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary-500" />
            <span>
              {new Date(active.eventDate).toLocaleDateString("en-MY", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary-500" />
            <span>
              {active.venue}, {active.state}
            </span>
          </div>
        </div>

        <div className="mt-8">
          <Link href={`/events/${active.slug}`}>
            <button className="flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-3 font-semibold text-white transition hover:bg-primary-600 shadow-lg shadow-primary-500/20 text-sm">
              <span>View Event Details</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* Navigation Indicators */}
      {events.length > 1 && (
        <div className="absolute bottom-6 right-8 flex gap-2 z-20">
          {events.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Show featured event ${idx + 1}`}
              aria-current={idx === currentIndex}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "w-6 bg-primary-500" : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
export default EventCarousel;
