"use client";

import Link from "next/link";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";

const toneStyles = {
  INFO: "border-sky-500/20 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  SUCCESS: "border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  WARNING: "border-amber-500/20 bg-amber-500/10 text-amber-950 dark:text-amber-100",
} as const;

export function PlatformAnnouncement() {
  const { data } = trpc.settings.getPublicPlatformExperience.useQuery();
  const announcement = data?.announcement;
  if (!announcement?.enabled || !announcement.message) return null;
  const Icon = announcement.tone === "SUCCESS" ? CheckCircle2 : announcement.tone === "WARNING" ? TriangleAlert : Info;
  const isInternal = announcement.href?.startsWith("/");
  return (
    <aside className={`border-b ${toneStyles[announcement.tone]}`} aria-label="Platform announcement">
      <div className="fluid-container flex min-h-10 items-center justify-center gap-2 py-2 text-center text-xs font-semibold sm:text-sm">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{announcement.message}</span>
        {announcement.href && announcement.linkLabel && (
          isInternal
            ? <Link href={announcement.href} className="shrink-0 font-black underline underline-offset-2">{announcement.linkLabel}</Link>
            : <a href={announcement.href} target="_blank" rel="noreferrer" className="shrink-0 font-black underline underline-offset-2">{announcement.linkLabel}</a>
        )}
      </div>
    </aside>
  );
}
