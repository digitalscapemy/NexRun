"use client";

import { useEffect } from "react";

export default function DashboardError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center text-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-error-600">Unable to load workspace</p>
        <h1 className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-50">Please try this page again</h1>
        <p className="mt-2 text-sm text-neutral-500">If the issue continues, return to the dashboard and retry your last action.</p>
        <button onClick={() => unstable_retry()} className="mt-5 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600">Try again</button>
      </div>
    </div>
  );
}
