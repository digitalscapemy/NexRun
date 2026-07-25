"use client";

import React from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { EventCarousel } from "@/components/public/event-carousel";
import { EventListing } from "@/components/public/event-listing";

import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export default function HomePage() {
  const { data: experience, isLoading: isLoadingExperience } = trpc.settings.getPublicPlatformExperience.useQuery();
  const carouselEnabled = experience?.carousel.enabled ?? true;
  const { data: featuredEvents = [], isLoading } = trpc.event.getFeaturedEvents.useQuery(undefined, { enabled: carouselEnabled });

  return (
    <div className="fluid-container py-8 sm:py-12 space-y-16">
      {/* Hero Carousel */}
      {(isLoadingExperience || carouselEnabled) && (isLoading || isLoadingExperience ? (
        <div className="h-95 w-full animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
      ) : <EventCarousel events={featuredEvents} />)}

      {/* Main Listing Section */}
      <section id="events" className="scroll-mt-24 space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary-500" /> Discover Events
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Find and register for running events near you
          </p>
        </div>
        <EventListing />
      </section>

      {/* Become an Organizer CTA */}
      <section className="bg-linear-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-3xl p-8 sm:p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="space-y-3 max-w-3xl text-center lg:text-left relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-[10px] font-bold uppercase tracking-wider text-primary-400">
            NexRun for Event Directors
          </span>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Are You a Race Organizer?</h3>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Create events, configure early-bird ticket pricing, layout custom race bib structures, issue verified finisher e-certificates, and check-in runners instantly using our smartphone REPC scanning tools.
          </p>
        </div>
        <div className="shrink-0 relative z-10">
          <Button asChild size="lg" className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-6 rounded-2xl shadow-lg shadow-primary-500/20 text-sm transition-all duration-200">
            <Link href="/become-organizer">
              Become an Organizer <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
