"use client";

export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-neutral-900">
          <div className="max-w-md text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">NexRun</p>
            <h1 className="mt-3 text-3xl font-black">Something went wrong</h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">We could not load this page. Your submitted data has not been intentionally changed.</p>
            <button onClick={() => unstable_retry()} className="mt-6 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600">Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
