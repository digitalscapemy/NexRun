"use client";

import React, { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatStatus } from "@/lib/utils";
import { Calendar, MapPin, Clock, Award, ShieldAlert, ShieldCheck, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: event, isLoading, error } = trpc.event.getEventBySlug.useQuery({
    slug: resolvedParams.id,
  });

  if (isLoading) {
    return (
      <div className="fluid-container py-12">
        <div className="mx-auto max-w-5xl space-y-8 animate-pulse">
          <div className="h-90 w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-8 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
          <div className="h-24 w-full bg-neutral-200 dark:bg-neutral-800 rounded-md" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="fluid-container py-24">
        <div className="mx-auto max-w-md text-center">
          <ShieldAlert className="h-12 w-12 text-error-500 mx-auto" />
          <h2 className="mt-4 text-xl font-bold">Event Not Found</h2>
          <p className="mt-2 text-sm text-neutral-500">
            The requested running event does not exist or has been removed.
          </p>
          <Link href="/events" className="mt-6 inline-block text-primary-500 font-semibold hover:underline">
            &larr; Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const regOpen = new Date(event.registrationOpenDate);
  const regClose = new Date(event.registrationCloseDate);
  const isRegistrationOpen =
    event.status === "PUBLISHED" && now >= regOpen && now <= regClose;
  const isSoldOut = event.categories.length > 0 && event.categories.every(
    (category) => category.maxSlots !== null && category.currentRegistrations >= category.maxSlots
  );
  const registrationLabel = event.status === "COMPLETED"
    ? "Event completed"
    : event.status === "REGISTRATION_CLOSED"
      ? "Registration closed"
      : event.status !== "PUBLISHED"
        ? `Private preview · ${formatStatus(event.status)}`
        : isSoldOut
          ? "Sold out"
          : now < regOpen
            ? "Registration opens soon"
            : isRegistrationOpen
              ? "Registration open"
              : "Registration closed";

  const isEarlyBirdActive = (cat: { earlyBirdPriceSen: number | null; earlyBirdDeadline: Date | string | null }) => {
    if (!cat.earlyBirdPriceSen || !cat.earlyBirdDeadline) return false;
    return now <= new Date(cat.earlyBirdDeadline);
  };

  return (
    <div className="fluid-container py-8 sm:py-12 space-y-8 sm:space-y-12">
      {/* 1. Large Event Banner - Styled to match Main Page Hero Carousel */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-neutral-950 text-white min-h-[420px] md:min-h-[520px] 2xl:min-h-[580px] shadow-lg flex items-center transition-all">
        {/* Banner Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-[center_35%] bg-no-repeat transition-all duration-500"
          style={{ backgroundImage: `url(${event.bannerImageUrl})` }}
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/75 to-neutral-950/20" />

        {/* Content Overlay */}
        <div className="relative z-10 p-6 sm:p-10 md:p-14 lg:p-16 2xl:p-20 max-w-2xl lg:max-w-3xl 2xl:max-w-4xl w-full">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-500 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-xs">
              {registrationLabel}
            </span>
            <span className="rounded-full bg-white/20 backdrop-blur-xs px-3 py-1 text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">
              Hosted by {event.organization.companyName}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold md:text-5xl tracking-tight text-white leading-tight">
            {event.title}
          </h1>

          <div className="mt-6 flex flex-wrap gap-4 text-xs sm:text-sm text-neutral-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary-500 shrink-0" />
              <span>
                {new Date(event.eventDate).toLocaleDateString("en-MY", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary-500 shrink-0" />
              <span>
                {event.venue}, {event.state}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Page Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3 2xl:grid-cols-4">
        {/* Left Side: General details, categories table, description */}
        <div className="lg:col-span-2 2xl:col-span-3 space-y-8">
          {/* Metadata Card */}
          <div className="grid gap-4 sm:grid-cols-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
            <div className="flex gap-3">
              <Calendar className="h-5 w-5 text-primary-500 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Race Day</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  {new Date(event.eventDate).toLocaleDateString("en-MY", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-primary-500 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Schedule</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  {event.startTime} - {event.endTime}
                </span>
              </div>
            </div>
            <div className="flex gap-3 min-w-0">
              <MapPin className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Venue</span>
                <span
                  title={`${event.venue}, ${event.state}`}
                  className="text-sm font-bold text-neutral-800 dark:text-neutral-200 block break-words"
                >
                  {event.venue}, {event.state}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Category Table */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary-500" />
              <span>Available Categories & Pricing</span>
            </h2>
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-bold uppercase text-neutral-500">
                      <th className="px-6 py-4">Category</th>
                      <th className="px-4 py-4 text-center">Distance</th>
                      <th className="px-4 py-4 text-center">Age Range</th>
                      <th className="px-4 py-4 text-center">Gender</th>
                      <th className="px-4 py-4 text-center">Slots</th>
                      <th className="px-6 py-4 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
                    {event.categories.map((cat) => {
                      const earlyBirdActive = isEarlyBirdActive(cat);
                      return (
                        <tr key={cat.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                          <td className="px-6 py-4 font-bold text-neutral-900 dark:text-neutral-50">
                            {cat.name}
                          </td>
                          <td className="px-4 py-4 text-center font-medium">{cat.distance}KM</td>
                          <td className="px-4 py-4 text-center font-medium">
                            {cat.ageMin} - {cat.ageMax} yrs
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-block rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-semibold uppercase">
                              {cat.gender}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {cat.maxSlots ? (
                              <span className="font-semibold">
                                {Math.max(0, cat.maxSlots - cat.currentRegistrations)} left
                              </span>
                            ) : (
                              "Unlimited"
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {earlyBirdActive ? (
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-primary-500">
                                    {formatCurrency(cat.earlyBirdPriceSen!)}
                                  </span>
                                  <span className="rounded bg-error-500/10 px-1 py-0.5 text-[9px] font-bold text-error-600">
                                    EB
                                  </span>
                                </div>
                                <span className="text-xs text-neutral-400 line-through">
                                  {formatCurrency(cat.priceSen)}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-neutral-900 dark:text-neutral-50">
                                {formatCurrency(cat.priceSen)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Description & Notes */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              Event Description & Terms
            </h2>
            <div className="prose dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed space-y-4">
              <ReactMarkdown>{event.description}</ReactMarkdown>
              {event.termsNotes && (
                <div className="mt-6 border-t border-neutral-200 dark:border-neutral-800 pt-6">
                  <h4 className="font-bold text-neutral-900 dark:text-neutral-50 mb-2">Important Rules:</h4>
                  <ReactMarkdown>{event.termsNotes}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Timeline & CTA Action card */}
        <div className="space-y-6 lg:col-span-1">
          {/* Action Card */}
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm rounded-2xl">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-neutral-400 uppercase tracking-wider block">Registration Closing</span>
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  {new Date(event.registrationCloseDate).toLocaleDateString("en-MY", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {isRegistrationOpen && !isSoldOut ? (
                <Link
                  href={`/events/${event.slug}/register`}
                  className="flex w-full items-center justify-center rounded-xl bg-primary-500 py-3.5 text-center font-bold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition"
                >
                  REGISTER NOW
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full rounded-xl bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-600 py-3.5 text-center font-bold cursor-not-allowed"
                >
                  {event.status === "COMPLETED"
                    ? "EVENT COMPLETED"
                    : isSoldOut
                      ? "SOLD OUT"
                      : "REGISTRATION CLOSED"}
                </button>
              )}

              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-2 text-xs text-neutral-400">
                <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success-600" /> Verified organizer: {event.organization.companyName}</p>
                <p>Contact PIC: {event.organization.email}</p>
                {event.locationMapUrl && (
                  <a href={event.locationMapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-semibold text-primary-600 hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> Open venue map
                  </a>
                )}
              </div>
            </div>
          </Card>

          {/* Event Timeline / Schedule */}
          {event.timelineItems.length > 0 && (
            <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm rounded-2xl">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50 mb-6">
                Event Timeline
              </h3>
              <div className="relative border-l-2 border-neutral-200 dark:border-neutral-800 ml-2.5 pl-6 space-y-6">
                {event.timelineItems.map((item) => (
                  <div key={item.id} className="relative">
                    {/* Circle Node accurately centered on the vertical timeline line */}
                    <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary-500 shadow-xs dark:border-neutral-900 ring-2 ring-primary-500/20" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 block">
                        {new Date(item.timestamp).toLocaleDateString("en-MY", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        •{" "}
                        {new Date(item.timestamp).toLocaleTimeString("en-MY", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                        {item.title}
                      </h4>
                      {item.location && (
                        <span className="text-xs text-neutral-500 block">@ {item.location}</span>
                      )}
                      {item.description && (
                        <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
