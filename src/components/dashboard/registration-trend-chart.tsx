"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TrendData {
  date: string;
  count?: number;
  netSen?: number;
}

interface RegistrationTrendChartProps {
  trend: TrendData[];
  isRevenue?: boolean;
}

export function RegistrationTrendChart({ trend, isRevenue = false }: RegistrationTrendChartProps) {
  if (trend.length === 0) {
    return (
      <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900 shadow-sm">
        <h3 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base mb-4">
          {isRevenue ? "Trend Pendapatan" : "Trend Pendaftaran"} (30 Hari)
        </h3>
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-neutral-500 mb-3">
            Tiada data untuk dipaparkan
          </p>
          <p className="text-xs text-neutral-400 max-w-xs">
            {isRevenue
              ? "Tiada pendapatan dalam 30 hari terakhir"
              : "Kongsi pautan event untuk mula terima pendaftaran"}
          </p>
        </div>
      </Card>
    );
  }

  // Format data for chart
  const chartData = trend.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-MY", { day: "numeric", month: "short" }),
    value: isRevenue ? (item.netSen ?? 0) / 100 : (item.count ?? 0),
    fullDate: new Date(item.date).toLocaleDateString("en-MY", { dateStyle: "full" }),
  }));

  const hasData = chartData.some((d) => d.value > 0);

  return (
    <Card className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 bg-white dark:bg-neutral-900 shadow-sm">
      <h3 className="font-extrabold text-neutral-900 dark:text-neutral-100 text-base mb-4">
        {isRevenue ? "Trend Pendapatan" : "Trend Pendaftaran"} (30 Hari)
      </h3>
      {!hasData ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-neutral-400 italic">
            {isRevenue
              ? "Tiada pendapatan dalam tempoh ini"
              : "Tiada pendaftaran dalam tempoh ini"}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isRevenue ? "#f59e0b" : "#10b981"} stopOpacity={0.8} />
                <stop offset="95%" stopColor={isRevenue ? "#f59e0b" : "#10b981"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#9ca3af"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value) => {
                const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                return isRevenue ? `RM ${numericValue.toFixed(2)}` : `${numericValue} pendaftaran`;
              }}
              labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isRevenue ? "#f59e0b" : "#10b981"}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
