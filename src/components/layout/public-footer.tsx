import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-neutral-200 bg-white py-8 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="fluid-container flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-sm text-neutral-500">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Link href="/" aria-label="NexRun home" className="inline-flex">
            <BrandLogo variant="wordmark" alt="" className="w-28" />
          </Link>
          <span>&copy; {currentYear}. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <Link href="/become-organizer" className="hover:text-primary-500 transition">
            Become an Organizer
          </Link>
          <Link href="/terms" className="hover:text-primary-500 transition">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-primary-500 transition">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
export default PublicFooter;
