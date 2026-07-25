import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, developerProcedure, organizerProcedure } from "../trpc";
import { getWorkspaceContext, requireApprovedOrganizationAccess } from "@/server/policies/rbac";
import { writeAuditLog } from "@/server/services/audit-service";
import type { Role } from "@/generated/prisma";

export const adminRouter = createTRPCRouter({
  getAnalytics: adminProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let startDate: Date | undefined;

      switch (input.timeRange) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case "all":
          startDate = undefined;
          break;
      }

      const totalEvents = await ctx.db.event.count({
        where: startDate ? { createdAt: { gte: startDate } } : undefined,
      });

      const totalOrganizers = await ctx.db.organization.count({
        where: startDate ? { createdAt: { gte: startDate } } : undefined,
      });

      const totalRegistrations = await ctx.db.registration.count({
        where: startDate ? { createdAt: { gte: startDate } } : undefined,
      });

      // Revenue from actually paid orders (not list price — discounts and early-bird are reflected here)
      const paidOrders = await ctx.db.order.findMany({
        where: {
          status: "PAID",
          ...(startDate ? { paidAt: { gte: startDate } } : {}),
        },
        select: { paidAt: true, totalPaidSen: true },
        orderBy: { paidAt: "asc" },
      });

      const revenueByDate: Record<string, number> = {};
      let totalRevenueSen = 0;

      for (const order of paidOrders) {
        const dateKey = (order.paidAt ?? new Date()).toISOString().split("T")[0];
        revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + order.totalPaidSen;
        totalRevenueSen += order.totalPaidSen;
      }

      const revenueTrend = Object.entries(revenueByDate)
        .map(([date, revenueSen]) => ({
          date,
          revenueSen,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const topEvents = await ctx.db.event.findMany({
        where: startDate ? { createdAt: { gte: startDate } } : undefined,
        select: {
          id: true,
          title: true,
          slug: true,
          eventDate: true,
          _count: {
            select: { registrations: { where: { status: "ACTIVE" } } },
          },
          registrations: {
            where: { status: "ACTIVE" },
            select: {
              ticketCategory: { select: { priceSen: true } },
            },
          },
        },
        orderBy: {
          registrations: { _count: "desc" },
        },
        take: 10,
      });

      const topEventsWithRevenue = topEvents.map((event) => {
        const revenueSen = event.registrations.reduce(
          (sum, reg) => sum + (reg.ticketCategory?.priceSen || 0),
          0
        );
        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          eventDate: event.eventDate,
          registrationCount: event._count.registrations,
          revenueSen,
        };
      });

      return {
        totalEvents,
        totalOrganizers,
        totalRegistrations,
        totalRevenueSen,
        revenueTrend,
        topEvents: topEventsWithRevenue,
      };
    }),

  // B-14: Platform-wide or event-scoped broadcast (admin/developer only)
  broadcastMessage: adminProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(100),
        message: z.string().trim().min(1).max(500),
        href: z.string().trim().max(200).optional(),
        // target: "all" → every user; "event" → participants of a specific event
        target: z.enum(["all", "event"]).default("all"),
        eventId: z.string().optional(),
      }).superRefine((data, ctx) => {
        if (data.target === "event" && !data.eventId) {
          ctx.addIssue({ code: "custom", path: ["eventId"], message: "Event ID is required when targeting an event." });
        }
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Hard cap: protect the notification table from a single call inserting
      // unlimited rows. 10,000 recipients is generous for a real event platform;
      // larger campaigns should use an async job queue instead.
      const MAX_RECIPIENTS = 10_000;

      let userIds: string[];

      if (input.target === "event" && input.eventId) {
        const registrations = await ctx.db.registration.findMany({
          where: { eventId: input.eventId, status: "ACTIVE" },
          select: { order: { select: { userId: true } } },
        });
        const uniqueUserIds = [...new Set(registrations.map((r) => r.order.userId))];
        userIds = uniqueUserIds;
      } else {
        const users = await ctx.db.user.findMany({ select: { id: true } });
        userIds = users.map((u) => u.id);
      }

      if (userIds.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No recipients found for the selected target." });
      }

      if (userIds.length > MAX_RECIPIENTS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Broadcast exceeds the ${MAX_RECIPIENTS.toLocaleString()}-recipient limit. Use a more targeted audience or contact the platform team for bulk delivery.`,
        });
      }

      // Batch-insert notifications in chunks of 100 to avoid large transactions
      const CHUNK = 100;
      let sent = 0;
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const batch = userIds.slice(i, i + CHUNK);
        await ctx.db.$transaction(
          batch.map((userId) =>
            ctx.db.notification.create({
              data: {
                userId,
                type: "BROADCAST",
                title: input.title,
                message: input.message,
                href: input.href ?? null,
              },
            })
          )
        );
        sent += batch.length;
      }

      return { sent };
    }),

  // B-14: Organizer-scoped broadcast to participants of one of their events
  broadcastEventMessage: organizerProcedure
    .input(
      z.object({
        eventId: z.string().min(1),
        title: z.string().trim().min(1).max(100),
        message: z.string().trim().min(1).max(500),
        href: z.string().trim().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.db, ctx);
      if (!workspace.selectedOrganization) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You need an organizer workspace." });
      }
      await requireApprovedOrganizationAccess(ctx.db, ctx, workspace.selectedOrganization.id);

      // Verify the event belongs to this organizer's organization
      const event = await ctx.db.event.findFirst({
        where: { id: input.eventId, organizationId: workspace.selectedOrganization.id },
        select: { id: true, title: true },
      });
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found in your workspace." });
      }

      const registrations = await ctx.db.registration.findMany({
        where: { eventId: input.eventId, status: "ACTIVE" },
        select: { order: { select: { userId: true } } },
      });
      const uniqueUserIds = [...new Set(registrations.map((r) => r.order.userId))];

      if (uniqueUserIds.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active participants found for this event." });
      }

      const MAX_EVENT_RECIPIENTS = 5_000;
      if (uniqueUserIds.length > MAX_EVENT_RECIPIENTS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This event has ${uniqueUserIds.length} participants which exceeds the ${MAX_EVENT_RECIPIENTS.toLocaleString()}-recipient limit for a single broadcast.`,
        });
      }

      const CHUNK = 100;
      let sent = 0;
      for (let i = 0; i < uniqueUserIds.length; i += CHUNK) {
        const batch = uniqueUserIds.slice(i, i + CHUNK);
        await ctx.db.$transaction(
          batch.map((userId) =>
            ctx.db.notification.create({
              data: {
                userId,
                type: "EVENT_BROADCAST",
                title: input.title,
                message: input.message,
                href: input.href ?? null,
              },
            })
          )
        );
        sent += batch.length;
      }

      return { sent, eventTitle: event.title };
    }),

  // B-17: Global search across events, users, and organizations (admin/developer only)
  globalSearch: adminProcedure
    .input(
      z.object({
        query: z.string().trim().min(1).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const q = input.query;

      const [events, users, organizations] = await Promise.all([
        ctx.db.event.findMany({
          where: {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { venue: { contains: q, mode: "insensitive" } },
              { state: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, title: true, slug: true, status: true, eventDate: true, state: true },
          take: 8,
          orderBy: { eventDate: "desc" },
        }),
        ctx.db.user.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.organization.findMany({
          where: {
            OR: [
              { companyName: { contains: q, mode: "insensitive" } },
              { ssmNumber: { contains: q, mode: "insensitive" } },
              { contactPerson: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, companyName: true, ssmNumber: true, status: true, contactPerson: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return { events, users, organizations };
    }),

  getUsersList: adminProcedure
    .input(
      z.object({
        search: z.string().trim().max(100).optional(),
        role: z.enum(["ALL", "DEVELOPER", "ADMIN", "ORGANIZER", "USER"]).default("ALL"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereCondition = {
        ...(input.role !== "ALL" ? { role: input.role as Role } : {}),
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: "insensitive" as const } },
                { email: { contains: input.search, mode: "insensitive" as const } },
                { userProfile: { fullName: { contains: input.search, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      };

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where: whereCondition,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            bannedAt: true,
            banReason: true,
            createdAt: true,
            userProfile: {
              select: {
                fullName: true,
                nationality: true,
              },
            },
            activeOrganization: {
              select: {
                id: true,
                companyName: true,
              },
            },
            _count: {
              select: {
                orders: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.user.count({ where: whereCondition }),
      ]);

      return {
        users,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit) || 1,
      };
    }),

  updateUserByAdmin: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        name: z.string().trim().min(2).max(100),
        fullName: z.string().trim().min(2).max(100),
        nationality: z.string().trim().min(2).default("Malaysian"),
        role: z.enum(["DEVELOPER", "ADMIN", "ORGANIZER", "USER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true, email: true },
      });

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target user not found." });
      }

      // Hierarchy Guard 1: ADMIN cannot modify a DEVELOPER account
      if (targetUser.role === "DEVELOPER" && ctx.userRole !== "DEVELOPER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Developer accounts are protected and can only be modified by another Developer.",
        });
      }

      // Hierarchy Guard 2: ADMIN cannot grant the DEVELOPER role
      if (input.role === "DEVELOPER" && ctx.userRole !== "DEVELOPER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only a Developer can assign the Developer role to an account.",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          name: input.name,
          role: input.role,
          userProfile: {
            upsert: {
              create: {
                fullName: input.fullName,
                nationality: input.nationality,
              },
              update: {
                fullName: input.fullName,
                nationality: input.nationality,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      await writeAuditLog(ctx.db, {
        actorUserId: ctx.userId,
        action: "USER_PROFILE_UPDATED_BY_ADMIN",
        entityType: "User",
        entityId: input.userId,
        summary: `Admin/Dev ${ctx.session?.user?.name || ctx.userId} updated user profile and role for ${targetUser.email} (Role: ${input.role}).`,
      });

      return updatedUser;
    }),

  toggleUserBan: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        banned: z.boolean(),
        reason: z.string().trim().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot ban your own account." });
      }

      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true, email: true },
      });

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target user not found." });
      }

      // Hierarchy Guard: ADMIN cannot ban a DEVELOPER account
      if (targetUser.role === "DEVELOPER" && ctx.userRole !== "DEVELOPER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Developer accounts cannot be banned by an Admin.",
        });
      }

      const bannedAt = input.banned ? new Date() : null;
      const banReason = input.banned ? input.reason || "Suspended by platform administration" : null;

      const updatedUser = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          bannedAt,
          banReason,
        },
        select: { id: true, email: true, bannedAt: true },
      });

      // Invalidate active sessions if user is banned
      if (input.banned) {
        await ctx.db.session.deleteMany({
          where: { userId: input.userId },
        });
      }

      await writeAuditLog(ctx.db, {
        actorUserId: ctx.userId,
        action: input.banned ? "USER_BANNED" : "USER_UNBANNED",
        entityType: "User",
        entityId: input.userId,
        summary: `${ctx.session?.user?.name || ctx.userId} ${input.banned ? "banned" : "unbanned"} user ${targetUser.email}. Reason: ${banReason || "N/A"}`,
      });

      return updatedUser;
    }),

  deleteUserByDev: developerProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        confirmationEmail: z.string().trim().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account." });
      }

      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true },
      });

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target user not found." });
      }

      const isMatch =
        input.confirmationEmail.toLowerCase() === targetUser.email.toLowerCase() ||
        input.confirmationEmail === "DELETE";

      if (!isMatch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Confirmation email or text does not match target user email.",
        });
      }

      await ctx.db.user.delete({
        where: { id: input.userId },
      });

      await writeAuditLog(ctx.db, {
        actorUserId: ctx.userId,
        action: "USER_DELETED_PERMANENTLY",
        entityType: "User",
        entityId: input.userId,
        summary: `Developer ${ctx.session?.user?.name || ctx.userId} permanently deleted user account ${targetUser.email}.`,
      });

      return { success: true, deletedEmail: targetUser.email };
    }),

  getEmailStatus: developerProcedure.query(async () => {
    const { serverEnv } = await import("@/server/env");
    return {
      resendConfigured: Boolean(serverEnv.RESEND_API_KEY && serverEnv.RESEND_API_KEY.length > 0),
      fromEmail: serverEnv.RESEND_FROM_EMAIL || "notifications@nexrun.my",
    };
  }),

  renderEmailPreview: developerProcedure
    .input(
      z.object({
        templateKey: z.enum([
          "registration-confirmed",
          "event-published",
          "event-cancelled-organizer",
          "event-cancelled-participant",
          "race-day-reminder",
          "settlement-completed",
        ]),
      })
    )
    .query(async ({ input }) => {
      const { render } = await import("@react-email/render");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      let subject = "NexRun Email Notification";
      let reactElement: React.ReactElement;

      switch (input.templateKey) {
        case "registration-confirmed": {
          const { RegistrationConfirmedEmail } = await import("@/server/services/email-templates/registration-confirmed");
          subject = "Registration Confirmed — Cyberjaya Tech Dash 2026";
          reactElement = RegistrationConfirmedEmail({
            participantName: "Aznan Developer",
            eventTitle: "Cyberjaya Tech Dash 2026",
            eventDate: "Sunday, 18 Oct 2026",
            eventVenue: "Taman Tasik Cyberjaya, Selangor",
            registeredParticipants: [
              { name: "Aznan Developer", category: "10KM Open (Men)", registrationCode: "REG-2026-CYBER-888" },
            ],
            totalPaidSen: 7500,
            ticketsUrl: `${appUrl}/dashboard/my-registrations`,
          });
          break;
        }
        case "event-published": {
          const { EventPublishedEmail } = await import("@/server/services/email-templates/event-published");
          subject = "Event Published — Cyberjaya Tech Dash 2026 is now LIVE!";
          reactElement = EventPublishedEmail({
            organizationName: "Run Malaysia Events Sdn Bhd",
            eventTitle: "Cyberjaya Tech Dash 2026",
            publishedDate: new Date().toLocaleDateString("en-MY", { dateStyle: "medium" }),
            eventUrl: `${appUrl}/events/cyberjaya-tech-dash-2026`,
            manageUrl: `${appUrl}/dashboard/events`,
          });
          break;
        }
        case "event-cancelled-organizer": {
          const { EventCancelledOrganizerEmail } = await import("@/server/services/email-templates/event-cancelled-organizer");
          subject = "Notice: Cyberjaya Tech Dash 2026 has been cancelled";
          reactElement = EventCancelledOrganizerEmail({
            organizationName: "Run Malaysia Events Sdn Bhd",
            eventTitle: "Cyberjaya Tech Dash 2026",
            cancellationReason: "Severe weather warning & local authority advisory.",
            participantCount: 420,
            manageUrl: `${appUrl}/dashboard/events`,
          });
          break;
        }
        case "event-cancelled-participant": {
          const { EventCancelledParticipantEmail } = await import("@/server/services/email-templates/event-cancelled-participant");
          subject = "Important: Cyberjaya Tech Dash 2026 Has Been Cancelled";
          reactElement = EventCancelledParticipantEmail({
            participantName: "Aznan Developer",
            eventTitle: "Cyberjaya Tech Dash 2026",
            cancellationReason: "Severe weather warning & local authority advisory.",
            exploreUrl: `${appUrl}/events`,
          });
          break;
        }
        case "race-day-reminder": {
          const { RaceDayReminderEmail } = await import("@/server/services/email-templates/race-day-reminder");
          subject = "Race Day Reminder: Cyberjaya Tech Dash 2026 is Tomorrow!";
          reactElement = RaceDayReminderEmail({
            participantName: "Aznan Developer",
            eventTitle: "Cyberjaya Tech Dash 2026",
            eventDate: "Sunday, 18 Oct 2026",
            startTime: "06:30 AM",
            venue: "Taman Tasik Cyberjaya",
            venueAddress: "Persiaran Semarak Api, 63000 Cyberjaya, Selangor",
            registrationCode: "REG-2026-CYBER-888",
            eTicketUrl: `${appUrl}/verify/registration/REG-2026-CYBER-888`,
          });
          break;
        }
        case "settlement-completed": {
          const { SettlementCompletedEmail } = await import("@/server/services/email-templates/settlement-completed");
          subject = "Settlement Processed — Cyberjaya Tech Dash 2026";
          reactElement = SettlementCompletedEmail({
            organizationName: "Run Malaysia Events Sdn Bhd",
            eventTitle: "Cyberjaya Tech Dash 2026",
            netPayoutSen: 1250000,
            referenceNumber: "MBB-STL-20261018-9988",
            settlementDate: new Date().toLocaleDateString("en-MY", { dateStyle: "medium" }),
            settlementsUrl: `${appUrl}/dashboard/settlements`,
          });
          break;
        }
      }

      const html = await render(reactElement);
      return { html, subject };
    }),

  sendTestEmail: developerProcedure
    .input(
      z.object({
        templateKey: z.enum([
          "registration-confirmed",
          "event-published",
          "event-cancelled-organizer",
          "event-cancelled-participant",
          "race-day-reminder",
          "settlement-completed",
        ]),
        recipientEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sendTransactionalEmail } = await import("@/server/services/email-service");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      let subject = "NexRun Test Email";
      let reactElement: React.ReactElement;

      switch (input.templateKey) {
        case "registration-confirmed": {
          const { RegistrationConfirmedEmail } = await import("@/server/services/email-templates/registration-confirmed");
          subject = "[TEST] Registration Confirmed — Cyberjaya Tech Dash 2026";
          reactElement = RegistrationConfirmedEmail({
            participantName: "Aznan Developer",
            eventTitle: "Cyberjaya Tech Dash 2026",
            eventDate: "Sunday, 18 Oct 2026",
            eventVenue: "Taman Tasik Cyberjaya, Selangor",
            registeredParticipants: [
              { name: "Aznan Developer", category: "10KM Open (Men)", registrationCode: "REG-2026-CYBER-888" },
            ],
            totalPaidSen: 7500,
            ticketsUrl: `${appUrl}/dashboard/my-registrations`,
          });
          break;
        }
        case "event-published": {
          const { EventPublishedEmail } = await import("@/server/services/email-templates/event-published");
          subject = "[TEST] Event Published — Cyberjaya Tech Dash 2026";
          reactElement = EventPublishedEmail({
            organizationName: "Run Malaysia Events Sdn Bhd",
            eventTitle: "Cyberjaya Tech Dash 2026",
            publishedDate: new Date().toLocaleDateString("en-MY", { dateStyle: "medium" }),
            eventUrl: `${appUrl}/events/cyberjaya-tech-dash-2026`,
            manageUrl: `${appUrl}/dashboard/events`,
          });
          break;
        }
        case "event-cancelled-organizer": {
          const { EventCancelledOrganizerEmail } = await import("@/server/services/email-templates/event-cancelled-organizer");
          subject = "[TEST] Notice: Cyberjaya Tech Dash 2026 Cancelled";
          reactElement = EventCancelledOrganizerEmail({
            organizationName: "Run Malaysia Events Sdn Bhd",
            eventTitle: "Cyberjaya Tech Dash 2026",
            cancellationReason: "Severe weather warning & local authority advisory.",
            participantCount: 420,
            manageUrl: `${appUrl}/dashboard/events`,
          });
          break;
        }
        case "event-cancelled-participant": {
          const { EventCancelledParticipantEmail } = await import("@/server/services/email-templates/event-cancelled-participant");
          subject = "[TEST] Important: Cyberjaya Tech Dash 2026 Has Been Cancelled";
          reactElement = EventCancelledParticipantEmail({
            participantName: "Aznan Developer",
            eventTitle: "Cyberjaya Tech Dash 2026",
            cancellationReason: "Severe weather warning & local authority advisory.",
            exploreUrl: `${appUrl}/events`,
          });
          break;
        }
        case "race-day-reminder": {
          const { RaceDayReminderEmail } = await import("@/server/services/email-templates/race-day-reminder");
          subject = "[TEST] Race Day Reminder: Cyberjaya Tech Dash 2026 is Tomorrow!";
          reactElement = RaceDayReminderEmail({
            participantName: "Aznan Developer",
            eventTitle: "Cyberjaya Tech Dash 2026",
            eventDate: "Sunday, 18 Oct 2026",
            startTime: "06:30 AM",
            venue: "Taman Tasik Cyberjaya",
            venueAddress: "Persiaran Semarak Api, 63000 Cyberjaya, Selangor",
            registrationCode: "REG-2026-CYBER-888",
            eTicketUrl: `${appUrl}/verify/registration/REG-2026-CYBER-888`,
          });
          break;
        }
        case "settlement-completed": {
          const { SettlementCompletedEmail } = await import("@/server/services/email-templates/settlement-completed");
          subject = "[TEST] Settlement Processed — Cyberjaya Tech Dash 2026";
          reactElement = SettlementCompletedEmail({
            organizationName: "Run Malaysia Events Sdn Bhd",
            eventTitle: "Cyberjaya Tech Dash 2026",
            netPayoutSen: 1250000,
            referenceNumber: "MBB-STL-20261018-9988",
            settlementDate: new Date().toLocaleDateString("en-MY", { dateStyle: "medium" }),
            settlementsUrl: `${appUrl}/dashboard/settlements`,
          });
          break;
        }
      }

      await sendTransactionalEmail({
        to: input.recipientEmail,
        subject,
        reactTemplate: reactElement,
      });

      await writeAuditLog(ctx.db, {
        actorUserId: ctx.userId,
        action: "TEST_EMAIL_DISPATCHED",
        entityType: "System",
        entityId: input.templateKey,
        summary: `Developer ${ctx.session?.user?.name || ctx.userId} dispatched test email template "${input.templateKey}" to ${input.recipientEmail}.`,
      });

      return { success: true, message: `Test email (${input.templateKey}) sent to ${input.recipientEmail}` };
    }),
});
