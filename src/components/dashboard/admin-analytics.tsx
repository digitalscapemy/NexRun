"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Calendar, Ticket, DollarSign } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");
  const { data, isLoading } = trpc.admin.getAnalytics.useQuery({ timeRange });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const timeRangeLabels = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    "1y": "Last Year",
    "all": "All Time",
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100">Platform Analytics</h2>
        <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1" aria-label="Analytics time range">
          {(["7d", "30d", "90d", "1y", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRange === range
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {timeRangeLabels[range]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-blue-200 dark:border-blue-900/50 bg-linear-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Total Events
            </span>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-neutral-900 dark:text-neutral-50">{data.totalEvents}</p>
          <p className="mt-1 text-xs text-neutral-500">Events created</p>
        </Card>

        <Card className="border border-purple-200 dark:border-purple-900/50 bg-linear-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Total Organizers
            </span>
            <Users className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-neutral-900 dark:text-neutral-50">{data.totalOrganizers}</p>
          <p className="mt-1 text-xs text-neutral-500">Registered organizers</p>
        </Card>

        <Card className="border border-emerald-200 dark:border-emerald-900/50 bg-linear-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Registrations
            </span>
            <Ticket className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-neutral-900 dark:text-neutral-50">{data.totalRegistrations}</p>
          <p className="mt-1 text-xs text-neutral-500">Active registrations</p>
        </Card>

        <Card className="border border-amber-200 dark:border-amber-900/50 bg-linear-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Total Revenue
            </span>
            <DollarSign className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-neutral-900 dark:text-neutral-50">
            {formatCurrency(data.totalRevenueSen)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Gross platform volume</p>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-primary-500" />
          <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100">Revenue Trend</h3>
        </div>
        {data.revenueTrend.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">No revenue data for selected period</p>
        ) : (
          <div className="h-64 min-w-0 sm:h-75">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.revenueTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(new Date(value), "MMM dd")}
                stroke="#9ca3af"
                minTickGap={24}
                style={{ fontSize: "10px" }}
              />
              <YAxis
                tickFormatter={(value) => `RM${(value / 100).toFixed(0)}`}
                stroke="#9ca3af"
                width={48}
                style={{ fontSize: "10px" }}
              />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                labelFormatter={(label) => format(new Date(label as string), "MMM dd, yyyy")}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenueSen"
                name="Revenue"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Top Events Table */}
      <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <h3 className="text-base font-extrabold text-neutral-900 dark:text-neutral-100 mb-4">Top Events by Registrations</h3>
        {data.topEvents.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">No events for selected period</p>
        ) : (
          <>
          <div data-testid="analytics-mobile-ranking" className="space-y-3 md:hidden">
            {data.topEvents.map((event, idx) => (
              <article key={event.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-sm font-black text-primary-600">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="overflow-wrap-anywhere font-bold text-neutral-900 dark:text-neutral-100">{event.title}</h4>
                    <p className="mt-1 text-xs text-neutral-500">{format(new Date(event.eventDate), "MMM dd, yyyy")}</p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800">
                  <div><dt className="text-neutral-500">Registrations</dt><dd className="mt-0.5 font-mono font-bold">{event.registrationCount}</dd></div>
                  <div className="text-right"><dt className="text-neutral-500">Revenue</dt><dd className="mt-0.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(event.revenueSen)}</dd></div>
                </dl>
                <Link href={`/events/${event.slug}`} className="mt-3 flex min-h-11 items-center justify-center rounded-lg border border-primary-200 text-xs font-bold text-primary-600 dark:border-primary-900 dark:text-primary-400">View event</Link>
              </article>
            ))}
          </div>
          <div data-testid="analytics-desktop-ranking" className="hidden overflow-x-auto overscroll-x-contain md:block" role="region" aria-label="Top events by registrations" tabIndex={0}>
            <table className="min-w-[42rem] w-full text-sm">
              <thead className="border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-neutral-600 dark:text-neutral-400">#</th>
                  <th className="text-left py-3 px-4 font-bold text-neutral-600 dark:text-neutral-400">Event Title</th>
                  <th className="text-left py-3 px-4 font-bold text-neutral-600 dark:text-neutral-400">Event Date</th>
                  <th className="text-right py-3 px-4 font-bold text-neutral-600 dark:text-neutral-400">Registrations</th>
                  <th className="text-right py-3 px-4 font-bold text-neutral-600 dark:text-neutral-400">Revenue</th>
                  <th className="text-right py-3 px-4 font-bold text-neutral-600 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {data.topEvents.map((event, idx) => (
                  <tr key={event.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="py-3 px-4 text-neutral-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100">{event.title}</td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                      {format(new Date(event.eventDate), "MMM dd, yyyy")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-900 dark:text-neutral-100">
                      {event.registrationCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(event.revenueSen)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/events/${event.slug}`}
                        className="text-xs font-bold text-primary-500 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
    </div>
  );
}
