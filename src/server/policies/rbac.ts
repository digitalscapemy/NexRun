import { TRPCError } from "@trpc/server";
import { ROLES, type RoleType } from "@/lib/constants";
import type { Session } from "@/server/auth";
import type {
  PrismaClient,
  OrganizationMemberRole,
  OrganizationStatus,
} from "@/generated/prisma";

export interface AuthContext {
  session: Session | null;
  userId?: string;
  userRole?: string;
}

/**
 * Ensures user is authenticated. Throws UNAUTHORIZED if not.
 */
export function requireUser(ctx: AuthContext) {
  if (!ctx.session?.user || !ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action.",
    });
  }
  return {
    session: ctx.session,
    user: ctx.session.user,
    userId: ctx.userId,
    userRole: ctx.userRole as RoleType,
  };
}

/**
 * Ensures user has one of the allowed roles. Throws FORBIDDEN if not.
 */
export function requireRole(ctx: AuthContext, allowedRoles: RoleType[]) {
  const authUser = requireUser(ctx);
  if (!allowedRoles.includes(authUser.userRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Access denied. Requires one of roles: ${allowedRoles.join(", ")}.`,
    });
  }
  return authUser;
}

/**
 * Shorthand for Admin or Developer access.
 */
export function requireAdminOrDeveloper(ctx: AuthContext) {
  return requireRole(ctx, [ROLES.ADMIN, ROLES.DEVELOPER]);
}

/**
 * Shorthand for Developer exclusive access.
 */
export function requireDeveloper(ctx: AuthContext) {
  return requireRole(ctx, [ROLES.DEVELOPER]);
}

export function isPlatformAdmin(role?: string): boolean {
  return role === ROLES.ADMIN || role === ROLES.DEVELOPER;
}

export type OrganizationAccess = {
  organizationId: string;
  organizationStatus: OrganizationStatus;
  memberRole: OrganizationMemberRole | "PLATFORM_ADMIN";
};

export type WorkspaceOrganization = {
  id: string;
  companyName: string;
  status: OrganizationStatus;
  userId: string;
  memberRole: OrganizationMemberRole | "PLATFORM_ADMIN";
};

export type WorkspaceContext = {
  selectedOrganization: WorkspaceOrganization | null;
  organizations: WorkspaceOrganization[];
  selectionWasFallback: boolean;
};

export const ORGANIZATION_PERMISSIONS = {
  MANAGE_EVENT: ["OWNER", "MANAGER"],
  MANAGE_PARTICIPANTS: ["OWNER", "MANAGER", "OPERATIONS"],
  MANAGE_FINANCE: ["OWNER", "MANAGER", "FINANCE"],
  CHECK_IN: ["OWNER", "MANAGER", "OPERATIONS", "CHECKIN_STAFF"],
} as const satisfies Record<string, readonly OrganizationMemberRole[]>;

export async function getAccessibleOrganizationIds(
  db: PrismaClient,
  ctx: AuthContext,
  options?: { approvedOnly?: boolean }
): Promise<string[]> {
  const authUser = requireUser(ctx);
  if (isPlatformAdmin(authUser.userRole)) {
    const organizations = await db.organization.findMany({
      where: options?.approvedOnly ? { status: "APPROVED" } : undefined,
      select: { id: true },
    });
    return organizations.map((organization) => organization.id);
  }

  const organizations = await db.organization.findMany({
    where: {
      ...(options?.approvedOnly ? { status: "APPROVED" as const } : {}),
      OR: [
        { userId: authUser.userId },
        { members: { some: { userId: authUser.userId, status: "ACTIVE" } } },
      ],
    },
    select: { id: true },
  });
  return organizations.map((organization) => organization.id);
}

/**
 * Returns every workspace the current user can actively access and resolves
 * their persisted selection. A stale selection is never trusted: it falls
 * back to the first authorized workspace without granting additional access.
 */
export async function getWorkspaceContext(
  db: PrismaClient,
  ctx: AuthContext
): Promise<WorkspaceContext> {
  const authUser = requireUser(ctx);
  const platformAdmin = isPlatformAdmin(authUser.userRole);
  const [user, organizations] = await Promise.all([
    db.user.findUnique({
      where: { id: authUser.userId },
      select: { activeOrganizationId: true },
    }),
    db.organization.findMany({
      where: platformAdmin
        ? undefined
        : {
            OR: [
              { userId: authUser.userId },
              { members: { some: { userId: authUser.userId, status: "ACTIVE" } } },
            ],
          },
      select: {
        id: true,
        companyName: true,
        status: true,
        userId: true,
        members: {
          where: { userId: authUser.userId, status: "ACTIVE" },
          select: { role: true },
          take: 1,
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);

  const accessibleOrganizations: WorkspaceOrganization[] = organizations.flatMap(
    (organization) => {
      const memberRole = platformAdmin
        ? "PLATFORM_ADMIN"
        : organization.userId === authUser.userId
          ? "OWNER"
          : organization.members[0]?.role;

      // The outer relation filter and nested member selection use the same
      // ACTIVE requirement. Keep this defensive check so an inconsistent row
      // can never be promoted to OWNER by a fallback value.
      if (!memberRole) return [];
      return [{
        id: organization.id,
        companyName: organization.companyName,
        status: organization.status,
        userId: organization.userId,
        memberRole,
      }];
    }
  );
  const selectedOrganization =
    accessibleOrganizations.find(
      (organization) => organization.id === user?.activeOrganizationId
    ) ?? accessibleOrganizations[0] ?? null;

  return {
    selectedOrganization,
    organizations: accessibleOrganizations,
    selectionWasFallback:
      selectedOrganization !== null &&
      selectedOrganization.id !== user?.activeOrganizationId,
  };
}

export async function requireSelectedOrganizationAccess(
  db: PrismaClient,
  ctx: AuthContext,
  allowedRoles?: readonly OrganizationMemberRole[],
  requireApproved = false
): Promise<OrganizationAccess> {
  const workspace = await getWorkspaceContext(db, ctx);
  const selected = workspace.selectedOrganization;
  if (!selected) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You need an organizer workspace to perform this action.",
    });
  }
  if (
    allowedRoles &&
    selected.memberRole !== "PLATFORM_ADMIN" &&
    !allowedRoles.includes(selected.memberRole)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your role in the selected workspace does not permit this action.",
    });
  }
  if (
    requireApproved &&
    selected.memberRole !== "PLATFORM_ADMIN" &&
    selected.status !== "APPROVED"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The selected workspace must be approved and active.",
    });
  }
  return {
    organizationId: selected.id,
    organizationStatus: selected.status,
    memberRole: selected.memberRole,
  };
}

/**
 * Resolves active access to an organization. Platform admins have global access,
 * while organizers must be the legacy owner or an active organization member.
 */
export async function getOrganizationAccess(
  db: PrismaClient,
  ctx: AuthContext,
  organizationId: string
): Promise<OrganizationAccess | null> {
  const authUser = requireUser(ctx);
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      userId: true,
      status: true,
      members: {
        where: { userId: authUser.userId, status: "ACTIVE" },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!organization) return null;
  if (isPlatformAdmin(authUser.userRole)) {
    return {
      organizationId: organization.id,
      organizationStatus: organization.status,
      memberRole: "PLATFORM_ADMIN",
    };
  }

  const membership = organization.members[0];
  if (organization.userId === authUser.userId || membership) {
    return {
      organizationId: organization.id,
      organizationStatus: organization.status,
      memberRole: membership?.role ?? "OWNER",
    };
  }

  return null;
}

export async function requireOrganizationAccess(
  db: PrismaClient,
  ctx: AuthContext,
  organizationId: string,
  allowedRoles?: readonly OrganizationMemberRole[]
): Promise<OrganizationAccess> {
  const access = await getOrganizationAccess(db, ctx, organizationId);
  if (!access) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this organization.",
    });
  }

  if (
    allowedRoles &&
    access.memberRole !== "PLATFORM_ADMIN" &&
    !allowedRoles.includes(access.memberRole)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your organization role does not permit this action.",
    });
  }

  return access;
}

export async function requireApprovedOrganizationAccess(
  db: PrismaClient,
  ctx: AuthContext,
  organizationId: string,
  allowedRoles?: readonly OrganizationMemberRole[]
): Promise<OrganizationAccess> {
  const access = await requireOrganizationAccess(db, ctx, organizationId, allowedRoles);
  if (access.memberRole !== "PLATFORM_ADMIN" && access.organizationStatus !== "APPROVED") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This organization must be approved and active to perform this action.",
    });
  }
  return access;
}

export async function requireEventAccess(
  db: PrismaClient,
  ctx: AuthContext,
  eventId: string,
  allowedRoles?: readonly OrganizationMemberRole[],
  requireApproved = true
) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, slug: true, featured: true, organizationId: true, status: true },
  });
  if (!event) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
  }

  const access = requireApproved
    ? await requireApprovedOrganizationAccess(db, ctx, event.organizationId, allowedRoles)
    : await requireOrganizationAccess(db, ctx, event.organizationId, allowedRoles);

  return { event, access };
}

/**
 * Verifies that an organizer owns the specified organization ID,
 * or is an Admin/Developer who can inspect any organization.
 */
export function requireOrganizationOwnership(
  ctx: AuthContext,
  organizationId: string,
  userOrganizationId?: string | null
) {
  const authUser = requireUser(ctx);

  // Admins and Developers have global oversight
  if (authUser.userRole === ROLES.ADMIN || authUser.userRole === ROLES.DEVELOPER) {
    return authUser;
  }

  // Organizers must own the organization ID
  if (authUser.userRole === ROLES.ORGANIZER && userOrganizationId === organizationId) {
    return authUser;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to access this organization's records.",
  });
}
