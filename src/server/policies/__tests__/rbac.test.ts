import { describe, it, expect } from "vitest";
import {
  getOrganizationAccess,
  getWorkspaceContext,
  requireUser,
  requireRole,
  requireAdminOrDeveloper,
  requireOrganizationOwnership,
  requireSelectedOrganizationAccess,
} from "../rbac";
import { ROLES } from "@/lib/constants";
import type { Session } from "@/server/auth";
import type { AuthContext } from "../rbac";
import type { PrismaClient } from "@/generated/prisma";

describe("RBAC Policy Guards", () => {
  const devSession = { user: { id: "dev-1", email: "dev@test.my", role: ROLES.DEVELOPER } } as unknown as Session;
  const adminSession = { user: { id: "admin-1", email: "admin@test.my", role: ROLES.ADMIN } } as unknown as Session;
  const orgSession = { user: { id: "org-1", email: "org@test.my", role: ROLES.ORGANIZER } } as unknown as Session;
  const userSession = { user: { id: "user-1", email: "user@test.my", role: ROLES.USER } } as unknown as Session;

  it("requireUser throws UNAUTHORIZED when session is null", () => {
    expect(() => requireUser({ session: null })).toThrowError(/logged in/);
  });

  it("requireRole allows permitted role and throws FORBIDDEN for unpermitted role", () => {
    const orgCtx: AuthContext = { session: orgSession, userId: "org-1", userRole: ROLES.ORGANIZER };
    const userCtx: AuthContext = { session: userSession, userId: "user-1", userRole: ROLES.USER };

    expect(() => requireRole(orgCtx, [ROLES.ORGANIZER])).not.toThrow();
    expect(() => requireRole(userCtx, [ROLES.ORGANIZER])).toThrowError(/Access denied/);
  });

  it("requireAdminOrDeveloper allows Admin or Developer and blocks User", () => {
    const devCtx: AuthContext = { session: devSession, userId: "dev-1", userRole: ROLES.DEVELOPER };
    const adminCtx: AuthContext = { session: adminSession, userId: "admin-1", userRole: ROLES.ADMIN };
    const userCtx: AuthContext = { session: userSession, userId: "user-1", userRole: ROLES.USER };

    expect(() => requireAdminOrDeveloper(devCtx)).not.toThrow();
    expect(() => requireAdminOrDeveloper(adminCtx)).not.toThrow();
    expect(() => requireAdminOrDeveloper(userCtx)).toThrowError(/Access denied/);
  });

  it("requireOrganizationOwnership allows owner organizer and global Admin/Developer", () => {
    const orgCtx: AuthContext = { session: orgSession, userId: "org-1", userRole: ROLES.ORGANIZER };
    const adminCtx: AuthContext = { session: adminSession, userId: "admin-1", userRole: ROLES.ADMIN };

    expect(() =>
      requireOrganizationOwnership(orgCtx, "org-100", "org-100")
    ).not.toThrow();

    expect(() =>
      requireOrganizationOwnership(adminCtx, "org-100", "org-999")
    ).not.toThrow();

    expect(() =>
      requireOrganizationOwnership(orgCtx, "org-100", "org-999")
    ).toThrowError(/permission/);
  });

  it("falls back from a stale selected workspace without exposing an inaccessible workspace", async () => {
    const db = {
      user: {
        findUnique: async () => ({ activeOrganizationId: "removed-workspace" }),
      },
      organization: {
        findMany: async () => [
          {
            id: "workspace-a",
            companyName: "Alpha Runs",
            status: "APPROVED",
            userId: "owner-a",
            members: [{ role: "MANAGER" }],
          },
          {
            id: "workspace-b",
            companyName: "Beta Runs",
            status: "APPROVED",
            userId: "owner-b",
            members: [{ role: "OPERATIONS" }],
          },
        ],
      },
    } as unknown as PrismaClient;
    const ctx: AuthContext = { session: orgSession, userId: "org-1", userRole: ROLES.ORGANIZER };

    const workspace = await getWorkspaceContext(db, ctx);

    expect(workspace.selectedOrganization?.id).toBe("workspace-a");
    expect(workspace.organizations.map((organization) => organization.id)).toEqual(["workspace-a", "workspace-b"]);
    expect(workspace.selectionWasFallback).toBe(true);
  });

  it("does not treat a suspended membership as organization access", async () => {
    const db = {
      organization: {
        findUnique: async () => ({
          id: "workspace-a",
          userId: "another-owner",
          status: "APPROVED",
          members: [],
        }),
      },
    } as unknown as PrismaClient;
    const ctx: AuthContext = { session: orgSession, userId: "org-1", userRole: ROLES.ORGANIZER };

    await expect(getOrganizationAccess(db, ctx, "workspace-a")).resolves.toBeNull();
  });

  it("enforces the selected workspace role before event-management actions", async () => {
    const db = {
      user: {
        findUnique: async () => ({ activeOrganizationId: "workspace-a" }),
      },
      organization: {
        findMany: async () => [
          {
            id: "workspace-a",
            companyName: "Alpha Runs",
            status: "APPROVED",
            userId: "another-owner",
            members: [{ role: "OPERATIONS" }],
          },
          {
            id: "workspace-b",
            companyName: "Beta Runs",
            status: "APPROVED",
            userId: "another-owner",
            members: [{ role: "MANAGER" }],
          },
        ],
      },
    } as unknown as PrismaClient;
    const ctx: AuthContext = { session: orgSession, userId: "org-1", userRole: ROLES.ORGANIZER };

    await expect(
      requireSelectedOrganizationAccess(db, ctx, ["OWNER", "MANAGER"], true)
    ).rejects.toThrow(/selected workspace/);
  });

  it("gives platform admins a selectable operational context while retaining global access", async () => {
    const db = {
      user: {
        findUnique: async () => ({ activeOrganizationId: "workspace-b" }),
      },
      organization: {
        findMany: async () => [
          {
            id: "workspace-a",
            companyName: "Alpha Runs",
            status: "PENDING",
            userId: "owner-a",
            members: [],
          },
          {
            id: "workspace-b",
            companyName: "Beta Runs",
            status: "SUSPENDED",
            userId: "owner-b",
            members: [],
          },
        ],
      },
    } as unknown as PrismaClient;
    const ctx: AuthContext = { session: adminSession, userId: "admin-1", userRole: ROLES.ADMIN };

    const workspace = await getWorkspaceContext(db, ctx);

    expect(workspace.selectedOrganization?.id).toBe("workspace-b");
    expect(workspace.selectedOrganization?.memberRole).toBe("PLATFORM_ADMIN");
    expect(workspace.selectionWasFallback).toBe(false);
  });
});
