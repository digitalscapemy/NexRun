"use client";

import Link from "next/link";
import { Building2, LogOut } from "lucide-react";
import type { RoleType } from "@/lib/constants";
import type { NavItem } from "@/lib/navigation";
import { BrandLogo } from "@/components/layout/brand-logo";

export interface DashboardWorkspace {
  selectedOrganization?: {
    id: string;
    companyName: string;
    status: string;
    memberRole: string | null;
  } | null;
  organizations: Array<{
    id: string;
    companyName: string;
    status: string;
    memberRole: string | null;
  }>;
}

interface DashboardSidebarProps {
  id: string;
  pathname: string;
  userName: string;
  userRole: RoleType;
  visibleNavItems: NavItem[];
  workspace?: DashboardWorkspace;
  isWorkspaceLoading: boolean;
  isWorkspaceSwitching: boolean;
  onWorkspaceChange: (organizationId: string) => void;
  onNavigate?: () => void;
  onSignOut: () => void;
  closeControl?: React.ReactNode;
}

const sections = ["MAIN", "PERSONAL", "EVENTS", "WORKSPACE", "ADMIN"] as const;

function roleBadgeColor(role: RoleType) {
  switch (role) {
    case "DEVELOPER":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "ADMIN":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    case "ORGANIZER":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    default:
      return "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20";
  }
}

export function DashboardSidebar({
  id,
  pathname,
  userName,
  userRole,
  visibleNavItems,
  workspace,
  isWorkspaceLoading,
  isWorkspaceSwitching,
  onWorkspaceChange,
  onNavigate,
  onSignOut,
  closeControl,
}: DashboardSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-neutral-900">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-4 sm:px-6 dark:border-neutral-800">
        <Link href="/" onClick={onNavigate} aria-label="NexRun home" className="flex min-w-0 items-center">
          <BrandLogo variant="wordmark" priority alt="" className="w-32 max-w-full" />
        </Link>
        {closeControl}
      </div>

      {workspace?.selectedOrganization && (
        <div className="shrink-0 border-b border-neutral-200 p-4 dark:border-neutral-800">
          <label
            htmlFor={id}
            className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400"
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            Active workspace
          </label>
          <select
            id={id}
            value={workspace.selectedOrganization.id}
            disabled={workspace.organizations.length < 2 || isWorkspaceSwitching || isWorkspaceLoading}
            onChange={(event) => onWorkspaceChange(event.target.value)}
            className="min-h-11 w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            {workspace.organizations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.companyName} &middot; {item.status.toLowerCase().replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <p className="mt-1.5 truncate text-xs text-neutral-500">
            {workspace.selectedOrganization.memberRole === "PLATFORM_ADMIN"
              ? "Platform operational context"
              : workspace.selectedOrganization.memberRole?.toLowerCase().replaceAll("_", " ")}
          </p>
        </div>
      )}

      <nav aria-label="Dashboard navigation" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
        {sections.map((sectionKey) => {
          const sectionItems = visibleNavItems.filter((item) => item.section === sectionKey);
          if (sectionItems.length === 0) return null;

          return (
            <div key={sectionKey} className="space-y-1">
              <div className="px-2 text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                {sectionKey}
              </div>
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-primary-500 text-white shadow-xs"
                        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.title}</span>
                    </span>
                    {item.badge && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${isActive ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{userName}</p>
            <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${roleBadgeColor(userRole)}`}>
              {userRole}
            </span>
          </div>
          <button
            onClick={onSignOut}
            type="button"
            aria-label="Sign out"
            title="Logout"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-200 hover:text-error-600 dark:hover:bg-neutral-700"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
