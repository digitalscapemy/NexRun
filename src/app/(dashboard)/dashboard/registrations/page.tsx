"use client";

import React from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticket, Calendar, MapPin, QrCode, FileText, Award, ArrowRight, CheckCircle2, Clock3, CreditCard } from "lucide-react";

export default function MyRegistrationsPage() {
  return (
    <ErrorBoundary>
      <MyRegistrationsContent />
    </ErrorBoundary>
  );
}

function MyRegistrationsContent() {
  const { data: orders, isLoading } = trpc.registration.getUserRegistrations.useQuery();
  const { data: pendingOrders = [], isLoading: isLoadingPending } = trpc.registration.getRecoverableOrders.useQuery();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
          <Ticket className="h-8 w-8 text-primary-500" />
          <span>My Event Registrations</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Access your confirmed race tickets, QR codes for Race Pack Collection (REPC), receipts, and e-certificates.
        </p>
      </div>

      {!isLoadingPending && pendingOrders.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-50">Pending checkout</h2>
          </div>
          <p className="text-sm text-neutral-500">Your slot is reserved temporarily. Complete payment before the reservation expires.</p>
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <Card key={order.id} className="border-amber-200 bg-amber-50/40 p-5 dark:border-amber-900/60 dark:bg-amber-950/15">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-neutral-50">{order.event.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">Order {order.orderNumber} &middot; {order._count.items} participant{order._count.items === 1 ? "" : "s"}</p>
                    <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Reserved until {order.expiresAt ? new Date(order.expiresAt).toLocaleString("en-MY") : "the checkout expires"}</p>
                    {order.paymentTransactions[0]?.failureReason && <p className="mt-1 text-xs text-error-600 dark:text-error-400">{order.paymentTransactions[0].failureReason}</p>}
                  </div>
                  <Button asChild className="bg-primary-500 font-bold text-white hover:bg-primary-600">
                    <Link href={`/orders/${order.id}/pay`}><CreditCard className="mr-1.5 h-4 w-4" /> Resume payment</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="space-y-4" aria-label="Loading...">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No Registrations Yet"
          description="You haven't signed up for any running events yet. Explore upcoming races across Malaysia and join the movement!"
          action={{
            label: "Explore Running Events",
            href: "/events",
          }}
        />
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const ev = order.event;
            const regList = order.registrations;

            return (
              <Card
                key={order.id}
                className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Event Banner & Header */}
                <div className="bg-neutral-900 text-white p-6 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-300 px-3 py-1 text-xs font-bold uppercase mb-2 border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed Order
                      </span>
                      <h2 className="text-2xl font-extrabold tracking-tight">{ev.title}</h2>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-neutral-300">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-primary-400" />
                          {new Date(ev.eventDate).toLocaleDateString("en-MY", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-primary-400" />
                          {ev.venue}, {ev.state}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl">
                        <Link href={`/orders/${order.id}/receipt`}>
                          <FileText className="h-4 w-4 mr-1.5" /> View Receipt
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="bg-primary-500 hover:bg-primary-600 text-white rounded-xl">
                        <Link href={`/events/${ev.slug}`}>
                          Event Page <ArrowRight className="h-4 w-4 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* REPC Collection Alert */}
                {ev.repcDate && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 px-6 py-3 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-4 text-xs">
                    <div className="text-amber-900 dark:text-amber-300">
                      <strong>Race Pack Collection (REPC):</strong>{" "}
                      {new Date(ev.repcDate).toLocaleDateString("en-MY")} ({ev.repcTime || "TBD"}) &bull;{" "}
                      <span>{ev.repcLocation || ev.venue}</span>
                    </div>
                    <span className="font-semibold text-amber-700 dark:text-amber-400 shrink-0">Show QR at Counter</span>
                  </div>
                )}

                {/* Individual Participant Tickets */}
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Registered Participants ({regList.length})
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {regList.map((reg) => {
                      const profile = reg.participantProfile;
                      const cat = reg.ticketCategory;

                      return (
                        <div
                          key={reg.id}
                          className="border border-neutral-100 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50/50 dark:bg-neutral-800/40 flex flex-col justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                                  {profile.fullName}
                                </p>
                                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                                  Bib Code: <span className="text-primary-600 dark:text-primary-400 font-semibold">{reg.registrationCode}</span>
                                </p>
                              </div>
                              <span className="rounded-full bg-primary-100 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300 px-2.5 py-0.5 text-[11px] font-extrabold uppercase border border-primary-200 dark:border-primary-800">
                                {cat.name}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                              <div>
                                <span className="text-[10px] text-neutral-400 block uppercase">T-Shirt Size</span>
                                <strong>{profile.tshirtSize || "Standard"}</strong> ({profile.tshirtType})
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-400 block uppercase">Check-In Status</span>
                                <strong className={reg.checkIn ? "text-emerald-600" : "text-neutral-500"}>
                                  {reg.checkIn ? "Checked in" : "Pending"}
                                </strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
                            <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/50 font-bold px-2">
                              <Link href={`/verify/registration/${reg.registrationCode}`} target="_blank">
                                <QrCode className="h-3.5 w-3.5 mr-1" /> View QR Code
                              </Link>
                            </Button>

                            {reg.isFinisher && ev.status === "COMPLETED" && (
                              <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 font-bold px-2">
                                <Link href={`/verify/certificate/${reg.registrationCode}`} target="_blank">
                                  <Award className="h-3.5 w-3.5 mr-1 text-amber-500" /> E-Certificate
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
