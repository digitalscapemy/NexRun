"use client";

import React from "react";
import Link from "next/link";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema, type EventFormInput } from "@/lib/validation/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MALAYSIAN_STATES } from "@/lib/constants";
import { Trash2, Plus, Calendar, Settings, FileText, MapPin, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { UploadButton } from "@/lib/uploadthing";
import { startTransition } from "react";

interface EventFormProps {
  initialData?: EventFormInput;
  onSubmit: (data: EventFormInput) => void;
  loading: boolean;
}

export function EventForm({ initialData, onSubmit, loading }: EventFormProps) {
  const [lastSavedAt, setLastSavedAt] = React.useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    getValues,
    formState: { errors },
  } = useForm<EventFormInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(eventFormSchema) as any,
    defaultValues: initialData || {
      title: "",
      slug: "",
      description: "",
      bannerImageUrl: "",
      eventDate: "",
      startTime: "",
      endTime: "",
      venue: "",
      fullAddress: "",
      state: "Selangor",
      locationMapUrl: "",
      registrationOpenDate: "",
      registrationCloseDate: "",
      repcDate: "",
      repcTime: "",
      repcLocation: "",
      ageReferenceDate: "",
      featured: false,
      termsNotes: "",
      categories: [
        {
          name: "10KM Open Men",
          distance: 10,
          ageMin: 18,
          ageMax: 65,
          gender: "MALE",
          priceSen: 5000, // RM50
          earlyBirdPriceSen: 4000,
          earlyBirdDeadline: "",
          maxSlots: 500,
          startSaleDate: null,
          endSaleDate: null,
          isActive: true,
        },
      ],
      timelineItems: [],
    },
  });

  // Load draft from localStorage on mount
  React.useEffect(() => {
    if (initialData) return; // Skip if editing existing event

    try {
      const savedDraft = localStorage.getItem("event-form-draft");
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        reset(parsedDraft);
        const savedTime = localStorage.getItem("event-form-draft-timestamp");
        startTransition(() => {
          if (savedTime) {
            setLastSavedAt(savedTime);
          }
        });
        toast("Draft restored from last session");
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
  }, [initialData, reset]);

  // Auto-save to localStorage every 30 seconds
  React.useEffect(() => {
    if (initialData) return; // Skip auto-save if editing existing event

    const intervalId = setInterval(() => {
      try {
        const currentValues = getValues();
        localStorage.setItem("event-form-draft", JSON.stringify(currentValues));
        const timestamp = new Date().toLocaleTimeString("en-MY", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kuala_Lumpur"
        });
        localStorage.setItem("event-form-draft-timestamp", timestamp);
        setLastSavedAt(timestamp);
      } catch (error) {
        console.error("Failed to auto-save draft:", error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [initialData, getValues]);

  const {
    fields: categoryFields,
    append: appendCategory,
    remove: removeCategory,
  } = useFieldArray({
    control,
    name: "categories",
  });

  const {
    fields: timelineFields,
    append: appendTimeline,
    remove: removeTimeline,
  } = useFieldArray({
    control,
    name: "timelineItems",
  });

  const handleAddCategory = () => {
    appendCategory({
      name: "",
      distance: 5,
      ageMin: 12,
      ageMax: 70,
      gender: "ALL",
      priceSen: 3000,
      earlyBirdPriceSen: null,
      earlyBirdDeadline: null,
      maxSlots: null,
      isActive: true,
    });
  };

  const handleAddTimeline = () => {
    appendTimeline({
      title: "Race Pack Collection Starts",
      timestamp: "",
      location: "",
      description: "",
      orderIndex: timelineFields.length,
    });
  };

  // Auto-generate slug from title
  const titleVal = useWatch({ control, name: "title" });
  const generateSlug = () => {
    if (!titleVal) return;
    const slugified = titleVal
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setValue("slug", slugified, { shouldValidate: true });
    toast.success("Slug generated from title!");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
      {/* 1. General Event Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2 border-b pb-2">
          <Settings className="h-5 w-5 text-primary-500" />
          <span>General Information</span>
        </h3>
        <div className="max-w-md">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input id="title" placeholder="Cyberjaya Run 2026" {...register("title")} disabled={loading} aria-invalid={!!errors.title} aria-describedby={errors.title ? "title-error" : undefined} />
            {errors.title && <p id="title-error" role="alert" className="text-xs font-semibold text-error-600">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="flex items-center justify-between">
              <span>Event Slug</span>
              <button
                type="button"
                onClick={generateSlug}
                className="text-[10px] text-primary-600 font-bold hover:underline"
              >
                Auto Generate
              </button>
            </Label>
            <Input
              id="slug"
              placeholder="cyberjaya-run-2026"
              {...register("slug")}
              disabled={loading}
              aria-invalid={errors.slug ? true : undefined}
              aria-describedby={errors.slug ? "slug-error" : undefined}
            />
            {errors.slug && <p id="slug-error" role="alert" className="text-xs font-semibold text-error-600">{errors.slug.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Event Description (Markdown supported)</Label>
          <textarea
            id="description"
            rows={4}
            placeholder="Introduce the event, schedule details, route paths, etc..."
            {...register("description")}
            disabled={loading}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "description-error" : undefined}
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.description && <p id="description-error" role="alert" className="text-xs font-semibold text-error-600">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bannerImageUrl">Event banner</Label>
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-neutral-300 p-4 sm:flex-row sm:items-center dark:border-neutral-700">
            <UploadButton
              endpoint="eventBanner"
              onClientUploadComplete={(files) => {
                const url = files?.[0]?.serverData?.url;
                if (url) {
                  setValue("bannerImageUrl", url, { shouldValidate: true, shouldDirty: true });
                  toast.success("Event banner uploaded.");
                }
              }}
              onUploadError={(error) => {
                toast.error(error.message || "Banner upload failed.");
              }}
              className="ut-button:bg-primary-500 ut-button:text-white ut-button:rounded-xl ut-button:font-bold"
            />
            <p className="text-xs leading-relaxed text-neutral-500">Use a wide JPG, PNG, or WebP image. Recommended ratio: 16:9.</p>
          </div>
          <Input
            id="bannerImageUrl"
            type="url"
            placeholder="Or paste a secure image URL"
            {...register("bannerImageUrl")}
            disabled={loading}
            aria-invalid={errors.bannerImageUrl ? true : undefined}
            aria-describedby={errors.bannerImageUrl ? "bannerImageUrl-error" : undefined}
          />
          {errors.bannerImageUrl && <p id="bannerImageUrl-error" role="alert" className="text-xs font-semibold text-error-600">{errors.bannerImageUrl.message}</p>}
        </div>
      </div>

      {/* 2. Venue & Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2 border-b pb-2">
          <MapPin className="h-5 w-5 text-primary-500" />
          <span>Venue & Location</span>
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="venue">Venue Name</Label>
            <Input
              id="venue"
              placeholder="Taman Tasik Cyberjaya"
              {...register("venue")}
              disabled={loading}
              aria-invalid={errors.venue ? true : undefined}
              aria-describedby={errors.venue ? "venue-error" : undefined}
            />
            {errors.venue && <p id="venue-error" role="alert" className="text-xs font-semibold text-error-600">{errors.venue.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <select
              id="state"
              {...register("state")}
              disabled={loading}
              className="w-full border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {MALAYSIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullAddress">Full Location Address</Label>
          <Input
            id="fullAddress"
            placeholder="Persiaran Tasik, Cyber 4, 63000 Cyberjaya, Selangor"
            {...register("fullAddress")}
            disabled={loading}
            aria-invalid={errors.fullAddress ? true : undefined}
            aria-describedby={errors.fullAddress ? "fullAddress-error" : undefined}
          />
          {errors.fullAddress && <p id="fullAddress-error" role="alert" className="text-xs font-semibold text-error-600">{errors.fullAddress.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="locationMapUrl">Google Maps URL (optional)</Label>
          <Input id="locationMapUrl" placeholder="https://maps.google.com/?q=..." {...register("locationMapUrl")} disabled={loading} />
        </div>
      </div>

      {/* 3. Dates & Schedules */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2 border-b pb-2">
          <Calendar className="h-5 w-5 text-primary-500" />
          <span>Date & Schedules</span>
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="eventDate">Race Day Date (ISO string/date)</Label>
            <Input
              id="eventDate"
              type="datetime-local"
              {...register("eventDate")}
              disabled={loading}
              aria-invalid={errors.eventDate ? true : undefined}
              aria-describedby={errors.eventDate ? "eventDate-error" : undefined}
            />
            {errors.eventDate && <p id="eventDate-error" role="alert" className="text-xs font-semibold text-error-600">{errors.eventDate.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              placeholder="05:30 AM"
              {...register("startTime")}
              disabled={loading}
              aria-invalid={errors.startTime ? true : undefined}
              aria-describedby={errors.startTime ? "startTime-error" : undefined}
            />
            {errors.startTime && <p id="startTime-error" role="alert" className="text-xs font-semibold text-error-600">{errors.startTime.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              placeholder="11:00 AM"
              {...register("endTime")}
              disabled={loading}
              aria-invalid={errors.endTime ? true : undefined}
              aria-describedby={errors.endTime ? "endTime-error" : undefined}
            />
            {errors.endTime && <p id="endTime-error" role="alert" className="text-xs font-semibold text-error-600">{errors.endTime.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="registrationOpenDate">Registration Open Date</Label>
            <Input
              id="registrationOpenDate"
              type="datetime-local"
              {...register("registrationOpenDate")}
              disabled={loading}
              aria-invalid={errors.registrationOpenDate ? true : undefined}
              aria-describedby={errors.registrationOpenDate ? "registrationOpenDate-error" : undefined}
            />
            {errors.registrationOpenDate && <p id="registrationOpenDate-error" role="alert" className="text-xs font-semibold text-error-600">{errors.registrationOpenDate.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationCloseDate">Registration Close Date</Label>
            <Input
              id="registrationCloseDate"
              type="datetime-local"
              {...register("registrationCloseDate")}
              disabled={loading}
              aria-invalid={errors.registrationCloseDate ? true : undefined}
              aria-describedby={errors.registrationCloseDate ? "registrationCloseDate-error" : undefined}
            />
            {errors.registrationCloseDate && <p id="registrationCloseDate-error" role="alert" className="text-xs font-semibold text-error-600">{errors.registrationCloseDate.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100">
          <div className="space-y-2">
            <Label htmlFor="repcDate">REPC Date (Collection)</Label>
            <Input
              id="repcDate"
              placeholder="12-13 December 2026"
              {...register("repcDate")}
              disabled={loading}
              aria-invalid={errors.repcDate ? true : undefined}
              aria-describedby={errors.repcDate ? "repcDate-error" : undefined}
            />
            {errors.repcDate && <p id="repcDate-error" role="alert" className="text-xs font-semibold text-error-600">{errors.repcDate.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="repcTime">REPC Time</Label>
            <Input
              id="repcTime"
              placeholder="10:00 AM - 06:00 PM"
              {...register("repcTime")}
              disabled={loading}
              aria-invalid={errors.repcTime ? true : undefined}
              aria-describedby={errors.repcTime ? "repcTime-error" : undefined}
            />
            {errors.repcTime && <p id="repcTime-error" role="alert" className="text-xs font-semibold text-error-600">{errors.repcTime.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="repcLocation">REPC Location</Label>
            <Input
              id="repcLocation"
              placeholder="DPULZE Shopping Centre"
              {...register("repcLocation")}
              disabled={loading}
              aria-invalid={errors.repcLocation ? true : undefined}
              aria-describedby={errors.repcLocation ? "repcLocation-error" : undefined}
            />
            {errors.repcLocation && <p id="repcLocation-error" role="alert" className="text-xs font-semibold text-error-600">{errors.repcLocation.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ageReferenceDate">Age Reference Date (Eligibility Check)</Label>
            <Input
              id="ageReferenceDate"
              type="datetime-local"
              {...register("ageReferenceDate")}
              disabled={loading}
              aria-invalid={errors.ageReferenceDate ? true : undefined}
              aria-describedby={errors.ageReferenceDate ? "ageReferenceDate-error" : undefined}
            />
            {errors.ageReferenceDate && <p id="ageReferenceDate-error" role="alert" className="text-xs font-semibold text-error-600">{errors.ageReferenceDate.message}</p>}
          </div>
        </div>
      </div>

      {/* 4. Ticket Categories */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            <span>Ticket Categories</span>
          </h3>
          <Button type="button" size="sm" onClick={handleAddCategory} className="bg-primary-500 text-white gap-1 py-1 px-3 text-xs">
            <Plus className="h-3 w-3" />
            <span>Add Category</span>
          </Button>
        </div>

        {categoryFields.map((field, idx) => (
          <div key={field.id} className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 p-4 rounded-xl space-y-4 relative">
            <button
              type="button"
              onClick={() => removeCategory(idx)}
              disabled={categoryFields.length <= 1}
              className="absolute top-4 right-4 text-neutral-400 hover:text-error-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <h4 className="font-bold text-sm text-neutral-700">Category #{idx + 1}</h4>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input placeholder="10KM Open Men" {...register(`categories.${idx}.name` as const)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label>Distance (KM)</Label>
                <Input type="number" step="0.1" {...register(`categories.${idx}.distance` as const, { valueAsNumber: true })} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label>Price (Sen - Cents)</Label>
                <Input type="number" placeholder="5000" {...register(`categories.${idx}.priceSen` as const, { valueAsNumber: true })} disabled={loading} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Gender Scope</Label>
                <select
                  {...register(`categories.${idx}.gender` as const)}
                  disabled={loading}
                  className="w-full border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 rounded-xl text-sm"
                >
                  <option value="ALL">All Genders</option>
                  <option value="MALE">Male Only</option>
                  <option value="FEMALE">Female Only</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Minimum Age</Label>
                <Input type="number" {...register(`categories.${idx}.ageMin` as const, { valueAsNumber: true })} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label>Maximum Age</Label>
                <Input type="number" {...register(`categories.${idx}.ageMax` as const, { valueAsNumber: true })} disabled={loading} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 bg-white p-3 rounded-lg border border-neutral-100">
              <div className="space-y-2">
                <Label>EB Price (Sen, optional)</Label>
                <Input type="number" placeholder="4000" {...register(`categories.${idx}.earlyBirdPriceSen` as const, { valueAsNumber: true })} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label>EB Deadline (optional)</Label>
                <Input type="datetime-local" {...register(`categories.${idx}.earlyBirdDeadline` as const)} disabled={loading} />
                <p className="text-[11px] text-neutral-500">
                  Early bird price applies up to and including this exact date and time. After this moment, the regular price applies.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Max Slots (optional)</Label>
                <Input type="number" placeholder="500" {...register(`categories.${idx}.maxSlots` as const, { valueAsNumber: true })} disabled={loading} />
              </div>
            </div>
            <div className="grid gap-4 rounded-lg border border-neutral-100 bg-white p-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category sale starts (optional)</Label>
                <Input type="datetime-local" {...register(`categories.${idx}.startSaleDate` as const)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label>Category sale ends (optional)</Label>
                <Input type="datetime-local" {...register(`categories.${idx}.endSaleDate` as const)} disabled={loading} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Custom Milestones Timeline */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-500" />
            <span>Event Timeline / Milestones</span>
          </h3>
          <Button type="button" size="sm" onClick={handleAddTimeline} className="bg-primary-500 text-white gap-1 py-1 px-3 text-xs">
            <Plus className="h-3 w-3" />
            <span>Add Milestone</span>
          </Button>
        </div>

        {timelineFields.map((field, idx) => (
          <div key={field.id} className="border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl space-y-4 relative bg-neutral-50/50">
            <button
              type="button"
              onClick={() => removeTimeline(idx)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-error-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <h4 className="font-bold text-sm text-neutral-700">Milestone #{idx + 1}</h4>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>Milestone Title</Label>
                <Input placeholder="Race Entry Pack Collection" {...register(`timelineItems.${idx}.title` as const)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label>Timestamp</Label>
                <Input type="datetime-local" {...register(`timelineItems.${idx}.timestamp` as const)} disabled={loading} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Location (optional)</Label>
                <Input placeholder="DPULZE Mall" {...register(`timelineItems.${idx}.location` as const)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label>Short Description (optional)</Label>
                <Input placeholder="Bring your original NRIC to collect the items." {...register(`timelineItems.${idx}.description` as const)} disabled={loading} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Terms and conditions */}
      <div className="space-y-2">
        <Label htmlFor="termsNotes">Rules, Terms & Conditions (Markdown supported)</Label>
        <textarea
          id="termsNotes"
          rows={3}
          placeholder="Participants must follow Malaysia Athletics rules, refunds are not permitted, etc..."
          {...register("termsNotes")}
          disabled={loading}
          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Submit buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t">
        {!initialData && lastSavedAt && (
          <p className="text-xs text-neutral-500 font-medium">
            Last saved at {lastSavedAt}
          </p>
        )}
        {!initialData && !lastSavedAt && (
          <div className="hidden sm:block" />
        )}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/events">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-2 rounded-xl" disabled={loading}>
            {loading ? "Saving event..." : "Save Event Draft"}
          </Button>
        </div>
      </div>
    </form>
  );
}
export default EventForm;
