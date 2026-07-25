import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-64 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50/50 p-12 dark:border-neutral-800 dark:bg-neutral-900/50", className)}>
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <Icon className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          {description}
        </p>
        {action && (
          action.href ? (
            <Button asChild className="font-bold">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick} className="font-bold">
              {action.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
