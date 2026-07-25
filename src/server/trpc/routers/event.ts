import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma, type EventStatus } from "@/generated/prisma";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  organizerProcedure,
  adminProcedure,
} from "../trpc";
import { eventFormSchema } from "@/lib/validation/event";
import { ROLES } from "@/lib/constants";
import {
  getOrganizationAccess,
  getWorkspaceContext,
  ORGANIZATION_PERMISSIONS,
  requireApprovedOrganizationAccess,
  requireEventAccess,
  requireSelectedOrganizationAccess,
} from "@/server/policies/rbac";
import { writeAuditLog } from "@/server/services/audit-service";
import { createNotification } from "@/server/services/notification-service";
import { createActivationInvoiceNumber } from "@/server/services/event-activation-service";
import { getActiveFeeSchedule } from "@/server/services/pricing-service";
import { getPlatformControlConfig } from "@/server/services/platform-control-service";
import {
  getPublicEventQueryPolicy,
  isPublicEventStatus,
} from "@/lib/event-public-visibility";

const EVENT_MANAGER_ROLES = ORGANIZATION_PERMISSIONS.MANAGE_EVENT;

function toEventInputData(input: z.infer<typeof eventFormSchema>) {
  const { organizationId: _organizationId, categories, timelineItems, ...eventData } = input;
  void _organizationId;
  return { categories, timelineItems, eventData };
}

function createEventContent(input: z.infer<typeof eventFormSchema>) {
  const { categories, timelineItems, eventData } = toEventInputData(input);
  return {
    ...eventData,
    eventDate: new Date(eventData.eventDate),
    registrationOpenDate: new Date(eventData.registrationOpenDate),
    registrationCloseDate: new Date(eventData.registrationCloseDate),
    ageReferenceDate: new Date(eventData.ageReferenceDate),
    categories: {
      create: categories.map((category) => ({
        name: category.name,
        distance: category.distance,
        ageMin: category.ageMin,
        ageMax: category.ageMax,
        gender: category.gender,
        priceSen: category.priceSen,
        earlyBirdPriceSen: category.earlyBirdPriceSen ?? null,
        earlyBirdDeadline: category.earlyBirdDeadline
          ? new Date(category.earlyBirdDeadline)
          : null,
        maxSlots: category.maxSlots ?? null,
        startSaleDate: category.startSaleDate ? new Date(category.startSaleDate) : null,
        endSaleDate: category.endSaleDate ? new Date(category.endSaleDate) : null,
        isActive: category.isActive,
      })),
    },
    timelineItems: {
      create: timelineItems.map((item, index) => ({
        title: item.title,
        timestamp: new Date(item.timestamp),
        location: item.location?.trim() || null,
        description: item.description?.trim() || null,
        orderIndex: index,
      })),
    },
  };
}

async function resolveOrganizationForEventCreation(
  db: Parameters<typeof requireApprovedOrganizationAccess>[0],
  ctx: Parameters<typeof requireApprovedOrganizationAccess>[1],
  requestedOrganizationId?: string
) {
  if (requestedOrganizationId) {
    await requireApprovedOrganizationAccess(db, ctx, requestedOrganizationId, EVENT_MANAGER_ROLES);
    return requestedOrganizationId;
  }
  const access = await requireSelectedOrganizationAccess(
    db,
    ctx,
    EVENT_MANAGER_ROLES,
    true
  );
  return access.organizationId;
}

async function recordEventStatus(
  db: Parameters<typeof writeAuditLog>[0],
  input: {
    eventId: string;
    organizationId: string;
    actorUserId: string;
    fromStatus: EventStatus | null;
    toStatus: EventStatus;
    notes?: string | null;
    action: string;
    title?: string;
  }
) {
  await db.eventStatusHistory.create({
    data: {
      eventId: input.eventId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      notes: input.notes?.trim() || null,
      actorUserId: input.actorUserId,
    },
  });
  await writeAuditLog(db, {
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    eventId: input.eventId,
    action: input.action,
    entityType: "Event",
    entityId: input.eventId,
    summary: input.title
      ? `${input.title} moved from ${input.fromStatus ?? "NEW"} to ${input.toStatus}.`
      : `Event status moved from ${input.fromStatus ?? "NEW"} to ${input.toStatus}.`,
    metadata: input.notes ? { notes: input.notes } : undefined,
  });
}

export const eventRouter = createTRPCRouter({
  getPublishedEvents: publicProcedure
    .input(
      z.object({
        tab: z.enum(["UPCOMING", "PAST"]).default("UPCOMING"),
        search: z.string().trim().max(100).optional(),
        state: z.string().trim().max(60).optional(),
        distanceFrom: z.number().positive().optional(),
        distanceTo: z.number().positive().optional(),
        priceFrom: z.number().int().min(0).optional(),
        priceTo: z.number().int().min(0).optional(),
        eventDateFrom: z.string().optional(),
        eventDateTo: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(12),
        cursor: z.string().optional(),
      }).superRefine((data, ctx) => {
        if (data.distanceFrom !== undefined && data.distanceTo !== undefined && data.distanceFrom > data.distanceTo) {
          ctx.addIssue({ code: "custom", path: ["distanceTo"], message: "Distance range end must be greater than or equal to start." });
        }
        if (data.priceFrom !== undefined && data.priceTo !== undefined && data.priceFrom > data.priceTo) {
          ctx.addIssue({ code: "custom", path: ["priceTo"], message: "Price range end must be greater than or equal to start." });
        }
        if (data.eventDateFrom && data.eventDateTo && new Date(data.eventDateFrom) > new Date(data.eventDateTo)) {
          ctx.addIssue({ code: "custom", path: ["eventDateTo"], message: "Event date range end must be after start." });
        }
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const publicPolicy = getPublicEventQueryPolicy({
        tab: input.tab,
        now,
        eventDateFrom: input.eventDateFrom ? new Date(input.eventDateFrom) : undefined,
        eventDateTo: input.eventDateTo ? new Date(input.eventDateTo) : undefined,
      });
      const where: Prisma.EventWhereInput = {
        status: { in: [...publicPolicy.statuses] },
        organization: { status: publicPolicy.organizationStatus },
        eventDate: publicPolicy.eventDate,
      };
      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { venue: { contains: input.search, mode: "insensitive" } },
          { state: { contains: input.search, mode: "insensitive" } },
          { organization: { companyName: { contains: input.search, mode: "insensitive" } } },
        ];
      }
      if (input.state && input.state !== "ALL") where.state = input.state;

      const categoryFilters: { isActive: boolean; distance?: { gte?: number; lte?: number }; priceSen?: { gte?: number; lte?: number } } = { isActive: true };
      if (input.distanceFrom !== undefined || input.distanceTo !== undefined) {
        categoryFilters.distance = {
          ...(input.distanceFrom !== undefined ? { gte: input.distanceFrom } : {}),
          ...(input.distanceTo !== undefined ? { lte: input.distanceTo } : {}),
        };
      }
      if (input.priceFrom !== undefined || input.priceTo !== undefined) {
        categoryFilters.priceSen = {
          ...(input.priceFrom !== undefined ? { gte: input.priceFrom } : {}),
          ...(input.priceTo !== undefined ? { lte: input.priceTo } : {}),
        };
      }
      if (categoryFilters.distance || categoryFilters.priceSen) {
        where.categories = { some: categoryFilters };
      }

      const items = await ctx.db.event.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        orderBy: input.tab === "UPCOMING" ? { eventDate: "asc" } : { eventDate: "desc" },
        include: {
          organization: { select: { companyName: true, status: true } },
          categories: { where: { isActive: true }, orderBy: { priceSen: "asc" } },
        },
      });
      const nextItem = items.length > input.limit ? items.pop() : undefined;
      return { items, nextCursor: nextItem?.id };
    }),

  getFeaturedEvents: publicProcedure.query(async ({ ctx }) => {
    const carousel = (await getPlatformControlConfig(ctx.db)).carousel;
    if (!carousel.enabled) return [];
    return ctx.db.event.findMany({
      where: {
        status: "PUBLISHED",
        ...(carousel.includeUpcomingEvents ? {} : { featured: true }),
        eventDate: { gte: new Date() },
        organization: { status: "APPROVED" },
      },
      take: carousel.maxEvents,
      orderBy: carousel.includeUpcomingEvents ? [{ featured: "desc" }, { eventDate: "asc" }] : { eventDate: "asc" },
      include: {
        organization: { select: { companyName: true } },
        categories: { where: { isActive: true }, select: { priceSen: true }, orderBy: { priceSen: "asc" } },
      },
    });
  }),

  getEventBySlug: publicProcedure
    .input(z.object({ slug: z.string().trim().min(3).max(160) }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { slug: input.slug },
        include: {
          organization: {
            select: { id: true, companyName: true, email: true, phone: true, status: true },
          },
          categories: { where: { isActive: true }, orderBy: { distance: "desc" } },
          timelineItems: { orderBy: { timestamp: "asc" } },
          images: { orderBy: { isPrimary: "desc" } },
        },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });

      const isPublic = isPublicEventStatus(event.status) && event.organization.status === "APPROVED";
      if (!isPublic) {
        const access = ctx.session?.user
          ? await getOrganizationAccess(ctx.db, { ...ctx, userRole: ctx.userRole ?? undefined }, event.organizationId)
          : null;
        if (!access) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }

      const { status: _organizationStatus, ...organization } = event.organization;
      void _organizationStatus;
      return { ...event, organization };
    }),

  getEventById: protectedProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, false);
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        include: {
          categories: { orderBy: { priceSen: "asc" } },
          timelineItems: { orderBy: { timestamp: "asc" } },
          statusHistory: { orderBy: { createdAt: "desc" }, take: 10 },
          organization: { select: { id: true, companyName: true, status: true } },
        },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      return event;
    }),

  getEventPermissions: protectedProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({ where: { id: input.eventId }, select: { organizationId: true } });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      const access = await getOrganizationAccess(ctx.db, ctx, event.organizationId);
      if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this event." });
      const permits = (roles: readonly string[]) =>
        access.memberRole === "PLATFORM_ADMIN" || roles.includes(access.memberRole);
      return {
        participants: permits(ORGANIZATION_PERMISSIONS.MANAGE_PARTICIPANTS),
        checkIn: permits(ORGANIZATION_PERMISSIONS.CHECK_IN),
        finance: permits(ORGANIZATION_PERMISSIONS.MANAGE_FINANCE),
        eventManagement: permits(ORGANIZATION_PERMISSIONS.MANAGE_EVENT),
      };
    }),

  getDashboardEvents: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.userRole === ROLES.ADMIN || ctx.userRole === ROLES.DEVELOPER) {
      return ctx.db.event.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          organization: { select: { companyName: true } },
          organizerFee: { select: { id: true, status: true, amountSen: true, invoiceNumber: true } },
          _count: { select: { registrations: true } },
        },
      });
    }
    const workspace = await getWorkspaceContext(ctx.db, ctx);
    if (!workspace.selectedOrganization) return [];
    return ctx.db.event.findMany({
      where: { organizationId: workspace.selectedOrganization.id },
      orderBy: { updatedAt: "desc" },
      include: {
        organization: { select: { companyName: true } },
        organizerFee: { select: { id: true, status: true, amountSen: true, invoiceNumber: true } },
        _count: { select: { registrations: true } },
      },
    });
  }),

  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const isPlatformAdmin = ctx.userRole === ROLES.ADMIN || ctx.userRole === ROLES.DEVELOPER;
    if (isPlatformAdmin) {
      const [totalUsers, totalEvents, totalRegistrations, revenue, pendingEventsCount, recentRegistrations] =
        await Promise.all([
          ctx.db.user.count(),
          ctx.db.event.count(),
          ctx.db.registration.count(),
          ctx.db.order.aggregate({ _sum: { totalPaidSen: true }, where: { status: "PAID" } }),
          ctx.db.event.count({ where: { status: "PENDING_APPROVAL" } }),
          ctx.db.registration.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
              event: { select: { title: true, slug: true } },
              participantProfile: { select: { fullName: true } },
              ticketCategory: { select: { name: true } },
            },
          }),
        ]);
      return {
        role: ctx.userRole,
        totalUsers,
        totalEvents,
        totalRegistrations,
        totalRevenueSen: revenue._sum.totalPaidSen ?? 0,
        pendingEventsCount,
        recentRegistrations,
      };
    }

    const workspace = await getWorkspaceContext(ctx.db, ctx);
    if (workspace.selectedOrganization) {
      const eventWhere = { organizationId: workspace.selectedOrganization.id };
      const [totalEvents, totalRegistrations, revenue, pendingEventsCount, recentRegistrations] = await Promise.all([
        ctx.db.event.count({ where: eventWhere }),
        ctx.db.registration.count({ where: { event: eventWhere } }),
        ctx.db.order.aggregate({ _sum: { totalPaidSen: true }, where: { status: "PAID", event: eventWhere } }),
        ctx.db.event.count({ where: { ...eventWhere, status: "PENDING_APPROVAL" } }),
        ctx.db.registration.findMany({
          where: { event: eventWhere },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            event: { select: { title: true, slug: true } },
            participantProfile: { select: { fullName: true } },
            ticketCategory: { select: { name: true } },
          },
        }),
      ]);
      return {
        role: "ORGANIZER",
        totalEvents,
        totalRegistrations,
        totalRevenueSen: revenue._sum.totalPaidSen ?? 0,
        pendingEventsCount,
        recentRegistrations,
      };
    }

    const now = new Date();
    const [totalRegistrations, upcomingCount, completedCount, recentRegistrations] = await Promise.all([
      ctx.db.registration.count({ where: { order: { userId: ctx.userId } } }),
      ctx.db.registration.count({ where: { order: { userId: ctx.userId }, event: { eventDate: { gte: now } } } }),
      ctx.db.registration.count({ where: { order: { userId: ctx.userId }, event: { eventDate: { lt: now } } } }),
      ctx.db.registration.findMany({
        where: { order: { userId: ctx.userId } },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          event: { select: { title: true, slug: true, eventDate: true } },
          participantProfile: { select: { fullName: true } },
          ticketCategory: { select: { name: true } },
        },
      }),
    ]);
    return { role: ctx.userRole, totalRegistrations, upcomingCount, completedCount, recentRegistrations };
  }),

  createEvent: organizerProcedure.input(eventFormSchema).mutation(async ({ ctx, input }) => {
    const organizationId = await resolveOrganizationForEventCreation(ctx.db, ctx, input.organizationId);
    const existingSlug = await ctx.db.event.findUnique({ where: { slug: input.slug } });
    if (existingSlug) {
      throw new TRPCError({ code: "CONFLICT", message: "This event link is already in use. Please choose another." });
    }

    return ctx.db.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: { ...createEventContent(input), featured: false, organizationId, status: "DRAFT" },
      });
      await recordEventStatus(tx, {
        eventId: event.id,
        organizationId,
        actorUserId: ctx.userId,
        fromStatus: null,
        toStatus: "DRAFT",
        action: "EVENT_CREATED",
        title: event.title,
      });
      return event;
    }).catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new TRPCError({ code: "CONFLICT", message: "This event link is already in use. Please choose another." });
      }
      throw error;
    });
  }),

  submitForApproval: organizerProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(
        ctx.db,
        ctx,
        input.eventId,
        EVENT_MANAGER_ROLES,
        true
      );
      if (!["DRAFT", "NEEDS_CHANGES"].includes(event.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only a draft or revised event can be submitted for review." });
      }
      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.event.update({
          where: { id: event.id },
          data: { status: "PENDING_APPROVAL" },
        });
        await recordEventStatus(tx, {
          eventId: event.id,
          organizationId: event.organizationId,
          actorUserId: ctx.userId,
          fromStatus: event.status,
          toStatus: "PENDING_APPROVAL",
          action: "EVENT_SUBMITTED_FOR_REVIEW",
          title: event.title,
        });
        return updated;
      });
    }),

  updateEvent: organizerProcedure
    .input(eventFormSchema.extend({ eventId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(
        ctx.db,
        ctx,
        input.eventId,
        EVENT_MANAGER_ROLES,
        true
      );
      if (!["DRAFT", "NEEDS_CHANGES", "PENDING_APPROVAL"].includes(event.status)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This event can no longer be edited." });
      }
      if (input.organizationId && input.organizationId !== event.organizationId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "An event cannot be moved between organizer workspaces." });
      }
      if (input.slug !== event.slug) {
        const conflict = await ctx.db.event.findUnique({ where: { slug: input.slug }, select: { id: true } });
        if (conflict) throw new TRPCError({ code: "CONFLICT", message: "This event link is already in use." });
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.ticketCategory.deleteMany({ where: { eventId: event.id } });
        await tx.eventTimelineItem.deleteMany({ where: { eventId: event.id } });
        const updated = await tx.event.update({
          where: { id: event.id },
          data: { ...createEventContent(input), featured: event.featured, status: "DRAFT" },
        });
        if (event.status !== "DRAFT") {
          await recordEventStatus(tx, {
            eventId: event.id,
            organizationId: event.organizationId,
            actorUserId: ctx.userId,
            fromStatus: event.status,
            toStatus: "DRAFT",
            action: "EVENT_REVISED",
            title: event.title,
          });
        } else {
          await writeAuditLog(tx, {
            actorUserId: ctx.userId,
            organizationId: event.organizationId,
            eventId: event.id,
            action: "EVENT_UPDATED",
            entityType: "Event",
            entityId: event.id,
            summary: `${event.title} draft details were updated.`,
          });
        }
        return updated;
      });
    }),

  deleteDraftEvent: organizerProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      if (!["DRAFT", "NEEDS_CHANGES"].includes(event.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only an unpublished event can be deleted." });
      }
      const registrationCount = await ctx.db.registration.count({ where: { eventId: event.id } });
      if (registrationCount > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "An event with registrations cannot be deleted." });
      }
      return ctx.db.$transaction(async (tx) => {
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId: event.id,
          action: "EVENT_DELETED",
          entityType: "Event",
          entityId: event.id,
          summary: `${event.title} was deleted before publication.`,
        });
        return tx.event.delete({ where: { id: event.id } });
      });
    }),

  cancelEvent: organizerProcedure
    .input(z.object({ eventId: z.string().min(1), reason: z.string().trim().min(5).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      if (!["PUBLISHED", "PENDING_APPROVAL", "AWAITING_EVENT_FEE", "REGISTRATION_CLOSED"].includes(event.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This event cannot be cancelled from its current status." });
      }
      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.event.update({ where: { id: event.id }, data: { status: "CANCELLED" } });
        if (event.status === "AWAITING_EVENT_FEE") {
          const activationFee = await tx.organizerFee.findUnique({ where: { eventId: event.id } });
          if (activationFee && ["PENDING", "PROCESSING"].includes(activationFee.status)) {
            await tx.organizerFee.update({ where: { id: activationFee.id }, data: { status: "VOID" } });
            await writeAuditLog(tx, {
              actorUserId: ctx.userId,
              organizationId: event.organizationId,
              eventId: event.id,
              action: "EVENT_ACTIVATION_FEE_VOIDED",
              entityType: "OrganizerFee",
              entityId: activationFee.id,
              summary: `The activation invoice for ${event.title} was voided after event cancellation.`,
            });
          }
        }
        await recordEventStatus(tx, {
          eventId: event.id,
          organizationId: event.organizationId,
          actorUserId: ctx.userId,
          fromStatus: event.status,
          toStatus: "CANCELLED",
          notes: input.reason,
          action: "EVENT_CANCELLED",
          title: event.title,
        });
        await createNotification(tx, {
          userId: event.organizationId ? (await tx.organization.findUniqueOrThrow({ where: { id: event.organizationId }, select: { userId: true } })).userId : ctx.userId,
          type: "EVENT_CANCELLED",
          title: "Event cancelled",
          message: `${event.title} has been cancelled.`,
          href: `/dashboard/events/${event.id}/edit`,
        });
        const participantUsers = await tx.order.findMany({
          where: { eventId: event.id, status: "PAID" },
          distinct: ["userId"],
          select: { userId: true },
        });
        if (participantUsers.length > 0) {
          await tx.notification.createMany({
            data: participantUsers.map(({ userId }) => ({
              userId,
              type: "EVENT_CANCELLED",
              title: "Registered event cancelled",
              message: `${event.title} has been cancelled: ${input.reason}`,
              href: "/dashboard/registrations",
            })),
          });
        }

        const organizerEmail = event.organizationId
          ? (await tx.organization.findUniqueOrThrow({
              where: { id: event.organizationId },
              select: { companyName: true, user: { select: { email: true } } },
            }))
          : null;

        if (organizerEmail) {
          const { sendTransactionalEmail } = await import("@/server/services/email-service");
          const { EventCancelledOrganizerEmail } = await import("@/server/services/email-templates/event-cancelled-organizer");

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

          await sendTransactionalEmail({
            to: organizerEmail.user.email,
            subject: `Event cancelled — ${event.title}`,
            reactTemplate: EventCancelledOrganizerEmail({
              organizationName: organizerEmail.companyName,
              eventTitle: event.title,
              cancellationReason: input.reason,
              participantCount: participantUsers.length,
              manageUrl: `${appUrl}/dashboard/events`,
            }),
          });
        }

        if (participantUsers.length > 0) {
          const { sendTransactionalEmail } = await import("@/server/services/email-service");
          const { EventCancelledParticipantEmail } = await import("@/server/services/email-templates/event-cancelled-participant");

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

          const participantEmails = await tx.user.findMany({
            where: { id: { in: participantUsers.map((u) => u.userId) } },
            select: { id: true, email: true, name: true },
          });

          for (const user of participantEmails) {
            await sendTransactionalEmail({
              to: user.email,
              subject: `Event cancelled — ${event.title}`,
              reactTemplate: EventCancelledParticipantEmail({
                participantName: user.name ?? "Runner",
                eventTitle: event.title,
                cancellationReason: input.reason,
                exploreUrl: `${appUrl}/events`,
              }),
            });
          }
        }

        return updated;
      });
    }),

  advanceEventLifecycle: organizerProcedure
    .input(z.object({ eventId: z.string().min(1), action: z.enum(["CLOSE_REGISTRATION", "COMPLETE"]) }))
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      const nextStatus: EventStatus = input.action === "CLOSE_REGISTRATION" ? "REGISTRATION_CLOSED" : "COMPLETED";
      if (input.action === "CLOSE_REGISTRATION" && event.status !== "PUBLISHED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only a published event can close registrations." });
      }
      if (input.action === "COMPLETE" && event.status !== "REGISTRATION_CLOSED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Close registrations before completing the event." });
      }
      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.event.update({ where: { id: event.id }, data: { status: nextStatus } });
        await recordEventStatus(tx, {
          eventId: event.id,
          organizationId: event.organizationId,
          actorUserId: ctx.userId,
          fromStatus: event.status,
          toStatus: nextStatus,
          action: input.action === "CLOSE_REGISTRATION" ? "EVENT_REGISTRATION_CLOSED" : "EVENT_COMPLETED",
          title: event.title,
        });
        return updated;
      });
    }),

  moderateEvent: adminProcedure
    .input(
      z.object({
        eventId: z.string().min(1),
        action: z.enum(["APPROVE", "REQUEST_CHANGES", "CANCEL"]),
        notes: z.string().trim().min(5).max(1000).optional(),
      }).superRefine((value, refinement) => {
        if (value.action !== "APPROVE" && !value.notes) {
          refinement.addIssue({ code: "custom", path: ["notes"], message: "A reason is required for this decision." });
        }
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({ where: { id: input.eventId } });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      if (
        input.action === "APPROVE" &&
        !["PENDING_APPROVAL", "AWAITING_EVENT_FEE"].includes(event.status)
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only submitted events can be approved." });
      }
      if (input.action === "REQUEST_CHANGES" && event.status !== "PENDING_APPROVAL") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only submitted events can be reviewed." });
      }
      if (input.action === "CANCEL" && ["CANCELLED", "COMPLETED"].includes(event.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This event is already closed." });
      }
      return ctx.db.$transaction(async (tx) => {
        if (input.action === "APPROVE") {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`event-approval:${event.id}`})) IS NULL AS locked`;
          const current = await tx.event.findUnique({
            where: { id: event.id },
            include: { organizerFee: true },
          });
          if (!current) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
          }
          if (current.status === "AWAITING_EVENT_FEE" && current.organizerFee) {
            return current;
          }
          if (current.status !== "PENDING_APPROVAL") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Event review state changed. Please refresh.",
            });
          }

          const organizerFee = await tx.organizerFee.upsert({
            where: { eventId: current.id },
            update: {},
            create: {
              organizationId: current.organizationId,
              eventId: current.id,
              amountSen: (await getActiveFeeSchedule(tx)).eventActivationFeeSen,
              invoiceNumber: createActivationInvoiceNumber(current.id),
              status: "PENDING",
            },
          });
          const updated = await tx.event.update({
            where: { id: current.id },
            data: { status: "AWAITING_EVENT_FEE" },
          });
          await recordEventStatus(tx, {
            eventId: current.id,
            organizationId: current.organizationId,
            actorUserId: ctx.userId,
            fromStatus: "PENDING_APPROVAL",
            toStatus: "AWAITING_EVENT_FEE",
            notes: input.notes,
            action: "EVENT_APPROVED_AWAITING_ACTIVATION",
            title: current.title,
          });
          await writeAuditLog(tx, {
            actorUserId: ctx.userId,
            organizationId: current.organizationId,
            eventId: current.id,
            action: "EVENT_ACTIVATION_INVOICE_ISSUED",
            entityType: "OrganizerFee",
            entityId: organizerFee.id,
            summary: `Activation invoice ${organizerFee.invoiceNumber} was issued for ${current.title}.`,
            metadata: { amountSen: organizerFee.amountSen },
          });
          const organization = await tx.organization.findUniqueOrThrow({
            where: { id: current.organizationId },
            select: { userId: true },
          });
          await createNotification(tx, {
            userId: organization.userId,
            type: "EVENT_APPROVED_AWAITING_ACTIVATION",
            title: "Event approved — activation required",
            message: `${current.title} was approved. Settle invoice ${organizerFee.invoiceNumber} to publish it.`,
            href: "/dashboard/event-fees",
          });
          return { ...updated, organizerFee };
        }

        const nextStatus: EventStatus =
          input.action === "REQUEST_CHANGES" ? "NEEDS_CHANGES" : "CANCELLED";
        const updated = await tx.event.update({ where: { id: event.id }, data: { status: nextStatus } });
        if (input.action === "CANCEL" && event.status === "AWAITING_EVENT_FEE") {
          const activationFee = await tx.organizerFee.findUnique({ where: { eventId: event.id } });
          if (activationFee && ["PENDING", "PROCESSING"].includes(activationFee.status)) {
            await tx.organizerFee.update({ where: { id: activationFee.id }, data: { status: "VOID" } });
            await writeAuditLog(tx, {
              actorUserId: ctx.userId,
              organizationId: event.organizationId,
              eventId: event.id,
              action: "EVENT_ACTIVATION_FEE_VOIDED",
              entityType: "OrganizerFee",
              entityId: activationFee.id,
              summary: `The activation invoice for ${event.title} was voided by platform operations.`,
            });
          }
        }
        await recordEventStatus(tx, {
          eventId: event.id,
          organizationId: event.organizationId,
          actorUserId: ctx.userId,
          fromStatus: event.status,
          toStatus: nextStatus,
          notes: input.notes,
          action: `EVENT_${input.action}`,
          title: event.title,
        });
        const organization = await tx.organization.findUniqueOrThrow({
          where: { id: event.organizationId },
          select: { userId: true },
        });
        await createNotification(tx, {
          userId: organization.userId,
          type: `EVENT_${input.action}`,
          title:
            input.action === "REQUEST_CHANGES"
              ? "Changes requested for your event"
              : "Event cancelled",
          message:
            input.notes ||
            `${event.title} is now ${nextStatus.toLowerCase().replaceAll("_", " ")}.`,
          href: `/dashboard/events/${event.id}/edit`,
        });
        if (input.action === "CANCEL") {
          const participantUsers = await tx.order.findMany({
            where: { eventId: event.id, status: "PAID" },
            distinct: ["userId"],
            select: { userId: true },
          });
          if (participantUsers.length > 0) {
            await tx.notification.createMany({
              data: participantUsers.map(({ userId }) => ({
                userId,
                type: "EVENT_CANCELLED",
                title: "Registered event cancelled",
                message: `${event.title} has been cancelled. Refer to the event terms or organizer for the next steps.`,
                href: "/dashboard/registrations",
              })),
            });
          }
        }
        return updated;
      });
    }),

  getOrganizerDashboard: organizerProcedure.query(async ({ ctx }) => {
    const workspace = await getWorkspaceContext(ctx.db, ctx);
    if (!workspace.selectedOrganization) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You need an organizer workspace to view the dashboard." });
    }

    const { id: organizationId, companyName, memberRole, status } = workspace.selectedOrganization;
    const now = new Date();
    const eventWhere: Prisma.EventWhereInput = { organizationId };

    // Financial access check
    const hasFinancialAccess = memberRole === "PLATFORM_ADMIN" ||
      ["OWNER", "MANAGER", "FINANCE"].includes(memberRole);

    // Helper: Malaysia date bucketing for trends
    function malaysiaDateParts(date: Date) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kuala_Lumpur",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(date);
      const value = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value || "";
      return `${value("year")}-${value("month")}-${value("day")}`;
    }

    // Zone 1: Action items
    const [
      awaitingActivationFee,
      needsChanges,
      pendingApproval,
      eventsForSettlement,
      closingSoonEvents,
    ] = await Promise.all([
      ctx.db.event.count({ where: { ...eventWhere, status: "AWAITING_EVENT_FEE" } }),
      ctx.db.event.count({ where: { ...eventWhere, status: "NEEDS_CHANGES" } }),
      ctx.db.event.count({ where: { ...eventWhere, status: "PENDING_APPROVAL" } }),
      ctx.db.event.findMany({
        where: {
          ...eventWhere,
          status: { in: ["REGISTRATION_CLOSED", "COMPLETED"] },
          settlements: { none: { status: { in: ["SETTLED", "PROCESSING"] } } },
        },
        select: { id: true },
      }),
      ctx.db.event.findMany({
        where: {
          ...eventWhere,
          status: "PUBLISHED",
          registrationCloseDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: { id: true, title: true, registrationCloseDate: true },
        take: 3,
        orderBy: { registrationCloseDate: "asc" },
      }),
    ]);

    const closingSoon = closingSoonEvents.map((event) => {
      const daysLeft = Math.ceil(
        (event.registrationCloseDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      return {
        eventId: event.id,
        title: event.title,
        closeDate: event.registrationCloseDate.toISOString(),
        daysLeft,
      };
    });

    // Zone 2: KPI
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      activeEvents,
      totalRegistrations,
      recentRegistrationsCount,
      revenueData,
      previousRevenueData,
      categoriesForFillRate,
    ] = await Promise.all([
      ctx.db.event.count({ where: { ...eventWhere, status: "PUBLISHED" } }),
      ctx.db.registration.count({ where: { event: eventWhere, status: "ACTIVE" } }),
      ctx.db.registration.count({
        where: { event: eventWhere, status: "ACTIVE", createdAt: { gte: thirtyDaysAgo } },
      }),
      hasFinancialAccess
        ? ctx.db.order.aggregate({
            _sum: { organizerNetSen: true, totalPaidSen: true },
            where: { status: "PAID", event: eventWhere, paidAt: { gte: thirtyDaysAgo } },
          })
        : Promise.resolve({ _sum: { organizerNetSen: null, totalPaidSen: null } }),
      hasFinancialAccess
        ? ctx.db.order.aggregate({
            _sum: { organizerNetSen: true },
            where: {
              status: "PAID",
              event: eventWhere,
              paidAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            },
          })
        : Promise.resolve({ _sum: { organizerNetSen: null } }),
      ctx.db.ticketCategory.findMany({
        where: { event: eventWhere, isActive: true, maxSlots: { not: null } },
        select: { currentRegistrations: true, maxSlots: true },
      }),
    ]);

    const registrationsDelta = recentRegistrationsCount;
    const revenueDeltaSen = hasFinancialAccess
      ? (revenueData._sum.organizerNetSen ?? 0) - (previousRevenueData._sum.organizerNetSen ?? 0)
      : 0;

    let avgFillRatePercent: number | null = null;
    if (categoriesForFillRate.length > 0) {
      const totalRegistrations = categoriesForFillRate.reduce(
        (sum, cat) => sum + cat.currentRegistrations,
        0
      );
      const totalSlots = categoriesForFillRate.reduce((sum, cat) => sum + (cat.maxSlots ?? 0), 0);
      avgFillRatePercent = totalSlots > 0 ? Math.round((totalRegistrations / totalSlots) * 100) : 0;
    }

    // Zone 3: Registration trend (30 days)
    const trendRegistrations = await ctx.db.registration.findMany({
      where: { event: eventWhere, status: "ACTIVE", createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    const trendMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = malaysiaDateParts(date);
      trendMap.set(dateKey, 0);
    }
    trendRegistrations.forEach((reg) => {
      const dateKey = malaysiaDateParts(reg.createdAt);
      if (trendMap.has(dateKey)) {
        trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + 1);
      }
    });
    const registrationTrend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Revenue trend for FINANCE role
    let revenueTrend: Array<{ date: string; netSen: number }> | undefined;
    if (hasFinancialAccess && memberRole === "FINANCE") {
      const trendOrders = await ctx.db.order.findMany({
        where: { status: "PAID", event: eventWhere, paidAt: { gte: thirtyDaysAgo } },
        select: { paidAt: true, organizerNetSen: true },
      });
      const revenueTrendMap = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = malaysiaDateParts(date);
        revenueTrendMap.set(dateKey, 0);
      }
      trendOrders.forEach((order) => {
        if (order.paidAt) {
          const dateKey = malaysiaDateParts(order.paidAt);
          if (revenueTrendMap.has(dateKey)) {
            revenueTrendMap.set(dateKey, (revenueTrendMap.get(dateKey) ?? 0) + order.organizerNetSen);
          }
        }
      });
      revenueTrend = Array.from(revenueTrendMap.entries())
        .map(([date, netSen]) => ({ date, netSen }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Zone 4: Upcoming events
    const upcomingEventsData = await ctx.db.event.findMany({
      where: { ...eventWhere, status: "PUBLISHED", eventDate: { gte: now } },
      select: {
        id: true,
        title: true,
        slug: true,
        eventDate: true,
        categories: {
          where: { isActive: true },
          select: { maxSlots: true, currentRegistrations: true },
        },
        _count: { select: { registrations: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { eventDate: "asc" },
      take: 3,
    });

    const upcomingEvents = upcomingEventsData.map((event) => {
      const daysUntil = Math.ceil(
        (event.eventDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      const registrations = event._count.registrations;
      const categoriesWithSlots = event.categories.filter((cat) => cat.maxSlots !== null);
      const totalMaxSlots =
        categoriesWithSlots.length > 0
          ? categoriesWithSlots.reduce((sum, cat) => sum + (cat.maxSlots ?? 0), 0)
          : null;
      const fillRatePercent =
        totalMaxSlots !== null && totalMaxSlots > 0
          ? Math.round((registrations / totalMaxSlots) * 100)
          : null;

      return {
        eventId: event.id,
        title: event.title,
        slug: event.slug,
        eventDate: event.eventDate.toISOString(),
        daysUntil,
        registrations,
        totalMaxSlots,
        fillRatePercent,
      };
    });

    // Zone 5: Recent registrations
    const recentRegistrations = await ctx.db.registration.findMany({
      where: { event: eventWhere, status: "ACTIVE" },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        registrationCode: true,
        createdAt: true,
        participantProfile: { select: { fullName: true } },
        event: { select: { title: true, slug: true } },
        ticketCategory: { select: { name: true } },
      },
    });

    return {
      workspace: {
        id: organizationId,
        companyName,
        memberRole,
        status,
      },
      actionItems: {
        awaitingActivationFee,
        needsChanges,
        pendingApproval,
        readyForSettlement: eventsForSettlement.length,
        closingSoon,
      },
      kpi: {
        activeEvents,
        totalRegistrations,
        registrationsDelta,
        organizerNetSen: hasFinancialAccess ? revenueData._sum.organizerNetSen ?? 0 : 0,
        grossPaidSen: hasFinancialAccess ? revenueData._sum.totalPaidSen ?? 0 : 0,
        revenueDeltaSen,
        avgFillRatePercent,
      },
      registrationTrend,
      revenueTrend,
      upcomingEvents,
      recentRegistrations: recentRegistrations.map((reg) => ({
        id: reg.id,
        registrationCode: reg.registrationCode,
        createdAt: reg.createdAt.toISOString(),
        participantName: reg.participantProfile.fullName,
        eventTitle: reg.event.title,
        eventSlug: reg.event.slug,
        categoryName: reg.ticketCategory.name,
      })),
    };
  }),

  // Lightweight picklist for broadcast/dropdown usage — returns id+title for all accessible events
  getEventPicklist: organizerProcedure.query(async ({ ctx }) => {
    const isPlatformAdmin = ctx.userRole === ROLES.ADMIN || ctx.userRole === ROLES.DEVELOPER;
    if (isPlatformAdmin) {
      return ctx.db.event.findMany({
        select: { id: true, title: true, status: true },
        orderBy: { eventDate: "desc" },
        take: 200,
      });
    }
    const workspace = await getWorkspaceContext(ctx.db, ctx);
    if (!workspace.selectedOrganization) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You need an organizer workspace." });
    }
    return ctx.db.event.findMany({
      where: { organizationId: workspace.selectedOrganization.id },
      select: { id: true, title: true, status: true },
      orderBy: { eventDate: "desc" },
    });
  }),

  // B-16: Duplicate an existing event (creates a DRAFT copy with all categories + timeline)
  duplicateEvent: organizerProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);

      const source = await ctx.db.event.findUnique({
        where: { id: event.id },
        include: {
          categories: true,
          timelineItems: { orderBy: { orderIndex: "asc" } },
        },
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Source event not found." });

      // Generate a unique slug for the copy
      const baseSlug = `${source.slug}-copy`;
      const suffix = Date.now().toString(36);
      const newSlug = `${baseSlug}-${suffix}`;

      const existing = await ctx.db.event.findUnique({ where: { slug: newSlug } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Could not generate a unique slug. Please try again." });

      const {
        id: _id, slug: _slug, status: _status, featured: _featured,
        organizerFee: _fee, createdAt: _createdAt, updatedAt: _updatedAt,
        organizationId, categories, timelineItems, ...rest
      } = source as typeof source & { organizerFee?: unknown };
      void _id; void _slug; void _status; void _featured; void _fee; void _createdAt; void _updatedAt;

      const newEvent = await ctx.db.$transaction(async (tx) => {
        const created = await tx.event.create({
          data: {
            ...rest,
            title: `${source.title} (Copy)`,
            slug: newSlug,
            status: "DRAFT",
            featured: false,
            organizationId,
            categories: {
              create: categories.map(({ id: _cid, eventId: _eid, createdAt: _ca, updatedAt: _ua, currentRegistrations: _cr, ...cat }) => {
                void _cid; void _eid; void _ca; void _ua; void _cr;
                return cat;
              }),
            },
            timelineItems: {
              create: timelineItems.map(({ id: _tid, eventId: _eid, createdAt: _ca, updatedAt: _ua, ...item }) => {
                void _tid; void _eid; void _ca; void _ua;
                return item;
              }),
            },
          },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId,
          eventId: created.id,
          action: "EVENT_DUPLICATED",
          entityType: "Event",
          entityId: created.id,
          summary: `Event "${created.title}" was duplicated from "${source.title}".`,
          metadata: { sourceEventId: source.id },
        });
        return created;
      });

      return { id: newEvent.id, slug: newEvent.slug, title: newEvent.title };
    }),
});
