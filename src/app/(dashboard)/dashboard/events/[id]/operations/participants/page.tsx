"use client";

import React, { useState, use } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Shirt, Pencil, CheckCircle2, XCircle, Download } from "lucide-react";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

function ParticipantsRosterPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const utils = trpc.useUtils();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [tshirtSizeFilter, setTshirtSizeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "CANCELLED">("ALL");
  const [checkedInFilter, setCheckedInFilter] = useState<"ALL" | "YES" | "NO">("ALL");
  const [finisherFilter, setFinisherFilter] = useState<"ALL" | "YES" | "NO">("ALL");
  const [bibNumberFrom, setBibNumberFrom] = useState("");
  const [bibNumberTo, setBibNumberTo] = useState("");
  const [registeredFrom, setRegisteredFrom] = useState("");
  const [registeredTo, setRegisteredTo] = useState("");
  const [page, setPage] = useState(1);

  // Edit T-Shirt modal state
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editTshirtType, setEditTshirtType] = useState<"MICROFIBER" | "COTTON">("MICROFIBER");
  const [editTshirtSize, setEditTshirtSize] = useState<"XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL">("M");

  // Bulk finisher selection state (registration IDs on the currently visible page).
  // Selection resets on page change/filter change — rows not visible shouldn't stay selected.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Queries
  const { data: eventData } = trpc.operational.getEventOperationalSummary.useQuery({
    eventId: resolvedParams.id,
  });

  const { data, isLoading } = trpc.operational.getEventParticipants.useQuery({
    eventId: resolvedParams.id,
    search: search.trim() !== "" ? search : undefined,
    categoryId: categoryId !== "ALL" ? categoryId : undefined,
    tshirtSize: tshirtSizeFilter !== "ALL" ? tshirtSizeFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    checkedIn: checkedInFilter === "ALL" ? undefined : checkedInFilter === "YES",
    finisher: finisherFilter === "ALL" ? undefined : finisherFilter === "YES",
    bibNumberFrom: bibNumberFrom.trim() !== "" ? parseInt(bibNumberFrom, 10) : undefined,
    bibNumberTo: bibNumberTo.trim() !== "" ? parseInt(bibNumberTo, 10) : undefined,
    registeredFrom: registeredFrom.trim() !== "" ? registeredFrom : undefined,
    registeredTo: registeredTo.trim() !== "" ? registeredTo : undefined,
    page,
    limit: 15,
  });

  // Mutations
  const updateTshirtMutation = trpc.operational.updateTshirtSize.useMutation({
    onSuccess: () => {
      toast.success("Participant t-shirt updated successfully.");
      setEditingProfileId(null);
      utils.operational.getEventParticipants.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update t-shirt size.");
    },
  });
  const finisherMutation = trpc.operational.updateFinisherStatus.useMutation({
    onSuccess: () => {
      toast.success("Finisher status updated.");
      utils.operational.getEventParticipants.invalidate();
    },
    onError: (err) => toast.error(err.message || "Unable to update finisher status."),
  });
  const bulkFinisherMutation = trpc.operational.bulkUpdateFinisherStatus.useMutation({
    onSuccess: ({ count }, variables) => {
      toast.success(
        variables.isFinisher
          ? `Marked ${count} participant${count === 1 ? "" : "s"} as finisher.`
          : `Unmarked ${count} participant${count === 1 ? "" : "s"} as finisher.`
      );
      setSelectedIds(new Set());
      utils.operational.getEventParticipants.invalidate();
    },
    onError: (err) => toast.error(err.message || "Unable to update finisher status for the selected participants."),
  });
  const exportMutation = trpc.operational.exportEventParticipants.useMutation({
    onSuccess: ({ csv, filename, rowCount, truncated }) => {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      if (truncated) {
        toast.success(`${rowCount} records exported (export capped at 10,000 rows). Contact support for full data.`, { duration: 6000 });
      } else {
        toast.success(`${rowCount} participant records exported.`);
      }
    },
    onError: (err) => toast.error(err.message || "Unable to export participants."),
  });

  const handleOpenEdit = (profile: {
    id: string;
    tshirtType: "MICROFIBER" | "COTTON" | null;
    tshirtSize: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL" | null;
  }) => {
    setEditingProfileId(profile.id);
    setEditTshirtType(profile.tshirtType || "MICROFIBER");
    setEditTshirtSize(profile.tshirtSize || "M");
  };

  const handleSaveTshirt = () => {
    if (!editingProfileId) return;
    updateTshirtMutation.mutate({
      profileId: editingProfileId,
      tshirtType: editTshirtType,
      tshirtSize: editTshirtSize,
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
        {/* Search */}
        <div className="relative w-full flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
          <Input
            placeholder="Search by code, participant name, NRIC, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setSelectedIds(new Set());
            }}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Filter row 1: Category, T-Shirt, Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Category</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="w-full pl-3 pr-4 py-2 border rounded-xl bg-transparent text-sm"
            >
              <option value="ALL">All Categories</option>
              {eventData?.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase mb-1.5 block">T-Shirt Size</label>
            <select
              value={tshirtSizeFilter}
              onChange={(e) => {
                setTshirtSizeFilter(e.target.value);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="w-full pl-3 pr-4 py-2 border rounded-xl bg-transparent text-sm"
            >
              <option value="ALL">All Sizes</option>
              {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map((sz) => (
                <option key={sz} value={sz}>
                  Size {sz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "CANCELLED");
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="w-full pl-3 pr-4 py-2 border rounded-xl bg-transparent text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Filter row 2: Checked In, Finisher, Bib Number Range */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Checked In</label>
            <select
              value={checkedInFilter}
              onChange={(e) => {
                setCheckedInFilter(e.target.value as "ALL" | "YES" | "NO");
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="w-full pl-3 pr-4 py-2 border rounded-xl bg-transparent text-sm"
            >
              <option value="ALL">All</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Finisher</label>
            <select
              value={finisherFilter}
              onChange={(e) => {
                setFinisherFilter(e.target.value as "ALL" | "YES" | "NO");
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="w-full pl-3 pr-4 py-2 border rounded-xl bg-transparent text-sm"
            >
              <option value="ALL">All</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Bib From</label>
            <Input
              type="number"
              placeholder="1"
              value={bibNumberFrom}
              onChange={(e) => {
                setBibNumberFrom(e.target.value);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Bib To</label>
            <Input
              type="number"
              placeholder="999"
              value={bibNumberTo}
              onChange={(e) => {
                setBibNumberTo(e.target.value);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Filter row 3: Registration Date Range + Export */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Registered From</label>
            <Input
              type="date"
              value={registeredFrom}
              onChange={(e) => {
                setRegisteredFrom(e.target.value);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Registered To</label>
            <Input
              type="date"
              value={registeredTo}
              onChange={(e) => {
                setRegisteredTo(e.target.value);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className="rounded-xl"
            />
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => exportMutation.mutate({ eventId: resolvedParams.id, report: "PARTICIPANTS" })}
              disabled={exportMutation.isPending}
              className="w-full gap-2 rounded-xl text-xs font-bold"
            >
              <Download className="h-3.5 w-3.5" />
              {exportMutation.isPending ? "Preparing..." : "Export CSV"}
            </Button>
          </div>
        </div>
      </div>

      {/* T-Shirt edit popup panel (visible when editing) */}
      {editingProfileId && (
        <Card className="p-4 border border-primary-500/20 bg-primary-50/10 dark:bg-primary-950/5 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Shirt className="h-8 w-8 text-primary-500" />
            <div>
              <p className="text-xs text-neutral-400 font-bold uppercase">Correct T-Shirt Size</p>
              <p className="text-sm font-semibold text-neutral-800">Configure size preference for participant</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={editTshirtType}
              onChange={(e) => setEditTshirtType(e.target.value as "MICROFIBER" | "COTTON")}
              className="border rounded-xl px-3 py-1.5 text-xs bg-transparent"
            >
              <option value="MICROFIBER">Microfiber</option>
              <option value="COTTON">Cotton</option>
            </select>
            <select
              value={editTshirtSize}
              onChange={(e) => setEditTshirtSize(e.target.value as "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL")}
              className="border rounded-xl px-3 py-1.5 text-xs bg-transparent"
            >
              {["XS", "S", "M", "L", "XL", "XXL", "3XL"].map((sz) => (
                <option key={sz} value={sz}>
                  Size {sz}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleSaveTshirt}
              disabled={updateTshirtMutation.isPending}
              className="bg-primary-500 text-white font-bold py-1 px-4 text-xs"
            >
              Save Change
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingProfileId(null)} className="text-xs">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Bulk finisher action bar (visible when the event is completed and 1+ rows are selected) */}
      {eventData?.status === "COMPLETED" && selectedIds.size > 0 && (
        <Card className="p-4 border border-primary-500/20 bg-primary-50/10 dark:bg-primary-950/5 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-primary-500" />
            <div>
              <p className="text-xs text-neutral-400 font-bold uppercase">Bulk Finisher Confirmation</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {selectedIds.size} participant{selectedIds.size === 1 ? "" : "s"} selected
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Button
              size="sm"
              onClick={() =>
                bulkFinisherMutation.mutate({
                  eventId: resolvedParams.id,
                  registrationIds: Array.from(selectedIds),
                  isFinisher: true,
                })
              }
              disabled={bulkFinisherMutation.isPending}
              className="bg-success-600 hover:bg-success-700 text-white font-bold py-1 px-4 text-xs"
            >
              Mark {selectedIds.size} as finisher
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                bulkFinisherMutation.mutate({
                  eventId: resolvedParams.id,
                  registrationIds: Array.from(selectedIds),
                  isFinisher: false,
                })
              }
              disabled={bulkFinisherMutation.isPending}
              className="text-xs font-bold"
            >
              Unmark {selectedIds.size} as finisher
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-xs">
              Clear selection
            </Button>
          </div>
        </Card>
      )}

      {/* Roster Table Grid */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" aria-label="Loading participants" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No Participants Found"
          description="No registered participants matching these filter options. Try adjusting your filters."
        />
      ) : (
        <div className="space-y-4">
          <div data-testid="participants-mobile-list" className="space-y-3 md:hidden">
            {data.items.map((reg) => (
              <article key={reg.id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex min-w-0 items-start gap-3">
                  {eventData?.status === "COMPLETED" && <input type="checkbox" aria-label={`Select ${reg.participantProfile.fullName}`} checked={selectedIds.has(reg.id)} onChange={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(reg.id)) next.delete(reg.id); else next.add(reg.id); return next; })} className="mt-0.5 size-5 shrink-0 rounded border-neutral-300 text-primary-500 focus:ring-primary-500" />}
                  <div className="min-w-0 flex-1"><p className="font-mono text-xs font-bold text-primary-500">{reg.registrationCode}</p><h3 className="mt-0.5 overflow-wrap-anywhere font-bold text-neutral-900 dark:text-neutral-50">{reg.participantProfile.fullName}</h3><p className="mt-1 overflow-wrap-anywhere font-mono text-xs text-neutral-500">{reg.participantProfile.icNumber}</p></div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800"><div><dt className="text-neutral-500">Category</dt><dd className="mt-0.5 font-semibold">{reg.ticketCategory.name} ({reg.ticketCategory.distance}KM)</dd></div><div><dt className="text-neutral-500">T-shirt</dt><dd className="mt-0.5 font-semibold">{reg.participantProfile.tshirtSize} ({reg.participantProfile.tshirtType})</dd></div><div><dt className="text-neutral-500">Status</dt><dd className="mt-0.5 font-semibold text-success-600">{reg.status}</dd></div><div><dt className="text-neutral-500">Checked in</dt><dd className="mt-0.5 font-semibold">{reg.checkIn ? "Yes" : "No"}</dd></div></dl>
                <div className={`mt-3 grid gap-2 ${eventData?.status === "COMPLETED" ? "grid-cols-2" : "grid-cols-1"}`}>
                  {eventData?.status === "COMPLETED" && <Button variant="outline" size="sm" onClick={() => finisherMutation.mutate({ eventId: resolvedParams.id, registrationId: reg.id, isFinisher: !reg.isFinisher })} disabled={finisherMutation.isPending} className="min-h-11 text-xs">{reg.isFinisher ? "Finisher confirmed" : "Mark finisher"}</Button>}
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit({ id: reg.participantProfile.id, tshirtType: reg.participantProfile.tshirtType as "MICROFIBER" | "COTTON" | null, tshirtSize: reg.participantProfile.tshirtSize as "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL" | null })} className="min-h-11 gap-1 text-xs"><Pencil className="h-3.5 w-3.5" />Edit Shirt</Button>
                </div>
              </article>
            ))}
          </div>
          <div data-testid="participants-desktop-table" role="region" aria-label="Participant roster, scroll horizontally for all columns" tabIndex={0} className="dashboard-scroll-region hidden rounded-2xl border border-neutral-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:block dark:border-neutral-800 dark:bg-neutral-900">
            <table className="min-w-[68rem] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-bold uppercase text-neutral-500">
                  {eventData?.status === "COMPLETED" && (
                    <th scope="col" className="w-10 px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label="Select all participants on this page"
                        checked={data.items.length > 0 && data.items.every((reg) => selectedIds.has(reg.id))}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              data.items.forEach((reg) => next.add(reg.id));
                            } else {
                              data.items.forEach((reg) => next.delete(reg.id));
                            }
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                      />
                    </th>
                  )}
                  <th scope="col" className="px-6 py-4">Reg Code / Runner</th>
                  <th scope="col" className="px-4 py-4">IC / Passport</th>
                  <th scope="col" className="px-4 py-4">Category</th>
                  <th scope="col" className="px-4 py-4">T-Shirt Size</th>
                  <th scope="col" className="px-4 py-4 text-center">Status</th>
                  <th scope="col" className="px-4 py-4 text-center">Checked In</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {data.items.map((reg) => (
                  <tr key={reg.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    {eventData?.status === "COMPLETED" && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${reg.participantProfile.fullName}`}
                          checked={selectedIds.has(reg.id)}
                          onChange={() => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(reg.id)) {
                                next.delete(reg.id);
                              } else {
                                next.add(reg.id);
                              }
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-mono font-bold text-xs text-primary-500 block">
                          {reg.registrationCode}
                        </span>
                        <span className="font-bold text-neutral-900 dark:text-neutral-50 block mt-0.5">
                          {reg.participantProfile.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">{reg.participantProfile.icNumber}</td>
                    <td className="px-4 py-4 font-semibold text-xs">
                      {reg.ticketCategory.name} ({reg.ticketCategory.distance}KM)
                    </td>
                    <td className="px-4 py-4 text-xs font-bold">
                      {reg.participantProfile.tshirtSize} ({reg.participantProfile.tshirtType})
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold bg-success-500/10 text-success-600">
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {reg.checkIn ? (
                        <div className="flex items-center justify-center gap-1 text-success-600 font-bold text-xs">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Yes</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-neutral-400 text-xs">
                          <XCircle className="h-4 w-4" />
                          <span>No</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {eventData?.status === "COMPLETED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => finisherMutation.mutate({ eventId: resolvedParams.id, registrationId: reg.id, isFinisher: !reg.isFinisher })}
                            disabled={finisherMutation.isPending}
                            className={`text-xs font-semibold ${reg.isFinisher ? "text-success-600" : "text-neutral-500"}`}
                          >
                            {reg.isFinisher ? "Finisher confirmed" : "Mark finisher"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit({
                            id: reg.participantProfile.id,
                            tshirtType: reg.participantProfile.tshirtType as "MICROFIBER" | "COTTON" | null,
                            tshirtSize: reg.participantProfile.tshirtSize as "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL" | null,
                          })}
                          aria-label={`Edit shirt size for ${reg.participantProfile.fullName}`}
                          className="text-xs font-semibold gap-1 text-neutral-500 hover:text-neutral-800"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit Shirt</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {data.pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((prev) => prev - 1);
                  setSelectedIds(new Set());
                }}
              >
                Previous
              </Button>
              <span className="text-sm font-semibold py-1.5 px-3">
                Page {page} of {data.pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pageCount}
                onClick={() => {
                  setPage((prev) => prev + 1);
                  setSelectedIds(new Set());
                }}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ParticipantsRosterPage(props: { params: Promise<{ id: string }> }) {
  return (
    <ErrorBoundary>
      <ParticipantsRosterPageContent {...props} />
    </ErrorBoundary>
  );
}
