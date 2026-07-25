"use client";

import React, { use, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckSquare, ArrowRight, UserCheck, Clock3, Shirt, PackageCheck, TicketCheck, Users, Pencil, Volume2, VolumeX, Zap, ZapOff, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { QrScanner } from "@/components/operations/qr-scanner";
import { CheckInFeedbackOverlay } from "@/components/operations/check-in-feedback-overlay";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

type CollectionState = {
  bibCollected: boolean;
  shirtCollected: boolean;
  packCollected: boolean;
};

type CheckedInRunner = {
  registrationId: string;
  fullName: string;
  registrationCode: string;
  categoryName: string;
  distance: number;
  tshirtSize: string;
  tshirtType: string;
  checkedInAt: Date;
  alreadyCheckedIn: boolean;
};

type FeedbackState = {
  status: "success" | "already" | "error";
  participant?: {
    fullName: string;
    registrationCode: string;
    categoryName: string;
    distance: number;
    tshirtSize: string;
    tshirtType: string;
  };
  message?: string;
} | null;

export default function CheckInDeskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ErrorBoundary>
      <CheckInDeskPageInner params={params} />
    </ErrorBoundary>
  );
}

function CheckInDeskPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const utils = trpc.useUtils();
  const [registrationCode, setRegistrationCode] = useState("");
  const [stationName, setStationName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("nexrun:checkin:station") || "";
  });
  const [notes, setNotes] = useState("");
  const [collection, setCollection] = useState<CollectionState>({
    bibCollected: true,
    shirtCollected: true,
    packCollected: true,
  });
  const [successInfo, setSuccessInfo] = useState<CheckedInRunner | null>(null);
  const [feedbackOverlay, setFeedbackOverlay] = useState<FeedbackState>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("nexrun:checkin:sound");
    return saved === null ? true : saved === "true";
  });
  const [continuousMode, setContinuousMode] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("nexrun:checkin:continuous");
    return saved === null ? true : saved === "true";
  });
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);

  // Persist preferences
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (stationName.trim()) {
      localStorage.setItem("nexrun:checkin:station", stationName.trim());
    }
  }, [stationName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("nexrun:checkin:sound", String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("nexrun:checkin:continuous", String(continuousMode));
  }, [continuousMode]);

  const { data: desk, isLoading } = trpc.operational.getCheckInDesk.useQuery(
    { eventId },
    { refetchInterval: 10_000 }
  );

  const refreshDesk = async () => {
    await Promise.all([
      utils.operational.getCheckInDesk.invalidate({ eventId }),
      utils.operational.getEventParticipants.invalidate(),
      utils.operational.getEventOperationalSummary.invalidate({ eventId }),
    ]);
  };

  const checkInMutation = trpc.operational.markBibCheckedIn.useMutation({
    onSuccess: async (data) => {
      const checkedInAt = new Date(data.checkedInAt);
      const runnerInfo: CheckedInRunner = {
        registrationId: data.registration.id,
        fullName: data.registration.participantProfile.fullName,
        registrationCode: data.registration.registrationCode,
        categoryName: data.registration.ticketCategory.name,
        distance: data.registration.ticketCategory.distance,
        tshirtSize: data.registration.participantProfile.tshirtSize || "Not specified",
        tshirtType: data.registration.participantProfile.tshirtType || "Not specified",
        checkedInAt,
        alreadyCheckedIn: data.alreadyCheckedIn,
      };
      setSuccessInfo(runnerInfo);

      // Show feedback overlay
      setFeedbackOverlay({
        status: data.alreadyCheckedIn ? "already" : "success",
        participant: {
          fullName: runnerInfo.fullName,
          registrationCode: runnerInfo.registrationCode,
          categoryName: runnerInfo.categoryName,
          distance: runnerInfo.distance,
          tshirtSize: runnerInfo.tshirtSize,
          tshirtType: runnerInfo.tshirtType,
        },
      });

      setCollection({
        bibCollected: data.bibCollected,
        shirtCollected: data.shirtCollected,
        packCollected: data.packCollected,
      });
      setStationName(data.stationName || "");
      setNotes(data.notes || "");
      setRegistrationCode("");
      await refreshDesk();
    },
    onError: (err) => {
      setSuccessInfo(null);
      setFeedbackOverlay({
        status: "error",
        message: err.message || "Failed to check in runner.",
      });
      toast.error(err.message || "Failed to check in runner.");
    },
  });

  const updateCheckInMutation = trpc.operational.updateCheckInRecord.useMutation({
    onSuccess: async () => {
      await refreshDesk();
      toast.success("Collection details updated and recorded in the audit log.");
    },
    onError: (err) => toast.error(err.message || "Unable to update collection details."),
  });

  const submitCheckIn = (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      toast.error("Please enter a registration code.");
      return;
    }
    checkInMutation.mutate({
      registrationCode: normalized,
      eventId,
      stationName: stationName.trim() || undefined,
      notes: notes.trim() || undefined,
      ...collection,
    });
  };

  const updateCollection = (key: keyof CollectionState) => {
    setCollection((current) => ({ ...current, [key]: !current[key] }));
  };

  const saveCorrection = () => {
    if (!successInfo) return;
    updateCheckInMutation.mutate({
      eventId,
      registrationId: successInfo.registrationId,
      stationName: stationName.trim() || undefined,
      notes: notes.trim() || undefined,
      ...collection,
    });
  };

  const collectionOptions: Array<{ key: keyof CollectionState; label: string; icon: typeof TicketCheck }> = [
    { key: "bibCollected", label: "Bib collected", icon: TicketCheck },
    { key: "shirtCollected", label: "Shirt collected", icon: Shirt },
    { key: "packCollected", label: "Race pack collected", icon: PackageCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Feedback Overlay */}
      {feedbackOverlay && (
        <CheckInFeedbackOverlay
          status={feedbackOverlay.status}
          participant={feedbackOverlay.participant}
          message={feedbackOverlay.message}
          soundEnabled={soundEnabled}
          onDismiss={() => setFeedbackOverlay(null)}
        />
      )}

      {/* Mobile: Sticky header with station name */}
      <div className="sticky top-16 z-10 -mx-3 mb-4 border-b border-neutral-200 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900 sm:-mx-6 sm:px-6 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              const newName = prompt("Enter station name:", stationName);
              if (newName !== null) setStationName(newName);
            }}
            className="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-sm font-bold text-primary-700 dark:bg-primary-950/25 dark:text-primary-300"
          >
            <span>{stationName || "Set station"}</span>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-pressed={soundEnabled}
              className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setContinuousMode(!continuousMode)}
              aria-pressed={continuousMode}
              className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
            >
              {continuousMode ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Stats grid (unchanged) */}
      {isLoading ? (
        <div aria-label="Loading statistics"><Skeleton className="h-32 w-full" /></div>
      ) : desk && (
        <div className="hidden gap-3 lg:grid lg:grid-cols-5">
          {[
            ["Active runners", desk.stats.activeRegistrations, Users],
            ["Checked in", desk.stats.checkedIn, UserCheck],
            ["Pending", desk.stats.pendingCheckIn, Clock3],
            ["Shirts issued", desk.stats.shirtCollected, Shirt],
            ["Race packs issued", desk.stats.packCollected, PackageCheck],
          ].map(([label, value, Icon]) => {
            const StatIcon = Icon as typeof Users;
            return (
              <Card key={String(label)} className="border-neutral-200 p-4 dark:border-neutral-800">
                <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{String(label)}</p>
                <p className="mt-1 flex items-center gap-2 text-2xl font-black text-neutral-900 dark:text-neutral-50"><StatIcon className="h-5 w-5 text-primary-500" /> {Number(value)}</p>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {/* ZONE A — SCAN (Mobile: top; Desktop: in card) */}
          <Card className="border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-neutral-50">
              <CheckSquare className="h-5 w-5 text-primary-500" /> Check in participant
            </h2>

            {/* Desktop: Station name + notes inline */}
            <div className="mb-4 hidden grid-cols-2 gap-3 lg:grid">
              <div>
                <label htmlFor="station-name" className="mb-1 block text-xs font-bold text-neutral-600 dark:text-neutral-300">Station name</label>
                <Input id="station-name" value={stationName} onChange={(event) => setStationName(event.target.value)} placeholder="e.g. REPC Counter A" maxLength={80} disabled={checkInMutation.isPending} />
              </div>
              <div>
                <label htmlFor="checkin-notes" className="mb-1 block text-xs font-bold text-neutral-600 dark:text-neutral-300">Notes (optional)</label>
                <Input id="checkin-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Collection note" maxLength={300} disabled={checkInMutation.isPending} />
              </div>
            </div>

            {/* Desktop: Collection toggles inline */}
            <div className="mb-4 hidden grid-cols-3 gap-2 lg:grid">
              {collectionOptions.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateCollection(key)}
                  aria-pressed={collection[key]}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border p-3 text-left text-xs font-bold transition ${collection[key] ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/25 dark:text-primary-300" : "border-neutral-200 text-neutral-500 dark:border-neutral-800"}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            <form onSubmit={(event) => { event.preventDefault(); submitCheckIn(registrationCode); }} className="space-y-4">
              <QrScanner
                disabled={checkInMutation.isPending}
                onDetected={submitCheckIn}
                continuous={continuousMode}
                debounceMs={3000}
              />
              <div className="flex gap-2">
                <Input
                  aria-label="Registration code"
                  placeholder="Enter registration code"
                  value={registrationCode}
                  onChange={(event) => setRegistrationCode(event.target.value)}
                  disabled={checkInMutation.isPending}
                  className="min-h-14 py-6 text-lg font-mono uppercase"
                />
                <Button type="submit" disabled={checkInMutation.isPending} className="min-h-14 bg-primary-500 px-6 font-bold text-white hover:bg-primary-600">
                  {checkInMutation.isPending ? "Checking in…" : <><span>Check in</span><ArrowRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </div>
            </form>
          </Card>

          {/* ZONE B — SETTINGS (Mobile: collapsible) */}
          <Card className="border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 lg:hidden">
            <button
              type="button"
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="flex w-full items-center justify-between text-left"
            >
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Settings & Collection</h3>
              {settingsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {settingsExpanded && (
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="mobile-notes" className="mb-1 block text-xs font-bold text-neutral-600 dark:text-neutral-300">Notes (optional)</label>
                  <Input id="mobile-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Collection note" maxLength={300} disabled={checkInMutation.isPending} />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {collectionOptions.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateCollection(key)}
                      aria-pressed={collection[key]}
                      className={`flex min-h-14 items-center gap-2 rounded-xl border p-4 text-left text-sm font-bold transition ${collection[key] ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/25 dark:text-primary-300" : "border-neutral-200 text-neutral-500 dark:border-neutral-800"}`}
                    >
                      <Icon className="h-5 w-5" /> {label}
                    </button>
                  ))}
                </div>
                {successInfo && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={saveCorrection}
                    disabled={updateCheckInMutation.isPending}
                    className="w-full gap-1.5 text-sm font-bold"
                  >
                    <Pencil className="h-3.5 w-3.5" /> {updateCheckInMutation.isPending ? "Saving…" : "Save collection correction"}
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* ZONE C — COMPACT SUMMARY (Mobile only) */}
          {desk && (
            <Card className="border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 lg:hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Checked in</p>
                  <p className="mt-1 text-2xl font-black text-neutral-900 dark:text-neutral-50">
                    {desk.stats.checkedIn} / {desk.stats.activeRegistrations}
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-full bg-primary-500"
                      style={{ width: `${desk.stats.activeRegistrations > 0 ? (desk.stats.checkedIn / desk.stats.activeRegistrations) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStatsExpanded(!statsExpanded)}
                  className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
                >
                  {statsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
              </div>
              {statsExpanded && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ["Pending", desk.stats.pendingCheckIn, Clock3],
                    ["Shirts issued", desk.stats.shirtCollected, Shirt],
                    ["Packs issued", desk.stats.packCollected, PackageCheck],
                  ].map(([label, value, Icon]) => {
                    const StatIcon = Icon as typeof Clock3;
                    return (
                      <div key={String(label)} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{String(label)}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-lg font-black text-neutral-900 dark:text-neutral-50">
                          <StatIcon className="h-4 w-4 text-primary-500" /> {Number(value)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Desktop: Success info card (hidden on mobile, replaced by overlay) */}
          {successInfo && (
            <Card className="hidden border-2 border-success-500 bg-success-50/20 p-6 dark:bg-success-950/10 lg:block">
              <div className="flex gap-4">
                <UserCheck className="h-10 w-10 shrink-0 text-success-600" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <span className="rounded bg-success-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-success-600">{successInfo.alreadyCheckedIn ? "Already checked in" : "Check-in approved"}</span>
                    <h3 className="mt-2 text-lg font-black text-neutral-950 dark:text-neutral-50">{successInfo.fullName}</h3>
                    <p className="text-xs text-neutral-500">{successInfo.registrationCode} &middot; {successInfo.categoryName} ({successInfo.distance}KM) &middot; {successInfo.tshirtSize} {successInfo.tshirtType}</p>
                  </div>
                  <p className="text-xs text-neutral-500">Checked in at {successInfo.checkedInAt.toLocaleTimeString("en-MY")}</p>
                  <Button type="button" variant="outline" onClick={saveCorrection} disabled={updateCheckInMutation.isPending} className="gap-1.5 text-xs font-bold">
                    <Pencil className="h-3.5 w-3.5" /> {updateCheckInMutation.isPending ? "Saving…" : "Save collection correction"}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ZONE D — RECENT ACTIVITY (Desktop: sidebar; Mobile: collapsible) */}
        <Card className="flex min-h-105 flex-col border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setActivityExpanded(!activityExpanded)}
            className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-3 text-left dark:border-neutral-800 lg:cursor-default"
          >
            <div>
              <h3 className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-50"><Clock3 className="h-4 w-4 text-primary-500" /> Recent desk activity</h3>
              <p className="mt-1 text-xs text-neutral-500">Shared across stations and refreshed automatically.</p>
            </div>
            <span className="lg:hidden">{activityExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
          </button>
          <div className={`flex-1 ${activityExpanded ? 'block' : 'hidden'} lg:block`}>
            {!desk || desk.recent.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-xs text-neutral-400">No participant has checked in yet.</div>
            ) : (
              <div className="space-y-3 overflow-y-auto">
                {desk.recent.map((checkIn) => (
                  <div key={checkIn.id} className="rounded-xl bg-neutral-50 p-3 text-xs dark:bg-neutral-800/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate font-bold text-neutral-900 dark:text-neutral-50">{checkIn.registration.participantProfile.fullName}</p><p className="font-mono text-primary-600 dark:text-primary-400">{checkIn.registration.registrationCode}</p></div>
                      <span className="shrink-0 text-neutral-400">{new Date(checkIn.checkedInAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="mt-1 text-neutral-500">{checkIn.stationName || "No station recorded"} &middot; {checkIn.registration.ticketCategory.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-semibold"><span className={checkIn.bibCollected ? "text-success-600" : "text-neutral-400"}>Bib {checkIn.bibCollected ? "issued" : "pending"}</span><span className="text-neutral-300">•</span><span className={checkIn.shirtCollected ? "text-success-600" : "text-neutral-400"}>Shirt {checkIn.shirtCollected ? "issued" : "pending"}</span><span className="text-neutral-300">•</span><span className={checkIn.packCollected ? "text-success-600" : "text-neutral-400"}>Pack {checkIn.packCollected ? "issued" : "pending"}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
