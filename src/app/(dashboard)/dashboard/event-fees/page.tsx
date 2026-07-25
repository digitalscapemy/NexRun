"use client";

import React, { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { ROLES, type RoleType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CreditCard, ReceiptText, ShieldCheck, CircleCheck, Clock3, Ban, Landmark } from "lucide-react";
import toast from "react-hot-toast";

function formatCurrency(amountSen: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amountSen / 100);
}

function getInvoiceStatusClass(status: string) {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
    case "WAIVED":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300";
    case "PROCESSING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
    case "VOID":
      return "border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
    default:
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300";
  }
}

export default function EventFeesPage() {
  return (
    <ErrorBoundary>
      <EventFeesContent />
    </ErrorBoundary>
  );
}

function EventFeesContent() {
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const userRole = (session?.user?.role as RoleType) || ROLES.USER;
  const isPlatformAdmin = userRole === ROLES.ADMIN || userRole === ROLES.DEVELOPER;
  const { data: fees = [], isLoading } = trpc.activation.getActivationFees.useQuery();
  const [waiverFeeId, setWaiverFeeId] = useState<string | null>(null);
  const [waiverReason, setWaiverReason] = useState("");

  const refreshFinancialViews = async () => {
    await Promise.all([
      utils.activation.getActivationFees.invalidate(),
      utils.event.getDashboardEvents.invalidate(),
      utils.event.getDashboardStats.invalidate(),
    ]);
  };

  const paymentMutation = trpc.activation.processActivationFeePayment.useMutation({
    onSuccess: async (result) => {
      await refreshFinancialViews();
      toast.success(result.message);
    },
    onError: (error) => toast.error(error.message || "Unable to process the activation payment."),
  });

  const waiveMutation = trpc.activation.waiveActivationFee.useMutation({
    onSuccess: async () => {
      setWaiverFeeId(null);
      setWaiverReason("");
      await refreshFinancialViews();
      toast.success("Activation fee waived and event published.");
    },
    onError: (error) => toast.error(error.message || "Unable to waive this activation fee."),
  });

  const payActivationFee = (organizerFeeId: string, eventTitle: string) => {
    if (!window.confirm(`Confirm secure payment of RM 2,000.00 to activate \"${eventTitle}\"?`)) return;
    paymentMutation.mutate({
      organizerFeeId,
      scenario: "SUCCESS",
      idempotencyKey: crypto.randomUUID(),
    });
  };

  const submitWaiver = (organizerFeeId: string) => {
    const reason = waiverReason.trim();
    if (reason.length < 5) {
      toast.error("Provide a waiver reason with at least 5 characters.");
      return;
    }
    waiveMutation.mutate({ organizerFeeId, reason });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 dark:border-neutral-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-primary-500" />
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
              Event Activation Fees
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            Approved events require a one-time {formatCurrency(200_000)} activation payment before they are published. This is separate from ticket sales, processing fees, and organizer settlements.
          </p>
        </div>
        {isPlatformAdmin && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-700 dark:border-primary-900/60 dark:bg-primary-950/30 dark:text-primary-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Platform oversight
          </span>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64" aria-label="Loading..." />
      ) : fees.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No activation invoices"
          description="Activation invoices appear here after an event is approved by NexRun."
        />
      ) : (
        <div className="space-y-5">
          {fees.map((fee) => {
            const isPayable =
              fee.event.status === "AWAITING_EVENT_FEE" &&
              (fee.status === "PENDING" || fee.status === "PROCESSING");
            const isWaiverOpen = waiverFeeId === fee.id;

            return (
              <Card key={fee.id} className="overflow-hidden border-neutral-200 shadow-sm dark:border-neutral-800">
                <CardHeader className="border-b border-neutral-100 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">{fee.event.title}</CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {isPlatformAdmin && <><strong>{fee.organization.companyName}</strong> &middot; </>}
                        Invoice {fee.invoiceNumber} &middot; Issued {new Date(fee.issuedAt).toLocaleDateString("en-MY", { dateStyle: "medium" })}
                      </CardDescription>
                    </div>
                    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getInvoiceStatusClass(fee.status)}`}>
                      {fee.status.toLowerCase().replaceAll("_", " ")}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/30">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Activation fee</p>
                      <p className="mt-1 text-2xl font-black text-neutral-900 dark:text-neutral-50">{formatCurrency(fee.amountSen)}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/30">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Event status</p>
                      <p className="mt-1 text-sm font-bold text-neutral-800 dark:text-neutral-100">{fee.event.status.toLowerCase().replaceAll("_", " ")}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/30">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Payment reference</p>
                      <p className="mt-1 truncate font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300">{fee.paymentReference || "Not available"}</p>
                    </div>
                  </div>

                  {isPayable && !isPlatformAdmin && (
                    <div className="flex flex-col gap-3 rounded-xl border border-primary-200 bg-primary-50/60 p-4 dark:border-primary-900/60 dark:bg-primary-950/20 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
                        <div>
                          <p className="text-sm font-bold text-primary-900 dark:text-primary-100">Ready for secure online payment</p>
                          <p className="mt-0.5 text-xs text-primary-700 dark:text-primary-300">Payment confirmation publishes this event immediately.</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => payActivationFee(fee.id, fee.event.title)}
                        disabled={paymentMutation.isPending}
                        className="bg-primary-500 font-bold text-white hover:bg-primary-600"
                      >
                        {paymentMutation.isPending ? "Processing…" : `Pay ${formatCurrency(fee.amountSen)}`}
                      </Button>
                    </div>
                  )}

                  {isPayable && isPlatformAdmin && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                      {!isWaiverOpen ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Awaiting organizer payment</p>
                            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">You may approve a documented waiver when operationally required.</p>
                          </div>
                          <Button variant="outline" onClick={() => setWaiverFeeId(fee.id)} className="border-amber-300 bg-white font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-neutral-900 dark:text-amber-300">
                            Waive activation fee
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label htmlFor={`waiver-${fee.id}`} className="text-sm font-bold text-amber-900 dark:text-amber-100">Waiver reason</label>
                          <textarea
                            id={`waiver-${fee.id}`}
                            value={waiverReason}
                            onChange={(event) => setWaiverReason(event.target.value)}
                            maxLength={1000}
                            placeholder="State the approved operational reason for this waiver"
                            className="min-h-24 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-amber-900/70 dark:bg-neutral-900"
                          />
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="ghost" onClick={() => { setWaiverFeeId(null); setWaiverReason(""); }}>Cancel</Button>
                            <Button onClick={() => submitWaiver(fee.id)} disabled={waiveMutation.isPending} className="bg-amber-600 font-bold text-white hover:bg-amber-700">
                              {waiveMutation.isPending ? "Publishing…" : "Confirm waiver & publish"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {fee.paymentAttempts.length > 0 && (
                    <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400">Payment activity</p>
                      <div className="space-y-2">
                        {fee.paymentAttempts.map((attempt) => (
                          <div key={attempt.id} className="flex flex-col gap-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-800/60 sm:flex-row sm:items-center sm:justify-between">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-200">
                              {attempt.status === "SUCCESS" ? <CircleCheck className="h-3.5 w-3.5 text-emerald-500" /> : attempt.status === "PROCESSING" ? <Clock3 className="h-3.5 w-3.5 text-amber-500" /> : <Ban className="h-3.5 w-3.5 text-rose-500" />}
                              {attempt.status.toLowerCase()} &middot; {new Date(attempt.createdAt).toLocaleString("en-MY")}
                            </span>
                            <span className="font-mono text-neutral-500">{attempt.transactionId || attempt.failureReason || "Awaiting confirmation"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
