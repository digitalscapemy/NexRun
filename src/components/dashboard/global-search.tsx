"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { Search, X, Calendar, Users, Building2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query.trim(), 350);

  const { data, isFetching } = trpc.admin.globalSearch.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2, staleTime: 10_000 }
  );

  const totalResults = (data?.events.length ?? 0) + (data?.users.length ?? 0) + (data?.organizations.length ?? 0);

  // Cmd/Ctrl+K shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleNavigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
  }, [router]);

  const clear = () => { setQuery(""); inputRef.current?.focus(); };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {/* Trigger button */}
      <Popover.Trigger
        type="button"
        aria-expanded={open}
        aria-label="Global search"
        aria-keyshortcuts="Meta+K Control+K"
        className="flex size-11 items-center justify-center gap-2 rounded-xl border border-transparent bg-neutral-50 px-2 text-xs text-neutral-500 transition hover:border-primary-400 hover:bg-white sm:h-10 sm:w-auto sm:px-3 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search platform…</span>
      </Popover.Trigger>

      {/* Dropdown panel */}
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={12} className="z-[60]">
          <Popover.Popup
            initialFocus={inputRef}
            finalFocus={true}
            className="w-[min(30rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl outline-none dark:border-neutral-700 dark:bg-neutral-900"
          >
          {/* Input row */}
          <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary-500 shrink-0" />
            ) : (
              <Search className="h-4 w-4 text-neutral-400 shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, users, organisations…"
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={clear} className="shrink-0 text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-105 overflow-y-auto">
            {debouncedQuery.length < 2 && (
              <p className="px-4 py-8 text-center text-xs text-neutral-400">Type at least 2 characters to search.</p>
            )}

            {debouncedQuery.length >= 2 && !isFetching && totalResults === 0 && (
              <p className="px-4 py-8 text-center text-xs text-neutral-400">No results for &ldquo;{debouncedQuery}&rdquo;</p>
            )}

            {/* Events section */}
            {(data?.events.length ?? 0) > 0 && (
              <section>
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <Calendar className="h-3.5 w-3.5 text-primary-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Events</span>
                </div>
                {data!.events.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => handleNavigate(`/dashboard/events`)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{ev.title}</p>
                      <p className="text-xs text-neutral-500">{format(new Date(ev.eventDate), "d MMM yyyy")} · {ev.state}</p>
                    </div>
                    <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusColor(ev.status)}`}>
                      {ev.status.replace(/_/g, " ")}
                    </span>
                  </button>
                ))}
              </section>
            )}

            {/* Users section */}
            {(data?.users.length ?? 0) > 0 && (
              <section>
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Users</span>
                </div>
                {data!.users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleNavigate(`/dashboard/audit-log`)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      {(user.name ?? user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name ?? "—"}</p>
                      <p className="truncate text-xs text-neutral-500">{user.email}</p>
                    </div>
                    <span className="ml-2 shrink-0 text-[9px] font-bold uppercase text-neutral-400">{user.role}</span>
                  </button>
                ))}
              </section>
            )}

            {/* Organisations section */}
            {(data?.organizations.length ?? 0) > 0 && (
              <section>
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <Building2 className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Organisations</span>
                </div>
                {data!.organizations.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleNavigate(`/dashboard/events`)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                      {org.companyName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{org.companyName}</p>
                      <p className="text-xs text-neutral-500">{org.ssmNumber} · {org.contactPerson}</p>
                    </div>
                    <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${orgStatusColor(org.status)}`}>
                      {org.status}
                    </span>
                  </button>
                ))}
              </section>
            )}

            {/* Footer hint */}
            {totalResults > 0 && (
              <p className="border-t border-neutral-100 px-4 py-2 text-center text-[10px] text-neutral-400 dark:border-neutral-800">
                Press <kbd className="rounded bg-neutral-100 px-1 font-mono dark:bg-neutral-800">Esc</kbd> to close
              </p>
            )}
          </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "PUBLISHED": return "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400";
    case "DRAFT": return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
    case "CANCELLED": return "bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400";
    default: return "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400";
  }
}

function orgStatusColor(status: string): string {
  switch (status) {
    case "APPROVED": return "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400";
    case "PENDING": return "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400";
    case "REJECTED": return "bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400";
    case "SUSPENDED": return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
    default: return "bg-neutral-100 text-neutral-600";
  }
}
