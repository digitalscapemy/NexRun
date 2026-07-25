"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { ROLES, type RoleType } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function CreateEventAction({ label = "Create New Event →" }: { label?: string }) {
  const { data: session, isPending } = useSession();
  const userRole = (session?.user?.role as RoleType) || ROLES.USER;
  const isOrganizer = userRole === ROLES.ORGANIZER;
  const isPlatformAdmin = userRole === ROLES.ADMIN || userRole === ROLES.DEVELOPER;
  const { data: workspace, isLoading: isWorkspaceLoading } = trpc.settings.getMyWorkspaceContext.useQuery(undefined, {
    enabled: !isPending && isOrganizer,
    retry: false,
  });

  const selectedOrganization = workspace?.selectedOrganization;
  const canCreateEvent =
    isPlatformAdmin ||
    (isOrganizer &&
      selectedOrganization?.status === "APPROVED" &&
      (selectedOrganization.memberRole === "OWNER" || selectedOrganization.memberRole === "MANAGER"));

  if (isPending || (isOrganizer && isWorkspaceLoading) || !canCreateEvent) return null;

  return (
    <Button asChild className="mt-6 rounded-xl bg-primary-500 px-6 font-bold text-white hover:bg-primary-600">
      <Link href="/dashboard/events/create">{label}</Link>
    </Button>
  );
}
