import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Zap, DollarSign, QrCode, ArrowRight } from "lucide-react";

export default function BecomeOrganizerPage() {
  return (
    <div className="bg-white dark:bg-neutral-950 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 bg-linear-to-b from-primary-500/10 via-transparent to-transparent">
        <div className="fluid-container text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider border border-primary-500/20">
            <Trophy className="h-4 w-4" /> Powering Malaysia&apos;s Next Generation of Running Events
          </div>
          <h1 className="text-4xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-6xl">
            Launch, Ticketing &amp; Manage Your Race with Zero Hassle
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-neutral-600 dark:text-neutral-300">
            NexRun gives event directors and sports associations a complete multi-tenant platform with instant QR check-in tools, dynamic race bib builders, and automated financial settlements.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-6 rounded-2xl shadow-xl shadow-primary-500/25 text-base">
              <Link href="/dashboard/organizer-onboarding">
                Apply as Event Organizer <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-neutral-300 dark:border-neutral-700 font-bold px-8 py-6 rounded-2xl text-base">
              <Link href="/">Explore Active Races</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="fluid-container py-20 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-50">
            Everything Required to Run an Outstanding Event
          </h2>
          <p className="text-neutral-500">
            We replace fragmented spreadsheets, slow payment gateways, and manual race pack collection with modern automation.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Card className="border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow bg-neutral-50/50 dark:bg-neutral-900/50">
            <CardContent className="p-0 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Multi-Category Ticketing</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Configure 5KM Fun Runs, 10KM Competitive, 21KM Half Marathons, and Full Marathons with age limits, early-bird deadlines, and slot caps.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow bg-neutral-50/50 dark:bg-neutral-900/50">
            <CardContent className="p-0 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Instant QR REPC Check-In</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Scan participant QR codes right from any smartphone or tablet during Race Pack Collection to eliminate long queues and prevent duplicate claims.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow bg-neutral-50/50 dark:bg-neutral-900/50">
            <CardContent className="p-0 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Transparent Bank Settlements</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Track real-time gross revenue, fee calculations, and direct payouts settled right into your corporate bank account post-race.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Onboarding Steps */}
      <section className="fluid-container py-20 bg-neutral-900 text-white rounded-3xl my-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black">3 Steps to Publish Your Event</h2>
            <p className="text-neutral-400">Our vetted onboarding process ensures trusted experiences across the running community.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 text-center sm:text-left">
            <div className="space-y-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 font-extrabold text-white text-base">
                1
              </span>
              <h3 className="text-lg font-bold">Submit SSM Details</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Complete your organizer onboarding form by submitting your registered company name, SSM number, and bank account details.
              </p>
            </div>

            <div className="space-y-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 font-extrabold text-white text-base">
                2
              </span>
              <h3 className="text-lg font-bold">Admin Verification</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                NexRun administrators review your corporate profile and unlock your full event publishing suite within 24 hours.
              </p>
            </div>

            <div className="space-y-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 font-extrabold text-white text-base">
                3
              </span>
              <h3 className="text-lg font-bold">Go Live &amp; Sell Tickets</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Build custom race categories, upload route maps, design printable race bibs, and open registrations to runners nationwide!
              </p>
            </div>
          </div>

          <div className="pt-6 text-center">
            <Button asChild size="lg" className="bg-white hover:bg-neutral-100 text-neutral-900 font-bold px-8 py-6 rounded-2xl">
              <Link href="/dashboard/organizer-onboarding">Start Onboarding Now &rarr;</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
