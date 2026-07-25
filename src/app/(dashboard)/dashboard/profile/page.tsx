"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton } from "@/components/ui/skeleton";
import { User, Save, Shield } from "lucide-react";
import toast from "react-hot-toast";

interface MyProfileData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  userProfile: {
    fullName: string;
    nationality: string;
  } | null;
}

function UserProfileForm({ myProfile, refetchProfile }: { myProfile: MyProfileData; refetchProfile: () => void }) {
  const [displayName, setDisplayName] = useState(myProfile.name || "");
  const [fullName, setFullName] = useState(myProfile.userProfile?.fullName || myProfile.name || "");
  const [nationality, setNationality] = useState(myProfile.userProfile?.nationality || "Malaysian");

  const updateProfileMutation = trpc.settings.updateUserProfile.useMutation({
    onSuccess: () => {
      toast.success("Personal profile updated successfully.");
      refetchProfile();
    },
    onError: (err) => toast.error(err.message || "Failed to update profile."),
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: displayName,
      fullName: fullName,
      nationality: nationality,
    });
  };

  return (
    <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
      <CardHeader className="border-b border-neutral-100 bg-neutral-50/70 p-5 dark:border-neutral-800 dark:bg-neutral-950/40">
        <div className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Personal Details</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Manage your official full name, display name, and nationality for event registrations.
            </CardDescription>
          </div>
          <span className="shrink-0 rounded-full bg-primary-500/10 text-primary-600 border border-primary-500/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider">
            Role: {myProfile.role}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Display Name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Tan"
                required
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Shown on public event standings and leaderboard.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Full Name (NRIC / Passport)
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Tan Ah Kow"
                required
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Used for official bib printing and e-certificates.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Email Address
              </label>
              <Input
                value={myProfile.email}
                disabled
                className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Authentication email address.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Nationality
              </label>
              <Input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="e.g. Malaysian"
                required
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Default nationality for race registration forms.</span>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl px-6 py-2.5 shadow-sm transition-all"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {updateProfileMutation.isPending ? "Saving..." : "Save Profile Details"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ProfilePageContent() {
  const { data: myProfile, isLoading, refetch } = trpc.settings.getMyProfile.useQuery();

  const withdrawConsent = trpc.settings.withdrawConsent.useMutation({
    onSuccess: (data) => {
      if (data.count === 0) {
        toast("No active consent record found for that type.");
      } else {
        toast.success("Consent withdrawal recorded.");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to withdraw consent."),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2.5">
          <User className="h-8 w-8 text-primary-500" />
          <span>My Profile &amp; Account Details</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          View and edit your personal details, display name, and data privacy settings.
        </p>
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : myProfile ? (
        <UserProfileForm key={myProfile.id} myProfile={myProfile} refetchProfile={refetch} />
      ) : null}

      {/* Account Security & Privacy */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Privacy &amp; Data Consent</h2>
        </div>
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-xs">
          <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
            Withdrawing consent records your preference in our audit system but does not delete your existing race registrations or order history.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => withdrawConsent.mutate({ consentType: "EVENT_TERMS" })}
              disabled={withdrawConsent.isPending}
              className="text-xs font-semibold border-neutral-200 dark:border-neutral-700 rounded-xl"
            >
              Withdraw event terms consent
            </Button>
            <Button
              variant="outline"
              onClick={() => withdrawConsent.mutate({ consentType: "PRIVACY" })}
              disabled={withdrawConsent.isPending}
              className="text-xs font-semibold border-neutral-200 dark:border-neutral-700 rounded-xl"
            >
              Withdraw privacy policy consent
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ErrorBoundary>
      <ProfilePageContent />
    </ErrorBoundary>
  );
}
