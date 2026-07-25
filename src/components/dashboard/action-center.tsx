"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, FileEdit, CheckCircle2, DollarSign, ArrowRight } from "lucide-react";

interface ActionItem {
  awaitingActivationFee: number;
  needsChanges: number;
  pendingApproval: number;
  readyForSettlement: number;
  closingSoon: Array<{ eventId: string; title: string; closeDate: string; daysLeft: number }>;
}

interface ActionCenterProps {
  actionItems: ActionItem;
  memberRole: string;
}

export function ActionCenter({ actionItems, memberRole }: ActionCenterProps) {
  const alerts: Array<{
    type: "action" | "info";
    icon: React.ReactNode;
    message: string;
    href?: string;
    cta?: string;
  }> = [];

  // Activation fee
  if (actionItems.awaitingActivationFee > 0 && ["OWNER", "MANAGER", "FINANCE"].includes(memberRole)) {
    alerts.push({
      type: "action",
      icon: <DollarSign className="h-5 w-5" />,
      message: `${actionItems.awaitingActivationFee} event${actionItems.awaitingActivationFee > 1 ? "s" : ""} menunggu bayaran activation`,
      href: "/dashboard/event-fees",
      cta: "Bayar Sekarang",
    });
  }

  // Needs changes
  if (actionItems.needsChanges > 0 && ["OWNER", "MANAGER"].includes(memberRole)) {
    alerts.push({
      type: "action",
      icon: <FileEdit className="h-5 w-5" />,
      message: `${actionItems.needsChanges} event${actionItems.needsChanges > 1 ? "s" : ""} perlu pembetulan`,
      href: "/dashboard/events",
      cta: "Semak Event",
    });
  }

  // Pending approval
  if (actionItems.pendingApproval > 0 && ["OWNER", "MANAGER"].includes(memberRole)) {
    alerts.push({
      type: "info",
      icon: <Clock className="h-5 w-5" />,
      message: `${actionItems.pendingApproval} event${actionItems.pendingApproval > 1 ? "s" : ""} dalam semakan admin`,
    });
  }

  // Settlement ready
  if (actionItems.readyForSettlement > 0 && ["OWNER", "MANAGER", "FINANCE"].includes(memberRole)) {
    alerts.push({
      type: "action",
      icon: <CheckCircle2 className="h-5 w-5" />,
      message: `${actionItems.readyForSettlement} event${actionItems.readyForSettlement > 1 ? "s" : ""} sedia untuk settlement`,
      href: "/dashboard/settlements",
      cta: "Lihat Settlement",
    });
  }

  // Closing soon
  actionItems.closingSoon.forEach((event) => {
    if (["OWNER", "MANAGER", "OPERATIONS"].includes(memberRole)) {
      alerts.push({
        type: "action",
        icon: <AlertCircle className="h-5 w-5" />,
        message: `${event.title} tutup pendaftaran dalam ${event.daysLeft} hari`,
        href: `/dashboard/events/${event.eventId}`,
        cta: "Lihat Event",
      });
    }
  });

  // Hide Zone 1 if no action items
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <Card
          key={index}
          className={`border-2 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            alert.type === "action"
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-blue-500/40 bg-blue-500/10"
          }`}
        >
          <div className="flex items-start gap-3 flex-1">
            <div
              className={`shrink-0 ${
                alert.type === "action"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {alert.icon}
            </div>
            <div>
              <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                {alert.message}
              </p>
            </div>
          </div>
          {alert.href && alert.cta && (
            <Link href={alert.href}>
              <Button
                size="sm"
                className={`font-bold rounded-xl shrink-0 ${
                  alert.type === "action"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {alert.cta} <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          )}
        </Card>
      ))}
    </div>
  );
}
