"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { playCheckInSound } from "@/lib/checkin-sound";

type CheckInFeedbackProps = {
  status: "success" | "already" | "error";
  participant?: {
    fullName: string;
    registrationCode: string;
    categoryName: string;
    distance: number;
    tshirtSize: string;
    tshirtType: string;
  };
  message?: string;
  soundEnabled: boolean;
  onDismiss: () => void;
};

const STATUS_CONFIG = {
  success: {
    bg: "bg-success-500",
    icon: CheckCircle2,
    label: "Check-in approved",
    vibration: [100],
  },
  already: {
    bg: "bg-warning-500",
    icon: AlertTriangle,
    label: "Already checked in",
    vibration: [80, 60, 80],
  },
  error: {
    bg: "bg-error-500",
    icon: XCircle,
    label: "Check-in failed",
    vibration: [200],
  },
} as const;

export function CheckInFeedbackOverlay({
  status,
  participant,
  message,
  soundEnabled,
  onDismiss,
}: CheckInFeedbackProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  useEffect(() => {
    // Play sound
    if (soundEnabled) {
      playCheckInSound(status);
    }

    // Vibrate
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(config.vibration);
    }

    // Auto-dismiss after 2.5s
    const timer = setTimeout(() => {
      onDismiss();
    }, 2500);

    return () => clearTimeout(timer);
  }, [status, soundEnabled, onDismiss, config.vibration]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${config.bg} text-white`}
      onClick={onDismiss}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <Icon className="h-24 w-24 lg:h-32 lg:w-32" strokeWidth={2} />

        <div className="space-y-2">
          <p className="text-sm font-black uppercase tracking-wider opacity-90 lg:text-base">
            {config.label}
          </p>

          {participant && (
            <>
              <h2 className="text-3xl font-black lg:text-5xl">
                {participant.fullName}
              </h2>
              <p className="text-base font-semibold opacity-90 lg:text-lg">
                {participant.registrationCode} · {participant.categoryName} ({participant.distance}KM)
              </p>
              <p className="text-sm opacity-80 lg:text-base">
                {participant.tshirtSize} {participant.tshirtType}
              </p>
            </>
          )}

          {status === "error" && message && (
            <p className="mt-4 text-base font-semibold lg:text-lg">{message}</p>
          )}
        </div>

        <p className="text-xs opacity-75 lg:text-sm">Tap to dismiss</p>
      </div>
    </div>
  );
}
