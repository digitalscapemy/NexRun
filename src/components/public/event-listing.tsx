"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { EventCard } from "./event-card";
import { EventSearchFilters } from "./event-search-filters";
import { Calendar, Compass } from "lucide-react";

export function EventListing() {
  const [tab, setTab] = useState<"UPCOMING" | "PAST">("UPCOMING");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedState, setSelectedState] = useState("ALL");
  const [distanceFrom, setDistanceFrom] = useState("");
  const [distanceTo, setDistanceTo] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [eventDateFrom, setEventDateFrom] = useState("");
  const [eventDateTo, setEventDateTo] = useState("");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Query events
  const { data, isLoading } = trpc.event.getPublishedEvents.useQuery({
    tab,
    search: debouncedSearch,
    state: selectedState,
    distanceFrom: distanceFrom.trim() !== "" ? parseFloat(distanceFrom) : undefined,
    distanceTo: distanceTo.trim() !== "" ? parseFloat(distanceTo) : undefined,
    priceFrom: priceFrom.trim() !== "" ? Math.round(parseFloat(priceFrom) * 100) : undefined,
    priceTo: priceTo.trim() !== "" ? Math.round(parseFloat(priceTo) * 100) : undefined,
    eventDateFrom: eventDateFrom.trim() !== "" ? eventDateFrom : undefined,
    eventDateTo: eventDateTo.trim() !== "" ? eventDateTo : undefined,
  });

  return (
    <div className="space-y-6">
      {/* Listing Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setTab("UPCOMING")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
            tab === "UPCOMING"
              ? "border-primary-500 text-primary-500 font-bold"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>Upcoming Events</span>
        </button>
        <button
          onClick={() => setTab("PAST")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
            tab === "PAST"
              ? "border-primary-500 text-primary-500 font-bold"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Past Events</span>
        </button>
      </div>

      {/* Search and Filters */}
      <EventSearchFilters
        search={search}
        setSearch={setSearch}
        selectedState={selectedState}
        setSelectedState={setSelectedState}
        distanceFrom={distanceFrom}
        setDistanceFrom={setDistanceFrom}
        distanceTo={distanceTo}
        setDistanceTo={setDistanceTo}
        priceFrom={priceFrom}
        setPriceFrom={setPriceFrom}
        priceTo={priceTo}
        setPriceTo={setPriceTo}
        eventDateFrom={eventDateFrom}
        setEventDateFrom={setEventDateFrom}
        eventDateTo={eventDateTo}
        setEventDateTo={setEventDateTo}
      />

      {/* Grid List */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {[...Array(6)].map((_, idx) => (
            <div
              key={idx}
              className="h-80 w-full animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          {tab === "PAST" ? (
            <Calendar className="h-12 w-12 text-neutral-400 mx-auto" />
          ) : (
            <Compass className="h-12 w-12 text-neutral-400 mx-auto" />
          )}
          <h3 className="mt-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {tab === "PAST" ? "No past events found" : "No upcoming events found"}
          </h3>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {tab === "PAST"
              ? "Try adjusting your search or filters to explore the event archive."
              : "Try adjusting your search or filters to discover upcoming races."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {data.items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
export default EventListing;
