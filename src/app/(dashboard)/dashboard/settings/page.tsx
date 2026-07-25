"use client";

import React, { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Settings, Calendar, Award, QrCode, Building2, UserPlus, Users, X, Save, CreditCard } from "lucide-react";
import { formatStatus } from "@/lib/utils";
import toast from "react-hot-toast";

interface OrganizationData {
  id: string;
  companyName: string;
  ssmNumber: string;
  contactPerson: string;
  phone: string;
  address: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  status: string;
  members: {
    id: string;
    role: string;
    user: {
      name: string | null;
      email: string;
    };
  }[];
}

function OrganizationDetailsCard({ organization, refetchOrganization }: { organization: OrganizationData; refetchOrganization: () => void }) {
  const [contactPerson, setContactPerson] = useState(organization.contactPerson || "");
  const [phone, setPhone] = useState(organization.phone || "");
  const [address, setAddress] = useState(organization.address || "");
  const [bankName, setBankName] = useState(organization.bankName || "");
  const [bankAccountNo, setBankAccountNo] = useState(organization.bankAccountNo || "");
  const [bankAccountName, setBankAccountName] = useState(organization.bankAccountName || "");

  const [teamEmail, setTeamEmail] = useState("");
  const [teamRole, setTeamRole] = useState<"MANAGER" | "OPERATIONS" | "FINANCE" | "CHECKIN_STAFF">("OPERATIONS");

  const updateOrgDetailsMutation = trpc.settings.updateOrganizationDetails.useMutation({
    onSuccess: () => {
      toast.success("Organization details updated successfully.");
      refetchOrganization();
    },
    onError: (err) => toast.error(err.message || "Failed to update organization details."),
  });

  const addMember = trpc.settings.addOrganizationMember.useMutation({
    onSuccess: () => {
      setTeamEmail("");
      toast.success("Team member added.");
      refetchOrganization();
    },
    onError: (err) => toast.error(err.message || "Failed to add team member."),
  });

  const removeMember = trpc.settings.removeOrganizationMember.useMutation({
    onSuccess: () => {
      toast.success("Team member removed.");
      refetchOrganization();
    },
    onError: (err) => toast.error(err.message || "Failed to remove team member."),
  });

  const handleSaveOrgDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgDetailsMutation.mutate({
      contactPerson,
      phone,
      address,
      bankName,
      bankAccountNo,
      bankAccountName,
    });
  };

  return (
    <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
      <CardHeader className="border-b border-neutral-100 bg-neutral-50/70 p-5 dark:border-neutral-800 dark:bg-neutral-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-lg font-bold">{organization.companyName}</CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                SSM Reg: <strong className="font-mono">{organization.ssmNumber}</strong> &middot; Organizer workspace details
              </CardDescription>
            </div>
          </div>
          <span className={`self-start sm:self-auto rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
            organization.status === "APPROVED" ? "bg-success-500/10 text-success-600 border border-success-500/20" : "bg-warning-500/10 text-warning-600 border border-warning-500/20"
          }`}>
            {formatStatus(organization.status)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Organization Contact Form */}
        <form onSubmit={handleSaveOrgDetails} className="space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 border-b pb-2">
            <Building2 className="h-4 w-4 text-primary-500" /> Contact &amp; Business Address
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Contact Person
              </label>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Encik Rosli"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Phone Number
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +60123456789"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Business Address
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Suite 10-2, Cyberjaya Tech Park, 63000 Cyberjaya, Selangor"
                required
              />
            </div>
          </div>

          {/* Bank Account Details for Settlements */}
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 border-b pb-2 pt-4">
            <CreditCard className="h-4 w-4 text-primary-500" /> Bank Settlement Account Details
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Bank Name
              </label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Maybank / CIMB Bank"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Bank Account Number
              </label>
              <Input
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                placeholder="e.g. 512345678901"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Account Registered Name
              </label>
              <Input
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                placeholder="e.g. Run Malaysia Events Sdn Bhd"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={updateOrgDetailsMutation.isPending}
              className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl px-5"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {updateOrgDetailsMutation.isPending ? "Saving..." : "Save Organization Details"}
            </Button>
          </div>
        </form>

        {/* Team Members Management */}
        <div className="pt-6 border-t space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary-500" /> Workspace Team Members
          </h3>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {organization.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {member.user.name || member.user.email}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {member.user.email} &middot; <span className="font-semibold uppercase text-primary-600 dark:text-primary-400">{member.role.toLowerCase().replaceAll("_", " ")}</span>
                    </p>
                  </div>
                  {member.role !== "OWNER" && (
                    <button
                      type="button"
                      aria-label={`Remove ${member.user.email}`}
                      onClick={() => removeMember.mutate({ organizationId: organization.id, memberId: member.id })}
                      disabled={removeMember.isPending}
                      className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-error-500/10 hover:text-error-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (organization.status === "APPROVED" && teamEmail.trim()) {
                  addMember.mutate({ organizationId: organization.id, email: teamEmail.trim(), role: teamRole });
                }
              }}
              className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/30 space-y-3"
            >
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary-500" />
                <h4 className="font-bold text-xs text-neutral-900 dark:text-neutral-100">Add Team Member</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-500">
                The user must have a NexRun account. Grant appropriate role permissions.
              </p>
              <Input
                value={teamEmail}
                onChange={(event) => setTeamEmail(event.target.value)}
                type="email"
                placeholder="teammate@example.com"
                className="bg-white dark:bg-neutral-900 text-xs"
                disabled={organization.status !== "APPROVED"}
              />
              <select
                value={teamRole}
                onChange={(event) => setTeamRole(event.target.value as typeof teamRole)}
                disabled={organization.status !== "APPROVED"}
                className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs dark:border-neutral-800 dark:bg-neutral-900"
              >
                <option value="MANAGER">Manager — manage events and team</option>
                <option value="OPERATIONS">Operations — participants and fulfilment</option>
                <option value="FINANCE">Finance — financial summaries</option>
                <option value="CHECKIN_STAFF">Check-in staff — race-day check-in only</option>
              </select>
              <Button
                type="submit"
                disabled={!teamEmail.trim() || organization.status !== "APPROVED" || addMember.isPending}
                className="w-full bg-primary-500 text-xs font-bold text-white hover:bg-primary-600 rounded-xl"
              >
                {addMember.isPending ? "Adding member..." : "Add team member"}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPortalPageContent() {
  const { data: events, isLoading: isLoadingEvents } = trpc.event.getDashboardEvents.useQuery();
  const { data: organization, refetch: refetchOrganization, isLoading: isLoadingOrg } = trpc.settings.getMyOrganization.useQuery();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary-500" />
          <span>Workspace Settings Hub</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your organizer team members, business details, bank settlement accounts, and print templates.
        </p>
      </div>

      {/* ORGANIZER & WORKSPACE DETAILS */}
      {isLoadingOrg ? (
        <CardSkeleton />
      ) : organization ? (
        <OrganizationDetailsCard key={organization.id} organization={organization} refetchOrganization={refetchOrganization} />
      ) : null}

      {/* EVENT TEMPLATES SECTION */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Event Templates &amp; Printing</h2>
          <p className="mt-1 text-sm text-neutral-500">Customize bib layouts and certificate presets for your active events.</p>
        </div>

        {isLoadingEvents ? (
          <div className="grid gap-6 sm:grid-cols-2" aria-label="Loading...">
            {[1, 2, 3, 4].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <EmptyState
            icon={Settings}
            title="No Events Configured"
            description="Create an event to start designing custom bib templates and certificates."
            action={{
              label: "Create New Event",
              href: "/dashboard/events/create",
            }}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {events.map((ev) => (
              <Card
                key={ev.id}
                className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-150 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                      {ev.title}
                    </CardTitle>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                      ev.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}>
                      {formatStatus(ev.status)}
                    </span>
                  </div>
                  <CardDescription className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                    <Calendar className="h-3.5 w-3.5 text-primary-500" />
                    <span>{new Date(ev.eventDate).toLocaleDateString("en-MY", { dateStyle: "medium" })}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-2 space-y-4">
                  <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 border border-neutral-100 dark:border-neutral-800">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Award className="h-4 w-4 text-amber-500" /> Print &amp; E-Cert Templates
                    </span>
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">Custom Ready &rarr;</span>
                  </div>

                  <div className="pt-2 border-t grid grid-cols-2 gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full text-xs font-bold py-2.5 rounded-xl border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <Link href={`/dashboard/events/${ev.id}/edit`}>
                        <Settings className="h-3.5 w-3.5 mr-1" /> Edit Event
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="w-full bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm"
                    >
                      <Link href={`/dashboard/events/${ev.id}/operations/templates`}>
                        <QrCode className="h-3.5 w-3.5 mr-1" /> Print Templates
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function SettingsPortalPage() {
  return (
    <ErrorBoundary>
      <SettingsPortalPageContent />
    </ErrorBoundary>
  );
}
