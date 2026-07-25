import React from "react";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="bg-white dark:bg-neutral-950 min-h-screen py-12 sm:py-16">
      <div className="fluid-container">
        <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase mb-4 border border-primary-200 dark:border-primary-800">
            <FileText className="h-3.5 w-3.5" /> Legal Terms
          </div>
          <h1 className="text-4xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-5xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-3 text-base text-neutral-500 max-w-2xl">
            Effective date: 18 July 2026. Please read these terms carefully before registering for running events on the NexRun platform.
          </p>
        </div>

        {/* Content Section */}
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>1. Acceptance of Terms</span>
            </h2>
            <p>
              By accessing, browsing, or registering for any running event via NexRun (`nexrun.my`), you agree to be bound by these Terms and Conditions along with all rules and regulations established by individual event organizers. If you do not agree, please do not use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>2. Event Registration &amp; Ticketing</span>
            </h2>
            <p>
              NexRun acts as a multi-tenant ticketing and registration platform for independent event organizers across Malaysia. All registrations are final upon confirmation of payment. Participants must ensure all profile details (such as full name, IC number/passport, emergency contact, and T-shirt size) are accurately provided during registration.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Tickets and race bibs are strictly non-transferable unless explicitly permitted by the event organizer during authorized transfer windows.</li>
              <li>Participant age restrictions (e.g. 18+ for marathons) are enforced based on official event rules.</li>
              <li>Race Pack Collection (REPC) dates and venues are dictated by the organizer; failure to collect during the specified window may result in forfeiture of the race pack without refund.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>3. Pricing &amp; Fees</span>
            </h2>
            <p>
              All ticket prices are listed in Malaysian Ringgit (RM) and displayed in sen during payment gateway processing. NexRun applies a transparent processing and platform fee which is shown clearly during checkout before payment submission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>4. Refund &amp; Cancellation Policy</span>
            </h2>
            <p>
              Unless an event is officially cancelled by the organizer or required by Malaysian statutory consumer laws, all registration fees are strictly non-refundable. In the event of severe weather, natural disasters, or government directives (Force Majeure), the organizer reserves the right to postpone or convert the race to a virtual run without issuing financial refunds.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>5. Assumption of Risk &amp; Medical Fitness</span>
            </h2>
            <p>
              Participating in road races and endurance runs involves physical exertion and inherent risks. By completing your registration, you warrant that you are physically fit and medically cleared to participate. You agree to release NexRun, its developers, volunteers, and partners from any liability regarding personal injury, loss, or property damage during race events.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>6. Organizer Obligations &amp; SSM Verification</span>
            </h2>
            <p>
              Event organizers using NexRun must complete mandatory corporate vetting with valid SSM registration numbers and bank account verification. Organizers are solely responsible for obtaining police permits, local municipal clearances, and medical support on race day.
            </p>
          </section>
        </div>

        {/* Footer info */}
        </div>
      </div>
    </div>
  );
}
