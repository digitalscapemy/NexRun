"use client";

import { MapPin, QrCode } from "lucide-react";
import { QrCodeImage } from "@/components/public/qr-code-image";
import type { BibTemplateConfig } from "@/lib/templates/template-config";

export type RaceBibDocumentProps = {
  template: BibTemplateConfig;
  event: { title: string; eventDate: Date | string; venue: string; state: string };
  registration: {
    bibNumber: string | null;
    participantName: string;
    categoryName: string;
    distance: number;
    registrationCode: string;
  };
  verificationUrl: string;
  className?: string;
};

const fontFamilyByTemplate = {
  "sans-serif": "var(--font-sans)",
  serif: "Georgia, Cambria, 'Times New Roman', serif",
  monospace: "var(--font-mono)",
} as const;

export function RaceBibDocument({ template, event, registration, verificationUrl, className = "" }: RaceBibDocumentProps) {
  const eventDate = new Date(event.eventDate).toLocaleDateString("en-MY", { dateStyle: "medium" });
  const bibNumber = registration.bibNumber ?? "TBC";

  return (
    <article
      aria-label={`Race bib for ${registration.participantName}`}
      className={`relative isolate flex min-h-[24rem] w-full max-w-[34rem] flex-col overflow-hidden rounded-[1.5rem] border bg-white text-neutral-900 shadow-xl print:mx-0 print:min-h-[13.7cm] print:max-w-none print:break-after-page print:rounded-none print:shadow-none ${className}`}
      style={{ borderColor: template.themeColor, fontFamily: fontFamilyByTemplate[template.fontFamily] }}
    >
      <div className="h-4 shrink-0" style={{ backgroundColor: template.themeColor }} />
      {template.headerImageUrl && (
        // Template URLs are validated before being saved. A standard image element avoids a remote-image allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={template.headerImageUrl} alt="" className="h-16 w-full shrink-0 object-contain px-5 pt-3" />
      )}
      <div className="flex flex-1 flex-col px-6 pb-5 pt-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{template.templateData.organizerLabel}</p>
            <h1 className="mt-1 truncate text-lg font-black uppercase tracking-tight sm:text-xl">{event.title}</h1>
            <p className="mt-1 text-xs font-semibold text-neutral-500">{eventDate}</p>
          </div>
          {template.templateData.showQrCode && (
            <div className="shrink-0 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-sm">
              <QrCodeImage value={verificationUrl} size={72} className="rounded-lg" />
            </div>
          )}
        </div>

        <div className="my-auto py-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">{template.templateData.runnerLabel}</p>
          <p className="mt-1 truncate text-xl font-black sm:text-2xl">{registration.participantName}</p>
          <p className="mt-5 text-[clamp(4rem,17vw,7.6rem)] font-black leading-none tracking-[-0.08em]" style={{ color: template.themeColor }}>{bibNumber}</p>
        </div>

        <div className="border-t border-neutral-200 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-wide text-neutral-600">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" style={{ color: template.themeColor }} />{template.locationText || `${event.venue}, ${event.state}`}</span>
            {template.templateData.showCategory && <span>{template.templateData.categoryLabel}: {registration.categoryName} · {registration.distance}KM</span>}
          </div>
          {!template.templateData.showQrCode && <p className="mt-2 font-mono text-[10px] font-bold text-neutral-400">{registration.registrationCode}</p>}
        </div>
      </div>
      {template.footerImageUrl && (
        // Template URLs are validated before being saved. A standard image element avoids a remote-image allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={template.footerImageUrl} alt="" className="h-14 w-full shrink-0 object-contain px-5 pb-2" />
      )}
      {!template.templateData.showQrCode && <QrCode className="pointer-events-none absolute right-4 top-4 h-7 w-7 text-neutral-100" />}
    </article>
  );
}
