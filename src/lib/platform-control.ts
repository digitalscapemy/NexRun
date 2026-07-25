import { z } from "zod";

const safeAnnouncementHrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => (value.startsWith("/") && !value.startsWith("//")) || /^https?:\/\//i.test(value), "Use a relative path or http(s) URL.");

export const homepageCarouselConfigSchema = z.object({
  enabled: z.boolean(),
  includeUpcomingEvents: z.boolean(),
  maxEvents: z.number().int().min(1).max(50),
}).strict();

export const raceReminderConfigSchema = z.object({
  enabled: z.boolean(),
  daysBeforeEvent: z.number().int().min(0).max(7),
  sendHourMalaysia: z.number().int().min(0).max(23),
}).strict();

export const securityControlsConfigSchema = z.object({
  verificationRequestsPerMinute: z.number().int().min(5).max(100),
  voucherRequestsPerMinute: z.number().int().min(5).max(100),
}).strict();

export const platformAnnouncementConfigSchema = z
  .object({
    enabled: z.boolean(),
    tone: z.enum(["INFO", "SUCCESS", "WARNING"]),
    message: z.string().trim().max(280),
    linkLabel: z.string().trim().max(48),
    href: safeAnnouncementHrefSchema.nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.enabled && !value.message) {
      ctx.addIssue({ code: "custom", path: ["message"], message: "An enabled announcement needs a message." });
    }
    if (value.href && !value.linkLabel) {
      ctx.addIssue({ code: "custom", path: ["linkLabel"], message: "Add a label for the announcement link." });
    }
    if (!value.href && value.linkLabel) {
      ctx.addIssue({ code: "custom", path: ["href"], message: "Add a link for the announcement label." });
    }
  });

export const DEFAULT_HOMEPAGE_CAROUSEL_CONFIG = homepageCarouselConfigSchema.parse({
  enabled: true,
  includeUpcomingEvents: true,
  maxEvents: 5,
});

export const DEFAULT_RACE_REMINDER_CONFIG = raceReminderConfigSchema.parse({
  enabled: true,
  daysBeforeEvent: 1,
  sendHourMalaysia: 9,
});

export const DEFAULT_SECURITY_CONTROLS_CONFIG = securityControlsConfigSchema.parse({
  verificationRequestsPerMinute: 40,
  voucherRequestsPerMinute: 30,
});

export const DEFAULT_PLATFORM_ANNOUNCEMENT_CONFIG = platformAnnouncementConfigSchema.parse({
  enabled: false,
  tone: "INFO",
  message: "",
  linkLabel: "",
  href: null,
});

export type HomepageCarouselConfig = z.infer<typeof homepageCarouselConfigSchema>;
export type RaceReminderConfig = z.infer<typeof raceReminderConfigSchema>;
export type SecurityControlsConfig = z.infer<typeof securityControlsConfigSchema>;
export type PlatformAnnouncementConfig = z.infer<typeof platformAnnouncementConfigSchema>;

export function parsePlatformControlValue<T>(
  rawValue: string | null | undefined,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  if (!rawValue) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(rawValue));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}
