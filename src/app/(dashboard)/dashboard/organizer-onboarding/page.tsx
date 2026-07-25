"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { organizerOnboardingSchema, type OrganizerOnboardingInput } from "@/lib/validation/settings";
import { ROLES, type RoleType } from "@/lib/constants";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2, Landmark, CheckCircle2, XCircle, Clock, ShieldCheck, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { UploadButton } from "@/lib/uploadthing";
import { PromptDialog } from "@/components/ui/prompt-dialog";

function OrganizerOnboardingPageContent() {
  const [resubmitting, setResubmitting] = useState(false);
  const [suspendDialog, setSuspendDialog] = useState<{ orgId: string; orgName: string; isSuspending: boolean } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const { data: session } = useSession();
  const userRole = (session?.user?.role as RoleType) || ROLES.USER;
  const isAdminOrDev = userRole === ROLES.ADMIN || userRole === ROLES.DEVELOPER;

  // Query organization applications if Admin or Developer
  const {
    data: orgList,
    isLoading: loadingList,
    refetch: refetchList,
  } = trpc.settings.getOrganizations.useQuery(undefined, {
    enabled: isAdminOrDev,
  });

  // Query my own organization status
  const {
    data: myOrg,
    isLoading: loadingMyOrg,
    refetch: refetchMyOrg,
  } = trpc.settings.getMyOrganization.useQuery();

  // Mutations
  const onboardingMutation = trpc.settings.registerOrganizerProfile.useMutation({
    onSuccess: () => {
      toast.success("Organizer onboarding request submitted successfully!");
      setResubmitting(false);
      refetchMyOrg();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit onboarding profile.");
    },
  });

  const approveMutation = trpc.settings.approveOrganization.useMutation({
    onSuccess: () => {
      toast.success("Organizer profile approved!");
      refetchList();
    },
    onError: (err) => {
      toast.error(err.message || "Approval failed.");
    },
  });

  const rejectMutation = trpc.settings.rejectOrganization.useMutation({
    onSuccess: () => {
      toast.success("Organizer profile rejected.");
      refetchList();
    },
    onError: (err) => {
      toast.error(err.message || "Rejection failed.");
    },
  });
  const suspensionMutation = trpc.settings.setOrganizationSuspension.useMutation({
    onSuccess: () => {
      toast.success("Organizer status updated.");
      setSuspendDialog(null);
      setSuspendReason("");
      refetchList();
    },
    onError: (err) => toast.error(err.message || "Unable to update organizer status."),
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<OrganizerOnboardingInput>({
    resolver: zodResolver(organizerOnboardingSchema),
    defaultValues: {
      companyName: "",
      ssmNumber: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      bankName: "",
      bankAccountNo: "",
      bankAccountName: "",
      ssmDocumentUrl: "",
    },
  });

  const onSubmit = (data: OrganizerOnboardingInput) => {
    onboardingMutation.mutate(data);
  };

  const loading = onboardingMutation.isPending;
  const ssmDocumentUrl = useWatch({ control, name: "ssmDocumentUrl" });

  const prepareResubmission = () => {
    if (!myOrg) return;
    setValue("companyName", myOrg.companyName);
    setValue("ssmNumber", myOrg.ssmNumber);
    setValue("contactPerson", myOrg.contactPerson);
    setValue("email", myOrg.email);
    setValue("phone", myOrg.phone);
    setValue("address", myOrg.address);
    setValue("bankName", myOrg.bankName);
    setValue("bankAccountNo", myOrg.bankAccountNo);
    setValue("bankAccountName", myOrg.bankAccountName);
    setValue("ssmDocumentUrl", myOrg.ssmDocumentUrl || "");
    setResubmitting(true);
  };

  // 1. ADMIN OR DEVELOPER REVIEW PANEL
  if (isAdminOrDev) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-rose-500" />
              <span>Organizers Applications Review</span>
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Admin & Developer panel to review corporate SSM profiles and approve organizer publishing privileges.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-500/10 text-rose-600 px-3 py-1 text-xs font-bold uppercase tracking-wider border border-rose-500/20">
              {userRole} MODE
            </span>
          </div>
        </div>

        {loadingList ? (
          <div aria-label="Loading...">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !orgList || orgList.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No Applications Found"
            description="There are currently no organizer profiles registered in the system."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {orgList.map((org) => {
              const isPending = org.status === "PENDING";
              const isApproved = org.status === "APPROVED";
              const isRejected = org.status === "REJECTED";
              const isSuspended = org.status === "SUSPENDED";

              return (
                <Card
                  key={org.id}
                  className={`border rounded-2xl overflow-hidden transition-all duration-150 shadow-sm flex flex-col justify-between ${
                    isPending
                      ? "border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10"
                      : isApproved
                      ? "border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 opacity-75"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                          {org.companyName}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono text-neutral-500 truncate mt-0.5">
                          SSM: {org.ssmNumber}
                        </CardDescription>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                          isPending
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                            : isApproved
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-300"
                        }`}
                      >
                        {isPending && <Clock className="h-3 w-3 animate-spin" />}
                        {isApproved && <CheckCircle2 className="h-3 w-3" />}
                        {isRejected && <XCircle className="h-3 w-3" />}
                        <span>{org.status}</span>
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
                    <div className="space-y-1 bg-white/60 dark:bg-neutral-900/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800/80">
                      <p><strong>PIC:</strong> {org.contactPerson}</p>
                      <p><strong>Email:</strong> {org.email}</p>
                      <p><strong>Phone:</strong> {org.phone}</p>
                      <p className="truncate"><strong>Address:</strong> {org.address}</p>
                    </div>

                    <div className="space-y-1 bg-white/60 dark:bg-neutral-900/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800/80">
                      <p className="text-[10px] uppercase font-bold text-neutral-400">Bank Details</p>
                      <p><strong>Bank:</strong> {org.bankName}</p>
                      <p><strong>Acc No:</strong> {org.bankAccountNo}</p>
                      <p className="truncate"><strong>Holder:</strong> {org.bankAccountName}</p>
                    </div>

                    {org.ssmDocumentUrl && (
                      <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-center border border-neutral-100 dark:border-neutral-850">
                        <a
                          href={org.ssmDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center justify-center gap-1"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          View SSM Document &rarr;
                        </a>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between border-t border-neutral-200/60 dark:border-neutral-800/60">
                      <span className="text-[11px] text-neutral-400">
                        User: {org.user.name || org.user.email}
                      </span>
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => rejectMutation.mutate({ orgId: org.id })}
                            disabled={rejectMutation.isPending || approveMutation.isPending}
                            className="h-8 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold px-3 rounded-lg dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ orgId: org.id })}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 rounded-lg shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        </div>
                      )}
                      {(isApproved || isSuspended) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSuspendDialog({ orgId: org.id, orgName: org.companyName, isSuspending: isApproved });
                            setSuspendReason("");
                          }}
                          disabled={suspensionMutation.isPending}
                          className={isApproved ? "h-8 text-xs font-bold text-error-600" : "h-8 text-xs font-bold text-success-600"}
                        >
                          {isApproved ? "Suspend" : "Reinstate"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      <PromptDialog
        open={suspendDialog !== null}
        title={suspendDialog?.isSuspending ? `Suspend "${suspendDialog?.orgName}"` : `Reinstate "${suspendDialog?.orgName}"`}
        description={suspendDialog?.isSuspending ? "Provide a reason for suspending this organizer." : "Provide a reason for reinstating this organizer."}
        placeholder={suspendDialog?.isSuspending ? "Reason for suspension..." : "Reason for reinstatement..."}
        value={suspendReason}
        onChange={setSuspendReason}
        onConfirm={() => {
          if (!suspendDialog) return;
          suspensionMutation.mutate({ orgId: suspendDialog.orgId, suspended: suspendDialog.isSuspending, reason: suspendReason.trim() });
        }}
        onCancel={() => { setSuspendDialog(null); setSuspendReason(""); }}
        confirmLabel={suspendDialog?.isSuspending ? "Suspend" : "Reinstate"}
        confirmVariant={suspendDialog?.isSuspending ? "danger" : "primary"}
        isPending={suspensionMutation.isPending}
      />
    </div>
    );
  }

  // 2. USER ALREADY SUBMITTED OR APPROVED ORGANIZATION PROFILE
  if (!loadingMyOrg && myOrg && !(myOrg.status === "REJECTED" && resubmitting)) {
    const isApproved = myOrg.status === "APPROVED";
    const isRejected = myOrg.status === "REJECTED";

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            My Organization Profile
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Your corporate status and event creation privileges.
          </p>
        </div>

        <Card className={`border rounded-2xl p-6 shadow-sm ${
          isApproved ? "border-emerald-300 bg-emerald-50/20 dark:border-emerald-900/60 dark:bg-emerald-950/10" : isRejected ? "border-error-500/30 bg-error-500/5" : "border-amber-300 bg-amber-50/20 dark:border-amber-900/60 dark:bg-amber-950/10"
        }`}>
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{myOrg.companyName}</h2>
              <p className="text-xs font-mono text-neutral-500">SSM: {myOrg.ssmNumber}</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase ${
              isApproved ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" : isRejected ? "bg-error-500/10 text-error-600" : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
            }`}>
              {isApproved ? <CheckCircle2 className="h-4 w-4" /> : isRejected ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              <span>{myOrg.status}</span>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mt-4 text-sm text-neutral-700 dark:text-neutral-300">
            <div>
              <p className="text-xs text-neutral-400 font-semibold uppercase">Contact Details</p>
              <p className="mt-1"><strong>PIC:</strong> {myOrg.contactPerson}</p>
              <p><strong>Email:</strong> {myOrg.email}</p>
              <p><strong>Phone:</strong> {myOrg.phone}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-semibold uppercase">Bank Settlement Details</p>
              <p className="mt-1"><strong>Bank:</strong> {myOrg.bankName}</p>
              <p><strong>Account No:</strong> {myOrg.bankAccountNo}</p>
              <p><strong>Holder:</strong> {myOrg.bankAccountName}</p>
            </div>
          </div>

          {isApproved ? (
            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Your organizer workspace is active and ready.
              </span>
              <Button asChild className="bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl px-5">
                <Link href="/dashboard/events">Go to My Events &rarr;</Link>
              </Button>
            </div>
          ) : isRejected ? (
            <div className="mt-6 space-y-3 border-t pt-4">
              <div className="rounded-xl bg-white/70 p-3 text-xs text-error-700 dark:bg-neutral-900/60 dark:text-error-300">
                <p className="font-bold">Changes are required before approval.</p>
                <p className="mt-1 leading-relaxed">{myOrg.applications[0]?.reviewerNotes || "Review your company details and supporting document before resubmitting."}</p>
              </div>
              <Button type="button" onClick={prepareResubmission} className="bg-primary-500 font-bold text-white hover:bg-primary-600">Edit and resubmit</Button>
            </div>
          ) : (
            <div className="mt-6 pt-4 border-t text-xs text-amber-700 dark:text-amber-400 font-medium">
              Your profile is under review. You will receive an update in your notification centre.
            </div>
          )}
        </Card>
      </div>
    );
  }

  // 3. USER SUBMISSION FORM (NEW ONBOARDING)
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
          {resubmitting ? "Update organizer application" : "Organizer onboarding"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Submit your official company details to activate event creation privileges.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Building2 className="h-4.5 w-4.5 text-primary-500" />
              <span>Company Information</span>
            </CardTitle>
            <CardDescription className="text-xs text-neutral-400">
              Provide corporate details as registered in SSM Malaysia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="companyName">Company / Association Name</Label>
                <Input id="companyName" placeholder="Run Malaysia Events Sdn Bhd" {...register("companyName")} disabled={loading} />
                {errors.companyName && <p className="text-xs font-semibold text-error-600">{errors.companyName.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="ssmNumber">SSM Registration Number</Label>
                <Input id="ssmNumber" placeholder="202401012345 (1512345-X)" {...register("ssmNumber")} disabled={loading} />
                {errors.ssmNumber && <p className="text-xs font-semibold text-error-600">{errors.ssmNumber.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="contactPerson">PIC Name (Contact Person)</Label>
                <Input id="contactPerson" placeholder="Faizal Tahir" {...register("contactPerson")} disabled={loading} />
                {errors.contactPerson && <p className="text-xs font-semibold text-error-600">{errors.contactPerson.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Business Email</Label>
                <Input id="email" type="email" placeholder="organizer@runmalaysia.my" {...register("email")} disabled={loading} />
                {errors.email && <p className="text-xs font-semibold text-error-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Contact Number</Label>
                <Input id="phone" placeholder="012-3456789" {...register("phone")} disabled={loading} />
                {errors.phone && <p className="text-xs font-semibold text-error-600">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Full Corporate Address</Label>
              <Input id="address" placeholder="Level 15, Menara Cyberjaya, 63000 Cyberjaya, Selangor" {...register("address")} disabled={loading} />
              {errors.address && <p className="text-xs font-semibold text-error-600">{errors.address.message}</p>}
            </div>

            <div className="space-y-1 pt-2">
              <Label>SSM Registration Certificate (PDF or Image)</Label>
              <div className="flex items-center gap-3">
                <UploadButton
                  endpoint="ssmDocument"
                  onClientUploadComplete={(res) => {
                    if (res?.[0]?.serverData?.key) {
                      setValue("ssmDocumentUrl", res[0].serverData.key);
                      toast.success("SSM Document uploaded successfully!");
                    }
                  }}
                  onUploadError={(error: Error) => {
                    toast.error(`Upload failed: ${error.message}`);
                  }}
                  className="ut-button:bg-primary-500 ut-button:hover:bg-primary-600 ut-button:rounded-xl ut-button:font-bold ut-button:text-xs"
                />
                {ssmDocumentUrl && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="h-4 w-4" /> Document uploaded
                  </span>
                )}
              </div>
              {errors.ssmDocumentUrl && <p className="text-xs font-semibold text-error-600">{errors.ssmDocumentUrl.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Landmark className="h-4.5 w-4.5 text-primary-500" />
              <span>Settlement Account Details</span>
            </CardTitle>
            <CardDescription className="text-xs text-neutral-400">
              Where ticket sales revenue (net platform fees) will be settled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input id="bankName" placeholder="Maybank Berhad" {...register("bankName")} disabled={loading} />
                {errors.bankName && <p className="text-xs font-semibold text-error-600">{errors.bankName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="bankAccountNo">Account Number</Label>
                <Input id="bankAccountNo" placeholder="562123456789" {...register("bankAccountNo")} disabled={loading} />
                {errors.bankAccountNo && <p className="text-xs font-semibold text-error-600">{errors.bankAccountNo.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="bankAccountName">Account Holder Name</Label>
                <Input id="bankAccountName" placeholder="RUN MALAYSIA EVENTS SDN BHD" {...register("bankAccountName")} disabled={loading} />
                {errors.bankAccountName && <p className="text-xs font-semibold text-error-600">{errors.bankAccountName.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-primary-500/20"
          >
            {loading ? "Submitting Request..." : "Submit Profile for Review"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function OrganizerOnboardingPage() {
  return (
    <ErrorBoundary>
      <OrganizerOnboardingPageContent />
    </ErrorBoundary>
  );
}
