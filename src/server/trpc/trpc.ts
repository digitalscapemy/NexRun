import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "../db";
import { auth } from "../auth";
import { serverEnv } from "../env";
import { resolveRequestIp } from "../security/request";

// Context creation
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  return {
    db,
    session,
    userId: session?.user?.id,
    userRole: session?.user?.role,
    requestIp: resolveRequestIp(opts.headers, serverEnv.TRUST_PROXY_HEADERS),
  };
};

// tRPC init
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Export reusable pieces
export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

// Public procedure (no auth required)
export const publicProcedure = t.procedure;

// Protected procedure (requires auth)
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
      userRole: ctx.session.user.role as string,
    },
  });
});

/** Only DEVELOPER */
export const developerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { requireRole } = await import("@/server/policies/rbac");
  const { ROLES } = await import("@/lib/constants");
  requireRole(ctx, [ROLES.DEVELOPER]);
  return next({ ctx });
});

/** ADMIN or DEVELOPER */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { requireRole } = await import("@/server/policies/rbac");
  const { ROLES } = await import("@/lib/constants");
  requireRole(ctx, [ROLES.ADMIN, ROLES.DEVELOPER]);
  return next({ ctx });
});

/** ORGANIZER, ADMIN, or DEVELOPER */
export const organizerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { requireRole } = await import("@/server/policies/rbac");
  const { ROLES } = await import("@/lib/constants");
  requireRole(ctx, [ROLES.ORGANIZER, ROLES.ADMIN, ROLES.DEVELOPER]);
  return next({ ctx });
});
