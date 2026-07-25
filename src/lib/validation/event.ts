import { z } from "zod";

const dateTimeInputSchema = z.string().min(1, "Date and time are required").refine(
  (value) => Number.isFinite(new Date(value).getTime()),
  "Invalid date and time"
);

const optionalDateTimeInputSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  dateTimeInputSchema.nullable()
);

const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().url().nullable().optional()
);

const optionalNonNegativeIntSchema = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined || Number.isNaN(value)
      ? null
      : value,
  z.number().int().min(0).nullable()
);

const optionalPositiveIntSchema = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined || Number.isNaN(value)
      ? null
      : value,
  z.number().int().positive().nullable()
);

export const ticketCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Category name is required (e.g. 10KM Open Men)"),
  distance: z.number().positive("Distance in KM must be positive"),
  ageMin: z.number().int().min(4, "Minimum age must be at least 4"),
  ageMax: z.number().int().max(100, "Maximum age must be at most 100"),
  gender: z.enum(["MALE", "FEMALE", "ALL"]),
  priceSen: z.number().int().min(0, "Price in sen cannot be negative"),
  earlyBirdPriceSen: optionalNonNegativeIntSchema.optional(),
  earlyBirdDeadline: optionalDateTimeInputSchema.optional(),
  maxSlots: optionalPositiveIntSchema.optional(),
  startSaleDate: optionalDateTimeInputSchema.optional(),
  endSaleDate: optionalDateTimeInputSchema.optional(),
  isActive: z.boolean().default(true),
}).superRefine((category, ctx) => {
  if (category.ageMin > category.ageMax) {
    ctx.addIssue({
      code: "custom",
      path: ["ageMax"],
      message: "Maximum age must be greater than or equal to minimum age",
    });
  }
  if (category.earlyBirdPriceSen !== null && category.earlyBirdPriceSen !== undefined) {
    if (!category.earlyBirdDeadline) {
      ctx.addIssue({
        code: "custom",
        path: ["earlyBirdDeadline"],
        message: "Early-bird deadline is required when an early-bird price is set",
      });
    }
    if (category.earlyBirdPriceSen > category.priceSen) {
      ctx.addIssue({
        code: "custom",
        path: ["earlyBirdPriceSen"],
        message: "Early-bird price cannot exceed the standard price",
      });
    }
  }
  if (category.startSaleDate && category.endSaleDate && new Date(category.startSaleDate) >= new Date(category.endSaleDate)) {
    ctx.addIssue({
      code: "custom",
      path: ["endSaleDate"],
      message: "Category sale end must be after its start",
    });
  }
});

export const eventTimelineItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Milestone title is required"),
  timestamp: dateTimeInputSchema,
  location: z.string().optional(),
  description: z.string().optional(),
  orderIndex: z.number().int().default(0),
});

export const eventFormSchema = z.object({
  organizationId: z.string().min(1).optional(),
  title: z.string().min(5, "Event title must be at least 5 characters"),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().min(20, "Please provide a detailed event description"),
  bannerImageUrl: z.string().url("Banner image URL is required"),
  eventDate: dateTimeInputSchema,
  startTime: z.string().min(4, "Start time required (e.g., 05:30 AM)"),
  endTime: z.string().min(4, "End time required (e.g., 11:00 AM)"),
  venue: z.string().min(3, "Venue name is required"),
  fullAddress: z.string().min(10, "Full address is required"),
  state: z.string().min(2, "State selection is required"),
  locationMapUrl: optionalUrlSchema,
  registrationOpenDate: dateTimeInputSchema,
  registrationCloseDate: dateTimeInputSchema,
  repcDate: z.string().min(4, "REPC date required"),
  repcTime: z.string().min(4, "REPC time required"),
  repcLocation: z.string().min(5, "REPC location required"),
  ageReferenceDate: dateTimeInputSchema,
  featured: z.boolean().default(false),
  termsNotes: z.string().optional(),
  categories: z.array(ticketCategorySchema).min(1, "At least one ticket category is required"),
  timelineItems: z.array(eventTimelineItemSchema),
}).superRefine((event, ctx) => {
  const eventDate = new Date(event.eventDate);
  const openDate = new Date(event.registrationOpenDate);
  const closeDate = new Date(event.registrationCloseDate);

  if (openDate >= closeDate) {
    ctx.addIssue({
      code: "custom",
      path: ["registrationCloseDate"],
      message: "Registration closing must be after registration opening",
    });
  }
  if (closeDate > eventDate) {
    ctx.addIssue({
      code: "custom",
      path: ["registrationCloseDate"],
      message: "Registration must close on or before race day",
    });
  }
});

export type TicketCategoryInput = z.infer<typeof ticketCategorySchema>;
export type EventFormInput = z.infer<typeof eventFormSchema>;
