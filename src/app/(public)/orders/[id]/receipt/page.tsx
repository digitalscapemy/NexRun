"use client";

import React, { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Calendar, MapPin, ShieldAlert, Award } from "lucide-react";
import { QrCodeImage } from "@/components/public/qr-code-image";

export default function OrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: order, isLoading, error } = trpc.registration.getOrderDetails.useQuery({
    orderId: resolvedParams.id,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="fluid-container py-12">
        <div className="mx-auto max-w-4xl animate-pulse space-y-8">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
          <div className="h-64 w-full bg-neutral-200 dark:bg-neutral-800 rounded-md" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="fluid-container py-24">
        <div className="mx-auto max-w-md text-center">
          <ShieldAlert className="h-12 w-12 text-error-500 mx-auto" />
          <h2 className="mt-4 text-xl font-bold">Order Not Found</h2>
          <p className="mt-2 text-sm text-neutral-500">The requested invoice receipt does not exist.</p>
          <Link href="/" className="mt-6 inline-block text-primary-500 font-semibold hover:underline">
            &larr; Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fluid-container py-8 sm:py-12 print:p-0">
      <div className="mx-auto max-w-4xl space-y-8 print:py-0 print:px-0">
        {/* Action Header bar (hidden on print) */}
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold">Race Invoice &amp; Receipt</h1>
            <p className="text-sm text-neutral-500">View and print your ticket vouchers below.</p>
          </div>
          <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-primary-500 hover:bg-primary-600 text-white gap-2">
            <Printer className="h-4 w-4" />
            <span>Print Receipt</span>
          </Button>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>

      {/* 1. Official Invoice Bill details */}
      <Card className="p-8 border border-neutral-200 bg-white shadow-xs rounded-2xl print:border-none print:shadow-none">
        <div className="flex flex-col sm:flex-row justify-between gap-6 border-b pb-6">
          <div>
            <h2 className="text-xl font-extrabold text-primary-500">NexRun Receipt</h2>
            <p className="text-xs text-neutral-400 mt-1">Platform Order Reference</p>
            <p className="font-bold text-sm text-neutral-800 mt-2">{order.orderNumber}</p>
          </div>
          <div className="sm:text-right text-xs space-y-1">
            <p className="font-bold text-sm uppercase text-success-600">Payment Status: {order.status}</p>
            <p>Invoice No: {order.invoiceNumber}</p>
            {order.paidAt && (
              <p>
                Paid Date:{" "}
                {new Date(order.paidAt).toLocaleDateString("en-MY", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {order.paymentTransactions[0]?.transactionId && (
              <p>Transaction ID: {order.paymentTransactions[0].transactionId}</p>
            )}
          </div>
        </div>

        {/* Event Meta details */}
        <div className="py-6 border-b text-sm grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs text-neutral-400 uppercase tracking-wider block font-semibold">Event Description</span>
            <p className="font-bold text-base text-neutral-900">{order.event.title}</p>
            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(order.event.eventDate).toLocaleDateString("en-MY", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </p>
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {order.event.venue}, {order.event.state}
              </span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-neutral-400 uppercase tracking-wider block font-semibold">REPC Schedule</span>
            <p className="font-semibold text-neutral-800">{order.event.repcLocation}</p>
            <p className="text-xs text-neutral-500">{order.event.repcDate}</p>
            <p className="text-xs text-neutral-500">{order.event.repcTime}</p>
          </div>
        </div>

        {/* Pricing calculations */}
        <div className="pt-6 text-sm">
          <h3 className="font-bold text-neutral-800 mb-3">Billing Calculations</h3>
          <div className="space-y-2 max-w-md ml-auto">
            <div className="flex justify-between">
              <span className="text-neutral-500">Ticket Subtotal:</span>
              <span>{formatCurrency(order.subtotalSen)}</span>
            </div>
            {order.discountSen > 0 && (
              <div className="flex justify-between text-success-600">
                <span>Voucher Code Discount ({order.voucherCode}):</span>
                <span>-{formatCurrency(order.discountSen)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-500">Payment service fee ({order.feeSnapshot?.processingFeePercentage ?? 3}%):</span>
              <span>{formatCurrency(order.processingFeeSen)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 font-extrabold text-base">
              <span className="text-neutral-950">Total Paid Amount:</span>
              <span className="text-primary-500">{formatCurrency(order.totalPaidSen)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Registration tickets */}
      <div className="space-y-6 break-before-page">
        <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2 print:hidden">
          <Award className="h-5 w-5 text-primary-500" />
          <span>Race Registration Vouchers</span>
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {order.registrations.map((reg) => (
            <Card key={reg.id} className="p-6 border border-neutral-200 bg-white relative rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between min-h-[220px] print:break-inside-avoid">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-600 uppercase tracking-wider">
                    {reg.ticketCategory.name} ({reg.ticketCategory.distance}KM)
                  </span>
                  <h3 className="mt-3 font-black text-neutral-950 text-base">{reg.participantProfile.fullName}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Identity: ****{reg.participantProfile.icNumber.slice(-4)}</p>
                  <p className="text-xs text-neutral-400">T-Shirt Size: {reg.participantProfile.tshirtSize} ({reg.participantProfile.tshirtType})</p>
                </div>

                <div className="text-center shrink-0">
                  <Link
                    href={`/verify/registration/${reg.registrationCode}`}
                    className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-1 text-[9px] font-bold uppercase tracking-wide text-neutral-500 transition hover:border-primary-300 hover:text-primary-600 print:border-neutral-300"
                  >
                    <QrCodeImage value={reg.qrCodeData || `${process.env.NEXT_PUBLIC_APP_URL || ""}/verify/registration/${reg.registrationCode}`} size={104} />
                    <span className="pb-1">Verify ticket</span>
                  </Link>
                </div>
              </div>

              <div className="mt-6 border-t pt-4 flex justify-between items-end text-xs">
                <div>
                  <span className="text-[9px] text-neutral-400 uppercase tracking-wider block font-semibold">Registration Code</span>
                  <span className="font-mono font-bold text-neutral-800">{reg.registrationCode}</span>
                </div>
                <span className="text-[10px] font-black text-success-600 uppercase bg-success-50/50 px-2 py-0.5 rounded border border-success-100">
                  ACTIVE TICKET
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
