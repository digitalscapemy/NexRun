import crypto from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MockPaymentScenario,
  OrderStatus,
  PaymentStatus,
  RegistrationStatus,
  type Prisma,
  type PrismaClient,
} from "@/generated/prisma";
import { checkoutRequestSchema, mockPaymentSchema } from "@/lib/validation/registration";
import { LEGAL_VERSIONS } from "@/lib/constants";
import { formatRepcSchedule } from "@/lib/format-repc-schedule";
import {
  getActiveTicketPriceSen,
  validateEligibility,
} from "@/server/engines/registration-engine";
import { calculateOrderPricing, getActiveFeeSchedule } from "@/server/services/pricing-service";
import { createNotification } from "@/server/services/notification-service";
import { writeAuditLog } from "@/server/services/audit-service";
import { enforceRateLimit } from "@/server/services/rate-limit-service";
import { getPlatformControlConfig } from "@/server/services/platform-control-service";
import {
  isRecoverableOrderStatus,
  RECOVERABLE_ORDER_STATUSES,
} from "@/server/services/checkout-service";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const RESERVATION_MINUTES = 15;

function normalizeVoucherCode(code?: string | null) {
  return code?.trim().toUpperCase() || null;
}

function maskParticipantName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part.length <= 2 ? `${part[0] ?? ""}*` : `${part.slice(0, 2)}${"*".repeat(Math.min(4, part.length - 2))}`))
    .join(" ");
}

function createOrderReferences() {
  const timestamp = Date.now().toString().slice(-8);
  const randomSeed = crypto.randomBytes(4).toString("hex").toUpperCase();
  return {
    orderNumber: `NR-ORD-${timestamp}-${randomSeed}`,
    invoiceNumber: `NR-INV-${timestamp}-${randomSeed}`,
  };
}

function allocateAmount(total: number, weights: number[]) {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let allocated = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return total - allocated;
    const amount = weightTotal > 0 ? Math.floor((total * weight) / weightTotal) : 0;
    allocated += amount;
    return amount;
  });
}

async function findVoucher(
  db: PrismaClient | Prisma.TransactionClient,
  eventId: string,
  code: string
) {
  return (
    (await db.voucher.findFirst({ where: { eventId, code } })) ??
    (await db.voucher.findFirst({ where: { eventId: null, code } }))
  );
}

async function expireOrderIfNeeded(
  db: PrismaClient,
  orderId: string,
  expiresAt: Date | null
) {
  if (!expiresAt || expiresAt > new Date()) return false;
  await db.$transaction([
    db.order.updateMany({
      where: { id: orderId, status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.FAILED] } },
      data: { status: OrderStatus.EXPIRED },
    }),
    db.inventoryReservation.updateMany({
      where: { orderId, status: "RESERVED" },
      data: { status: "EXPIRED" },
    }),
  ]);
  return true;
}

export const registrationRouter = createTRPCRouter({
  getPaymentFeeDisclosure: publicProcedure.query(async ({ ctx }) => {
    const fees = await getActiveFeeSchedule(ctx.db);
    return { processingFeePercentage: fees.processingFeePercentage };
  }),

  validateVoucher: publicProcedure
    .input(z.object({ eventId: z.string(), code: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const security = (await getPlatformControlConfig(ctx.db)).security;
      await enforceRateLimit(ctx.db, { key: `voucher:${ctx.requestIp}`, max: security.voucherRequestsPerMinute, windowMs: 60_000 });
      const code = normalizeVoucherCode(input.code)!;
      const event = await ctx.db.event.findFirst({
        where: { id: input.eventId, status: "PUBLISHED", organization: { status: "APPROVED" } },
        select: { id: true },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      const voucher = await findVoucher(ctx.db, input.eventId, code);

      if (!voucher || !voucher.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid voucher code." });
      }

      const now = new Date();
      if (now < voucher.validFrom || now > voucher.validUntil) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voucher has expired or is not yet active.",
        });
      }
      if (voucher.maxUses !== null && voucher.currentUses >= voucher.maxUses) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Voucher usage limit has been reached." });
      }

      return {
        id: voucher.id,
        code: voucher.code,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        applicationPolicy: voucher.applicationPolicy,
        remainingUses:
          voucher.maxUses === null ? null : Math.max(0, voucher.maxUses - voucher.currentUses),
      };
    }),

  getOrderDetails: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              eventDate: true,
              venue: true,
              state: true,
              repcDate: true,
              repcTime: true,
              repcLocation: true,
            },
          },
          registrations: {
            include: { participantProfile: true, ticketCategory: true, checkIn: true },
          },
          paymentTransactions: {
            select: {
              id: true,
              status: true,
              provider: true,
              paymentMethod: true,
              transactionId: true,
              amountSen: true,
              processedAt: true,
              failureReason: true,
            },
            orderBy: { createdAt: "desc" },
          },
          feeSnapshot: true,
        },
      });

      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      if (order.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }
      const expired = await expireOrderIfNeeded(ctx.db, order.id, order.expiresAt);
      return expired ? { ...order, status: OrderStatus.EXPIRED } : order;
    }),

  getOrderStatus: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          userId: true,
          orderNumber: true,
          status: true,
          totalPaidSen: true,
          expiresAt: true,
          paymentTransactions: {
            select: { status: true, failureReason: true, processedAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      if (!order || order.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }
      const expired = await expireOrderIfNeeded(ctx.db, order.id, order.expiresAt);
      return expired ? { ...order, status: OrderStatus.EXPIRED } : order;
    }),

  getCheckoutOrder: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          userId: true,
          orderNumber: true,
          status: true,
          subtotalSen: true,
          discountSen: true,
          processingFeeSen: true,
          totalPaidSen: true,
          expiresAt: true,
          createdAt: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              eventDate: true,
              venue: true,
              state: true,
              status: true,
            },
          },
          _count: { select: { items: true } },
          paymentTransactions: {
            select: {
              status: true,
              paymentMethod: true,
              failureReason: true,
              processedAt: true,
              transactionId: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      if (!order || order.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Checkout not found." });
      }
      const expired = await expireOrderIfNeeded(ctx.db, order.id, order.expiresAt);
      return expired ? { ...order, status: OrderStatus.EXPIRED } : order;
    }),

  getRecoverableOrders: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    await ctx.db.$transaction([
      ctx.db.order.updateMany({
        where: {
          userId: ctx.userId,
          expiresAt: { lte: now },
          status: { in: [...RECOVERABLE_ORDER_STATUSES] },
        },
        data: { status: OrderStatus.EXPIRED },
      }),
      ctx.db.inventoryReservation.updateMany({
        where: {
          order: { userId: ctx.userId },
          expiresAt: { lte: now },
          status: "RESERVED",
        },
        data: { status: "EXPIRED" },
      }),
    ]);
    return ctx.db.order.findMany({
      where: {
        userId: ctx.userId,
        status: { in: [...RECOVERABLE_ORDER_STATUSES] },
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalPaidSen: true,
        expiresAt: true,
        event: { select: { title: true, slug: true, eventDate: true, venue: true, state: true } },
        _count: { select: { items: true } },
        paymentTransactions: {
          select: { status: true, paymentMethod: true, failureReason: true, processedAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  cancelCheckoutOrder: protectedProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`checkout:${input.orderId}`})) IS NULL AS locked`;
        const order = await tx.order.findUnique({
          where: { id: input.orderId },
          select: { id: true, userId: true, status: true, totalPaidSen: true, expiresAt: true, eventId: true, event: { select: { organizationId: true } } },
        });
        if (!order || order.userId !== ctx.userId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Checkout not found." });
        }
        if (!isRecoverableOrderStatus(order.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This checkout can no longer be cancelled." });
        }
        if (order.expiresAt && order.expiresAt <= new Date()) {
          await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.EXPIRED } });
          await tx.inventoryReservation.updateMany({
            where: { orderId: order.id, status: "RESERVED" },
            data: { status: "EXPIRED" },
          });
          return { orderId: order.id, status: OrderStatus.EXPIRED };
        }
        const cancellationKey = `cancel:${order.id}`;
        await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
        await tx.inventoryReservation.updateMany({
          where: { orderId: order.id, status: "RESERVED" },
          data: { status: "RELEASED" },
        });
        await tx.paymentTransaction.upsert({
          where: { idempotencyKey: cancellationKey },
          update: {},
          create: {
            orderId: order.id,
            provider: "NEXRUN_CHECKOUT",
            status: PaymentStatus.CANCELLED,
            scenario: MockPaymentScenario.CANCELLED,
            amountSen: order.totalPaidSen,
            idempotencyKey: cancellationKey,
            failureReason: "Checkout cancelled by the participant before payment completion.",
            processedAt: new Date(),
          },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: order.event.organizationId,
          eventId: order.eventId,
          action: "CHECKOUT_CANCELLED",
          entityType: "Order",
          entityId: order.id,
          summary: "Participant cancelled checkout and released the reserved slots.",
        });
        return { orderId: order.id, status: OrderStatus.CANCELLED };
      })
    ),

  createOrder: protectedProcedure
    .input(checkoutRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const idempotencyKey = input.idempotencyKey ?? crypto.randomUUID();
      const existingOrder = await ctx.db.order.findUnique({ where: { idempotencyKey } });
      if (existingOrder) {
        if (existingOrder.userId !== ctx.userId) {
          throw new TRPCError({ code: "CONFLICT", message: "Checkout request already exists." });
        }
        return {
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          totalPaidSen: existingOrder.totalPaidSen,
          expiresAt: existingOrder.expiresAt,
        };
      }

      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        include: { categories: true, organization: { select: { status: true } } },
      });
      if (!event || event.status !== "PUBLISHED" || event.organization.status !== "APPROVED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This event is not accepting registrations." });
      }

      const now = new Date();
      if (now < event.registrationOpenDate || now > event.registrationCloseDate) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Registration window is closed." });
      }

      const categoryById = new Map(event.categories.map((category) => [category.id, category]));
      const participantsWithCategories = input.registrations.map((participant) => {
        const categoryId = participant.ticketCategoryId ?? input.ticketCategoryId;
        const category = categoryId ? categoryById.get(categoryId) : undefined;
        if (!category || !category.isActive) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A selected ticket category is unavailable." });
        }
        if (
          (category.startSaleDate && now < category.startSaleDate) ||
          (category.endSaleDate && now > category.endSaleDate)
        ) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `${category.name} is not currently on sale.` });
        }
        validateEligibility(
          { gender: participant.gender, dateOfBirth: participant.dateOfBirth },
          category,
          event.ageReferenceDate
        );
        return {
          participant,
          category,
          priceSen: getActiveTicketPriceSen(category, now),
        };
      });

      const quantityByCategory = new Map<string, number>();
      for (const item of participantsWithCategories) {
        quantityByCategory.set(item.category.id, (quantityByCategory.get(item.category.id) ?? 0) + 1);
      }

      const subtotalSen = participantsWithCategories.reduce((total, item) => total + item.priceSen, 0);
      const voucherCode = normalizeVoucherCode(input.voucherCode);
      const voucher = voucherCode ? await findVoucher(ctx.db, event.id, voucherCode) : null;
      let discountSen = 0;
      let appliedVoucherId: string | null = null;

      if (voucher) {
        const isValid =
          voucher.isActive &&
          now >= voucher.validFrom &&
          now <= voucher.validUntil &&
          (voucher.maxUses === null || voucher.currentUses < voucher.maxUses);
        if (!isValid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Voucher is no longer available." });
        }
        appliedVoucherId = voucher.id;
        if (voucher.discountType === "PERCENTAGE") {
          discountSen = Math.round((subtotalSen * Math.min(voucher.discountValue, 100)) / 100);
        } else {
          discountSen =
            voucher.applicationPolicy === "PER_PARTICIPANT"
              ? voucher.discountValue * participantsWithCategories.length
              : voucher.discountValue;
        }
        discountSen = Math.min(discountSen, subtotalSen);
      } else if (voucherCode) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Voucher is invalid for this event." });
      }

      const feeSchedule = await getActiveFeeSchedule(ctx.db);
      const pricing = calculateOrderPricing(subtotalSen, discountSen, feeSchedule);
      const priceWeights = participantsWithCategories.map((item) => item.priceSen);
      const itemAdminFees = allocateAmount(pricing.adminFeeSen, priceWeights);
      const itemProcessingFees = allocateAmount(pricing.processingFeeSen, priceWeights);
      const expiresAt = new Date(now.getTime() + RESERVATION_MINUTES * 60_000);
      const references = createOrderReferences();

      try {
        return await ctx.db.$transaction(async (tx) => {
        for (const [categoryId, requestedQuantity] of quantityByCategory) {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`ticket:${categoryId}`})) IS NULL AS locked`;
          const category = await tx.ticketCategory.findUnique({ where: { id: categoryId } });
          if (!category || !category.isActive) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "A ticket category became unavailable." });
          }
          if (category.maxSlots !== null) {
            const activeReservations = await tx.inventoryReservation.aggregate({
              where: { ticketCategoryId: categoryId, status: "RESERVED", expiresAt: { gt: now } },
              _sum: { quantity: true },
            });
            const remaining =
              category.maxSlots - category.currentRegistrations - (activeReservations._sum.quantity ?? 0);
            if (requestedQuantity > remaining) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Not enough slots available. Remaining slots: ${Math.max(0, remaining)}`,
              });
            }
          }
        }

        const order = await tx.order.create({
          data: {
            ...references,
            idempotencyKey,
            userId: ctx.userId,
            eventId: event.id,
            subtotalSen,
            discountSen,
            adminFeeSen: pricing.adminFeeSen,
            processingFeeSen: pricing.processingFeeSen,
            totalPaidSen: pricing.totalPaidSen,
            organizerNetSen: pricing.organizerNetSen,
            voucherCode,
            voucherId: appliedVoucherId,
            status: OrderStatus.PENDING,
            expiresAt,
            feeSnapshot: {
              create: {
                adminFeePercentage: feeSchedule.adminFeePercentage,
                processingFeePercentage: feeSchedule.processingFeePercentage,
              },
            },
          },
        });

        if (appliedVoucherId) {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`voucher:${appliedVoucherId}`})) IS NULL AS locked`;
          const currentVoucher = await tx.voucher.findUnique({
            where: { id: appliedVoucherId },
            select: { isActive: true, maxUses: true, currentUses: true, validUntil: true },
          });
          if (
            !currentVoucher?.isActive ||
            now > currentVoucher.validUntil ||
            (currentVoucher.maxUses !== null && currentVoucher.currentUses >= currentVoucher.maxUses)
          ) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Voucher is no longer available." });
          }
          await tx.voucherRedemption.create({
            data: { voucherId: appliedVoucherId, orderId: order.id, quantity: 1, discountSen },
          });
          await tx.voucher.update({
            where: { id: appliedVoucherId },
            data: { currentUses: { increment: 1 } },
          });
        }

        for (const [categoryId, quantity] of quantityByCategory) {
          await tx.inventoryReservation.create({
            data: { orderId: order.id, ticketCategoryId: categoryId, quantity, expiresAt },
          });
        }

        for (const [itemIndex, item] of participantsWithCategories.entries()) {
          const participant = item.participant;
          const profile = await tx.participantProfile.create({
            data: {
              fullName: participant.fullName.trim(),
              icNumber: participant.icNumber.trim(),
              nationality: participant.nationality.trim(),
              gender: participant.gender,
              phone: participant.phone.trim(),
              email: participant.email.trim().toLowerCase(),
              dateOfBirth: new Date(participant.dateOfBirth),
              tshirtType: participant.tshirtType,
              tshirtSize: participant.tshirtSize,
              bloodType: participant.bloodType?.trim() || null,
              medicalConditions: participant.medicalConditions?.trim() || null,
              emergencyContactName: participant.emergencyContactName.trim(),
              emergencyContactPhone: participant.emergencyContactPhone.trim(),
            },
          });
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              participantProfileId: profile.id,
              ticketCategoryId: item.category.id,
              ticketNameSnapshot: item.category.name,
              ticketPriceSenSnapshot: item.priceSen,
              distanceSnapshot: item.category.distance,
              adminFeeSnapshotSen: itemAdminFees[itemIndex],
              processingFeeSnapshotSen: itemProcessingFees[itemIndex],
            },
          });
        }

        await tx.consentRecord.createMany({
          data: [
            { userId: ctx.userId, orderId: order.id, consentType: "EVENT_TERMS", version: LEGAL_VERSIONS.EVENT_TERMS },
            { userId: ctx.userId, orderId: order.id, consentType: "PRIVACY", version: LEGAL_VERSIONS.PRIVACY },
          ],
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId: event.id,
          action: "ORDER_CREATED",
          entityType: "Order",
          entityId: order.id,
          summary: `Order ${order.orderNumber} created with a temporary slot reservation.`,
        });

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalPaidSen: order.totalPaidSen,
          expiresAt: order.expiresAt,
        };
        });
      } catch (error) {
        const existing = await ctx.db.order.findUnique({ where: { idempotencyKey } });
        if (existing?.userId === ctx.userId) {
          return {
            orderId: existing.id,
            orderNumber: existing.orderNumber,
            totalPaidSen: existing.totalPaidSen,
            expiresAt: existing.expiresAt,
          };
        }
        throw error;
      }
    }),

  processMockPayment: protectedProcedure
    .input(
      mockPaymentSchema.extend({
        cardHolderName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        include: {
          items: { include: { participantProfile: true, ticketCategory: true } },
          reservations: true,
          event: { select: { id: true, title: true, organizationId: true, status: true } },
          voucher: true,
          paymentTransactions: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!order || order.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      }

      const successfulPayment = order.paymentTransactions.find(
        (transaction) => transaction.status === PaymentStatus.SUCCESS
      );
      if (order.status === OrderStatus.PAID && successfulPayment) {
        return {
          orderId: order.id,
          status: order.status,
          paymentStatus: successfulPayment.status,
          transactionId: successfulPayment.transactionId,
          message: "Payment was already completed.",
        };
      }
      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.EXPIRED ||
        order.status === OrderStatus.REFUNDED
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This order can no longer be paid." });
      }

      const now = new Date();
      if (await expireOrderIfNeeded(ctx.db, order.id, order.expiresAt)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This checkout reservation has expired." });
      }

      const scenario = input.scenario as MockPaymentScenario;
      const idempotencyKey = input.idempotencyKey ?? `mock:${order.id}:${scenario}`;
      const previousAttempt = await ctx.db.paymentTransaction.findUnique({ where: { idempotencyKey } });
      if (previousAttempt) {
        return {
          orderId: order.id,
          status: order.status,
          paymentStatus: previousAttempt.status,
          transactionId: previousAttempt.transactionId,
          message: previousAttempt.failureReason ?? "Payment attempt already processed.",
        };
      }

      if (scenario !== MockPaymentScenario.SUCCESS) {
        const status =
          scenario === MockPaymentScenario.CANCELLED ? PaymentStatus.CANCELLED : PaymentStatus.FAILED;
        const reason =
          scenario === MockPaymentScenario.DECLINED
            ? "The payment was declined. Please use another payment method or contact your bank."
            : scenario === MockPaymentScenario.PENDING
              ? "The payment is still processing. Please wait before trying again."
              : scenario === MockPaymentScenario.TIMEOUT
                ? "The payment provider timed out. You may retry safely."
                : "The payment was cancelled.";

        return ctx.db.$transaction(async (tx) => {
          const paymentStatus =
            scenario === MockPaymentScenario.PENDING ? PaymentStatus.PROCESSING : status;
          const attempt = await tx.paymentTransaction.create({
            data: {
              orderId: order.id,
              provider: "NEXRUN_SIMULATED_GATEWAY",
              paymentMethod: input.paymentMethod,
              scenario,
              status: paymentStatus,
              amountSen: order.totalPaidSen,
              idempotencyKey,
              failureReason: reason,
              processedAt: scenario === MockPaymentScenario.PENDING ? null : now,
            },
          });
          await tx.order.update({
            where: { id: order.id },
            data: {
              status:
                scenario === MockPaymentScenario.CANCELLED
                  ? OrderStatus.CANCELLED
                  : scenario === MockPaymentScenario.PENDING
                    ? OrderStatus.PROCESSING
                    : OrderStatus.PENDING,
            },
          });
          if (scenario === MockPaymentScenario.CANCELLED) {
            await tx.inventoryReservation.updateMany({
              where: { orderId: order.id, status: "RESERVED" },
              data: { status: "RELEASED" },
            });
          }
          await writeAuditLog(tx, {
            actorUserId: ctx.userId,
            organizationId: order.event.organizationId,
            eventId: order.eventId,
            action: `PAYMENT_${scenario}`,
            entityType: "PaymentTransaction",
            entityId: attempt.id,
            summary: reason,
          });
          return {
            orderId: order.id,
            status:
              scenario === MockPaymentScenario.CANCELLED
                ? OrderStatus.CANCELLED
                : scenario === MockPaymentScenario.PENDING
                  ? OrderStatus.PROCESSING
                  : OrderStatus.PENDING,
            paymentStatus,
            transactionId: null,
            message: reason,
          };
        });
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`event:${order.eventId}`})) IS NULL AS locked`;
        const currentOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: { reservations: true },
        });
        if (!currentOrder) throw new TRPCError({ code: "NOT_FOUND" });
        if (currentOrder.status === OrderStatus.PAID) {
          const existing = await tx.paymentTransaction.findFirst({
            where: { orderId: order.id, status: PaymentStatus.SUCCESS },
          });
          return {
            orderId: order.id,
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.SUCCESS,
            transactionId: existing?.transactionId ?? null,
            message: "Payment was already completed.",
          };
        }
        if (order.event.status === "CANCELLED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This event has been cancelled." });
        }

        for (const reservation of currentOrder.reservations) {
          if (reservation.status !== "RESERVED" || reservation.expiresAt <= now) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "The slot reservation is no longer valid." });
          }
        }

        // Voucher reservation was already locked and recorded during createOrder.
        // Do NOT re-increment currentUses here — that would double-count and exhaust
        // the quota twice as fast (and the unique constraint on VoucherRedemption
        // [voucherId, orderId] would make this crash anyway).

        const transitioned = await tx.order.updateMany({
          where: {
            id: order.id,
            status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.FAILED] },
          },
          data: { status: OrderStatus.PAID, paidAt: now },
        });
        if (transitioned.count !== 1) {
          throw new TRPCError({ code: "CONFLICT", message: "Order state changed. Please refresh." });
        }

        const transactionId = `SIM-${Date.now()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
        const payment = await tx.paymentTransaction.create({
          data: {
            orderId: order.id,
            provider: "NEXRUN_SIMULATED_GATEWAY",
            paymentMethod: input.paymentMethod,
            scenario,
            status: PaymentStatus.SUCCESS,
            transactionId,
            amountSen: order.totalPaidSen,
            idempotencyKey,
            processedAt: now,
          },
        });

        for (const reservation of currentOrder.reservations) {
          await tx.ticketCategory.update({
            where: { id: reservation.ticketCategoryId },
            data: { currentRegistrations: { increment: reservation.quantity } },
          });
        }
        await tx.inventoryReservation.updateMany({
          where: { orderId: order.id, status: "RESERVED" },
          data: { status: "COMMITTED" },
        });

        const existingRegistrationCount = await tx.registration.count({
          where: { eventId: order.eventId },
        });
        const template = await tx.raceBibTemplate.findUnique({ where: { eventId: order.eventId } });
        const startingBib = template?.startingBibNumber ?? 1001;
        for (const [index, item] of order.items.entries()) {
          const registrationCode = `NR-REG-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
          const bibNumber = String(startingBib + existingRegistrationCount + index);
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          await tx.registration.create({
            data: {
              registrationCode,
              orderId: order.id,
              orderItemId: item.id,
              eventId: order.eventId,
              participantProfileId: item.participantProfileId,
              ticketCategoryId: item.ticketCategoryId,
              bibNumber,
              status: RegistrationStatus.ACTIVE,
              qrCodeData: `${appUrl}/verify/registration/${registrationCode}`,
            },
          });
        }

        await createNotification(tx, {
          userId: ctx.userId,
          type: "PAYMENT_SUCCESS",
          title: "Registration confirmed",
          message: `Your registration for ${order.event.title} is confirmed.`,
          href: "/dashboard/registrations",
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: order.event.organizationId,
          eventId: order.eventId,
          action: "PAYMENT_SUCCESS",
          entityType: "PaymentTransaction",
          entityId: payment.id,
          summary: `Payment ${transactionId} completed and registrations were issued.`,
        });

        const result = {
          orderId: order.id,
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.SUCCESS,
          transactionId,
          message: "Payment completed and registrations confirmed.",
        };

        const finalOrder = await ctx.db.order.findUnique({
          where: { id: order.id },
          include: {
            user: { select: { email: true, name: true } },
            event: {
              select: {
                title: true,
                eventDate: true,
                venue: true,
                repcDate: true,
                repcTime: true,
                repcLocation: true,
              },
            },
            registrations: {
              include: {
                participantProfile: { select: { fullName: true } },
                ticketCategory: { select: { name: true } },
              },
            },
          },
        });

        if (finalOrder) {
          const { sendTransactionalEmail } = await import("@/server/services/email-service");
          const { RegistrationConfirmedEmail } = await import("@/server/services/email-templates/registration-confirmed");
          const { formatInTimeZone } = await import("date-fns-tz");

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const eventDate = formatInTimeZone(finalOrder.event.eventDate, "Asia/Kuala_Lumpur", "dd MMMM yyyy");
          const repcDate = formatRepcSchedule(
            finalOrder.event.repcDate,
            finalOrder.event.repcTime,
          );

          await sendTransactionalEmail({
            to: finalOrder.user.email,
            subject: `Registration confirmed — ${finalOrder.event.title}`,
            reactTemplate: RegistrationConfirmedEmail({
              participantName: finalOrder.user.name ?? "Runner",
              eventTitle: finalOrder.event.title,
              eventDate,
              eventVenue: finalOrder.event.venue,
              registeredParticipants: finalOrder.registrations.map((reg) => ({
                name: reg.participantProfile.fullName,
                category: reg.ticketCategory.name,
                registrationCode: reg.registrationCode,
              })),
              totalPaidSen: finalOrder.totalPaidSen,
              repcDate,
              repcLocation: finalOrder.event.repcLocation ?? undefined,
              ticketsUrl: `${appUrl}/dashboard/registrations`,
            }),
          });
        }

        return result;
      });
    }),

  getUserRegistrations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.order.findMany({
      where: { userId: ctx.userId, status: "PAID" },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            eventDate: true,
            venue: true,
            state: true,
            bannerImageUrl: true,
            repcDate: true,
            repcTime: true,
            repcLocation: true,
            status: true,
          },
        },
        registrations: {
          include: { participantProfile: true, ticketCategory: true, checkIn: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  verifyRegistration: publicProcedure
    .input(z.object({ registrationCode: z.string().min(8) }))
    .query(async ({ ctx, input }) => {
      const security = (await getPlatformControlConfig(ctx.db)).security;
      await enforceRateLimit(ctx.db, { key: `verify-registration:${ctx.requestIp}`, max: security.verificationRequestsPerMinute, windowMs: 60_000 });
      const registration = await ctx.db.registration.findUnique({
        where: { registrationCode: input.registrationCode.trim().toUpperCase() },
        select: {
          registrationCode: true,
          bibNumber: true,
          status: true,
          isFinisher: true,
          finishedAt: true,
          participantProfile: { select: { fullName: true } },
          ticketCategory: { select: { name: true, distance: true } },
          event: {
            select: {
              title: true,
              slug: true,
              eventDate: true,
              venue: true,
              state: true,
              repcDate: true,
              repcTime: true,
              repcLocation: true,
              status: true,
              certificateTemplate: true,
            },
          },
          checkIn: {
            select: {
              checkedInAt: true,
              bibCollected: true,
              shirtCollected: true,
              packCollected: true,
            },
          },
        },
      });
      if (!registration) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Registration code is invalid." });
      }
      return {
        ...registration,
        participantProfile: {
          fullName: maskParticipantName(registration.participantProfile.fullName),
        },
      };
    }),
});
