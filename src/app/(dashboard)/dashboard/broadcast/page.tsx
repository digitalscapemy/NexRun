"use client";

import React, { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { ROLES, type RoleType } from "@/lib/constants";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Send, Users, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function BroadcastPage() {
  return (
    <ErrorBoundary>
      <BroadcastPageContent />
    </ErrorBoundary>
  );
}

function BroadcastPageContent() {
  const { data: session } = useSession();
  const userRole = (session?.user?.role as RoleType) || ROLES.USER;
  const isAdmin = userRole === ROLES.ADMIN || userRole === ROLES.DEVELOPER;
  const isOrganizer = userRole === ROLES.ORGANIZER;

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
          <Megaphone className="h-7 w-7 text-primary-500" />
          Broadcast Message
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Send a notification to users or event participants directly.
        </p>
      </div>

      {isAdmin && <AdminBroadcastForm />}
      {(isAdmin || isOrganizer) && <OrganizerBroadcastForm />}
    </div>
  );
}

function AdminBroadcastForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [target, setTarget] = useState<"all" | "event">("all");
  const [eventId, setEventId] = useState("");

  const { data: events } = trpc.event.getEventPicklist.useQuery(undefined, { retry: false });

  const broadcast = trpc.admin.broadcastMessage.useMutation({
    onSuccess: (res) => {
      toast.success(`Broadcast sent to ${res.sent} users.`);
      setTitle(""); setMessage(""); setHref(""); setEventId("");
    },
    onError: (err) => toast.error(err.message || "Broadcast failed."),
  });

  return (
    <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
      <CardHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-100">
          <Users className="h-4 w-4 text-rose-500" />
          Platform-Wide Broadcast
        </CardTitle>
        <p className="text-xs text-neutral-500 mt-1">Send to all users or all participants of a specific event.</p>
      </CardHeader>
      <CardContent className="pt-5">
        <form onSubmit={(e) => { e.preventDefault(); broadcast.mutate({ title: title.trim(), message: message.trim(), href: href.trim() || undefined, target, eventId: target === "event" ? eventId : undefined }); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <div className="flex gap-4">
              {(["all", "event"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="admin-target" value={opt} checked={target === opt} onChange={() => setTarget(opt)} className="accent-primary-500" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{opt === "all" ? "All Users" : "Event Participants"}</span>
                </label>
              ))}
            </div>
          </div>

          {target === "event" && (
            <div className="space-y-2">
              <Label htmlFor="admin-event-select">Select Event</Label>
              <select id="admin-event-select" value={eventId} onChange={(e) => setEventId(e.target.value)} required className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">— Choose an event —</option>
                {events?.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-title">Title</Label>
            <Input id="admin-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required placeholder="e.g. Platform Maintenance Notice" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-msg">Message</Label>
            <textarea id="admin-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} required placeholder="Enter the notification message body..." className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <p className="text-[10px] text-neutral-400 text-right">{message.length}/500</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-href">Link URL <span className="text-neutral-400 font-normal">(optional)</span></Label>
            <Input id="admin-href" value={href} onChange={(e) => setHref(e.target.value)} maxLength={200} placeholder="/dashboard/events" />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={broadcast.isPending} className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 rounded-xl flex items-center gap-2">
              <Send className="h-4 w-4" />
              {broadcast.isPending ? "Sending..." : "Send Broadcast"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function OrganizerBroadcastForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [eventId, setEventId] = useState("");

  const { data: events } = trpc.event.getEventPicklist.useQuery(undefined, { retry: false });

  const broadcast = trpc.admin.broadcastEventMessage.useMutation({
    onSuccess: (res) => {
      toast.success(`Broadcast sent to ${res.sent} participants of "${res.eventTitle}".`);
      setTitle(""); setMessage(""); setHref(""); setEventId("");
    },
    onError: (err) => toast.error(err.message || "Broadcast failed."),
  });

  return (
    <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
      <CardHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-100">
          <Calendar className="h-4 w-4 text-primary-500" />
          Event Participant Broadcast
        </CardTitle>
        <p className="text-xs text-neutral-500 mt-1">Notify all active participants of one of your events.</p>
      </CardHeader>
      <CardContent className="pt-5">
        <form onSubmit={(e) => { e.preventDefault(); broadcast.mutate({ eventId, title: title.trim(), message: message.trim(), href: href.trim() || undefined }); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-event-select">Event</Label>
            <select id="org-event-select" value={eventId} onChange={(e) => setEventId(e.target.value)} required className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">— Choose an event —</option>
              {events?.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-title">Title</Label>
            <Input id="org-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required placeholder="e.g. Route Change Announcement" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-msg">Message</Label>
            <textarea id="org-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} required placeholder="Enter the notification message body..." className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <p className="text-[10px] text-neutral-400 text-right">{message.length}/500</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-href">Link URL <span className="text-neutral-400 font-normal">(optional)</span></Label>
            <Input id="org-href" value={href} onChange={(e) => setHref(e.target.value)} maxLength={200} placeholder="/events/my-event" />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={broadcast.isPending} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 rounded-xl flex items-center gap-2">
              <Send className="h-4 w-4" />
              {broadcast.isPending ? "Sending..." : "Send to Participants"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
