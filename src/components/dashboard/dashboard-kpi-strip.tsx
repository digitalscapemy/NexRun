"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Users, DollarSign, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiData {
  activeEvents: number;
  totalRegistrations: number;
  registrationsDelta: number;
  organizerNetSen: number;
  grossPaidSen: number;
  revenueDeltaSen: number;
  avgFillRatePercent: number | null;
}

interface DashboardKpiStripProps {
  kpi: KpiData;
  memberRole: string;
  hasFinancialAccess: boolean;
}

export function DashboardKpiStrip({ kpi, memberRole, hasFinancialAccess }: DashboardKpiStripProps) {
  const renderDelta = (delta: number, label: string) => {
    if (delta === 0) {
      return (
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <Minus className="h-3 w-3" />
          <span>Tiada perubahan</span>
        </div>
      );
    }
    const isPositive = delta > 0;
    return (
      <div className={`flex items-center gap-1 text-xs ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span>
          {isPositive ? "+" : ""}{delta} {label}
        </span>
      </div>
    );
  };

  const cards = [];

  // Events Active (all roles)
  if (memberRole !== "CHECKIN_STAFF") {
    cards.push(
      <Card
        key="events"
        className="border border-orange-200 dark:border-orange-900/50 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            Events Aktif
          </span>
          <Calendar className="h-5 w-5 text-orange-500" />
        </div>
        <p className="text-3xl font-black text-neutral-900 dark:text-neutral-50">
          {kpi.activeEvents}
        </p>
        <p className="mt-1 text-xs text-neutral-500">Event yang published</p>
      </Card>
    );
  }

  // Registrations (OWNER/MANAGER/OPERATIONS)
  if (["OWNER", "MANAGER", "OPERATIONS", "PLATFORM_ADMIN"].includes(memberRole)) {
    cards.push(
      <Card
        key="registrations"
        className="border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Registrations
          </span>
          <Users className="h-5 w-5 text-emerald-500" />
        </div>
        <p className="text-3xl font-black text-neutral-900 dark:text-neutral-50">
          {kpi.totalRegistrations}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-neutral-500">Pelari aktif</p>
          {renderDelta(kpi.registrationsDelta, "dalam 30h")}
        </div>
      </Card>
    );
  }

  // Revenue (OWNER/MANAGER/FINANCE)
  if (hasFinancialAccess) {
    cards.push(
      <Card
        key="revenue"
        className="border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Pendapatan Bersih Anda
          </span>
          <DollarSign className="h-5 w-5 text-amber-500" />
        </div>
        <p className="text-2xl font-black text-neutral-900 dark:text-neutral-50">
          {formatCurrency(kpi.organizerNetSen)}
        </p>
        <div className="mt-1">
          <p className="text-xs text-neutral-500">
            Gross {formatCurrency(kpi.grossPaidSen)} · Selepas yuran platform
          </p>
          {renderDelta(kpi.revenueDeltaSen, "sen dalam 30h")}
        </div>
      </Card>
    );
  }

  // Fill Rate (OWNER/MANAGER/OPERATIONS)
  if (["OWNER", "MANAGER", "OPERATIONS", "PLATFORM_ADMIN"].includes(memberRole)) {
    cards.push(
      <Card
        key="fillrate"
        className="border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Fill Rate
          </span>
          <TrendingUp className="h-5 w-5 text-blue-500" />
        </div>
        <p className="text-3xl font-black text-neutral-900 dark:text-neutral-50">
          {kpi.avgFillRatePercent !== null ? `${kpi.avgFillRatePercent}%` : "—"}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {kpi.avgFillRatePercent !== null ? "Purata slot terisi" : "Semua slot unlimited"}
        </p>
      </Card>
    );
  }

  // CHECKIN_STAFF: Only check-in rate (placeholder for now)
  if (memberRole === "CHECKIN_STAFF") {
    cards.push(
      <Card
        key="checkin"
        className="border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-neutral-900 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Check-In Rate
          </span>
          <Users className="h-5 w-5 text-purple-500" />
        </div>
        <p className="text-3xl font-black text-neutral-900 dark:text-neutral-50">
          —
        </p>
        <p className="mt-1 text-xs text-neutral-500">Sila gunakan scanner</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards}
    </div>
  );
}
