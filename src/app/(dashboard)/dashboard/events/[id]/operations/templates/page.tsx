"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Award, Hash, ImageIcon, MapPin, Palette, Type } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type BibTemplateConfig,
  type CertificateTemplateConfig,
} from "@/lib/templates/template-config";
import { bibTemplateSchema, certificateTemplateSchema } from "@/lib/validation/settings";
import { trpc } from "@/lib/trpc";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

const isHexColour = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

export default function TemplatesDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const { data: templates, isLoading, error } = trpc.settings.getEventTemplates.useQuery({ eventId });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error || !templates) {
    return (
      <Card className="rounded-2xl border border-error-500/30 p-6 text-sm text-error-700 dark:text-error-300">
        {error?.message ?? "Template settings could not be loaded. Please refresh and try again."}
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <TemplateEditor key={JSON.stringify(templates)} eventId={eventId} initialBib={templates.bib} initialCertificate={templates.cert} />
    </ErrorBoundary>
  );
}

function TemplateEditor({
  eventId,
  initialBib,
  initialCertificate,
}: {
  eventId: string;
  initialBib: BibTemplateConfig;
  initialCertificate: CertificateTemplateConfig;
}) {
  const utils = trpc.useUtils();
  const [bib, setBib] = useState(initialBib);
  const [certificate, setCertificate] = useState(initialCertificate);
  const [bibError, setBibError] = useState<string | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);

  const saveBibMutation = trpc.settings.saveBibTemplate.useMutation({
    onSuccess: async () => {
      toast.success("Race bib settings saved.");
      await utils.settings.getEventTemplates.invalidate({ eventId });
    },
    onError: (mutationError) => toast.error(mutationError.message || "Unable to save race bib settings."),
  });
  const saveCertificateMutation = trpc.settings.saveCertificateTemplate.useMutation({
    onSuccess: async () => {
      toast.success("Certificate settings saved.");
      await utils.settings.getEventTemplates.invalidate({ eventId });
    },
    onError: (mutationError) => toast.error(mutationError.message || "Unable to save certificate settings."),
  });

  const saveBib = () => {
    const input = {
      ...bib,
      eventId,
      headerImageUrl: bib.headerImageUrl?.trim() || null,
      footerImageUrl: bib.footerImageUrl?.trim() || null,
      locationText: bib.locationText?.trim() || null,
    };
    const parsed = bibTemplateSchema.safeParse(input);
    if (!parsed.success) {
      setBibError(parsed.error.issues[0]?.message ?? "Please check the race bib settings.");
      return;
    }
    setBibError(null);
    saveBibMutation.mutate(parsed.data);
  };

  const saveCertificate = () => {
    const input = { ...certificate, eventId };
    const parsed = certificateTemplateSchema.safeParse(input);
    if (!parsed.success) {
      setCertificateError(parsed.error.issues[0]?.message ?? "Please check the certificate settings.");
      return;
    }
    setCertificateError(null);
    saveCertificateMutation.mutate(parsed.data);
  };

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 rounded-2xl border border-primary-500/20 bg-primary-50/40 p-5 shadow-xs dark:bg-primary-950/10 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-bold text-neutral-900 dark:text-neutral-50">Ready to prepare documents?</p><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Use the Document Studio to review individual documents and print controlled batches.</p></div>
        <Button asChild className="shrink-0 font-bold"><Link href={`/dashboard/events/${eventId}/operations/documents`}>Open Document Studio</Link></Button>
      </Card>
      <div className="grid gap-8 xl:grid-cols-2">
      <section className="space-y-5">
        <Card className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-6 flex items-start gap-3">
            <span className="rounded-xl bg-primary-500/10 p-2.5 text-primary-600 dark:text-primary-400"><Palette className="h-5 w-5" /></span>
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-neutral-50">Race bib settings</h2>
              <p className="mt-1 text-sm text-neutral-500">Control the content and visual settings used when bibs are generated.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ColourInput label="Theme colour" value={bib.themeColor} onChange={(themeColor) => setBib({ ...bib, themeColor })} />
              <Field label="Starting bib number" icon={<Hash className="h-4 w-4" />}>
                <Input type="number" min={100} value={bib.startingBibNumber} onChange={(event) => setBib({ ...bib, startingBibNumber: Number(event.target.value) })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Font family" icon={<Type className="h-4 w-4" />}>
                <select value={bib.fontFamily} onChange={(event) => setBib({ ...bib, fontFamily: event.target.value as BibTemplateConfig["fontFamily"] })} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="sans-serif">Sans serif</option><option value="serif">Serif</option><option value="monospace">Monospace</option>
                </select>
              </Field>
              <Field label="Collection location" icon={<MapPin className="h-4 w-4" />}>
                <Input value={bib.locationText ?? ""} maxLength={160} placeholder="Taman Tasik Cyberjaya, Selangor" onChange={(event) => setBib({ ...bib, locationText: event.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Header image URL" icon={<ImageIcon className="h-4 w-4" />}>
                <Input type="url" value={bib.headerImageUrl ?? ""} maxLength={2000} placeholder="https://..." onChange={(event) => setBib({ ...bib, headerImageUrl: event.target.value || null })} />
              </Field>
              <Field label="Footer image URL" icon={<ImageIcon className="h-4 w-4" />}>
                <Input type="url" value={bib.footerImageUrl ?? ""} maxLength={2000} placeholder="https://..." onChange={(event) => setBib({ ...bib, footerImageUrl: event.target.value || null })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Organizer label" value={bib.templateData.organizerLabel} maxLength={80} onChange={(organizerLabel) => setBib({ ...bib, templateData: { ...bib.templateData, organizerLabel } })} />
              <TextField label="Runner label" value={bib.templateData.runnerLabel} maxLength={60} onChange={(runnerLabel) => setBib({ ...bib, templateData: { ...bib.templateData, runnerLabel } })} />
              <TextField label="Category label" value={bib.templateData.categoryLabel} maxLength={60} onChange={(categoryLabel) => setBib({ ...bib, templateData: { ...bib.templateData, categoryLabel } })} />
            </div>
            <div className="flex flex-wrap gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <Toggle label="Include QR code" checked={bib.templateData.showQrCode} onChange={(showQrCode) => setBib({ ...bib, templateData: { ...bib.templateData, showQrCode } })} />
              <Toggle label="Show category" checked={bib.templateData.showCategory} onChange={(showCategory) => setBib({ ...bib, templateData: { ...bib.templateData, showCategory } })} />
            </div>
            {bibError && <p role="alert" className="text-sm font-medium text-error-600">{bibError}</p>}
            <Button onClick={saveBib} disabled={saveBibMutation.isPending} className="w-full font-bold">{saveBibMutation.isPending ? "Saving settings..." : "Save race bib settings"}</Button>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="h-3" style={{ backgroundColor: isHexColour(bib.themeColor) ? bib.themeColor : "#F97316" }} />
          <div className="space-y-3 p-5 text-sm">
            <p className="font-bold text-neutral-900 dark:text-neutral-50">Race bib configuration summary</p>
            <div className="grid gap-3 sm:grid-cols-2 text-neutral-600 dark:text-neutral-300"><span>{bib.templateData.organizerLabel}</span><span>Bib sequence begins at {bib.startingBibNumber}</span><span>{bib.templateData.showQrCode ? "QR code included" : "QR code hidden"}</span><span>{bib.templateData.showCategory ? "Category included" : "Category hidden"}</span></div>
          </div>
        </Card>
      </section>

      <section className="space-y-5">
        <Card className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-6 flex items-start gap-3">
            <span className="rounded-xl bg-primary-500/10 p-2.5 text-primary-600 dark:text-primary-400"><Award className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-neutral-900 dark:text-neutral-50">Certificate settings</h2><p className="mt-1 text-sm text-neutral-500">Set approved completion language and layout options for finisher certificates.</p></div>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <ColourInput label="Theme colour" value={certificate.themeColor} onChange={(themeColor) => setCertificate({ ...certificate, themeColor })} />
              <Field label="Orientation"><select value={certificate.orientation} onChange={(event) => setCertificate({ ...certificate, orientation: event.target.value as CertificateTemplateConfig["orientation"] })} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="LANDSCAPE">Landscape</option><option value="PORTRAIT">Portrait</option></select></Field>
              <Field label="Style preset"><select value={certificate.preset} onChange={(event) => setCertificate({ ...certificate, preset: event.target.value as CertificateTemplateConfig["preset"] })} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="CLASSIC">Classic</option><option value="BOLD">Bold</option><option value="MODERN">Modern</option><option value="MINIMAL">Minimal</option></select></Field>
            </div>
            <TextField label="Certificate title" value={certificate.customTexts.title} maxLength={100} onChange={(title) => setCertificate({ ...certificate, customTexts: { ...certificate.customTexts, title } })} />
            <TextField label="Introductory line" value={certificate.customTexts.subtitle} maxLength={160} onChange={(subtitle) => setCertificate({ ...certificate, customTexts: { ...certificate.customTexts, subtitle } })} />
            <TextField label="Completion statement" value={certificate.customTexts.completionText} maxLength={220} onChange={(completionText) => setCertificate({ ...certificate, customTexts: { ...certificate.customTexts, completionText } })} />
            <div className="grid gap-4 sm:grid-cols-2"><TextField label="Signature title" value={certificate.customTexts.signatureTitle} maxLength={80} onChange={(signatureTitle) => setCertificate({ ...certificate, customTexts: { ...certificate.customTexts, signatureTitle } })} /><TextField label="Issuer name (optional)" value={certificate.customTexts.issuerName} maxLength={100} onChange={(issuerName) => setCertificate({ ...certificate, customTexts: { ...certificate.customTexts, issuerName } })} /></div>
            <div className="flex flex-wrap gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"><Toggle label="Show event date" checked={certificate.templateData.showEventDate} onChange={(showEventDate) => setCertificate({ ...certificate, templateData: { ...certificate.templateData, showEventDate } })} /><Toggle label="Show race distance" checked={certificate.templateData.showDistance} onChange={(showDistance) => setCertificate({ ...certificate, templateData: { ...certificate.templateData, showDistance } })} /></div>
            {certificateError && <p role="alert" className="text-sm font-medium text-error-600">{certificateError}</p>}
            <Button onClick={saveCertificate} disabled={saveCertificateMutation.isPending} className="w-full font-bold">{saveCertificateMutation.isPending ? "Saving settings..." : "Save certificate settings"}</Button>
          </div>
        </Card>

        <Card className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900" style={{ borderColor: isHexColour(certificate.themeColor) ? certificate.themeColor : undefined }}>
          <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Certificate configuration summary</p>
          <h3 className="mt-3 text-center text-xl font-black text-neutral-900 dark:text-neutral-50">{certificate.customTexts.title}</h3>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-neutral-500">{certificate.customTexts.completionText}</p>
          <div className="mt-5 flex justify-between border-t border-neutral-200 pt-4 text-xs text-neutral-500 dark:border-neutral-800"><span>{certificate.orientation.toLowerCase()} · {certificate.preset.toLowerCase()}</span><span>{certificate.customTexts.signatureTitle}{certificate.customTexts.issuerName ? ` · ${certificate.customTexts.issuerName}` : ""}</span></div>
        </Card>
      </section>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="flex items-center gap-1.5">{icon}{label}</Label>{children}</div>;
}

function TextField({ label, value, maxLength, onChange }: { label: string; value: string; maxLength: number; onChange: (value: string) => void }) {
  return <Field label={label}><Input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} /></Field>;
}

function ColourInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><div className="flex gap-2"><Input type="color" aria-label={`${label} picker`} value={isHexColour(value) ? value : "#F97316"} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 cursor-pointer p-1" /><Input value={value} maxLength={7} className="font-mono" onChange={(event) => onChange(event.target.value)} /></div></Field>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary-500" />{label}</label>;
}
