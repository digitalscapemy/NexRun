// Auth route group layout — centered card layout for login/register
import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="flex min-h-dvh items-start justify-center overflow-y-auto bg-neutral-50 p-4 py-6 dark:bg-neutral-950 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-md dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
        <Link href="/" aria-label="NexRun home" className="mx-auto mb-7 flex w-fit justify-center">
          <BrandLogo variant="lockup" priority alt="" className="w-40 sm:w-44" />
        </Link>
        {children}
      </div>
    </main>
  );
}
