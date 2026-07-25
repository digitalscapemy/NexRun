import type { Prisma, PrismaClient } from "@/generated/prisma";
import {
  DEFAULT_HOMEPAGE_CAROUSEL_CONFIG,
  DEFAULT_PLATFORM_ANNOUNCEMENT_CONFIG,
  DEFAULT_RACE_REMINDER_CONFIG,
  DEFAULT_SECURITY_CONTROLS_CONFIG,
  homepageCarouselConfigSchema,
  parsePlatformControlValue,
  platformAnnouncementConfigSchema,
  raceReminderConfigSchema,
  securityControlsConfigSchema,
  type HomepageCarouselConfig,
  type PlatformAnnouncementConfig,
  type RaceReminderConfig,
  type SecurityControlsConfig,
} from "@/lib/platform-control";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export const PLATFORM_CONTROL_KEYS = {
  HOMEPAGE_CAROUSEL: "homepageCarouselConfig",
  RACE_REMINDERS: "raceReminderConfig",
  SECURITY_CONTROLS: "securityControlsConfig",
  ANNOUNCEMENT: "platformAnnouncementConfig",
} as const;

export type PlatformControlConfig = {
  carousel: HomepageCarouselConfig;
  reminders: RaceReminderConfig;
  security: SecurityControlsConfig;
  announcement: PlatformAnnouncementConfig;
};

export async function getPlatformControlConfig(db: DatabaseClient): Promise<PlatformControlConfig> {
  const settings = await db.platformSetting.findMany({
    where: { key: { in: Object.values(PLATFORM_CONTROL_KEYS) } },
    select: { key: true, value: true },
  });
  const values = new Map(settings.map((setting) => [setting.key, setting.value]));
  return {
    carousel: parsePlatformControlValue(values.get(PLATFORM_CONTROL_KEYS.HOMEPAGE_CAROUSEL), homepageCarouselConfigSchema, DEFAULT_HOMEPAGE_CAROUSEL_CONFIG),
    reminders: parsePlatformControlValue(values.get(PLATFORM_CONTROL_KEYS.RACE_REMINDERS), raceReminderConfigSchema, DEFAULT_RACE_REMINDER_CONFIG),
    security: parsePlatformControlValue(values.get(PLATFORM_CONTROL_KEYS.SECURITY_CONTROLS), securityControlsConfigSchema, DEFAULT_SECURITY_CONTROLS_CONFIG),
    announcement: parsePlatformControlValue(values.get(PLATFORM_CONTROL_KEYS.ANNOUNCEMENT), platformAnnouncementConfigSchema, DEFAULT_PLATFORM_ANNOUNCEMENT_CONFIG),
  };
}

export async function savePlatformControlValue<T>(
  db: DatabaseClient,
  input: { key: string; value: T; description: string; updatedByUserId: string },
) {
  return db.platformSetting.upsert({
    where: { key: input.key },
    update: { value: JSON.stringify(input.value), description: input.description, updatedByUserId: input.updatedByUserId },
    create: { key: input.key, value: JSON.stringify(input.value), description: input.description, updatedByUserId: input.updatedByUserId },
  });
}
