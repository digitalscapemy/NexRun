import { z } from "zod";
import {
  bibTemplateConfigSchema,
  certificateTemplateConfigSchema,
} from "@/lib/templates/template-config";
import {
  homepageCarouselConfigSchema,
  platformAnnouncementConfigSchema,
  raceReminderConfigSchema,
  securityControlsConfigSchema,
} from "@/lib/platform-control";

export const organizerOnboardingSchema = z.object({
  companyName: z.string().min(5, "Company / Association Name must be at least 5 characters."),
  ssmNumber: z
    .string()
    .min(9, "SSM Registration Number is required.")
    .regex(/^[0-9A-Za-z-() ]+$/, "SSM Number must contain alphanumeric characters and standard delimiters."),
  contactPerson: z.string().min(3, "Contact person name must be at least 3 characters."),
  email: z.string().email("Valid business email is required."),
  phone: z.string().min(8, "Valid business contact number is required."),
  address: z.string().min(10, "Full business address is required."),
  bankName: z.string().min(3, "Bank name is required."),
  bankAccountNo: z.string().min(6, "Valid bank account number is required."),
  bankAccountName: z.string().min(5, "Bank Account Name must match SSM profile."),
  ssmDocumentUrl: z
    .string()
    .trim()
    .min(3, "Please upload a valid SSM document registration file.")
    .max(512)
    .refine(
      (value) => !value.includes("://") && !value.startsWith("//"),
      "The SSM document must be an uploaded private file.",
    ),
});

export const platformFeeSchema = z.object({
  adminFeePercentage: z.number().int().min(0).max(50),
  processingFeePercentage: z.number().int().min(0).max(50),
  eventActivationFeeSen: z.number().int().min(100, "Event activation fee must be at least RM1.00.").max(100_000_000),
});

export const platformFeeFormSchema = z.object({
  adminFeePercentage: z.number().int().min(0).max(50),
  processingFeePercentage: z.number().int().min(0).max(50),
  eventActivationFeeAmount: z
    .number()
    .finite()
    .min(1, "Event activation fee must be at least RM1.00.")
    .max(1_000_000)
    .refine((value) => Number.isInteger(value * 100), "Use no more than two decimal places."),
});

export const homepageCarouselSettingsSchema = homepageCarouselConfigSchema;
export const raceReminderSettingsSchema = raceReminderConfigSchema;
export const securityControlsSettingsSchema = securityControlsConfigSchema;
export const platformAnnouncementSettingsSchema = platformAnnouncementConfigSchema;

export const bibTemplateSchema = z.object({ eventId: z.string().min(1) }).extend(bibTemplateConfigSchema.shape);

export const certificateTemplateSchema = z
  .object({ eventId: z.string().min(1) })
  .extend(certificateTemplateConfigSchema.shape);

export type OrganizerOnboardingInput = z.infer<typeof organizerOnboardingSchema>;
export type PlatformFeeInput = z.infer<typeof platformFeeSchema>;
export type PlatformFeeFormInput = z.infer<typeof platformFeeFormSchema>;
export type HomepageCarouselSettingsInput = z.infer<typeof homepageCarouselSettingsSchema>;
export type RaceReminderSettingsInput = z.infer<typeof raceReminderSettingsSchema>;
export type SecurityControlsSettingsInput = z.infer<typeof securityControlsSettingsSchema>;
export type PlatformAnnouncementSettingsInput = z.infer<typeof platformAnnouncementSettingsSchema>;
export type BibTemplateInput = z.infer<typeof bibTemplateSchema>;
export type CertificateTemplateInput = z.infer<typeof certificateTemplateSchema>;
