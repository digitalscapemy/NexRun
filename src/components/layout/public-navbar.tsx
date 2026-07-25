"use client";
// Force rebuild and re-scan classes for Tailwind CSS v4 - pass 2
import React, { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LogOut, LayoutDashboard, Menu, X, Trophy } from "lucide-react";
import toast from "react-hot-toast";

export function PublicNavbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Successfully logged out.");
    } catch {
      toast.error("Failed to sign out. Please try again.");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="fluid-container flex h-16 items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" aria-label="NexRun home" className="flex min-w-0 items-center">
          <BrandLogo variant="wordmark" priority alt="" className="w-28 sm:w-32" />
        </Link>

        {/* Center Nav Links - Desktop */}
        <nav className="hidden md:flex desktop-nav-visible items-center gap-6">
          <Link
            href="/events"
            className="text-sm font-medium text-neutral-600 hover:text-primary-500 dark:text-neutral-300 transition-colors"
          >
            Events
          </Link>
          <Link
            href="/become-organizer"
            className="text-sm font-medium text-neutral-600 hover:text-primary-500 dark:text-neutral-300 transition-colors flex items-center gap-1.5"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span>Become an Organizer</span>
          </Link>
        </nav>

        {/* Right Auth Section - Desktop */}
        <div className="hidden md:flex desktop-nav-visible items-center gap-3">
          {session?.user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="gap-2 text-xs rounded-xl h-9">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 text-xs text-neutral-500 hover:text-error-600 rounded-xl h-9"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-xs font-semibold rounded-xl h-9">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-xl h-9">
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden mobile-nav-hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="inline-flex items-center justify-center p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mobile-nav-hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 animate-in slide-in-from-top-4 duration-200">
          <div className="space-y-1 px-4 pt-2 pb-4">
            <Link
              href="/events"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-3 py-2 text-base font-semibold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all"
            >
              Events
            </Link>
            <Link
              href="/become-organizer"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-3 py-2 text-base font-semibold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all"
            >
              Become an Organizer
            </Link>

            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              {session?.user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await handleSignOut();
                    }}
                    variant="ghost"
                    className="w-full text-center py-2.5 text-sm font-bold text-error-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Logout</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center rounded-xl py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center rounded-xl bg-primary-500 py-2.5 text-sm font-bold text-white hover:bg-primary-600 shadow-xs"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
export default PublicNavbar;
