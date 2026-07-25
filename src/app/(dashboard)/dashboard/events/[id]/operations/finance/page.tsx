"use client";

import React, { use } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, Percent, ShieldAlert } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton, DashboardStatSkeleton } from "@/components/ui/skeleton";

export default function FinancialReportsPage(props: { params: Promise<{ id: string }> }) {
  return (
    <ErrorBoundary>
      <FinancialReportsPageInner {...props} />
    </ErrorBoundary>
  );
}

function FinancialReportsPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  // Financial summary query
  const { data: summary, isLoading, error } =
    trpc.operational.getEventFinancialSummary.useQuery({
      eventId: resolvedParams.id,
    });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <DashboardStatSkeleton />
          <DashboardStatSkeleton />
          <DashboardStatSkeleton />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <ShieldAlert className="h-12 w-12 text-error-500 mx-auto" />
        <h2 className="mt-4 text-xl font-bold">Financials Error</h2>
        <p className="mt-2 text-sm text-neutral-500">Failed to aggregate event financial transaction data.</p>
      </div>
    );
  }

  const { aggregates, categoriesBreakdown, tshirtBreakdown, ordersCount } = summary;

  return (
    <div className="space-y-8">
      {/* 1. Aggregated KPI metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Revenue */}
        <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Gross Revenue</span>
              <span className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50 mt-1 block">
                {formatCurrency(aggregates.ticketSubtotalSen)}
              </span>
            </div>
            <TrendingUp className="h-5 w-5 text-success-500" />
          </div>
          <span className="text-[10px] text-neutral-400 mt-2 block">Total from {ordersCount} order payments</span>
        </Card>

        {/* Voucher Discounts */}
        <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Discounts Used</span>
              <span className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50 mt-1 block">
                -{formatCurrency(aggregates.discountSen)}
              </span>
            </div>
            <Percent className="h-5 w-5 text-warning-500" />
          </div>
          <span className="text-[10px] text-neutral-400 mt-2 block">Promo code voucher deductions</span>
        </Card>

        {/* Platform Fees */}
        <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Platform Commission</span>
              <span className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50 mt-1 block">
                {formatCurrency(aggregates.adminFeeSen)}
              </span>
            </div>
            <DollarSign className="h-5 w-5 text-primary-500" />
          </div>
          <span className="text-[10px] text-neutral-400 mt-2 block">3% NexRun platform fee</span>
        </Card>

        {/* Payment Processing Fees */}
        <Card className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Payment Gateway Fee</span>
              <span className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50 mt-1 block">
                {formatCurrency(aggregates.processingFeeSen)}
              </span>
            </div>
            <Percent className="h-5 w-5 text-amber-500" />
          </div>
          <span className="text-[10px] text-neutral-400 mt-2 block">3% payment processing fee</span>
        </Card>

        {/* Organizer Net Payout */}
        <Card className="p-5 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 rounded-2xl shadow-sm bg-primary-50/10">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-primary-600 font-bold uppercase tracking-wider block">Organizer Payout</span>
              <span className="text-xl font-black text-primary-500 mt-1 block">
                {formatCurrency(aggregates.organizerNetSen)}
              </span>
            </div>
            <DollarSign className="h-5 w-5 text-primary-500" />
          </div>
          <span className="text-[10px] text-neutral-400 mt-2 block">Net payable settlement amount</span>
        </Card>
      </div>

      {/* Revenue Breakdown Visualization */}
      <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Revenue Breakdown</h3>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Gross Revenue</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-50">{formatCurrency(aggregates.ticketSubtotalSen)}</span>
            </div>
            <div className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden flex">
              <div
                className="bg-primary-500 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ width: `${(aggregates.organizerNetSen / aggregates.ticketSubtotalSen) * 100}%` }}
                title={`Organizer Net: ${formatCurrency(aggregates.organizerNetSen)}`}
              >
                {aggregates.ticketSubtotalSen > 0 && ((aggregates.organizerNetSen / aggregates.ticketSubtotalSen) * 100).toFixed(0)}%
              </div>
              <div
                className="bg-amber-400 flex items-center justify-center text-[10px] font-bold text-neutral-900"
                style={{ width: `${(aggregates.adminFeeSen / aggregates.ticketSubtotalSen) * 100}%` }}
                title={`Platform Fee: ${formatCurrency(aggregates.adminFeeSen)}`}
              >
                {aggregates.ticketSubtotalSen > 0 && ((aggregates.adminFeeSen / aggregates.ticketSubtotalSen) * 100).toFixed(0)}%
              </div>
              <div
                className="bg-orange-400 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ width: `${(aggregates.processingFeeSen / aggregates.ticketSubtotalSen) * 100}%` }}
                title={`Payment Fee: ${formatCurrency(aggregates.processingFeeSen)}`}
              >
                {aggregates.ticketSubtotalSen > 0 && ((aggregates.processingFeeSen / aggregates.ticketSubtotalSen) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs pt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary-500"></div>
              <span className="text-neutral-600 dark:text-neutral-400">Organizer Net ({formatCurrency(aggregates.organizerNetSen)})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-400"></div>
              <span className="text-neutral-600 dark:text-neutral-400">Platform Fee ({formatCurrency(aggregates.adminFeeSen)})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-400"></div>
              <span className="text-neutral-600 dark:text-neutral-400">Payment Fee ({formatCurrency(aggregates.processingFeeSen)})</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Category-wise Breakdown Table & Swag Size Requirements */}
      <div className="grid gap-8 md:grid-cols-3">
        {/* Category Table */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            <span>Category Performance Breakdown</span>
          </h3>

          <div role="region" aria-label="Sales by category, scroll horizontally for all columns" tabIndex={0} className="dashboard-scroll-region rounded-2xl border border-neutral-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-neutral-800 dark:bg-neutral-900">
            <table className="min-w-[36rem] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-bold uppercase text-neutral-500">
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-4 py-4 text-center">Registrations</th>
                  <th className="px-4 py-4 text-right">Unit Price</th>
                  <th className="px-6 py-4 text-right">Revenue (Sen)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {categoriesBreakdown.map((cat) => (
                  <tr key={cat.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-neutral-50">{cat.name}</td>
                    <td className="px-4 py-4 text-center font-semibold">{cat.registrationsCount}</td>
                    <td className="px-4 py-4 text-right">{formatCurrency(cat.priceSen)}</td>
                    <td className="px-6 py-4 text-right font-bold text-primary-500">
                      {formatCurrency(cat.revenueSen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* T-Shirt Size counts */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            <span>T-Shirt Size Allocations</span>
          </h3>

          <div role="region" aria-label="Payment breakdown, scroll horizontally for all columns" tabIndex={0} className="dashboard-scroll-region rounded-2xl border border-neutral-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-neutral-800 dark:bg-neutral-900">
            <table className="min-w-[32rem] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-bold uppercase text-neutral-500">
                  <th className="px-6 py-4">Size Name</th>
                  <th className="px-6 py-4 text-right">Total Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {tshirtBreakdown.map((item) => (
                  <tr key={item.size} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4 font-bold text-neutral-800">{item.size}</td>
                    <td className="px-6 py-4 text-right font-semibold">{item.count} runner(s)</td>
                  </tr>
                ))}
                {tshirtBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-neutral-500">
                      No t-shirt allocations ordered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
