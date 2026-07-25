import { describe, expect, it } from "vitest";
import { checkoutRequestSchema } from "../registration";
import { createVoucherSchema, eventDocumentBatchSchema, recordDocumentPrintSchema, updateCheckInSchema } from "../operational";
import {
  bibTemplateSchema,
  certificateTemplateSchema,
  organizerOnboardingSchema,
  platformFeeFormSchema,
  platformFeeSchema,
} from "../settings";
import { normalizeBibTemplate, normalizeCertificateTemplate } from "@/lib/templates/template-config";
import {
  homepageCarouselConfigSchema,
  platformAnnouncementConfigSchema,
  raceReminderConfigSchema,
  securityControlsConfigSchema,
} from "@/lib/platform-control";

const participant = {
  ticketCategoryId: "category-1",
  fullName: "Aminah Binti Ali",
  icNumber: "900101-01-1234",
  nationality: "Malaysian",
  gender: "FEMALE" as const,
  phone: "0123456789",
  email: "aminah@example.com",
  dateOfBirth: "1990-01-01T00:00:00.000Z",
  tshirtType: "MICROFIBER" as const,
  tshirtSize: "M" as const,
  emergencyContactName: "Ali Bin Ahmad",
  emergencyContactPhone: "0198765432",
};

describe("checkout validation", () => {
  it("requires versioned legal acceptance flags", () => {
    expect(checkoutRequestSchema.safeParse({ eventId: "event-1", registrations: [participant] }).success).toBe(false);
    expect(
      checkoutRequestSchema.safeParse({
        eventId: "event-1",
        registrations: [participant],
        acceptTerms: true,
        acceptPrivacy: true,
      }).success
    ).toBe(true);
  });

  it("limits group registrations to 50 participants", () => {
    expect(
      checkoutRequestSchema.safeParse({
        eventId: "event-1",
        registrations: Array.from({ length: 51 }, () => participant),
        acceptTerms: true,
        acceptPrivacy: true,
      }).success
    ).toBe(false);
  });
});

describe("voucher validation", () => {
  const voucher = {
    eventId: "event-1",
    code: "RUN10",
    discountType: "PERCENTAGE" as const,
    discountValue: 10,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-02-01T00:00:00.000Z",
    applicationPolicy: "PER_ORDER" as const,
  };

  it("rejects percentage discounts over 100", () => {
    expect(createVoucherSchema.safeParse({ ...voucher, discountValue: 101 }).success).toBe(false);
  });

  it("rejects an inverted validity window", () => {
    expect(
      createVoucherSchema.safeParse({ ...voucher, validFrom: voucher.validUntil, validUntil: voucher.validFrom }).success
    ).toBe(false);
  });
});

describe("platform fee validation", () => {
  it("accepts the 3% + 3% schedule with a configurable activation fee", () => {
    expect(
      platformFeeSchema.safeParse({ adminFeePercentage: 3, processingFeePercentage: 3, eventActivationFeeSen: 200000 }).success,
    ).toBe(true);
    expect(
      platformFeeSchema.safeParse({ adminFeePercentage: 3.5, processingFeePercentage: 3, eventActivationFeeSen: 200000 }).success,
    ).toBe(false);
    expect(platformFeeFormSchema.safeParse({ adminFeePercentage: 3, processingFeePercentage: 3, eventActivationFeeAmount: 1999.5 }).success).toBe(true);
    expect(platformFeeFormSchema.safeParse({ adminFeePercentage: 3, processingFeePercentage: 3, eventActivationFeeAmount: 0 }).success).toBe(false);
  });
});

describe("organizer onboarding validation", () => {
  const application = {
    companyName: "NexRun Runners Club",
    ssmNumber: "202601234567",
    contactPerson: "Aminah Binti Ali",
    email: "admin@example.com",
    phone: "0123456789",
    address: "Level 15, Menara Cyberjaya, Selangor",
    bankName: "Example Bank",
    bankAccountNo: "1234567890",
    bankAccountName: "NexRun Runners Club",
    ssmDocumentUrl: "uploaded_private_file_key_123",
  };

  it("accepts private upload keys and rejects externally supplied document URLs", () => {
    expect(organizerOnboardingSchema.safeParse(application).success).toBe(true);
    expect(
      organizerOnboardingSchema.safeParse({
        ...application,
        ssmDocumentUrl: "https://untrusted.example/ssm.pdf",
      }).success,
    ).toBe(false);
  });
});

describe("check-in correction validation", () => {
  const correction = {
    eventId: "event-1",
    registrationId: "registration-1",
    stationName: "REPC Counter A",
    bibCollected: true,
    shirtCollected: false,
    packCollected: true,
  };

  it("accepts an auditable collection correction", () => {
    expect(updateCheckInSchema.safeParse(correction).success).toBe(true);
  });

  it("rejects oversized desk notes", () => {
    expect(
      updateCheckInSchema.safeParse({ ...correction, notes: "x".repeat(301) }).success
    ).toBe(false);
  });
});

describe("template configuration validation", () => {
  const bib = {
    eventId: "event-1",
    themeColor: "#F97316",
    fontFamily: "sans-serif" as const,
    startingBibNumber: 1001,
    locationText: "Cyberjaya",
    headerImageUrl: "https://cdn.nexrun.test/header.png",
    footerImageUrl: null,
    templateData: {
      organizerLabel: "Official Race Bib",
      runnerLabel: "Participant",
      categoryLabel: "Category",
      showQrCode: true,
      showCategory: true,
    },
  };

  it("accepts a constrained bib configuration and rejects unsafe image URLs", () => {
    expect(bibTemplateSchema.safeParse(bib).success).toBe(true);
    expect(bibTemplateSchema.safeParse({ ...bib, headerImageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(bibTemplateSchema.safeParse({ ...bib, templateData: { ...bib.templateData, unexpected: true } }).success).toBe(false);
  });

  it("requires supported certificate content and defaults legacy records safely", () => {
    const certificate = {
      eventId: "event-1",
      orientation: "LANDSCAPE" as const,
      preset: "CLASSIC" as const,
      themeColor: "#0F766E",
      customTexts: {
        title: "Certificate of Completion",
        subtitle: "This certificate is proudly presented to",
        completionText: "For successfully completing the event.",
        signatureTitle: "Race Director",
        issuerName: "NexRun Runners Club",
      },
      templateData: { showEventDate: true, showDistance: true },
    };
    expect(certificateTemplateSchema.safeParse(certificate).success).toBe(true);
    expect(certificateTemplateSchema.safeParse({ ...certificate, customTexts: { ...certificate.customTexts, title: "" } }).success).toBe(false);
    expect(normalizeBibTemplate({ themeColor: "#F97316", fontFamily: "sans-serif", startingBibNumber: 1001 })).toMatchObject({
      templateData: { showQrCode: true, showCategory: true },
    });
    expect(normalizeCertificateTemplate({ orientation: "LANDSCAPE", preset: "CLASSIC", themeColor: "#F97316" })).toMatchObject({
      customTexts: { signatureTitle: "Event Director" },
    });
  });
});

describe("document batch validation", () => {
  it("bounds browser print batches and rejects duplicate documents", () => {
    expect(eventDocumentBatchSchema.safeParse({ eventId: "event-1", documentType: "BIB", page: 1, limit: 50 }).success).toBe(true);
    expect(eventDocumentBatchSchema.safeParse({ eventId: "event-1", documentType: "BIB", page: 1, limit: 51 }).success).toBe(false);
    expect(recordDocumentPrintSchema.safeParse({ eventId: "event-1", documentType: "CERTIFICATE", registrationIds: ["registration-1", "registration-1"] }).success).toBe(false);
  });
});

describe("platform control validation", () => {
  it("bounds carousel, reminder and public request controls", () => {
    expect(homepageCarouselConfigSchema.safeParse({ enabled: true, includeUpcomingEvents: true, maxEvents: 5 }).success).toBe(true);
    expect(homepageCarouselConfigSchema.safeParse({ enabled: true, includeUpcomingEvents: true, maxEvents: 51 }).success).toBe(false);
    expect(raceReminderConfigSchema.safeParse({ enabled: true, daysBeforeEvent: 1, sendHourMalaysia: 9 }).success).toBe(true);
    expect(raceReminderConfigSchema.safeParse({ enabled: true, daysBeforeEvent: 8, sendHourMalaysia: 9 }).success).toBe(false);
    expect(securityControlsConfigSchema.safeParse({ verificationRequestsPerMinute: 40, voucherRequestsPerMinute: 30 }).success).toBe(true);
    expect(securityControlsConfigSchema.safeParse({ verificationRequestsPerMinute: 4, voucherRequestsPerMinute: 30 }).success).toBe(false);
  });

  it("requires a valid message and safe link for an enabled public announcement", () => {
    const valid = { enabled: true, tone: "INFO" as const, message: "Registration closes tonight.", linkLabel: "View events", href: "/events" };
    expect(platformAnnouncementConfigSchema.safeParse(valid).success).toBe(true);
    expect(platformAnnouncementConfigSchema.safeParse({ ...valid, message: "" }).success).toBe(false);
    expect(platformAnnouncementConfigSchema.safeParse({ ...valid, href: "javascript:alert(1)" }).success).toBe(false);
    expect(platformAnnouncementConfigSchema.safeParse({ ...valid, href: "//untrusted.example" }).success).toBe(false);
  });
});
