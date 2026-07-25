"use client";

import { useState } from "react";
import { ClipboardList, Search, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";

function OrganizationActivityLogPageContent() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = trpc.settings.getOrganizationAuditLogs.useQuery({
    search: search.trim() || undefined,
    limit: 100,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">Workspace oversight</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
          <ClipboardList className="h-7 w-7 text-primary-500" /> Activity log
        </h1>
        <p className="mt-2 text-sm text-neutral-500">A read-only history of who changed what within your organization.</p>
      </div>

      <div className="relative max-w-xl flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-neutral-400 pointer-events-none" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search actions or summaries" className="h-11 rounded-xl pl-10" />
      </div>

      {isLoading ? (
        <Card className="overflow-hidden rounded-2xl border-neutral-200 dark:border-neutral-800" aria-label="Loading...">
          <div role="region" aria-label="Loading activity log" tabIndex={0} className="dashboard-scroll-region">
            <table className="min-w-[44rem] w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/80">
                <tr>
                  <th scope="col" className="px-5 py-3">When</th>
                  <th scope="col" className="px-5 py-3">Action</th>
                  <th scope="col" className="px-5 py-3">Summary</th>
                  <th scope="col" className="px-5 py-3">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </tbody>
            </table>
          </div>
        </Card>
      ) : error ? (
        <Card className="flex items-center gap-3 border-error-500/30 p-6 text-sm text-error-700 dark:text-error-300">
          <ShieldAlert className="h-5 w-5 shrink-0" /> {error.message}
        </Card>
      ) : !data?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No activity recorded yet"
          description="When team members make changes within your organization, they will appear here."
        />
      ) : (
        <Card className="overflow-hidden rounded-2xl border-neutral-200 dark:border-neutral-800">
          <div role="region" aria-label="Activity log, scroll horizontally for all columns" tabIndex={0} className="dashboard-scroll-region outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <table className="min-w-[44rem] w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/80">
                <tr>
                  <th scope="col" className="px-5 py-3">When</th>
                  <th scope="col" className="px-5 py-3">Action</th>
                  <th scope="col" className="px-5 py-3">Summary</th>
                  <th scope="col" className="px-5 py-3">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {data.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-neutral-500">
                      {new Date(log.createdAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-5 py-4"><span className="rounded-md bg-neutral-100 px-2 py-1 font-mono text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{log.action}</span></td>
                    <td className="max-w-xl px-5 py-4 text-neutral-700 dark:text-neutral-200">{log.summary}</td>
                    <td className="px-5 py-4 text-xs text-neutral-500">{log.actor?.name || log.actor?.email || "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function OrganizationActivityLogPage() {
  return (
    <ErrorBoundary>
      <OrganizationActivityLogPageContent />
    </ErrorBoundary>
  );
}
