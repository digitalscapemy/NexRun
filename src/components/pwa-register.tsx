"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

// Extend Window type for beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const reloadRequested = useRef(false);

  useEffect(() => {
    // Never let a service worker control Next.js development chunks. Turbopack
    // reuses chunk URLs while their contents change, so cache-first behavior
    // can otherwise leave event handlers stale in localhost.
    const cleanDevelopmentWorker = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) =>
            [registration.active, registration.waiting, registration.installing].some((worker) =>
              worker?.scriptURL.endsWith("/sw.js")
            )
          )
          .map((registration) => registration.unregister())
      );
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("nexrun-")).map((key) => caches.delete(key)));
    };

    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV !== "production") {
        void cleanDevelopmentWorker().catch((err) => console.warn("Development SW cleanup failed:", err));
      } else {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/", updateViaCache: "none" })
          .then((registration) => {
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (!newWorker) return;
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
              });
            });
          })
          .catch((err) => console.error("SW registration failed:", err));
      }
    }

    // Capture install prompt event
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Show banner only if not dismissed in this session
      const dismissed = sessionStorage.getItem("pwa-install-dismissed");
      if (!dismissed) setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setShowBanner(false);
  };

  const handleReload = () => {
    if (reloadRequested.current) return;
    reloadRequested.current = true;
    const reload = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
    navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
    window.setTimeout(reload, 1500);
  };

  if (updateReady) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 right-3 z-50 flex flex-col items-stretch gap-3 rounded-xl border border-primary-400/40 bg-neutral-900 px-4 py-3 text-sm text-white shadow-2xl sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:flex-row sm:items-center"
      >
        <span className="font-semibold">A new version is available.</span>
        <button
          type="button"
          onClick={handleReload}
          className="min-h-11 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600"
        >
          Reload
        </button>
      </div>
    );
  }

  if (!showBanner || !installPrompt) return null;

  return (
    <div
      role="region"
      aria-label="Install NexRun app"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 right-3 z-50 flex items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-4 shadow-2xl sm:left-auto sm:right-4 sm:w-80"
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/nexrun-pwa-192.png"
          width={36}
          height={36}
          alt=""
          aria-hidden="true"
          className="size-9 shrink-0 rounded-lg"
        />
        <div>
          <p className="text-sm font-bold text-white">Install NexRun</p>
          <p className="text-[11px] text-neutral-400">Add to home screen for offline access</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="min-h-11 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="flex size-11 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
