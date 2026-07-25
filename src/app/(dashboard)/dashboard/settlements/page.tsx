"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import { ROLES, type RoleType } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign, CheckCircle2, Clock, Landmark, ArrowRight, History, X } from "lucide-react";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@base-ui/react/dialog";

export default function SettlementsPage() {
  return (
    <ErrorBoundary>
      <SettlementsPageContent />
    </ErrorBoundary>
  );
}

function SettlementsPageContent() {
  const { data: session } = useSession();
  const userRole = (session?.user?.role as RoleType) || ROLES.USER;
  const isAdminOrDev = userRole === ROLES.ADMIN || userRole === ROLES.DEVELOPER;

  const {
    data: settlements,
    isLoading,
    refetch,
  } = trpc.settings.getPendingSettlements.useQuery();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [referenceNum, setReferenceNum] = useState("");
  const [timelineEventId, setTimelineEventId] = useState<string | null>(null);

  const processMutation = trpc.settings.processSettlement.useMutation({
    onSuccess: () => {
      toast.success("Settlement processed and marked as SETTLED!");
      setSelectedEventId(null);
      setReferenceNum("");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to process settlement.");
    },
  });

  const handleSettle = (eventId: string) => {
    if (!referenceNum || referenceNum.trim().length < 3) {
      toast.error("Please provide a valid bank transfer reference number.");
      return;
    }
    processMutation.mutate({ eventId, referenceNumber: referenceNum.trim() });
  };

  const formatRM = (sen: number) => {
    return `RM ${(sen / 100).toFixed(2)}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="border-b pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-primary-500" />
              <span>Event Revenue & Settlements</span>
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {isAdminOrDev
                ? "Admin oversight: Review organizer bank details and disburse net ticket sales revenue after event completion."
                : "Organizer hub: Track ticket sales revenue, platform fee deductions, and net payout settlements."}
            </p>
          </div>
        </div>
        {isAdminOrDev && (
          <div className="flex justify-center pt-1">
            <span className="rounded-full bg-primary-500/10 text-primary-600 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider border border-primary-500/20 shadow-2xs">
              ADMIN PAYOUT CONTROLLER
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !settlements || settlements.length === 0 ? (
        <Card className="p-12 text-center border-dashed rounded-2xl">
          <DollarSign className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">No Financial Records Yet</h3>
          <p className="text-sm text-neutral-500 mt-1">There are no active or completed events with ticket revenue ready for settlement.</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {settlements.map((item) => {
            const isSettled = item.settlementStatus === "SETTLED";
            const isSelected = selectedEventId === item.eventId;

            return (
              <Card
                key={item.eventId}
                className={`border rounded-2xl overflow-hidden transition-all shadow-sm ${
                  isSettled
                    ? "border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/10 dark:bg-emerald-950/10"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                }`}
              >
                <CardHeader className="pb-4 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <CardTitle className="min-w-0 overflow-wrap-anywhere text-lg font-bold text-neutral-900 dark:text-neutral-100">
                          {item.eventTitle}
                        </CardTitle>
                        <span className="text-xs bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded-md font-mono uppercase">
                          {item.status}
                        </span>
                      </div>
                      <CardDescription className="text-xs text-neutral-500 mt-1">
                        Organizer: <strong>{item.companyName}</strong> | Event Date: {new Date(item.eventDate).toLocaleDateString("en-MY", { dateStyle: "medium" })}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase ${
                          isSettled
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300"
                        }`}
                      >
                        {isSettled ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        <span>{item.settlementStatus}</span>
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                  <div className="grid gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4 xl:gap-6">
                    {/* Financial Breakdown */}
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                      <p className="text-[11px] font-bold uppercase text-neutral-400">Gross Ticket Sales</p>
                      <p className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 mt-1">
                        {formatRM(item.totalPaidSen)}
                      </p>
                    </div>

                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                      <p className="text-[11px] font-bold uppercase text-neutral-400">Platform Admin Fee</p>
                      <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                        - {formatRM(item.totalAdminFeeSen)}
                      </p>
                    </div>

                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
                      <p className="text-[11px] font-bold uppercase text-neutral-400">Payment Gateway Fee</p>
                      <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                        - {formatRM(item.totalProcessingFeeSen)}
                      </p>
                    </div>

                    <div className="bg-primary-50 dark:bg-primary-950/30 p-4 rounded-xl border border-primary-200 dark:border-primary-900">
                      <p className="text-[11px] font-bold uppercase text-primary-600 dark:text-primary-400">Net Payable to Organizer</p>
                      <p className="text-2xl font-black text-primary-600 dark:text-primary-400 mt-1">
                        {formatRM(item.netPayableSen)}
                      </p>
                    </div>
                  </div>

                  {/* Bank Details & Status Bar */}
                  <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-neutral-600 dark:text-neutral-300">
                    <div className="flex min-w-0 items-center gap-3">
                      <Landmark className="h-5 w-5 text-neutral-400 shrink-0" />
                      <div className="min-w-0 overflow-wrap-anywhere">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{item.bankName || "No Bank Info"}</span> &bull; Acc:{" "}
                        <span className="font-mono">{item.bankAccountNo || "N/A"}</span>
                        <p className="text-[11px] text-neutral-400 mt-0.5">Holder: {item.bankAccountName || "N/A"}</p>
                        <button
                          type="button"
                          onClick={() => setTimelineEventId(item.eventId)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:underline dark:text-primary-400"
                        >
                          <History className="h-3 w-3" /> View payout timeline
                        </button>
                      </div>
                    </div>

                    {isSettled ? (
                      <div className="min-w-0 overflow-wrap-anywhere text-left md:text-right">
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold block">
                          Settled on {item.settledAt ? new Date(item.settledAt).toLocaleDateString("en-MY") : "N/A"}
                        </span>
                        <span className="font-mono text-[11px] text-neutral-400">Ref: {item.referenceNumber}</span>
                      </div>
                    ) : isAdminOrDev ? (
                      <div>
                        {!isSelected ? (
                          <Button
                            onClick={() => setSelectedEventId(item.eventId)}
                            className="w-full rounded-xl bg-primary-500 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-primary-600 sm:w-auto"
                          >
                            Process Payout <ArrowRight className="h-4 w-4 ml-1.5" />
                          </Button>
                        ) : (
                          <div className="grid w-full gap-2 rounded-xl bg-neutral-100 p-2 sm:grid-cols-[minmax(12rem,1fr)_auto_auto] dark:bg-neutral-800">
                            <Input
                              placeholder="Bank Transfer Ref # (e.g. MBB-99887766)"
                              value={referenceNum}
                              onChange={(e) => setReferenceNum(e.target.value)}
                              className="h-11 w-full min-w-0 bg-white text-xs dark:bg-neutral-900"
                            />
                            <Button
                              size="sm"
                              disabled={processMutation.isPending}
                              onClick={() => handleSettle(item.eventId)}
                              className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700"
                            >
                              {processMutation.isPending ? "Processing..." : "Confirm & Settle"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedEventId(null);
                                setReferenceNum("");
                              }}
                              className="min-h-11 w-full text-neutral-500"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-amber-700 dark:text-amber-400 font-medium">
                        ⏳ Pending processing by NexRun Admin
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {timelineEventId && (
        <SettlementTimelineModal eventId={timelineEventId} onClose={() => setTimelineEventId(null)} />
      )}
    </div>
  );
}

function SettlementTimelineModal({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const { data, isLoading } = trpc.settings.getSettlementTimeline.useQuery({ eventId });

  const formatRM = (sen: number) => `RM ${(sen / 100).toFixed(2)}`;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4">
      <Dialog.Popup className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl outline-none dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary-500" />
            <Dialog.Title className="text-base font-bold text-neutral-900 dark:text-neutral-100">Payout Timeline</Dialog.Title>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close timeline"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading || !data ? (
          <Skeleton className="h-48 m-5" />
        ) : (
          <div className="min-h-0 space-y-6 overflow-y-auto p-4 sm:p-5">
            <div>
              <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{data.eventTitle}</h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Race day {new Date(data.eventDate).toLocaleDateString("en-MY", { dateStyle: "medium" })}
              </p>
            </div>

            <div className="grid gap-3 text-xs min-[380px]:grid-cols-2">
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-3">
                <p className="font-bold uppercase text-neutral-400">Net payable</p>
                <p className="mt-1 text-base font-black text-primary-600 dark:text-primary-400">{formatRM(data.netPayableSen)}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-3">
                <p className="font-bold uppercase text-neutral-400">Current status</p>
                <p className="mt-1 text-base font-black text-neutral-900 dark:text-neutral-100">{data.status}</p>
              </div>
            </div>

            <div className="relative border-l border-neutral-200 dark:border-neutral-800 pl-5 space-y-6">
              {data.milestones.map((milestone, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-6.25 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-neutral-900 ${
                      milestone.done ? "bg-primary-500" : "bg-neutral-300 dark:bg-neutral-700"
                    }`}
                  />
                  <p className={`text-sm font-bold ${milestone.done ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400"}`}>
                    {milestone.label}
                  </p>
                  {milestone.at ? (
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {new Date(milestone.at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400 mt-0.5 italic">Not yet reached</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
