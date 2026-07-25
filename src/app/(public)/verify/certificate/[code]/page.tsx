"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Printer, ShieldAlert } from "lucide-react";
import { CertificateDocument } from "@/components/documents/certificate-document";
import { Button } from "@/components/ui/button";
import { normalizeCertificateTemplate } from "@/lib/templates/template-config";
import { trpc } from "@/lib/trpc";

export default function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data: reg, isLoading, error } = trpc.registration.verifyRegistration.useQuery({ registrationCode: code });

  if (isLoading) {
    return <div className="fluid-container py-12"><div className="mx-auto h-[34rem] max-w-5xl animate-pulse rounded-3xl bg-neutral-200 dark:bg-neutral-800" /></div>;
  }

  if (error || !reg) {
    return (
      <div className="fluid-container py-24"><div className="mx-auto max-w-md text-center"><ShieldAlert className="mx-auto h-16 w-16 text-error-500" /><h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">Certificate not available</h1><p className="mt-2 text-sm text-neutral-500">We could not verify the certificate code <span className="font-mono font-bold">{code}</span>.</p><Link href="/" className="mt-6 inline-block font-semibold text-primary-500 hover:underline">Return to homepage</Link></div></div>
    );
  }

  if (!reg.isFinisher || reg.event.status !== "COMPLETED") {
    return (
      <div className="fluid-container py-24"><div className="mx-auto max-w-md text-center"><Award className="mx-auto h-14 w-14 text-neutral-300" /><h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">Certificate not available yet</h1><p className="mt-2 text-sm leading-relaxed text-neutral-500">Certificates are released only after the event is completed and the organizer confirms finisher status.</p><Link href="/" className="mt-6 inline-block font-semibold text-primary-500 hover:underline">Return to homepage</Link></div></div>
    );
  }

  return (
    <div className="fluid-container py-8 sm:py-12 print:p-0">
      <div className="mx-auto max-w-5xl space-y-6 print:max-w-none print:space-y-0">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-neutral-800 print:hidden">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"><ArrowLeft className="h-4 w-4" />Back to home</Link>
          <Button type="button" onClick={() => window.print()} className="gap-2 font-bold"><Printer className="h-4 w-4" />Print / Save PDF</Button>
        </div>
        <div className="print:break-after-page">
          <CertificateDocument
            template={normalizeCertificateTemplate(reg.event.certificateTemplate)}
            event={reg.event}
            registration={{ participantName: reg.participantProfile.fullName, categoryName: reg.ticketCategory.name, distance: reg.ticketCategory.distance, registrationCode: reg.registrationCode }}
            verificationUrl={`/verify/certificate/${reg.registrationCode}`}
          />
        </div>
        <p className="print:hidden text-center text-xs text-neutral-500">This public verification view protects participant identity while confirming the official finisher record.</p>
      </div>
    </div>
  );
}
