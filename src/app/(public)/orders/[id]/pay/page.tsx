"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditCard, Clock3, CircleAlert, ShieldCheck, XCircle } from "lucide-react";
import toast from "react-hot-toast";

type PaymentMethod = "ONLINE_BANKING" | "EWALLET" | "CARD";

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function ResumeCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = use(params);
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = trpc.registration.getCheckoutOrder.useQuery({ orderId }, { retry: false });

  useEffect(() => {
    if (!order?.expiresAt) return;
    const update = () => {
      setRemainingSeconds(Math.max(0, Math.floor((new Date(order.expiresAt!).getTime() - Date.now()) / 1000)));
    };
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [order?.expiresAt]);

  const paymentMutation = trpc.registration.processMockPayment.useMutation({
    onSuccess: async (result) => {
      if (result.status === "PAID") {
        toast.success("Payment confirmed. Your registrations are ready.");
        router.replace(`/orders/${encodeURIComponent(result.orderId)}/receipt`);
        return;
      }
      toast(result.message);
      await refetch();
    },
    onError: (err) => toast.error(err.message || "Payment could not be completed."),
  });

  const cancelMutation = trpc.registration.cancelCheckoutOrder.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.status === "EXPIRED"
          ? "The reservation had expired and its slots were released."
          : "Checkout cancelled and reserved slots released."
      );
      router.replace("/dashboard/registrations");
    },
    onError: (err) => toast.error(err.message || "Unable to cancel this checkout."),
  });

  if (isLoading) {
    return <div className="fluid-container py-16"><div className="mx-auto h-80 max-w-xl animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" /></div>;
  }

  if (error || !order) {
    return (
      <div className="fluid-container py-20">
        <Card className="mx-auto max-w-md p-8 text-center">
          <CircleAlert className="mx-auto h-11 w-11 text-error-500" />
          <h1 className="mt-4 text-xl font-bold">Checkout unavailable</h1>
          <p className="mt-2 text-sm text-neutral-500">Sign in with the account that created this order, or start a new registration.</p>
          <Link href="/events" className="mt-6 inline-block text-sm font-bold text-primary-600 hover:underline">Browse events</Link>
        </Card>
      </div>
    );
  }

  const canResume = ["PENDING", "PROCESSING", "FAILED"].includes(order.status) && remainingSeconds > 0;
  const latestAttempt = order.paymentTransactions[0];
  const selectedPaymentMethod = paymentMethod ?? latestAttempt?.paymentMethod ?? "ONLINE_BANKING";

  return (
    <div className="fluid-container py-10 sm:py-14">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center">
          <CreditCard className="mx-auto h-10 w-10 text-primary-500" />
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">Complete your registration</h1>
          <p className="mt-2 text-sm text-neutral-500">Your checkout is saved securely. Continue before the reservation expires.</p>
        </div>

        <Card className="overflow-hidden rounded-2xl border-neutral-200 shadow-sm dark:border-neutral-800">
          <div className="border-b border-neutral-100 bg-neutral-50/70 p-5 dark:border-neutral-800 dark:bg-neutral-900/60">
            <h2 className="font-bold text-neutral-900 dark:text-neutral-50">{order.event.title}</h2>
            <p className="mt-1 text-xs text-neutral-500">Order {order.orderNumber} &middot; {order._count.items} participant{order._count.items === 1 ? "" : "s"}</p>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60">
                <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Amount due</p>
                <p className="mt-1 text-lg font-black text-primary-600 dark:text-primary-400">{formatCurrency(order.totalPaidSen)}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60">
                <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Reservation</p>
                <p className={`mt-1 inline-flex items-center gap-1 text-lg font-black ${remainingSeconds <= 60 ? "text-error-600" : "text-neutral-900 dark:text-neutral-50"}`}>
                  <Clock3 className="h-4 w-4" /> {formatTime(remainingSeconds)}
                </p>
              </div>
            </div>

            {latestAttempt?.failureReason && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
                {latestAttempt.failureReason}
              </div>
            )}

            {order.status === "PAID" ? (
              <div className="space-y-4 text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-success-500" />
                <p className="font-bold text-success-700 dark:text-success-300">Payment is already confirmed.</p>
                <Button asChild className="w-full bg-primary-500 font-bold text-white hover:bg-primary-600">
                  <Link href={`/orders/${encodeURIComponent(order.id)}/receipt`}>View receipt and tickets</Link>
                </Button>
              </div>
            ) : canResume ? (
              <>
                <div className="space-y-2" role="radiogroup" aria-label="Payment method">
                  {[
                    ["ONLINE_BANKING", "Online banking", "Continue securely through your bank."],
                    ["EWALLET", "E-wallet", "Continue with your preferred wallet."],
                    ["CARD", "Debit or credit card", "Continue with the payment provider."],
                  ].map(([value, label, detail]) => (
                    <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${selectedPaymentMethod === value ? "border-primary-500 bg-primary-50/70 dark:bg-primary-950/25" : "border-neutral-200 dark:border-neutral-800"}`}>
                      <input type="radio" name="payment-method" value={value} checked={selectedPaymentMethod === value} onChange={() => setPaymentMethod(value as PaymentMethod)} className="h-4 w-4 text-primary-500 focus:ring-primary-500" />
                      <span><span className="block font-semibold text-neutral-900 dark:text-neutral-100">{label}</span><span className="block text-xs text-neutral-500">{detail}</span></span>
                    </label>
                  ))}
                </div>
                <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50">
                  Payment details are handled by the payment provider. You may safely return to this page while your reservation remains active.
                </div>
                <Button
                  onClick={() => paymentMutation.mutate({ orderId: order.id, paymentMethod: selectedPaymentMethod, scenario: "SUCCESS", idempotencyKey: `payment:${order.id}:success` })}
                  disabled={paymentMutation.isPending}
                  className="w-full bg-primary-500 py-3 font-bold text-white hover:bg-primary-600"
                >
                  {paymentMutation.isPending ? "Confirming payment…" : `Pay ${formatCurrency(order.totalPaidSen)}`}
                </Button>
                <Button variant="ghost" onClick={() => { if (window.confirm("Cancel this checkout and release the reserved slots?")) cancelMutation.mutate({ orderId: order.id }); }} disabled={cancelMutation.isPending} className="w-full text-neutral-500 hover:text-error-600">
                  <XCircle className="mr-1.5 h-4 w-4" /> Cancel checkout
                </Button>
              </>
            ) : (
              <div className="space-y-4 text-center">
                <CircleAlert className="mx-auto h-11 w-11 text-amber-500" />
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">This checkout is no longer active.</p>
                <p className="text-xs text-neutral-500">Start a new registration to see current ticket availability and pricing.</p>
                <Button asChild className="w-full bg-primary-500 font-bold text-white hover:bg-primary-600"><Link href={`/events/${order.event.slug}/register`}>Start new registration</Link></Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
