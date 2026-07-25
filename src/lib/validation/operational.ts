import { z } from "zod";

export const participantQuerySchema = z.object({
  eventId: z.string(),
  search: z.string().trim().max(100).optional(),
  categoryId: z.string().optional(),
  tshirtSize: z.string().optional(),
  status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
  checkedIn: z.boolean().optional(),
  finisher: z.boolean().optional(),
  bibNumberFrom: z.number().int().min(1).optional(),
  bibNumberTo: z.number().int().min(1).optional(),
  registeredFrom: z.string().optional(),
  registeredTo: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(25),
  page: z.number().int().min(1).default(1),
}).superRefine((data, ctx) => {
  if (data.bibNumberFrom !== undefined && data.bibNumberTo !== undefined && data.bibNumberFrom > data.bibNumberTo) {
    ctx.addIssue({ code: "custom", path: ["bibNumberTo"], message: "Bib number range end must be greater than or equal to start." });
  }
  if (data.registeredFrom && data.registeredTo && new Date(data.registeredFrom) > new Date(data.registeredTo)) {
    ctx.addIssue({ code: "custom", path: ["registeredTo"], message: "Registration date range end must be after start." });
  }
});

export const eventDocumentTypeSchema = z.enum(["BIB", "CERTIFICATE"]);

export const eventDocumentBatchSchema = z.object({
  eventId: z.string().min(1),
  documentType: eventDocumentTypeSchema,
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(50),
});

export const recordDocumentPrintSchema = z.object({
  eventId: z.string().min(1),
  documentType: eventDocumentTypeSchema,
  registrationIds: z.array(z.string().min(1)).min(1).max(50).refine(
    (ids) => new Set(ids).size === ids.length,
    "Each document can only be included once."
  ),
});

export const updateTshirtSchema = z.object({
  profileId: z.string(),
  tshirtType: z.enum(["MICROFIBER", "COTTON"]),
  tshirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL", "3XL"]),
});

export const checkInSchema = z.object({
  registrationCode: z.string().min(5, "Registration code is required."),
  eventId: z.string(),
  stationName: z.string().trim().max(80).optional(),
  bibCollected: z.boolean().default(true),
  shirtCollected: z.boolean().default(true),
  packCollected: z.boolean().default(true),
  notes: z.string().trim().max(300).optional(),
});

export const updateCheckInSchema = z.object({
  eventId: z.string().min(1),
  registrationId: z.string().min(1),
  stationName: z.string().trim().max(80).optional(),
  bibCollected: z.boolean(),
  shirtCollected: z.boolean(),
  packCollected: z.boolean(),
  notes: z.string().trim().max(300).optional(),
});

export type ParticipantQueryInput = z.infer<typeof participantQuerySchema>;
export type EventDocumentBatchInput = z.infer<typeof eventDocumentBatchSchema>;
export type RecordDocumentPrintInput = z.infer<typeof recordDocumentPrintSchema>;
export type UpdateTshirtInput = z.infer<typeof updateTshirtSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type UpdateCheckInInput = z.infer<typeof updateCheckInSchema>;

export const createVoucherSchema = z.object({
  eventId: z.string(),
  code: z.string().min(3, "Code must be at least 3 chars.").max(20, "Code is too long.").regex(/^[A-Z0-9_-]+$/, "Code must be uppercase alphanumeric, hyphens, and underscores only."),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().int().min(1, "Discount value must be at least 1."),
  maxUses: z.number().int().min(1, "Max uses must be at least 1.").nullable().optional(),
  validFrom: z.string().min(1, "Validity start date is required."),
  validUntil: z.string().min(1, "Validity end date is required."),
  applicationPolicy: z.enum(["PER_ORDER", "PER_PARTICIPANT"]),
}).superRefine((voucher, ctx) => {
  if (new Date(voucher.validFrom) >= new Date(voucher.validUntil)) {
    ctx.addIssue({ code: "custom", path: ["validUntil"], message: "Voucher end date must be after its start date." });
  }
  if (voucher.discountType === "PERCENTAGE" && voucher.discountValue > 100) {
    ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage discount cannot exceed 100%." });
  }
});

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
