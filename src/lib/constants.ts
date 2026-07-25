export const APP_NAME = "NexRun";
export const APP_TAGLINE = "Malaysia's Premier Run Event Management Platform";
export const APP_DESCRIPTION = "Discover, register, and manage running events with NexRun.";

export const ROLES = {
  DEVELOPER: "DEVELOPER",
  ADMIN: "ADMIN",
  ORGANIZER: "ORGANIZER",
  USER: "USER",
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

export const CURRENCY = {
  CODE: "MYR",
  SYMBOL: "RM",
  DECIMALS: 2,
} as const;

export const DEFAULT_SETTINGS = {
  ADMIN_FEE_PERCENTAGE: 3,
  PROCESSING_FEE_PERCENTAGE: 3,
  EVENT_ACTIVATION_FEE_SEN: 200_000,
  MAX_PLATFORM_FEE_PERCENTAGE: 50,
  MAX_EVENTS_DISPLAY: 12,
  CAROUSEL_ENABLED: true,
  TIMELINE_VIEW_ENABLED: true,
  MAINTENANCE_MODE: false,
} as const;

export const LEGAL_VERSIONS = {
  EVENT_TERMS: "2026-07",
  PRIVACY: "2026-07",
} as const;

export const TSHIRT_SIZES = [
  "XS", "S", "M", "L", "XL", "XXL", "3XL",
] as const;

export const TSHIRT_TYPES = [
  "MICROFIBER", "COTTON",
] as const;

export const BLOOD_TYPES = [
  "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-",
] as const;

export const MALAYSIAN_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka",
  "Negeri Sembilan", "Pahang", "Perak", "Perlis",
  "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
  "Terengganu", "Kuala Lumpur", "Putrajaya", "Labuan",
] as const;
