import { z } from "zod";

export const participantDetailsSchema = z.object({
  ticketCategoryId: z.string().min(1, "A ticket category is required.").optional(),
  fullName: z.string().min(3, "Full name must be at least 3 characters."),
  icNumber: z
    .string()
    .min(6, "IC/Passport number is required.")
    .regex(/^[0-9A-Za-z-]+$/, "IC/Passport number must contain only letters, numbers, and hyphens."),
  nationality: z.string().min(2, "Nationality is required."),
  gender: z.enum(["MALE", "FEMALE"]),
  phone: z.string().min(8, "Valid phone number is required."),
  email: z.string().email("Valid email address is required."),
  dateOfBirth: z.string().datetime("Date of birth must be a valid ISO timestamp."),
  tshirtType: z.enum(["MICROFIBER", "COTTON"]),
  tshirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL", "3XL"]),
  bloodType: z.string().optional(),
  medicalConditions: z.string().optional(),
  emergencyContactName: z.string().min(3, "Emergency contact name is required."),
  emergencyContactPhone: z.string().min(8, "Emergency contact phone number is required."),
});

export const checkoutRequestSchema = z.object({
  eventId: z.string(),
  ticketCategoryId: z.string().optional(),
  registrations: z.array(participantDetailsSchema).min(1, "At least one participant is required.").max(50, "An order can contain up to 50 participants."),
  voucherCode: z.string().optional().nullable(),
  idempotencyKey: z.string().min(12).max(128).optional(),
  acceptTerms: z.literal(true, { error: "You must accept the event terms." }),
  acceptPrivacy: z.literal(true, { error: "You must consent to personal data processing." }),
}).superRefine((data, ctx) => {
  data.registrations.forEach((registration, index) => {
    if (!registration.ticketCategoryId && !data.ticketCategoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["registrations", index, "ticketCategoryId"],
        message: "A ticket category is required for each participant.",
      });
    }
  });
});

export const mockPaymentSchema = z.object({
  orderId: z.string(),
  paymentMethod: z.enum(["ONLINE_BANKING", "EWALLET", "CARD"]).default("ONLINE_BANKING"),
  scenario: z.enum(["SUCCESS", "DECLINED", "PENDING", "TIMEOUT", "CANCELLED"]).default("SUCCESS"),
  idempotencyKey: z.string().min(12).max(128).optional(),
});

export type ParticipantDetailsInput = z.infer<typeof participantDetailsSchema>;
export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;
