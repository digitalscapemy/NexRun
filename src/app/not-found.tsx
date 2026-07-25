import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-600">404</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">The page may have moved, or you may not have access to it.</p>
        <Link href="/events" className="mt-6 inline-flex rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-600">Return to events</Link>
      </div>
    </main>
  );
}
