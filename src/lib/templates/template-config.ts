import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid 6-digit hex colour code.");
const templateUrlSchema = z.string().trim().url("Use a valid https:// URL.").refine(
  (url) => new URL(url).protocol === "https:",
  "Image URLs must use https:// for security."
);

const optionalTemplateUrlSchema = z.union([templateUrlSchema, z.null()]).optional().default(null);

export const bibTemplateDataSchema = z
  .object({
    organizerLabel: z.string().trim().min(1).max(80).default("Official Race Bib"),
    runnerLabel: z.string().trim().min(1).max(60).default("Participant"),
    categoryLabel: z.string().trim().min(1).max(60).default("Category"),
    showQrCode: z.boolean().default(true),
    showCategory: z.boolean().default(true),
  })
  .strict();

export const certificateCustomTextsSchema = z
  .object({
    title: z.string().trim().min(1).max(100).default("Certificate of Completion"),
    subtitle: z.string().trim().min(1).max(160).default("This certificate is proudly presented to"),
    completionText: z.string().trim().min(1).max(220).default("For successfully completing the event."),
    signatureTitle: z.string().trim().min(1).max(80).default("Event Director"),
    issuerName: z.string().trim().max(100).default(""),
  })
  .strict();

export const certificateTemplateDataSchema = z
  .object({
    showEventDate: z.boolean().default(true),
    showDistance: z.boolean().default(true),
  })
  .strict();

export const bibTemplateConfigSchema = z.object({
  headerImageUrl: optionalTemplateUrlSchema,
  footerImageUrl: optionalTemplateUrlSchema,
  themeColor: hexColorSchema,
  fontFamily: z.enum(["sans-serif", "serif", "monospace"]),
  startingBibNumber: z.number().int().min(100, "Starting Bib number must be at least 100."),
  locationText: z.string().trim().max(160).nullable().optional().default(null),
  templateData: bibTemplateDataSchema,
});

export const certificateTemplateConfigSchema = z.object({
  orientation: z.enum(["LANDSCAPE", "PORTRAIT"]),
  preset: z.enum(["CLASSIC", "BOLD", "MODERN", "MINIMAL"]),
  themeColor: hexColorSchema,
  customTexts: certificateCustomTextsSchema,
  templateData: certificateTemplateDataSchema,
});

export const DEFAULT_BIB_TEMPLATE = bibTemplateConfigSchema.parse({
  themeColor: "#F97316",
  fontFamily: "sans-serif",
  startingBibNumber: 1001,
  templateData: {},
});

export const DEFAULT_CERTIFICATE_TEMPLATE = certificateTemplateConfigSchema.parse({
  orientation: "LANDSCAPE",
  preset: "CLASSIC",
  themeColor: "#F97316",
  customTexts: {},
  templateData: {},
});

export type BibTemplateConfig = z.infer<typeof bibTemplateConfigSchema>;
export type CertificateTemplateConfig = z.infer<typeof certificateTemplateConfigSchema>;

export function normalizeBibTemplate(template: object | null | undefined): BibTemplateConfig {
  const source = template as { templateData?: unknown } | null | undefined;
  const parsed = bibTemplateConfigSchema.safeParse({
    ...DEFAULT_BIB_TEMPLATE,
    ...template,
    templateData: source?.templateData ?? {},
  });
  return parsed.success ? parsed.data : DEFAULT_BIB_TEMPLATE;
}

export function normalizeCertificateTemplate(
  template: object | null | undefined
): CertificateTemplateConfig {
  const source = template as { customTexts?: unknown; templateData?: unknown } | null | undefined;
  const parsed = certificateTemplateConfigSchema.safeParse({
    ...DEFAULT_CERTIFICATE_TEMPLATE,
    ...template,
    customTexts: source?.customTexts ?? {},
    templateData: source?.templateData ?? {},
  });
  return parsed.success ? parsed.data : DEFAULT_CERTIFICATE_TEMPLATE;
}

export function bibTemplateAuditSummary(template: BibTemplateConfig | null) {
  if (!template) return null;
  return {
    themeColor: template.themeColor,
    fontFamily: template.fontFamily,
    startingBibNumber: template.startingBibNumber,
    hasHeaderImage: Boolean(template.headerImageUrl),
    hasFooterImage: Boolean(template.footerImageUrl),
    showQrCode: template.templateData.showQrCode,
    showCategory: template.templateData.showCategory,
  };
}

export function certificateTemplateAuditSummary(template: CertificateTemplateConfig | null) {
  if (!template) return null;
  return {
    orientation: template.orientation,
    preset: template.preset,
    themeColor: template.themeColor,
    hasIssuerName: Boolean(template.customTexts.issuerName),
    showEventDate: template.templateData.showEventDate,
    showDistance: template.templateData.showDistance,
  };
}
