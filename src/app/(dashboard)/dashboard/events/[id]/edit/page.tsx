"use client";

import React, { use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { EventForm } from "@/components/forms/event-form";
import type { EventFormInput } from "@/lib/validation/event";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function EditEventPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ErrorBoundary>
      <EditEventPageContent {...props} />
    </ErrorBoundary>
  );
}

function EditEventPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const router = useRouter();
  const utils = trpc.useUtils();

  // Query event details
  const { data: event, isLoading, error } = trpc.event.getEventById.useQuery({ eventId });

  // Update mutation
  const updateMutation = trpc.event.updateEvent.useMutation({
    onSuccess: () => {
      toast.success("Event updated successfully!");
      utils.event.getEventById.invalidate({ eventId });
      router.push("/dashboard/events");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update event.");
    },
  });

  const formatDateTimeLocal = (dateInput: Date | string | null | undefined) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const handleSubmit = (data: EventFormInput) => {
    const formattedCategories = data.categories.map((cat) => ({
      ...cat,
      earlyBirdDeadline: cat.earlyBirdDeadline ? new Date(cat.earlyBirdDeadline).toISOString() : null,
      startSaleDate: cat.startSaleDate ? new Date(cat.startSaleDate).toISOString() : undefined,
      endSaleDate: cat.endSaleDate ? new Date(cat.endSaleDate).toISOString() : undefined,
    }));

    const formattedTimeline = data.timelineItems.map((item) => ({
      ...item,
      timestamp: new Date(item.timestamp).toISOString(),
    }));

    updateMutation.mutate({
      ...data,
      eventId,
      eventDate: new Date(data.eventDate).toISOString(),
      registrationOpenDate: new Date(data.registrationOpenDate).toISOString(),
      registrationCloseDate: new Date(data.registrationCloseDate).toISOString(),
      ageReferenceDate: new Date(data.ageReferenceDate).toISOString(),
      categories: formattedCategories,
      timelineItems: formattedTimeline,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl">
          <CardHeader>
            <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
            <CardTitle className="mt-4 text-xl font-bold">Error Loading Event</CardTitle>
            <CardDescription className="mt-2 text-sm text-neutral-500">
              {error?.message || "The event could not be found or you do not have permission to edit it."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/events")} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold w-full">
              Back to Events List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-fill initial form state
  const initialData: EventFormInput = {
    title: event.title,
    slug: event.slug,
    description: event.description,
    bannerImageUrl: event.bannerImageUrl,
    eventDate: formatDateTimeLocal(event.eventDate),
    startTime: event.startTime,
    endTime: event.endTime,
    venue: event.venue,
    fullAddress: event.fullAddress,
    state: event.state,
    locationMapUrl: event.locationMapUrl || "",
    registrationOpenDate: formatDateTimeLocal(event.registrationOpenDate),
    registrationCloseDate: formatDateTimeLocal(event.registrationCloseDate),
    repcDate: event.repcDate,
    repcTime: event.repcTime,
    repcLocation: event.repcLocation,
    ageReferenceDate: formatDateTimeLocal(event.ageReferenceDate),
    featured: event.featured,
    termsNotes: event.termsNotes || "",
    categories: event.categories.map((c) => ({
      name: c.name,
      distance: c.distance,
      ageMin: c.ageMin,
      ageMax: c.ageMax,
      gender: c.gender,
      priceSen: c.priceSen,
      earlyBirdPriceSen: c.earlyBirdPriceSen,
      earlyBirdDeadline: c.earlyBirdDeadline ? formatDateTimeLocal(c.earlyBirdDeadline) : null,
      startSaleDate: c.startSaleDate ? formatDateTimeLocal(c.startSaleDate) : null,
      endSaleDate: c.endSaleDate ? formatDateTimeLocal(c.endSaleDate) : null,
      maxSlots: c.maxSlots,
      isActive: c.isActive,
    })),
    timelineItems: event.timelineItems.map((t, idx) => ({
      title: t.title,
      timestamp: formatDateTimeLocal(t.timestamp),
      location: t.location || "",
      description: t.description || "",
      orderIndex: idx,
    })),
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Edit Running Event
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Modify event information, pricing tiers, and timeline milestones.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/events")} variant="outline" className="rounded-xl flex items-center gap-1.5 text-xs font-bold">
          <ArrowLeft className="h-4 w-4" /> Cancel
        </Button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 p-4 rounded-xl flex gap-3 text-xs text-amber-800 dark:text-amber-300">
        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 animate-pulse" />
        <p className="font-semibold">
          IMPORTANT: Updating this event will reset its status back to DRAFT. You will need to submit it for administrator review again before tickets are available.
        </p>
      </div>

      <EventForm initialData={initialData} onSubmit={handleSubmit} loading={updateMutation.isPending} />
    </div>
  );
}
