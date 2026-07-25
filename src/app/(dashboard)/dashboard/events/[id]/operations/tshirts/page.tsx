"use client";

import React, { useState, use } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Search, Shirt, Pencil, Users, Download } from "lucide-react";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"] as const;
type TshirtSize = (typeof SIZES)[number];

function TshirtsOperationsPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [tshirtSizeFilter, setTshirtSizeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Edit modal state
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editTshirtType, setEditTshirtType] = useState<"MICROFIBER" | "COTTON">("MICROFIBER");
  const [editTshirtSize, setEditTshirtSize] = useState<TshirtSize>("M");

  const { data, isLoading } = trpc.operational.getEventParticipants.useQuery({
    eventId: resolvedParams.id,
    search: search.trim() !== "" ? search : undefined,
    tshirtSize: tshirtSizeFilter !== "ALL" ? tshirtSizeFilter : undefined,
    page,
    limit: 50,
  });

  const { data: eventSummary } = trpc.operational.getEventOperationalSummary.useQuery({
    eventId: resolvedParams.id,
  });

  const updateTshirtMutation = trpc.operational.updateTshirtSize.useMutation({
    onSuccess: () => {
      toast.success("Participant T-Shirt size updated successfully.");
      setEditingProfileId(null);
      utils.operational.getEventParticipants.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update T-Shirt size.");
    },
  });
  const exportMutation = trpc.operational.exportEventParticipants.useMutation({
    onSuccess: ({ csv, filename, rowCount }) => {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${rowCount} shirt orders exported.`);
    },
    onError: (err) => toast.error(err.message || "Unable to export shirt orders."),
  });

  const handleOpenEdit = (profile: {
    id: string;
    tshirtType?: string | null;
    tshirtSize?: string | null;
  }) => {
    setEditingProfileId(profile.id);
    setEditTshirtType((profile.tshirtType as "MICROFIBER" | "COTTON") || "MICROFIBER");
    setEditTshirtSize((profile.tshirtSize as TshirtSize) || "M");
  };

  const handleSaveTshirt = () => {
    if (!editingProfileId) return;
    updateTshirtMutation.mutate({
      profileId: editingProfileId,
      tshirtType: editTshirtType,
      tshirtSize: editTshirtSize,
    });
  };

  // Compute aggregated breakdown
  const sizeBreakdown = SIZES.reduce(
    (acc, size) => {
      acc[size] = { MICROFIBER: 0, COTTON: 0, total: 0 };
      return acc;
    },
    {} as Record<TshirtSize, { MICROFIBER: number; COTTON: number; total: number }>
  );

  let totalShirts = 0;
  if (eventSummary?.tshirtBreakdown) {
    eventSummary.tshirtBreakdown.forEach((item) => {
      const size = item.size as TshirtSize | undefined;
      const type = item.type as "MICROFIBER" | "COTTON" | undefined;
      if (size && sizeBreakdown[size]) {
        sizeBreakdown[size].total += item.count;
        if (type === "COTTON") {
          sizeBreakdown[size].COTTON += item.count;
        } else {
          sizeBreakdown[size].MICROFIBER += item.count;
        }
        totalShirts += item.count;
      }
    });
  }

  const handleExportCSV = () => {
    if (!totalShirts) {
      toast.error("No participant data to export.");
      return;
    }
    exportMutation.mutate({ eventId: resolvedParams.id, report: "TSHIRTS" });
  };

  return (
    <div className="space-y-8">
      {/* Aggregated Size Distribution Banner */}
      <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm">
        <CardHeader className="bg-neutral-50 dark:bg-neutral-800/50 pb-4 border-b border-neutral-200/60 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Shirt className="h-5 w-5 text-primary-500" />
              <span>Aggregated Size Distribution Batch</span>
            </CardTitle>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live breakdown of sizes across all registered runners. Use this for vendor printing orders.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>Total Orders: {totalShirts}</span>
            </div>
            <Button
              onClick={handleExportCSV}
              disabled={exportMutation.isPending}
              variant="outline"
              size="sm"
              className="text-xs font-bold flex items-center gap-1.5 rounded-xl border-neutral-300 dark:border-neutral-700"
            >
              <Download className="h-3.5 w-3.5" /> {exportMutation.isPending ? "Preparing..." : "Export CSV Sheet"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {SIZES.map((size) => (
              <div
                key={size}
                className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-center flex flex-col justify-between"
              >
                <span className="text-xs font-extrabold text-neutral-500 block">{size}</span>
                <span className="text-2xl font-black text-neutral-900 dark:text-neutral-50 my-1">
                  {sizeBreakdown[size]?.total || 0}
                </span>
                <div className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-200/60 dark:border-neutral-700 flex justify-around">
                  <span>MF: {sizeBreakdown[size]?.MICROFIBER || 0}</span>
                  <span>CT: {sizeBreakdown[size]?.COTTON || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full md:flex-1 flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
          <Input
            placeholder="Search by registration code, participant name, NRIC..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 rounded-xl"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={tshirtSizeFilter}
            onChange={(e) => {
              setTshirtSizeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
          >
            <option value="ALL">All Shirt Sizes</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                Size {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 space-y-4" aria-label="Loading t-shirt orders">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.items || data.items.length === 0 ? (
          <EmptyState
            icon={Shirt}
            title="No Participants Found"
            description="Try clearing your search filters to see more participants."
            className="border-0"
          />
        ) : (
          <>
          <div data-testid="tshirts-mobile-list" className="divide-y divide-neutral-200 md:hidden dark:divide-neutral-800">
            {data.items.map((reg) => {
              const profile = reg.participantProfile;
              if (!profile) return null;
              return (
                <article key={reg.id} className="space-y-3 p-4">
                  <div className="min-w-0">
                    <h3 className="overflow-wrap-anywhere font-bold text-neutral-900 dark:text-neutral-100">{profile.fullName}</h3>
                    <p className="mt-0.5 overflow-wrap-anywhere font-mono text-xs text-neutral-500">{reg.registrationCode} · {profile.icNumber}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-lg bg-neutral-100 px-2.5 py-1 font-semibold dark:bg-neutral-800">{reg.ticketCategory?.name || "General"}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500/10 px-2.5 py-1 font-bold text-primary-600 dark:text-primary-400"><Shirt className="h-3.5 w-3.5" />{profile.tshirtSize || "M"} · {profile.tshirtType || "MICROFIBER"}</span>
                  </div>
                  <Button variant="outline" onClick={() => handleOpenEdit(profile)} className="min-h-11 w-full rounded-xl text-xs font-bold"><Pencil className="mr-1 h-3.5 w-3.5 text-primary-500" />Correct Size</Button>
                </article>
              );
            })}
          </div>
          <div data-testid="tshirts-desktop-table" role="region" aria-label="T-shirt collection, scroll horizontally for all columns" tabIndex={0} className="dashboard-scroll-region hidden outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:block">
            <table className="min-w-[54rem] w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Registration Info</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Shirt Specifications</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
                {data.items.map((reg) => {
                  const profile = reg.participantProfile;
                  if (!profile) return null;

                  return (
                    <tr key={reg.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100">
                            {profile.fullName}
                          </span>
                          <span className="text-xs font-mono text-neutral-500">
                            Reg: {reg.registrationCode} | NRIC: {profile.icNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
                          {reg.ticketCategory?.name || "General"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 font-extrabold text-xs">
                            <Shirt className="h-3.5 w-3.5" />
                            {profile.tshirtSize || "M"}
                          </span>
                          <span className="text-xs text-neutral-500 font-medium">
                            ({profile.tshirtType || "MICROFIBER"})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(profile)}
                          className="h-8 rounded-xl text-xs font-bold border-neutral-200 dark:border-neutral-700"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1 text-primary-500" />
                          Correct Size
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination */}
        {data && data.pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/50 px-4 py-4 sm:px-6 dark:border-neutral-800 dark:bg-neutral-800/30">
            <span className="text-xs text-neutral-500">
              Page {page} of {data.pageCount} (Total {data.totalCount} entries)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-8 text-xs font-bold rounded-xl"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pageCount}
                onClick={() => setPage(page + 1)}
                className="h-8 text-xs font-bold rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProfileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4">
          <Card role="dialog" aria-modal="true" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 dark:border-neutral-800 dark:bg-neutral-900">
            <CardHeader className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Shirt className="h-5 w-5 text-primary-500" />
                <span>Correct Participant T-Shirt</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Shirt Material Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTshirtType("MICROFIBER")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                      editTshirtType === "MICROFIBER"
                        ? "bg-primary-500 text-white border-primary-500"
                        : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    Microfiber (Quick-Dry)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTshirtType("COTTON")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                      editTshirtType === "COTTON"
                        ? "bg-primary-500 text-white border-primary-500"
                        : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    Premium Cotton
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Select Correct Size
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setEditTshirtSize(size)}
                      className={`py-2 rounded-xl text-xs font-black border ${
                        editTshirtSize === size
                          ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                          : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  variant="outline"
                  onClick={() => setEditingProfileId(null)}
                  className="flex-1 rounded-xl font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTshirt}
                  disabled={updateTshirtMutation.isPending}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold"
                >
                  {updateTshirtMutation.isPending ? "Saving..." : "Save Corrections"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function TshirtsOperationsPage(props: { params: Promise<{ id: string }> }) {
  return (
    <ErrorBoundary>
      <TshirtsOperationsPageContent {...props} />
    </ErrorBoundary>
  );
}
