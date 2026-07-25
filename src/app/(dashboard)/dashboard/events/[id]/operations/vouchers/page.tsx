"use client";

import React, { use } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createVoucherSchema, type CreateVoucherInput } from "@/lib/validation/operational";
import { Tag, Users, Percent, DollarSign, CheckCircle2, XCircle, ArrowLeft, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

function EventVouchersPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  const utils = trpc.useUtils();

  // Queries
  const { data: vouchers, isLoading: loadingVouchers } = trpc.operational.getEventVouchers.useQuery({ eventId });

  // Mutations
  const createMutation = trpc.operational.createVoucher.useMutation({
    onSuccess: () => {
      toast.success("Promo code created successfully!");
      utils.operational.getEventVouchers.invalidate();
      reset();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create promo code.");
    },
  });

  const deactivateMutation = trpc.operational.deactivateVoucher.useMutation({
    onSuccess: () => {
      toast.success("Promo code deactivated.");
      utils.operational.getEventVouchers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to deactivate promo code.");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateVoucherInput>({
    resolver: zodResolver(createVoucherSchema),
    defaultValues: {
      eventId,
      code: "",
      discountType: "PERCENTAGE",
      discountValue: 10,
      maxUses: null,
      validFrom: "",
      validUntil: "",
      applicationPolicy: "PER_ORDER",
    },
  });

  const onSubmit = (data: CreateVoucherInput) => {
    createMutation.mutate({
      ...data,
      // Always ensure code is uppercase
      code: data.code.toUpperCase().trim(),
    });
  };

  const loading = createMutation.isPending || deactivateMutation.isPending;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            <Tag className="h-8 w-8 text-primary-500" />
            <span>Manage Promo Codes & Vouchers</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Configure discounts, early bird incentives, and set redemption caps.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/dashboard/vouchers" className="flex items-center gap-1.5 text-xs font-bold">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Active Vouchers List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>Active Promotion Rules</span>
            {vouchers && (
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 text-xs font-bold">
                {vouchers.length}
              </span>
            )}
          </h2>

          {loadingVouchers ? (
            <div className="space-y-3" aria-label="Loading vouchers">
              {[1, 2].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : !vouchers || vouchers.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No Vouchers Configured"
              description="Use the panel on the right to set up your first event discount code."
            />
          ) : (
            <div className="space-y-3">
              {vouchers.map((v) => (
                <Card
                  key={v.id}
                  className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between md:flex-row md:items-center gap-4 transition-all duration-150 ${
                    v.isActive
                      ? "border-emerald-200 bg-emerald-50/10 dark:border-emerald-950 dark:bg-emerald-950/5"
                      : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 opacity-60"
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-0.5 text-xs font-mono font-bold tracking-wider">
                        {v.code}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase shrink-0 ${
                          v.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {v.isActive ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                        <span>{v.isActive ? "Active" : "Disabled"}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="flex items-center gap-1 font-semibold text-neutral-900 dark:text-neutral-200">
                        {v.discountType === "PERCENTAGE" ? (
                          <>
                            <Percent className="h-3.5 w-3.5 text-primary-500" /> {v.discountValue}% Off
                          </>
                        ) : (
                          <>
                            <DollarSign className="h-3.5 w-3.5 text-primary-500" /> RM {(v.discountValue / 100).toFixed(2)} Off
                          </>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-neutral-400" /> Used: {v.currentUses}
                        {v.maxUses !== null ? ` / ${v.maxUses}` : " (Unlimited)"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-neutral-400" /> Ends: {new Date(v.validUntil).toLocaleDateString("en-MY", { dateStyle: "short" })}
                      </span>
                    </div>
                  </div>

                  {v.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => deactivateMutation.mutate({ voucherId: v.id, eventId })}
                      className="border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 dark:border-rose-900/50 dark:hover:bg-rose-950/20"
                    >
                      Deactivate
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Create Voucher Form */}
        <div>
          <Card className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">Create Promo Code</CardTitle>
              <CardDescription className="text-xs text-neutral-400">Configure discount rules and usage conditions.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="code">Promo Code</Label>
                  <Input id="code" placeholder="EARLYBIRD10" className="font-mono uppercase" {...register("code")} disabled={loading} />
                  {errors.code && <p className="text-xs font-semibold text-error-600">{errors.code.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="discountType">Type</Label>
                    <select
                      id="discountType"
                      {...register("discountType")}
                      disabled={loading}
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 text-sm outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed (RM)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="discountValue">Value</Label>
                    <Input id="discountValue" type="number" {...register("discountValue", { valueAsNumber: true })} disabled={loading} />
                    {errors.discountValue && <p className="text-xs font-semibold text-error-600">{errors.discountValue.message}</p>}
                  </div>
                </div>

                <p className="text-[10px] text-neutral-400">
                  Note: For Fixed (RM), enter value in sen (e.g. 500 = RM 5.00). For Percentage, enter value as digit (e.g. 15 = 15%).
                </p>

                <div className="space-y-1">
                  <Label htmlFor="maxUses">Max Redemptions (Optional)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    placeholder="Unlimited"
                    {...register("maxUses", {
                      setValueAs: (v) => (v === "" || v === undefined ? null : Number(v)),
                    })}
                    disabled={loading}
                  />
                  {errors.maxUses && <p className="text-xs font-semibold text-error-600">{errors.maxUses.message}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="validFrom">Valid From</Label>
                  <Input id="validFrom" type="datetime-local" {...register("validFrom")} disabled={loading} />
                  {errors.validFrom && <p className="text-xs font-semibold text-error-600">{errors.validFrom.message}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input id="validUntil" type="datetime-local" {...register("validUntil")} disabled={loading} />
                  {errors.validUntil && <p className="text-xs font-semibold text-error-600">{errors.validUntil.message}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="applicationPolicy">Application Policy</Label>
                  <select
                    id="applicationPolicy"
                    {...register("applicationPolicy")}
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 text-sm outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="PER_ORDER">Apply once per checkout order</option>
                    <option value="PER_PARTICIPANT">Apply per ticket/participant in order</option>
                  </select>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 rounded-xl shadow-xs mt-2">
                  {createMutation.isPending ? "Generating..." : "Generate Promo Code"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EventVouchersPage(props: { params: Promise<{ id: string }> }) {
  return (
    <ErrorBoundary>
      <EventVouchersPageContent {...props} />
    </ErrorBoundary>
  );
}
