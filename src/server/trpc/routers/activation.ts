import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MockPaymentScenario,
  OrganizerFeeStatus,
  PaymentStatus,
} from "@/generated/prisma";
import { ROLES } from "@/lib/constants";
import {
  ORGANIZATION_PERMISSIONS,
  requireApprovedOrganizationAccess,
  requireEventAccess,
  requireSelectedOrganizationAccess,
} from "@/server/policies/rbac";
import { writeAuditLog } from "@/server/services/audit-service";
import {
  ACTIVATION_FEE_PROVIDER,
  createActivationPaymentReference,
  resolveActivationAttemptOutcome,
} from "@/server/services/event-activation-service";
import { createNotification } from "@/server/services/notification-service";
import { serverEnv } from "@/server/env";
import {
  adminProcedure,
  createTRPCRouter,
  organizerProcedure,
} from "../trpc";

const FINANCE_ROLES = ORGANIZATION_PERMISSIONS.MANAGE_FINANCE;
const paymentInputSchema = z.object({
  organizerFeeId: z.string().min(1),
  scenario: z.enum(["SUCCESS", "DECLINED", "PENDING", "TIMEOUT", "CANCELLED"]).default("SUCCESS"),
  idempotencyKey: z.string().trim().min(12).max(128),
});

export const activationRouter = createTRPCRouter({
  getActivationFees: organizerProcedure
    .input(z.object({ eventId: z.string().min(1).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const isPlatformAdmin =
        ctx.userRole === ROLES.ADMIN || ctx.userRole === ROLES.DEVELOPER;
      let organizationId: string | undefined;

      if (input?.eventId) {
        const { event } = await requireEventAccess(
          ctx.db,
          ctx,
          input.eventId,
          FINANCE_ROLES,
          true
        );
        organizationId = event.organizationId;
      } else if (!isPlatformAdmin) {
        const access = await requireSelectedOrganizationAccess(
          ctx.db,
          ctx,
          FINANCE_ROLES,
          true
        );
        organizationId = access.organizationId;
      }

      return ctx.db.organizerFee.findMany({
        where: {
          ...(organizationId ? { organizationId } : {}),
          ...(input?.eventId ? { eventId: input.eventId } : {}),
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              eventDate: true,
            },
          },
          organization: { select: { id: true, companyName: true } },
          paymentAttempts: {
            select: {
              id: true,
              provider: true,
              status: true,
              scenario: true,
              transactionId: true,
              amountSen: true,
              failureReason: true,
              processedAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
        orderBy: { issuedAt: "desc" },
      });
    }),

  processActivationFeePayment: organizerProcedure
    .input(paymentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!serverEnv.MOCK_PAYMENT_MODE) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Online activation payments are temporarily unavailable.",
        });
      }

      const feeReference = await ctx.db.organizerFee.findUnique({
        where: { id: input.organizerFeeId },
        select: { id: true, organizationId: true },
      });
      if (!feeReference) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Activation invoice not found." });
      }
      await requireApprovedOrganizationAccess(
        ctx.db,
        ctx,
        feeReference.organizationId,
        FINANCE_ROLES
      );

      return ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`activation-fee:${feeReference.id}`})) IS NULL AS locked`;
        const current = await tx.organizerFee.findUnique({
          where: { id: feeReference.id },
          include: {
            event: { select: { id: true, title: true, status: true } },
            organization: { select: { userId: true } },
          },
        });
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Activation invoice not found." });
        }

        const previousAttempt = await tx.organizerFeePaymentAttempt.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (previousAttempt) {
          if (previousAttempt.organizerFeeId !== current.id) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "This payment request key is already in use.",
            });
          }
          return {
            organizerFeeId: current.id,
            eventId: current.eventId,
            eventStatus: current.event.status,
            organizerFeeStatus: current.status,
            paymentStatus: previousAttempt.status,
            transactionId: previousAttempt.transactionId,
            message:
              previousAttempt.failureReason ??
              (previousAttempt.status === PaymentStatus.SUCCESS
                ? "Activation payment was already completed."
                : "Payment attempt already received."),
          };
        }

        if (current.status === OrganizerFeeStatus.PAID) {
          return {
            organizerFeeId: current.id,
            eventId: current.eventId,
            eventStatus: current.event.status,
            organizerFeeStatus: current.status,
            paymentStatus: PaymentStatus.SUCCESS,
            transactionId: current.paymentReference,
            message: "Activation payment was already completed.",
          };
        }
        if (current.status === OrganizerFeeStatus.WAIVED) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This activation fee was waived." });
        }
        if (current.status === OrganizerFeeStatus.VOID) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This activation invoice is void." });
        }
        if (current.event.status !== "AWAITING_EVENT_FEE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This event is not awaiting an activation payment.",
          });
        }

        const now = new Date();
        const scenario = input.scenario as MockPaymentScenario;
        const outcome = resolveActivationAttemptOutcome(scenario);

        if (scenario !== MockPaymentScenario.SUCCESS) {
          const attempt = await tx.organizerFeePaymentAttempt.create({
            data: {
              organizerFeeId: current.id,
              provider: ACTIVATION_FEE_PROVIDER,
              scenario,
              status: outcome.paymentStatus,
              amountSen: current.amountSen,
              idempotencyKey: input.idempotencyKey,
              failureReason: outcome.failureReason,
              processedAt: outcome.isTerminal ? now : null,
            },
          });
          await tx.organizerFee.update({
            where: { id: current.id },
            data: { status: outcome.organizerFeeStatus },
          });
          await writeAuditLog(tx, {
            actorUserId: ctx.userId,
            organizationId: current.organizationId,
            eventId: current.eventId,
            action: `EVENT_ACTIVATION_PAYMENT_${scenario}`,
            entityType: "OrganizerFeePaymentAttempt",
            entityId: attempt.id,
            summary:
              outcome.failureReason ??
              `Activation payment for ${current.event.title} is processing.`,
            metadata: { scenario, paymentStatus: outcome.paymentStatus },
          });
          return {
            organizerFeeId: current.id,
            eventId: current.eventId,
            eventStatus: current.event.status,
            organizerFeeStatus: outcome.organizerFeeStatus,
            paymentStatus: outcome.paymentStatus,
            transactionId: null,
            message:
              outcome.failureReason ??
              "Payment is processing. The event will publish after confirmation.",
          };
        }

        const transactionId = createActivationPaymentReference();
        const attempt = await tx.organizerFeePaymentAttempt.create({
          data: {
            organizerFeeId: current.id,
            provider: ACTIVATION_FEE_PROVIDER,
            scenario,
            status: PaymentStatus.SUCCESS,
            transactionId,
            amountSen: current.amountSen,
            idempotencyKey: input.idempotencyKey,
            processedAt: now,
          },
        });
        await tx.organizerFee.update({
          where: { id: current.id },
          data: {
            status: OrganizerFeeStatus.PAID,
            paymentReference: transactionId,
            paidAt: now,
          },
        });
        await tx.event.update({
          where: { id: current.eventId },
          data: { status: "PUBLISHED" },
        });
        await tx.eventStatusHistory.create({
          data: {
            eventId: current.eventId,
            fromStatus: "AWAITING_EVENT_FEE",
            toStatus: "PUBLISHED",
            notes: `Activation invoice ${current.invoiceNumber} paid.`,
            actorUserId: ctx.userId,
          },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: current.organizationId,
          eventId: current.eventId,
          action: "EVENT_ACTIVATION_PAYMENT_SUCCESS",
          entityType: "OrganizerFeePaymentAttempt",
          entityId: attempt.id,
          summary: `Activation payment ${transactionId} completed and ${current.event.title} was published.`,
          metadata: {
            invoiceNumber: current.invoiceNumber,
            amountSen: current.amountSen,
          },
        });
        await createNotification(tx, {
          userId: current.organization.userId,
          type: "EVENT_ACTIVATION_PAID",
          title: "Event published",
          message: `${current.event.title} is now live after activation payment confirmation.`,
          href: "/dashboard/events",
        });

        const result = {
          organizerFeeId: current.id,
          eventId: current.eventId,
          eventStatus: "PUBLISHED" as const,
          organizerFeeStatus: OrganizerFeeStatus.PAID,
          paymentStatus: PaymentStatus.SUCCESS,
          transactionId,
          message: "Payment completed. Your event is now published.",
        };

        const fullOrg = await ctx.db.organization.findUnique({
          where: { id: current.organizationId },
          select: { companyName: true, user: { select: { email: true } } },
        });

        if (fullOrg) {
          const { sendTransactionalEmail } = await import("@/server/services/email-service");
          const { EventPublishedEmail } = await import("@/server/services/email-templates/event-published");
          const { formatInTimeZone } = await import("date-fns-tz");

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const publishedDate = formatInTimeZone(now, "Asia/Kuala_Lumpur", "dd MMMM yyyy");

          await sendTransactionalEmail({
            to: fullOrg.user.email,
            subject: `Your event is now live — ${current.event.title}`,
            reactTemplate: EventPublishedEmail({
              organizationName: fullOrg.companyName,
              eventTitle: current.event.title,
              publishedDate,
              eventUrl: `${appUrl}/events/${current.event.id}`,
              manageUrl: `${appUrl}/dashboard/events`,
            }),
          });
        }

        return result;
      });
    }),

  waiveActivationFee: adminProcedure
    .input(
      z.object({
        organizerFeeId: z.string().min(1),
        reason: z.string().trim().min(5).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`activation-fee:${input.organizerFeeId}`})) IS NULL AS locked`;
        const current = await tx.organizerFee.findUnique({
          where: { id: input.organizerFeeId },
          include: {
            event: { select: { id: true, title: true, status: true } },
            organization: { select: { userId: true } },
          },
        });
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Activation invoice not found." });
        }
        if (current.status === OrganizerFeeStatus.WAIVED) return current;
        if (current.status === OrganizerFeeStatus.PAID) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A paid invoice cannot be waived." });
        }
        if (current.status === OrganizerFeeStatus.VOID) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A void invoice cannot be waived." });
        }
        if (current.event.status !== "AWAITING_EVENT_FEE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This event is not awaiting activation.",
          });
        }

        const now = new Date();
        const reason = input.reason.trim();
        const waived = await tx.organizerFee.update({
          where: { id: current.id },
          data: {
            status: OrganizerFeeStatus.WAIVED,
            paidAt: null,
            waivedAt: now,
            waivedByUserId: ctx.userId,
            waiverReason: reason,
          },
        });
        await tx.event.update({
          where: { id: current.eventId },
          data: { status: "PUBLISHED" },
        });
        await tx.eventStatusHistory.create({
          data: {
            eventId: current.eventId,
            fromStatus: "AWAITING_EVENT_FEE",
            toStatus: "PUBLISHED",
            notes: `Activation fee waived: ${reason}`,
            actorUserId: ctx.userId,
          },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: current.organizationId,
          eventId: current.eventId,
          action: "EVENT_ACTIVATION_FEE_WAIVED",
          entityType: "OrganizerFee",
          entityId: current.id,
          summary: `${current.invoiceNumber} was waived and ${current.event.title} was published.`,
          metadata: { reason, amountSen: current.amountSen },
        });
        await createNotification(tx, {
          userId: current.organization.userId,
          type: "EVENT_ACTIVATION_WAIVED",
          title: "Event published",
          message: `${current.event.title} is now live after an approved activation-fee waiver.`,
          href: "/dashboard/events",
        });

        const fullOrg = await ctx.db.organization.findUnique({
          where: { id: current.organizationId },
          select: { companyName: true, user: { select: { email: true } } },
        });

        if (fullOrg) {
          const { sendTransactionalEmail } = await import("@/server/services/email-service");
          const { EventPublishedEmail } = await import("@/server/services/email-templates/event-published");
          const { formatInTimeZone } = await import("date-fns-tz");

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const publishedDate = formatInTimeZone(now, "Asia/Kuala_Lumpur", "dd MMMM yyyy");

          await sendTransactionalEmail({
            to: fullOrg.user.email,
            subject: `Your event is now live — ${current.event.title}`,
            reactTemplate: EventPublishedEmail({
              organizationName: fullOrg.companyName,
              eventTitle: current.event.title,
              publishedDate,
              eventUrl: `${appUrl}/events/${current.event.id}`,
              manageUrl: `${appUrl}/dashboard/events`,
            }),
          });
        }

        return waived;
      })
    ),
});
