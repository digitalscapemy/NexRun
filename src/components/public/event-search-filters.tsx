"use client";

import React, { useState } from "react";
import { MALAYSIAN_STATES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Navigation, DollarSign, CalendarDays, SlidersHorizontal } from "lucide-react";

interface EventSearchFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  selectedState: string;
  setSelectedState: (val: string) => void;
  distanceFrom: string;
  setDistanceFrom: (val: string) => void;
  distanceTo: string;
  setDistanceTo: (val: string) => void;
  priceFrom: string;
  setPriceFrom: (val: string) => void;
  priceTo: string;
  setPriceTo: (val: string) => void;
  eventDateFrom: string;
  setEventDateFrom: (val: string) => void;
  eventDateTo: string;
  setEventDateTo: (val: string) => void;
}

export function EventSearchFilters({
  search,
  setSearch,
  selectedState,
  setSelectedState,
  distanceFrom,
  setDistanceFrom,
  distanceTo,
  setDistanceTo,
  priceFrom,
  setPriceFrom,
  priceTo,
  setPriceTo,
  eventDateFrom,
  setEventDateFrom,
  eventDateTo,
  setEventDateTo,
}: EventSearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-3">
      {/* Row 1: Search, State, and Advanced Toggle */}
      <div className="flex items-center gap-3 rounded-[28px] border border-neutral-200 bg-white p-3 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 md:p-4">
        {/* Search Input — grows to fill space */}
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
            <Search className="h-4 w-4 text-neutral-400" />
          </div>
          <Input
            aria-label="Search events"
            placeholder="Search by event title, venue, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl border-neutral-200 dark:border-neutral-800 focus-visible:ring-primary-500 bg-neutral-50/50 dark:bg-neutral-950"
          />
        </div>

        {/* State Filter — shrinks to content width */}
        <div className="relative shrink-0">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <MapPin className="h-4 w-4 text-primary-500" />
          </div>
          <select
            aria-label="Filter events by state"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="h-12 pl-9 pr-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer appearance-none font-medium"
          >
            <option value="ALL" className="bg-white dark:bg-neutral-900">All States</option>
            {MALAYSIAN_STATES.map((st) => (
              <option key={st} value={st} className="bg-white dark:bg-neutral-900">
                {st}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-neutral-400 dark:text-neutral-500">
            <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          aria-label="Toggle advanced filters"
          className={`shrink-0 flex items-center gap-2 h-12 px-4 rounded-xl border text-sm font-semibold transition-colors ${
            showAdvanced
              ? "border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-950/30 dark:text-primary-400 dark:border-primary-600"
              : "border-neutral-200 bg-neutral-50/50 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Row 2: Advanced Filters — hidden by default */}
      {showAdvanced && (
        <div className="grid grid-cols-1 gap-4 rounded-[28px] border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 md:grid-cols-3 md:p-6">
          {/* Distance Range */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5" />
              Distance Range (KM)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="From"
                value={distanceFrom}
                onChange={(e) => setDistanceFrom(e.target.value)}
                min="0"
                step="0.1"
                className="h-10 rounded-lg border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-sm"
              />
              <span className="text-neutral-400 text-sm">—</span>
              <Input
                type="number"
                placeholder="To"
                value={distanceTo}
                onChange={(e) => setDistanceTo(e.target.value)}
                min="0"
                step="0.1"
                className="h-10 rounded-lg border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-sm"
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Price Range (RM)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="From"
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                min="0"
                step="0.01"
                className="h-10 rounded-lg border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-sm"
              />
              <span className="text-neutral-400 text-sm">—</span>
              <Input
                type="number"
                placeholder="To"
                value={priceTo}
                onChange={(e) => setPriceTo(e.target.value)}
                min="0"
                step="0.01"
                className="h-10 rounded-lg border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-sm"
              />
            </div>
          </div>

          {/* Event Date Range */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Event Date Range
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={eventDateFrom}
                onChange={(e) => setEventDateFrom(e.target.value)}
                className="h-10 rounded-lg border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-sm"
              />
              <span className="text-neutral-400 text-sm">—</span>
              <Input
                type="date"
                value={eventDateTo}
                onChange={(e) => setEventDateTo(e.target.value)}
                className="h-10 rounded-lg border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default EventSearchFilters;
