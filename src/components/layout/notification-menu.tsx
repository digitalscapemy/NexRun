"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { trpc } from "@/lib/trpc";

export function NotificationMenu() {
  const utils = trpc.useUtils();
  const { data } = trpc.settings.getNotifications.useQuery({ limit: 8 }, { refetchInterval: 60_000 });
  const markRead = trpc.settings.markNotificationRead.useMutation({
    onSuccess: () => utils.settings.getNotifications.invalidate(),
  });
  const markAllRead = trpc.settings.markAllNotificationsRead.useMutation({
    onSuccess: () => utils.settings.getNotifications.invalidate(),
  });

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Notifications${data?.unreadCount ? `, ${data.unreadCount} unread` : ""}`}
        className="relative flex size-11 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-neutral-800 dark:hover:text-white"
      >
        <Bell className="h-4.5 w-4.5" aria-hidden="true" />
        {!!data?.unreadCount && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[9px] font-bold text-white">
            {Math.min(data.unreadCount, 9)}{data.unreadCount > 9 ? "+" : ""}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={12} className="z-[60]">
          <Popover.Popup className="w-[min(22rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl outline-none dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <div>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Notifications</p>
            <p className="text-[11px] text-neutral-500">Account and event updates</p>
          </div>
          {!!data?.unreadCount && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="rounded-lg bg-primary-50 px-2 py-1 text-[10px] font-bold text-primary-700 transition hover:bg-primary-100 disabled:opacity-50 dark:bg-primary-950/40 dark:text-primary-300 dark:hover:bg-primary-950/60"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {!data || data.items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">You&apos;re all caught up.</p>
          ) : (
            data.items.map((notification) => {
              const content = (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {notification.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-[10px] text-neutral-400">
                    {new Date(notification.createdAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              );
              const className = `block border-b border-neutral-100 px-4 py-3 transition hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/60 ${
                notification.readAt ? "" : "bg-primary-50/45 dark:bg-primary-950/10"
              }`;
              return notification.href ? (
                <Link
                  key={notification.id}
                  href={notification.href}
                  className={className}
                  onClick={() => !notification.readAt && markRead.mutate({ notificationId: notification.id })}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={notification.id}
                  type="button"
                  className={`${className} w-full text-left`}
                  onClick={() => !notification.readAt && markRead.mutate({ notificationId: notification.id })}
                >
                  {content}
                </button>
              );
            })
          )}
        </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
