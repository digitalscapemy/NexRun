"use client";

import React, { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  ShieldCheck,
  User,
  Tag,
  Clock,
  Printer,
  ShieldAlert,
  ArrowLeft,
  QrCode,
} from "lucide-react";
import { QrCodeImage } from "@/components/public/qr-code-image";

export default function VerifyRegistrationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const { data: reg, isLoading, error } = trpc.registration.verifyRegistration.useQuery({
    registrationCode: resolvedParams.code,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="fluid-container py-12">
        <div className="mx-auto max-w-xl animate-pulse space-y-6">
          <div className="h-44 w-full bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
          <div className="h-64 w-full bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !reg) {
    return (
      <div className="fluid-container py-24">
        <div className="mx-auto max-w-md text-center">
          <ShieldAlert className="h-16 w-16 text-error-500 mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Invalid Registration Code
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            We could not verify the registration code <span className="font-mono font-bold">{resolvedParams.code}</span>. Please check with the event organizer.
          </p>
          <Link href="/" className="mt-6 inline-block text-primary-500 font-semibold hover:underline">
            &larr; Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const profile = reg.participantProfile;
  const isCheckedIn = !!reg.checkIn;
  const collectionStatus = reg.checkIn
    ? [
        { label: "Bib", collected: reg.checkIn.bibCollected },
        { label: "T-shirt", collected: reg.checkIn.shirtCollected },
        { label: "Race pack", collected: reg.checkIn.packCollected },
      ]
    : [];

  return (
    <div className="fluid-container py-8 sm:py-12 print:p-0">
      <div className="mx-auto max-w-2xl space-y-6 print:py-0 print:px-0">
        {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4 print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <Button
          onClick={handlePrint}
          variant="outline"
          size="sm"
          className="text-xs font-bold rounded-xl flex items-center gap-1.5 border-neutral-300 dark:border-neutral-700"
        >
          <Printer className="h-3.5 w-3.5" /> Print / Save E-Ticket
        </Button>
      </div>

      {/* Official Status Card */}
      <Card className="border-2 border-emerald-500/30 dark:border-emerald-500/20 bg-linear-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-neutral-900 rounded-3xl overflow-hidden shadow-lg print:shadow-none print:border">
        <div className="bg-emerald-500 text-white px-6 py-3 flex items-center justify-between font-extrabold text-sm tracking-wide uppercase">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Official Verified E-Ticket
          </span>
          <span>NexRun System</span>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Event & QR Code Layout */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-neutral-200/80 dark:border-neutral-800">
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="text-xs font-extrabold uppercase text-primary-500 tracking-wider">
                Event Entry Ticket
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-50">
                {reg.event.title}
              </h1>
              <div className="flex flex-col sm:flex-row items-center gap-3 text-xs text-neutral-500 font-medium pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary-500" />
                  {new Date(reg.event.eventDate).toLocaleDateString("en-MY", {
                    dateStyle: "full",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary-500" />
                  {reg.event.venue}, {reg.event.state}
                </span>
              </div>
            </div>

            {/* QR Code Visual Box */}
            <div className="flex flex-col items-center bg-white dark:bg-neutral-950 p-3 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 shadow-inner shrink-0">
              <QrCodeImage value={`${process.env.NEXT_PUBLIC_APP_URL || ""}/verify/registration/${reg.registrationCode}`} size={128} className="rounded-xl" />
              <span className="text-[10px] font-bold text-neutral-400 mt-1.5 uppercase">
                Scan for REPC
              </span>
            </div>
          </div>

          {/* Participant Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary-500" /> Participant Name
              </span>
              <p className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base">
                {profile?.fullName || "-"}
              </p>
              <p className="text-xs text-neutral-500 pt-0.5">Identity details are kept private.</p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary-500" /> Race Category
              </span>
              <p className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base">
                {reg.ticketCategory?.name || "General Ticket"}
              </p>
              <p className="text-xs pt-0.5 font-mono font-bold text-primary-600 dark:text-primary-400">
                Code: {reg.registrationCode}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 space-y-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-primary-500" /> Race Bib
              </span>
              <p className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base">
                {reg.bibNumber ? `Bib ${reg.bibNumber}` : "Pending assignment"}
              </p>
              <p className="text-xs text-neutral-500 pt-0.5">
                {reg.ticketCategory.distance}KM category
              </p>
            </div>

            <div
              className={`p-4 rounded-2xl border space-y-1 ${
                isCheckedIn
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                  : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800"
              }`}
            >
              <span className="text-[11px] font-bold text-neutral-400 uppercase flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary-500" /> Check-In Status
              </span>
              <div className="flex items-center gap-2">
                {isCheckedIn ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-base">
                      Checked in
                    </span>
                  </>
                ) : (
                  <span className="font-bold text-neutral-700 dark:text-neutral-300 text-base">
                    Pending race pack collection
                  </span>
                )}
              </div>
              {isCheckedIn && reg.checkIn && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">Checked in at: {new Date(reg.checkIn.checkedInAt).toLocaleString("en-MY")}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold">
                    {collectionStatus.map(({ label, collected }) => <span key={label} className={collected ? "text-emerald-700 dark:text-emerald-300" : "text-neutral-500 dark:text-neutral-400"}>{label}: {collected ? "Collected" : "Pending"}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* REPC Collection Notice */}
          {reg.event.repcDate && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs space-y-1 text-amber-900 dark:text-amber-200">
              <strong className="font-extrabold block text-amber-800 dark:text-amber-300">
                Race Entry Pack Collection schedule
              </strong>
              <p>
                Please present this QR code or registration code ({reg.registrationCode}) at{" "}
                <span className="font-bold">{reg.event.repcLocation || "Race Venue"}</span> on{" "}
                <span className="font-bold">
                  {new Date(reg.event.repcDate).toLocaleDateString("en-MY")} ({reg.event.repcTime || "9:00 AM - 6:00 PM"})
                </span>{" "}
                to collect your race bib and T-shirt.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
