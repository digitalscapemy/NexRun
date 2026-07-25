"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { EventForm } from "@/components/forms/event-form";
import type { EventFormInput } from "@/lib/validation/event";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function CreateEventPage() {
  return (
    <ErrorBoundary>
      <CreateEventPageContent />
    </ErrorBoundary>
  );
}

function CreateEventPageContent() {
  const router = useRouter();

  const createMutation = trpc.event.createEvent.useMutation({
    onSuccess: () => {
      // Clear localStorage draft on successful submission
      localStorage.removeItem("event-form-draft");
      localStorage.removeItem("event-form-draft-timestamp");
      toast.success("Event draft created successfully!");
      router.push("/dashboard/events");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create event draft.");
    },
  });

  const handleSubmit = (data: EventFormInput) => {
    // Convert date string timestamps to ISO Strings to satisfy Zod datetime checks
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

    createMutation.mutate({
      ...data,
      eventDate: new Date(data.eventDate).toISOString(),
      registrationOpenDate: new Date(data.registrationOpenDate).toISOString(),
      registrationCloseDate: new Date(data.registrationCloseDate).toISOString(),
      ageReferenceDate: new Date(data.ageReferenceDate).toISOString(),
      categories: formattedCategories,
      timelineItems: formattedTimeline,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Create Running Event
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Draft a new event and specify pricing categories & timeline milestones
        </p>
      </div>
      <EventForm onSubmit={handleSubmit} loading={createMutation.isPending} />
    </div>
  );
}
