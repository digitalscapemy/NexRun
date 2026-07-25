"use client";

import { Award, Calendar, CheckCircle2, MapPin } from "lucide-react";
import { QrCodeImage } from "@/components/public/qr-code-image";
import type { CertificateTemplateConfig } from "@/lib/templates/template-config";

export type CertificateDocumentProps = {
  template: CertificateTemplateConfig;
  event: { title: string; eventDate: Date | string; venue: string; state: string };
  registration: { participantName: string; categoryName: string; distance: number; registrationCode: string };
  verificationUrl: string;
  className?: string;
};

const presetClassName = {
  CLASSIC: "border-double",
  BOLD: "border-solid",
  MODERN: "border-solid rounded-none",
  MINIMAL: "border-solid rounded-xl",
} as const;

export function CertificateDocument({ template, event, registration, verificationUrl, className = "" }: CertificateDocumentProps) {
  const isLandscape = template.orientation === "LANDSCAPE";
  const date = new Date(event.eventDate).toLocaleDateString("en-MY", { dateStyle: "long" });

  return (
    <article
      aria-label={`Finisher certificate for ${registration.participantName}`}
      className={`relative isolate mx-auto flex w-full max-w-5xl flex-col overflow-hidden border-8 bg-white p-7 text-center text-neutral-900 shadow-2xl sm:p-12 print:max-w-none print:break-after-page print:shadow-none ${presetClassName[template.preset]} ${isLandscape ? "aspect-[1.414/1] print:min-h-[18cm]" : "aspect-[0.707/1] max-w-xl print:min-h-[25.4cm]"} ${className}`}
      style={{ borderColor: template.themeColor }}
    >
      <Award className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 opacity-[0.035]" style={{ color: template.themeColor }} />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ borderColor: template.themeColor, color: template.themeColor }}>
          <Award className="h-3.5 w-3.5" /> Official finisher record
        </div>
        <h1 className="mt-4 font-serif text-2xl font-black uppercase tracking-tight sm:text-4xl">{template.customTexts.title}</h1>
        <p className="mt-3 text-sm text-neutral-500">{template.customTexts.subtitle}</p>
      </div>

      <div className="relative z-10 my-auto py-6">
        <p className="text-3xl font-black tracking-tight sm:text-5xl" style={{ color: template.themeColor }}>{registration.participantName}</p>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
          {template.customTexts.completionText} <strong className="font-extrabold text-neutral-900">{registration.categoryName}</strong>{template.templateData.showDistance ? ` (${registration.distance}KM)` : ""}.
        </p>
        <h2 className="mt-5 text-xl font-black uppercase tracking-wide sm:text-3xl">{event.title}</h2>
        <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-neutral-500 sm:text-sm">
          {template.templateData.showEventDate && <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" style={{ color: template.themeColor }} />{date}</span>}
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" style={{ color: template.themeColor }} />{event.venue}, {event.state}</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col-reverse items-center justify-between gap-5 border-t border-neutral-200 pt-5 text-left sm:flex-row">
        <div className="flex items-center gap-3">
          <QrCodeImage value={verificationUrl} size={56} className="rounded-md border border-neutral-100" />
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Verification code</p><p className="font-mono text-xs font-extrabold">{registration.registrationCode}</p><p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Verified finisher record</p></div>
        </div>
        <div className="min-w-40 text-center sm:text-right"><div className="border-b border-neutral-400 pb-1 font-serif text-base italic text-neutral-700">{template.customTexts.issuerName || template.customTexts.signatureTitle}</div><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{template.customTexts.issuerName ? template.customTexts.signatureTitle : "Authorized signature"}</p></div>
      </div>
    </article>
  );
}
