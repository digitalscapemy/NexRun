"use client";

import { useState } from "react";
import {
  Activity,
  BellRing,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Eye,
  Mail,
  Megaphone,
  Save,
  Send,
  Settings,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  HomepageCarouselConfig,
  PlatformAnnouncementConfig,
  RaceReminderConfig,
  SecurityControlsConfig,
} from "@/lib/platform-control";
import type { PlatformControlConfig } from "@/server/services/platform-control-service";
import type { PlatformJobRun } from "@/generated/prisma";
import { trpc } from "@/lib/trpc";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "fees" | "display" | "reminders" | "integrations" | "security" | "announcement" | "emails";
type ControlCenterData = PlatformControlConfig & {
  fees: { adminFeePercentage: number; processingFeePercentage: number; eventActivationFeeSen: number };
  health: {
    database: "CONNECTED";
    cronConfigured: boolean;
    uploadServiceConfigured: boolean;
    paymentMode: "SIMULATED" | "LIVE";
    trustProxyHeaders: boolean;
    activeRateLimitBuckets: number;
    lastReminderRun: PlatformJobRun | null;
  };
};

const TABS: { id: Tab; label: string; icon: typeof CreditCard }[] = [
  { id: "fees", label: "Platform Fees", icon: CreditCard },
  { id: "display", label: "Display", icon: Eye },
  { id: "reminders", label: "Reminders", icon: BellRing },
  { id: "emails", label: "Email Templates", icon: Mail },
  { id: "integrations", label: "Integration Health", icon: Activity },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "announcement", label: "Announcement", icon: Megaphone },
];

export default function PlatformControlCenterPage() {
  const { data, isLoading, error } = trpc.settings.getPlatformControlCenter.useQuery();
  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !data) return <Card className="border-error-500/30 p-6 text-sm text-error-700 dark:text-error-300">{error?.message ?? "Platform controls could not be loaded."}</Card>;
  return (
    <ErrorBoundary>
      <PlatformControlEditor key={JSON.stringify(data)} initial={data as ControlCenterData} />
    </ErrorBoundary>
  );
}

function PlatformControlEditor({ initial }: { initial: ControlCenterData }) {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<Tab>("fees");
  const [fees, setFees] = useState({
    adminFeePercentage: initial.fees.adminFeePercentage,
    processingFeePercentage: initial.fees.processingFeePercentage,
    eventActivationFeeAmount: initial.fees.eventActivationFeeSen / 100,
  });
  const [carousel, setCarousel] = useState<HomepageCarouselConfig>(initial.carousel);
  const [reminders, setReminders] = useState<RaceReminderConfig>(initial.reminders);
  const [security, setSecurity] = useState<SecurityControlsConfig>(initial.security);
  const [announcement, setAnnouncement] = useState<PlatformAnnouncementConfig>(initial.announcement);

  const refresh = async () => {
    await Promise.all([
      utils.settings.getPlatformControlCenter.invalidate(),
      utils.settings.getPlatformFees.invalidate(),
      utils.settings.getPublicPlatformExperience.invalidate(),
      utils.event.getFeaturedEvents.invalidate(),
    ]);
  };
  const feeMutation = trpc.settings.updatePlatformFees.useMutation({ onSuccess: async () => { toast.success("Platform fee schedule saved."); await refresh(); }, onError: (err) => toast.error(err.message) });
  const carouselMutation = trpc.settings.updateHomepageCarouselSettings.useMutation({ onSuccess: async () => { toast.success("Homepage display settings saved."); await refresh(); }, onError: (err) => toast.error(err.message) });
  const reminderMutation = trpc.settings.updateRaceReminderSettings.useMutation({ onSuccess: async () => { toast.success("Reminder schedule saved."); await refresh(); }, onError: (err) => toast.error(err.message) });
  const securityMutation = trpc.settings.updateSecurityControls.useMutation({ onSuccess: async () => { toast.success("Security controls saved."); await refresh(); }, onError: (err) => toast.error(err.message) });
  const announcementMutation = trpc.settings.updatePlatformAnnouncement.useMutation({ onSuccess: async () => { toast.success("Public announcement saved."); await refresh(); }, onError: (err) => toast.error(err.message) });
  const runReminderMutation = trpc.settings.runRaceDayRemindersNow.useMutation({ onSuccess: async (result) => { toast.success(result.status === "SUCCESS" ? `${result.deliveries} reminder(s) processed.` : result.reason ?? "Reminder run skipped."); await refresh(); }, onError: (err) => toast.error(err.message) });

  const saveFees = () => feeMutation.mutate({ ...fees, eventActivationFeeSen: Math.round(fees.eventActivationFeeAmount * 100) });
  const saveAnnouncement = () => announcementMutation.mutate({ ...announcement, href: announcement.href?.trim() || null, linkLabel: announcement.linkLabel.trim(), message: announcement.message.trim() });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-b border-neutral-200 pb-5 dark:border-neutral-800">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-primary-500/10 p-2.5 text-primary-600 dark:text-primary-400"><Settings className="h-6 w-6" /></span><div><h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">Platform Control Center</h1><p className="mt-1 text-sm text-neutral-500">Manage global commercial, public experience, automation, integration and security controls.</p></div></div>
      </div>

      <nav aria-label="Platform settings" className="overflow-x-auto border-b border-neutral-200 dark:border-neutral-800"><div className="flex min-w-max gap-1">{TABS.map((tab) => { const Icon = tab.icon; const active = activeTab === tab.id; return <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${active ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"}`}><Icon className="h-4 w-4" />{tab.label}</button>; })}</div></nav>

      {activeTab === "fees" && <section className="space-y-5"><SectionHeading icon={CreditCard} title="Platform fee schedule" description="Changes apply only to new activation invoices and new checkouts. Historical financial records remain immutable." /><Card><CardContent className="grid gap-5 pt-6 sm:grid-cols-3"><MoneyInput label="Event activation fee" value={fees.eventActivationFeeAmount} onChange={(eventActivationFeeAmount) => setFees({ ...fees, eventActivationFeeAmount })} /><PercentageInput label="Platform profit" value={fees.adminFeePercentage} onChange={(adminFeePercentage) => setFees({ ...fees, adminFeePercentage })} /><PercentageInput label="Payment service fee" value={fees.processingFeePercentage} onChange={(processingFeePercentage) => setFees({ ...fees, processingFeePercentage })} /></CardContent></Card><SaveButton onClick={saveFees} pending={feeMutation.isPending} /></section>}

      {activeTab === "display" && <section className="space-y-5"><SectionHeading icon={Eye} title="Homepage carousel" description="Control whether the public homepage shows the carousel and which eligible events appear." /><Card><CardContent className="space-y-5 pt-6"><Toggle label="Enable homepage carousel" description="When off, the carousel is removed from the public homepage." checked={carousel.enabled} onChange={(enabled) => setCarousel({ ...carousel, enabled })} /><Toggle label="Include upcoming published events" description="When enabled, eligible upcoming events with banners join featured events in date order." checked={carousel.includeUpcomingEvents} onChange={(includeUpcomingEvents) => setCarousel({ ...carousel, includeUpcomingEvents })} /><div className="max-w-xs space-y-1.5"><Label htmlFor="maxEvents">Maximum events in carousel</Label><Input id="maxEvents" type="number" min={1} max={50} value={carousel.maxEvents} onChange={(event) => setCarousel({ ...carousel, maxEvents: Number(event.target.value) })} /><p className="text-xs text-neutral-500">Choose 1 to 50. Featured events are prioritised.</p></div></CardContent></Card><SaveButton onClick={() => carouselMutation.mutate(carousel)} pending={carouselMutation.isPending} /></section>}

      {activeTab === "reminders" && <section className="space-y-5"><SectionHeading icon={BellRing} title="Automatic race-day reminders" description="Eligible active registrations receive one in-app reminder only. Cron runs must call the protected internal endpoint." /><Card><CardContent className="space-y-5 pt-6"><Toggle label="Enable race-day reminder" description="Disabling this prevents both scheduled and manual runs from sending reminders." checked={reminders.enabled} onChange={(enabled) => setReminders({ ...reminders, enabled })} /><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="daysBeforeEvent">Days before event</Label><Input id="daysBeforeEvent" type="number" min={0} max={7} value={reminders.daysBeforeEvent} onChange={(event) => setReminders({ ...reminders, daysBeforeEvent: Number(event.target.value) })} /></div><div className="space-y-1.5"><Label htmlFor="sendHourMalaysia">Earliest send hour (Malaysia time)</Label><Input id="sendHourMalaysia" type="number" min={0} max={23} value={reminders.sendHourMalaysia} onChange={(event) => setReminders({ ...reminders, sendHourMalaysia: Number(event.target.value) })} /><p className="text-xs text-neutral-500">The job sends on its first run at or after this hour.</p></div></div><div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-800 dark:bg-neutral-950/30"><p className="font-bold text-neutral-900 dark:text-neutral-50">Latest job: {initial.health.lastReminderRun?.status ?? "No run recorded"}</p><p className="mt-1 text-xs text-neutral-500">{initial.health.lastReminderRun?.summary ?? "Configure your scheduler to POST /api/internal/send-race-reminders with CRON_SECRET."}</p></div></CardContent></Card><div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={() => runReminderMutation.mutate()} disabled={runReminderMutation.isPending}>{runReminderMutation.isPending ? "Running..." : "Run due reminders now"}</Button><SaveButton onClick={() => reminderMutation.mutate(reminders)} pending={reminderMutation.isPending} /></div></section>}

      {activeTab === "integrations" && <section className="space-y-5"><SectionHeading icon={Activity} title="Integration health" description="Live configuration status. Secrets and provider credentials are never exposed in this interface." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><HealthCard label="Database" value={initial.health.database} healthy /><HealthCard label="Scheduler secret" value={initial.health.cronConfigured ? "Configured" : "Not configured"} healthy={initial.health.cronConfigured} /><HealthCard label="Upload service" value={initial.health.uploadServiceConfigured ? "Configured" : "Not configured"} healthy={initial.health.uploadServiceConfigured} /><HealthCard label="Payment mode" value={initial.health.paymentMode} healthy={initial.health.paymentMode === "LIVE"} warning={initial.health.paymentMode !== "LIVE"} /><HealthCard label="Rate-limit buckets" value={String(initial.health.activeRateLimitBuckets)} healthy /><HealthCard label="Proxy headers" value={initial.health.trustProxyHeaders ? "Trusted" : "Direct only"} healthy /></div></section>}

      {activeTab === "security" && <section className="space-y-5"><SectionHeading icon={ShieldCheck} title="Public request protection" description="These limits protect anonymous verification and voucher-validation endpoints per IP address, per minute." /><Card><CardContent className="grid gap-5 pt-6 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="verificationRequests">Certificate / ticket verification requests</Label><Input id="verificationRequests" type="number" min={5} max={100} value={security.verificationRequestsPerMinute} onChange={(event) => setSecurity({ ...security, verificationRequestsPerMinute: Number(event.target.value) })} /><p className="text-xs text-neutral-500">Allowed requests per minute per IP.</p></div><div className="space-y-1.5"><Label htmlFor="voucherRequests">Voucher validation requests</Label><Input id="voucherRequests" type="number" min={5} max={100} value={security.voucherRequestsPerMinute} onChange={(event) => setSecurity({ ...security, voucherRequestsPerMinute: Number(event.target.value) })} /><p className="text-xs text-neutral-500">Allowed requests per minute per IP.</p></div></CardContent></Card><SaveButton onClick={() => securityMutation.mutate(security)} pending={securityMutation.isPending} /></section>}

      {activeTab === "emails" && <EmailSection />}

      {activeTab === "announcement" && <section className="space-y-5"><SectionHeading icon={Megaphone} title="Public announcement" description="Display a small platform-wide message above public pages without changing event content." /><Card><CardContent className="space-y-5 pt-6"><Toggle label="Show public announcement" description="Only enable this after adding an accurate message." checked={announcement.enabled} onChange={(enabled) => setAnnouncement({ ...announcement, enabled })} /><div className="grid gap-5 sm:grid-cols-3"><div className="space-y-1.5"><Label htmlFor="announcementTone">Tone</Label><select id="announcementTone" value={announcement.tone} onChange={(event) => setAnnouncement({ ...announcement, tone: event.target.value as PlatformAnnouncementConfig["tone"] })} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="INFO">Information</option><option value="SUCCESS">Success</option><option value="WARNING">Warning</option></select></div><div className="space-y-1.5 sm:col-span-2"><Label htmlFor="announcementMessage">Message</Label><Input id="announcementMessage" maxLength={280} value={announcement.message} onChange={(event) => setAnnouncement({ ...announcement, message: event.target.value })} placeholder="Registration for selected events closes soon." /></div></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="announcementLinkLabel">Link label (optional)</Label><Input id="announcementLinkLabel" maxLength={48} value={announcement.linkLabel} onChange={(event) => setAnnouncement({ ...announcement, linkLabel: event.target.value })} placeholder="View events" /></div><div className="space-y-1.5"><Label htmlFor="announcementHref">Link URL (optional)</Label><Input id="announcementHref" maxLength={500} value={announcement.href ?? ""} onChange={(event) => setAnnouncement({ ...announcement, href: event.target.value || null })} placeholder="/events or https://..." /></div></div></CardContent></Card><SaveButton onClick={saveAnnouncement} pending={announcementMutation.isPending} /></section>}
    </div>
  );
}

type TemplateKey =
  | "registration-confirmed"
  | "event-published"
  | "event-cancelled-organizer"
  | "event-cancelled-participant"
  | "race-day-reminder"
  | "settlement-completed";

const EMAIL_TEMPLATES: { key: TemplateKey; label: string; desc: string }[] = [
  { key: "registration-confirmed", label: "Registration Confirmed", desc: "Sent to participant upon successful event booking & receipt" },
  { key: "event-published", label: "Event Published", desc: "Sent to organizer when admin approves and publishes event" },
  { key: "event-cancelled-organizer", label: "Event Cancelled (Organizer)", desc: "Official cancellation copy sent to organizer" },
  { key: "event-cancelled-participant", label: "Event Cancelled (Participant)", desc: "Cancellation notice sent to registered participants" },
  { key: "race-day-reminder", label: "Race Day Reminder", desc: "Time, venue & e-ticket reminder sent to participants" },
  { key: "settlement-completed", label: "Payout Settlement Completed", desc: "Net ticket sales disbursement notice sent to organizer" },
];

function EmailSection() {
  const { data: status, isLoading: isStatusLoading } = trpc.admin.getEmailStatus.useQuery();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("registration-confirmed");
  const [testRecipient, setTestRecipient] = useState("");

  const { data: preview, isLoading: isPreviewLoading } = trpc.admin.renderEmailPreview.useQuery({
    templateKey: selectedTemplate,
  });

  const sendTestMutation = trpc.admin.sendTestEmail.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to dispatch test email.");
    },
  });

  const handleSendTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }
    sendTestMutation.mutate({
      templateKey: selectedTemplate,
      recipientEmail: testRecipient.trim(),
    });
  };

  const activeInfo = EMAIL_TEMPLATES.find((t) => t.key === selectedTemplate)!;

  return (
    <section className="space-y-5">
      <SectionHeading
        icon={Mail}
        title="Transactional Email Templates"
        description="Live preview and test dispatch for all 6 automated email notifications."
      />

      {/* Health Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <HealthCard
          label="Resend API Status"
          value={isStatusLoading ? "Checking..." : status?.resendConfigured ? "Connected (Live API)" : "Mock Mode (Local Log Only)"}
          healthy={Boolean(status?.resendConfigured)}
          warning={!status?.resendConfigured}
        />
        <HealthCard
          label="Default Sender Address"
          value={status?.fromEmail ?? "notifications@nexrun.my"}
          healthy
        />
      </div>

      {/* Template Selector */}
      <div className="grid gap-2 sm:grid-cols-3">
        {EMAIL_TEMPLATES.map((tpl) => {
          const active = selectedTemplate === tpl.key;
          return (
            <button
              key={tpl.key}
              type="button"
              onClick={() => setSelectedTemplate(tpl.key)}
              className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                active
                  ? "border-primary-500 bg-primary-500/10 text-primary-900 dark:text-primary-100 shadow-xs"
                  : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              }`}
            >
              <span className="font-bold text-xs sm:text-sm">{tpl.label}</span>
              <span className="text-[11px] text-neutral-500 mt-1 line-clamp-1">{tpl.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Live Preview Container */}
      <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm">
        <CardHeader className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-extrabold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                <span>{activeInfo.label}</span>
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500 mt-0.5">
                Subject: <span className="font-mono text-neutral-700 dark:text-neutral-300">{preview?.subject || "Loading..."}</span>
              </CardDescription>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shrink-0">
              {selectedTemplate}.tsx
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isPreviewLoading ? (
            <div className="p-12 text-center text-sm text-neutral-400">Rendering live email template...</div>
          ) : preview?.html ? (
            <iframe
              title={`Preview ${selectedTemplate}`}
              srcDoc={preview.html}
              className="w-full h-125 border-0 bg-white rounded-b-2xl"
            />
          ) : (
            <div className="p-12 text-center text-sm text-error-500">Failed to render email preview.</div>
          )}
        </CardContent>
      </Card>

      {/* Dispatch Test Email Form */}
      <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs">
        <form onSubmit={handleSendTest} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full space-y-1.5">
            <Label htmlFor="testEmailInput" className="text-xs font-bold">
              Dispatch Test Email ({activeInfo.label})
            </Label>
            <Input
              id="testEmailInput"
              type="email"
              placeholder="Enter recipient email (e.g. developer@nexrun.my)..."
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="h-10 text-xs rounded-xl"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={sendTestMutation.isPending}
            className="w-full sm:w-auto h-10 gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl px-5 shrink-0"
          >
            <Send className="h-4 w-4" />
            {sendTestMutation.isPending ? "Sending Test..." : "Send Test Email"}
          </Button>
        </form>
      </Card>
    </section>
  );
}

function SectionHeading({ icon: Icon, title, description }: { icon: typeof Settings; title: string; description: string }) { return <div><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary-500" /><h2 className="text-lg font-black text-neutral-900 dark:text-neutral-50">{title}</h2></div><p className="mt-1 text-sm text-neutral-500">{description}</p></div>; }
function SaveButton({ onClick, pending }: { onClick: () => void; pending: boolean }) { return <div className="flex justify-end"><Button type="button" onClick={onClick} disabled={pending} className="gap-2 font-bold"><Save className="h-4 w-4" />{pending ? "Saving..." : "Save changes"}</Button></div>; }
function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex cursor-pointer items-start justify-between gap-5 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"><span><span className="block font-bold text-neutral-900 dark:text-neutral-50">{label}</span><span className="mt-1 block text-xs leading-relaxed text-neutral-500">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-9 cursor-pointer accent-primary-500" /></label>; }
function PercentageInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <div className="space-y-1.5"><Label>{label}</Label><div className="relative"><Input type="number" min={0} max={50} value={value} onChange={(event) => onChange(Number(event.target.value))} className="pr-8" /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-neutral-500">%</span></div></div>; }
function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <div className="space-y-1.5"><Label>{label}</Label><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-neutral-500">RM</span><Input type="number" min={1} step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} className="pl-10" /></div></div>; }
function HealthCard({ label, value, healthy, warning = false }: { label: string; value: string; healthy: boolean; warning?: boolean }) { const Icon = healthy ? CheckCircle2 : CircleAlert; return <Card><CardHeader className="pb-1"><CardDescription>{label}</CardDescription><CardTitle className="flex items-center gap-2 text-base"><Icon className={`h-4 w-4 ${healthy ? "text-emerald-600" : warning ? "text-amber-500" : "text-error-500"}`} />{value}</CardTitle></CardHeader></Card>; }
