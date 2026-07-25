import React from "react";
import { Lock } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="bg-white dark:bg-neutral-950 min-h-screen py-12 sm:py-16">
      <div className="fluid-container">
        <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase mb-4 border border-primary-200 dark:border-primary-800">
            <Lock className="h-3.5 w-3.5" /> Privacy Notice
          </div>
          <h1 className="text-4xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-base text-neutral-500 max-w-2xl">
            Effective date: 18 July 2026. This notice explains how NexRun collects, uses, and protects personal information in line with Malaysia&apos;s data protection principles.
          </p>
        </div>

        {/* Content Section */}
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>1. Information We Collect</span>
            </h2>
            <p>
              To provide race registration and event operations, NexRun collects personal data submitted during account creation and checkout. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Identity Details:</strong> Full Name, NRIC (MyKad) or Passport number, Date of Birth, and Gender (required for age group categorization and insurance coverage).</li>
              <li><strong>Contact Information:</strong> Email address and mobile phone number.</li>
              <li><strong>Emergency Contact Details:</strong> Name and contact phone number of your designated emergency contact for race day safety.</li>
              <li><strong>Apparel Sizing:</strong> T-Shirt size preferences for participant merchandise.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>2. Purpose of Data Collection</span>
            </h2>
            <p>
              Your personal data is collected solely for legitimate operational purposes, including:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Issuing race bibs, verification codes, and participant check-in validation.</li>
              <li>Facilitating secure online payments and generating financial receipts.</li>
              <li>Communicating critical race day announcements, REPC schedule updates, and safety guidelines.</li>
              <li>Sharing necessary roster data with official timing chip vendors and medical personnel on standby during the event.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>3. Data Sharing &amp; Protection</span>
            </h2>
            <p>
              We treat your personal data with utmost confidentiality. Participant rosters are shared strictly with the specific organizer of the event you registered for. We do NOT sell, trade, or rent your personal data to unauthorized third-party advertisers. All data stored within PostgreSQL databases undergoes strict access control and encrypted transmissions using modern SSL/TLS protocols.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>4. Cookie Policy</span>
            </h2>
            <p>
              NexRun uses essential session cookies (`better-auth`) to maintain authentication state and security while you browse the dashboard. We do not deploy intrusive tracking scripts across unrelated web properties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>5. User Rights &amp; Contact</span>
            </h2>
            <p>
              Under PDPA 2010, you have the right to request access to, correct, or delete your personal profile data. For privacy inquiries or deletion requests, please contact our Data Protection Officer at `privacy@nexrun.my`.
            </p>
          </section>
        </div>

        {/* Footer info */}
        </div>
      </div>
    </div>
  );
}
