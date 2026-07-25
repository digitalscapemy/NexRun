"use client";

import React, { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import { ROLES, type RoleType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatStatus } from "@/lib/utils";
import {
  Calendar,
  Plus,
  Users,
  Search,
  Trash2,
  XCircle,
  CheckCircle2,
  Filter,
  Eye,
  Pencil,
  CreditCard,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";

function EventsPageContent() {
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const userRole = (session?.user?.role as RoleType) || ROLES.USER;
  const isAdminOrDev = userRole === ROLES.ADMIN || userRole === ROLES.DEVELOPER;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [promptDialog, setPromptDialog] = useState<{ type: "REQUEST_CHANGES" | "CANCEL"; eventId: string; eventTitle: string } | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const { data: events = [], isLoading } = trpc.event.getDashboardEvents.useQuery();

  // Mutations
  const submitMutation = trpc.event.submitForApproval.useMutation({
    onSuccess: () => {
      toast.success("Event submitted for approval.");
      utils.event.getDashboardEvents.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit event.");
    },
  });

  const moderateMutation = trpc.event.moderateEvent.useMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "APPROVE"
          ? "Event approved. Activation invoice issued."
          : "Event moderation decision saved."
      );
      setPromptDialog(null);
      setPromptValue("");
      utils.event.getDashboardEvents.invalidate();
      utils.activation.getActivationFees.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to moderate event.");
    },
  });

  const deleteDraftMutation = trpc.event.deleteDraftEvent.useMutation({
    onSuccess: () => {
      toast.success("Draft event deleted permanently.");
      utils.event.getDashboardEvents.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete draft event.");
    },
  });

  const cancelMutation = trpc.event.cancelEvent.useMutation({
    onSuccess: () => {
      toast.success("Event has been cancelled.");
      setPromptDialog(null);
      setPromptValue("");
      utils.event.getDashboardEvents.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel event.");
    },
  });

  const lifecycleMutation = trpc.event.advanceEventLifecycle.useMutation({
    onSuccess: () => {
      toast.success("Event lifecycle updated.");
      utils.event.getDashboardEvents.invalidate();
    },
    onError: (err) => toast.error(err.message || "Unable to update this event."),
  });

  const duplicateMutation = trpc.event.duplicateEvent.useMutation({
    onSuccess: () => {
      toast.success("Event duplicated as a new draft.");
      utils.event.getDashboardEvents.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to duplicate event."),
  });

  const handleSubmitForApproval = (id: string) => {
    submitMutation.mutate({ eventId: id });
  };

  const handleDuplicate = (id: string, title: string) => {
    if (!confirm(`Duplicate "${title}" as a new draft event? Categories and timeline will be copied.`)) return;
    duplicateMutation.mutate({ eventId: id });
  };

  const handleModerate = (id: string, action: "APPROVE" | "REQUEST_CHANGES") => {
    if (action === "REQUEST_CHANGES") {
      const event = events.find((e) => e.id === id);
      setPromptDialog({ type: "REQUEST_CHANGES", eventId: id, eventTitle: event?.title ?? "" });
      setPromptValue("");
      return;
    }
    if (!confirm("Approve this event and issue its RM 2,000 activation invoice?")) return;
    moderateMutation.mutate({ eventId: id, action });
  };

  const handleDeleteDraft = (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    deleteDraftMutation.mutate({ eventId: id });
  };

  const handleCancelEvent = (id: string, title: string) => {
    setPromptDialog({ type: "CANCEL", eventId: id, eventTitle: title });
    setPromptValue("");
  };

  const handlePromptConfirm = () => {
    if (!promptDialog) return;
    if (promptDialog.type === "REQUEST_CHANGES") {
      moderateMutation.mutate({ eventId: promptDialog.eventId, action: "REQUEST_CHANGES", notes: promptValue.trim() });
    } else {
      cancelMutation.mutate({ eventId: promptDialog.eventId, reason: promptValue.trim() });
    }
  };

  const handleLifecycle = (id: string, action: "CLOSE_REGISTRATION" | "COMPLETE") => {    const message = action === "CLOSE_REGISTRATION" ? "close registration" : "mark this event as completed";
    if (!confirm(`Are you sure you want to ${message}?`)) return;
    lifecycleMutation.mutate({ eventId: id, action });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700";
      case "PENDING_APPROVAL":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse";
      case "AWAITING_EVENT_FEE":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 font-bold";
      case "PUBLISHED":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold";
      case "REGISTRATION_CLOSED":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "NEEDS_CHANGES":
        return "bg-amber-500/10 text-amber-700 border-amber-500/20";
      case "CANCELLED":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20 line-through";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-200";
    }
  };

  // Filter & Search Logic
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      search.trim() === "" ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.slug.toLowerCase().includes(search.toLowerCase()) ||
      (event.venue && event.venue.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || event.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-row items-center justify-between gap-4 w-full text-left">
        <div className="min-w-0 flex-1 text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2.5 text-left">
            <Calendar className="h-7 w-7 text-primary-500 shrink-0" />
            <span>Manage Events</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500 text-left">
            Create, moderate, and manage your running events lifecycle
          </p>
        </div>
        <Link href="/dashboard/events/create" className="shrink-0 ml-auto">
          <Button className="bg-primary-500 hover:bg-primary-600 text-white font-bold gap-2 rounded-xl px-4 py-2.5 shadow-xs text-sm">
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </Button>
        </Link>
      </div>

      {/* Integrated Search & Filter Bar (Side-by-Side) */}
      {events.length > 0 && (
        <div className="flex flex-row items-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 shadow-xs">
          {/* Search (Left) */}
          <div className="relative flex-1 min-w-0 flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
            <Input
              placeholder="Search events by title, slug, or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-neutral-50/60 dark:bg-neutral-950/60 border-neutral-200 dark:border-neutral-800 text-sm focus-visible:ring-primary-500 w-full"
            />
          </div>

          {/* Filter (Right) */}
          <div className="flex items-center gap-2 shrink-0 w-44 sm:w-60">
            <Filter className="h-4 w-4 text-neutral-400 shrink-0 ml-1 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 text-xs sm:text-sm bg-neutral-50/60 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold text-neutral-700 dark:text-neutral-300"
            >
              <option value="ALL">All Statuses ({events.length})</option>
              <option value="DRAFT">Draft Only</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="AWAITING_EVENT_FEE">Awaiting Activation Fee</option>
              <option value="NEEDS_CHANGES">Changes Requested</option>
              <option value="PUBLISHED">Published</option>
              <option value="REGISTRATION_CLOSED">Registration Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-800 p-12 text-center flex flex-col items-center justify-center min-h-85 rounded-3xl">
          <Calendar className="h-14 w-14 text-neutral-300 dark:text-neutral-700 mb-2" />
          <h3 className="mt-4 text-lg font-extrabold text-neutral-900 dark:text-neutral-100">
            No Events Found
          </h3>
          <p className="mt-1 text-sm text-neutral-500 max-w-sm">
            Create your first running event to start accepting registrations and building custom race bibs.
          </p>
          <Link href="/dashboard/events/create" className="mt-6">
            <Button className="bg-primary-500 hover:bg-primary-600 text-white font-bold gap-2 rounded-xl px-6 py-5 shadow-md">
              <Plus className="h-4 w-4" />
              <span>Create Event</span>
            </Button>
          </Link>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card className="p-12 text-center border rounded-2xl bg-white dark:bg-neutral-900">
          <p className="font-bold text-neutral-700 dark:text-neutral-300">No events match your current filters.</p>
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
            }}
            className="mt-3 text-xs text-primary-500 font-bold"
          >
            Reset Filters
          </Button>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div data-testid="events-desktop-table" className="max-md:hidden overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-extrabold uppercase text-neutral-500 tracking-wider">
                  <th className="px-6 py-4">Event Details</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4 text-center">Registrations</th>
                  <th className="px-4 py-4 text-center">Race Date</th>
                  <th className="px-6 py-4 text-right">Actions & Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
                {filteredEvents.map((event) => {
                  const canEdit = event.status === "DRAFT" || event.status === "NEEDS_CHANGES" || event.status === "PENDING_APPROVAL";
                  const canCancel = event.status === "PUBLISHED" || event.status === "PENDING_APPROVAL" || event.status === "AWAITING_EVENT_FEE";

                  return (
                    <tr key={event.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition">
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-neutral-900 dark:text-neutral-50 block text-base">
                            {event.title}
                          </span>
                          <span className="text-xs font-mono text-neutral-400 block mt-0.5">
                            /{event.slug}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-block rounded-lg border px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase ${getStatusBadgeColor(
                            event.status
                          )}`}
                        >
                          {formatStatus(event.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-bold">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          <Users className="h-3.5 w-3.5 text-primary-500" />
                          <span>{event._count?.registrations || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-neutral-600 dark:text-neutral-300">
                        {new Date(event.eventDate).toLocaleDateString("en-MY", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Admin Inline Moderation Tools */}
                          {isAdminOrDev && event.status === "PENDING_APPROVAL" && (
                            <div className="flex items-center gap-1.5 bg-amber-500/10 p-1 rounded-xl border border-amber-500/20 mr-1">
                              <Button
                                size="sm"
                                onClick={() => handleModerate(event.id, "APPROVE")}
                                disabled={moderateMutation.isPending}
                                className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-2.5"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleModerate(event.id, "REQUEST_CHANGES")}
                                disabled={moderateMutation.isPending}
                                className="h-7 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg px-2.5"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Request changes
                              </Button>
                            </div>
                          )}

                          {/* Organizer Actions */}
                          {(event.status === "DRAFT" || event.status === "NEEDS_CHANGES") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSubmitForApproval(event.id)}
                                disabled={submitMutation.isPending}
                                className="h-8 text-xs font-bold border-primary-500/30 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50 rounded-xl"
                              >
                                Submit For Approval
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDraft(event.id, event.title)}
                                disabled={deleteDraftMutation.isPending}
                                className="h-8 w-8 p-0 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                                title="Delete Draft"
                                aria-label="Delete draft event"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {canCancel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelEvent(event.id, event.title)}
                              disabled={cancelMutation.isPending}
                              className="h-8 text-xs font-bold text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                              title="Cancel Event"
                            >
                              Cancel
                            </Button>
                          )}

                          {event.status === "PUBLISHED" && (
                            <Button variant="outline" size="sm" onClick={() => handleLifecycle(event.id, "CLOSE_REGISTRATION")} disabled={lifecycleMutation.isPending} className="h-8 text-xs font-bold rounded-xl">
                              Close registration
                            </Button>
                          )}
                          {event.status === "REGISTRATION_CLOSED" && (
                            <Button variant="outline" size="sm" onClick={() => handleLifecycle(event.id, "COMPLETE")} disabled={lifecycleMutation.isPending} className="h-8 text-xs font-bold rounded-xl">
                              Complete event
                            </Button>
                          )}

                          {/* Guarded Edit vs View */}
                          {event.status === "AWAITING_EVENT_FEE" ? (
                            <Link href="/dashboard/event-fees">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-bold rounded-xl border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300 flex items-center gap-1"
                              >
                                <CreditCard className="h-3.5 w-3.5" /> Activation fee
                              </Button>
                            </Link>
                          ) : canEdit ? (
                            <Link href={`/dashboard/events/${event.id}/edit`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-bold rounded-xl border-neutral-200 dark:border-neutral-700 flex items-center gap-1"
                              >
                                <Pencil className="h-3 w-3 text-primary-500" /> Edit
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/events/${event.slug}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-bold text-neutral-500 hover:text-neutral-900 rounded-xl flex items-center gap-1"
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(event.id, event.title)}
                            disabled={duplicateMutation.isPending}
                            className="h-8 w-8 p-0 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-xl"
                            title="Duplicate Event"
                            aria-label="Duplicate event"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Responsive Fallback) */}
          <div data-testid="events-mobile-list" className="md:hidden space-y-4">
            {filteredEvents.map((event) => {
              const canEdit = event.status === "DRAFT" || event.status === "NEEDS_CHANGES" || event.status === "PENDING_APPROVAL";
              const canCancel = event.status === "PUBLISHED" || event.status === "PENDING_APPROVAL" || event.status === "AWAITING_EVENT_FEE";

              return (
                <Card
                  key={event.id}
                  className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-neutral-900 dark:text-neutral-50 text-base line-clamp-1">
                        {event.title}
                      </h4>
                      <span className="text-xs font-mono text-neutral-400 block mt-0.5">
                        /{event.slug}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 border ${getStatusBadgeColor(
                        event.status
                      )}`}
                    >
                      {formatStatus(event.status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <span className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-300">
                      <Users className="h-3.5 w-3.5 text-primary-500" />
                      {event._count?.registrations || 0} Registered
                    </span>
                    <span>
                      {new Date(event.eventDate).toLocaleDateString("en-MY", {
                        dateStyle: "medium",
                      })}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
                    {isAdminOrDev && event.status === "PENDING_APPROVAL" && (
                      <div className="flex items-center gap-1.5 w-full bg-amber-500/10 p-1.5 rounded-xl justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleModerate(event.id, "APPROVE")}
                          className="h-8 bg-emerald-600 text-white text-xs font-bold rounded-lg px-3 flex-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleModerate(event.id, "REQUEST_CHANGES")}
                          className="h-8 bg-rose-600 text-white text-xs font-bold rounded-lg px-3 flex-1"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Request changes
                        </Button>
                      </div>
                    )}

                    {(event.status === "DRAFT" || event.status === "NEEDS_CHANGES") && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitForApproval(event.id)}
                          className="h-8 text-xs font-bold border-primary-500/30 text-primary-600 rounded-xl"
                        >
                          Submit For Approval
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDraft(event.id, event.title)}
                          className="h-8 w-8 p-0 text-neutral-400 hover:text-rose-600 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelEvent(event.id, event.title)}
                        className="h-8 text-xs font-bold text-neutral-400 hover:text-rose-600 rounded-xl"
                      >
                        Cancel
                      </Button>
                    )}

                    {event.status === "PUBLISHED" && (
                      <Button variant="outline" size="sm" onClick={() => handleLifecycle(event.id, "CLOSE_REGISTRATION")} disabled={lifecycleMutation.isPending} className="h-8 text-xs font-bold rounded-xl">
                        Close registration
                      </Button>
                    )}
                    {event.status === "REGISTRATION_CLOSED" && (
                      <Button variant="outline" size="sm" onClick={() => handleLifecycle(event.id, "COMPLETE")} disabled={lifecycleMutation.isPending} className="h-8 text-xs font-bold rounded-xl">
                        Complete event
                      </Button>
                    )}

                    {event.status === "AWAITING_EVENT_FEE" ? (
                      <Link href="/dashboard/event-fees">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold rounded-xl border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300 flex items-center gap-1"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Activation fee
                        </Button>
                      </Link>
                    ) : canEdit ? (
                      <Link href={`/dashboard/events/${event.id}/edit`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold rounded-xl flex items-center gap-1"
                        >
                          <Pencil className="h-3 w-3 text-primary-500" /> Edit
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/events/${event.slug}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold rounded-xl flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(event.id, event.title)}
                      disabled={duplicateMutation.isPending}
                      className="h-8 w-8 p-0 text-neutral-400 hover:text-primary-600 rounded-xl"
                      title="Duplicate Event"
                      aria-label="Duplicate event"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
      <PromptDialog
        open={promptDialog !== null}
        title={
          promptDialog?.type === "REQUEST_CHANGES"
            ? "Request changes"
            : `Cancel "${promptDialog?.eventTitle}"`
        }
        description={
          promptDialog?.type === "REQUEST_CHANGES"
            ? "Describe the changes the organizer must make."
            : "This will cancel the event and notify all registered participants."
        }
        placeholder={
          promptDialog?.type === "REQUEST_CHANGES"
            ? "What changes are needed..."
            : "Reason for cancellation..."
        }
        value={promptValue}
        onChange={setPromptValue}
        onConfirm={handlePromptConfirm}
        onCancel={() => { setPromptDialog(null); setPromptValue(""); }}
        confirmLabel={promptDialog?.type === "REQUEST_CHANGES" ? "Send request" : "Cancel event"}
        confirmVariant="danger"
        isPending={moderateMutation.isPending || cancelMutation.isPending}
      />
    </div>
  );
}

export default function OrganizerEventsPage() {
  return (
    <ErrorBoundary>
      <EventsPageContent />
    </ErrorBoundary>
  );
}
