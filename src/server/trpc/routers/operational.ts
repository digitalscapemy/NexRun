import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@/generated/prisma";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  participantQuerySchema,
  updateTshirtSchema,
  checkInSchema,
  updateCheckInSchema,
  createVoucherSchema,
  eventDocumentBatchSchema,
  recordDocumentPrintSchema,
} from "@/lib/validation/operational";
import { ORGANIZATION_PERMISSIONS, requireEventAccess } from "@/server/policies/rbac";
import type { OrganizationMemberRole } from "@/generated/prisma";
import { writeAuditLog } from "@/server/services/audit-service";
import { normalizeBibTemplate, normalizeCertificateTemplate } from "@/lib/templates/template-config";

const PARTICIPANT_ROLES = ORGANIZATION_PERMISSIONS.MANAGE_PARTICIPANTS;
const FINANCE_ROLES = ORGANIZATION_PERMISSIONS.MANAGE_FINANCE;
const CHECK_IN_ROLES = ORGANIZATION_PERMISSIONS.CHECK_IN;
const EVENT_MANAGER_ROLES = ORGANIZATION_PERMISSIONS.MANAGE_EVENT;

function maskIdentity(value: string) {
  const clean = value.trim();
  if (clean.length <= 4) return "•".repeat(clean.length);
  return `${"•".repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export const operationalRouter = createTRPCRouter({
  getCheckInDesk: protectedProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await requireEventAccess(ctx.db, ctx, input.eventId, CHECK_IN_ROLES, true);
      const checkInWhere = { registration: { eventId: input.eventId } };
      const [event, activeRegistrations, checkedIn, bibCollected, shirtCollected, packCollected, recent] =
        await Promise.all([
          ctx.db.event.findUnique({
            where: { id: input.eventId },
            select: { id: true, title: true, status: true, eventDate: true, venue: true },
          }),
          ctx.db.registration.count({ where: { eventId: input.eventId, status: "ACTIVE" } }),
          ctx.db.checkIn.count({ where: checkInWhere }),
          ctx.db.checkIn.count({ where: { ...checkInWhere, bibCollected: true } }),
          ctx.db.checkIn.count({ where: { ...checkInWhere, shirtCollected: true } }),
          ctx.db.checkIn.count({ where: { ...checkInWhere, packCollected: true } }),
          ctx.db.checkIn.findMany({
            where: checkInWhere,
            take: 20,
            orderBy: { checkedInAt: "desc" },
            select: {
              id: true,
              registrationId: true,
              checkedInAt: true,
              stationName: true,
              bibCollected: true,
              shirtCollected: true,
              packCollected: true,
              notes: true,
              registration: {
                select: {
                  registrationCode: true,
                  participantProfile: { select: { fullName: true, tshirtType: true, tshirtSize: true } },
                  ticketCategory: { select: { name: true, distance: true } },
                },
              },
            },
          }),
        ]);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      return {
        event,
        stats: {
          activeRegistrations,
          checkedIn,
          pendingCheckIn: Math.max(0, activeRegistrations - checkedIn),
          bibCollected,
          shirtCollected,
          packCollected,
        },
        recent,
      };
    }),

  getEventOperationalSummary: protectedProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await requireEventAccess(ctx.db, ctx, input.eventId, PARTICIPANT_ROLES, true);
      const [event, checkedInCount, tshirts] = await Promise.all([
        ctx.db.event.findUnique({
          where: { id: input.eventId },
          select: {
            id: true,
            title: true,
            status: true,
            eventDate: true,
            categories: {
              select: { id: true, name: true, distance: true, maxSlots: true, currentRegistrations: true },
              orderBy: { distance: "asc" },
            },
            _count: { select: { registrations: true } },
          },
        }),
        ctx.db.checkIn.count({ where: { registration: { eventId: input.eventId } } }),
        ctx.db.participantProfile.groupBy({
          by: ["tshirtSize", "tshirtType"],
          where: { registrations: { some: { eventId: input.eventId, status: "ACTIVE" } } },
          _count: { _all: true },
        }),
      ]);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      return {
        ...event,
        checkedInCount,
        tshirtBreakdown: tshirts.map((item) => ({
          size: item.tshirtSize || "NOT_SPECIFIED",
          type: item.tshirtType || "MICROFIBER",
          count: item._count._all,
        })),
      };
    }),

  getEventParticipants: protectedProcedure
    .input(participantQuerySchema)
    .query(async ({ ctx, input }) => {
      await requireEventAccess(ctx.db, ctx, input.eventId, PARTICIPANT_ROLES, true);
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.RegistrationWhereInput = {
        eventId: input.eventId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.categoryId ? { ticketCategoryId: input.categoryId } : {}),
        ...(input.tshirtSize ? { participantProfile: { tshirtSize: input.tshirtSize } } : {}),
        ...(input.checkedIn !== undefined ? (input.checkedIn ? { checkIn: { isNot: null } } : { checkIn: null }) : {}),
        ...(input.finisher !== undefined ? { isFinisher: input.finisher } : {}),
        ...(input.bibNumberFrom !== undefined || input.bibNumberTo !== undefined
          ? {
              bibNumber: {
                ...(input.bibNumberFrom !== undefined ? { gte: String(input.bibNumberFrom) } : {}),
                ...(input.bibNumberTo !== undefined ? { lte: String(input.bibNumberTo) } : {}),
              },
            }
          : {}),
        ...(input.registeredFrom || input.registeredTo
          ? {
              createdAt: {
                ...(input.registeredFrom ? { gte: new Date(input.registeredFrom) } : {}),
                ...(input.registeredTo ? { lte: new Date(input.registeredTo) } : {}),
              },
            }
          : {}),
      };
      if (input.search) {
        where.OR = [
          { registrationCode: { contains: input.search, mode: "insensitive" } },
          { bibNumber: { contains: input.search, mode: "insensitive" } },
          {
            participantProfile: {
              OR: [
                { fullName: { contains: input.search, mode: "insensitive" } },
                { icNumber: { contains: input.search, mode: "insensitive" } },
                { email: { contains: input.search, mode: "insensitive" } },
                { phone: { contains: input.search, mode: "insensitive" } },
              ],
            },
          },
        ];
      }

      const [totalCount, records] = await ctx.db.$transaction([
        ctx.db.registration.count({ where }),
        ctx.db.registration.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            registrationCode: true,
            bibNumber: true,
            status: true,
            isFinisher: true,
            finishedAt: true,
            createdAt: true,
            participantProfile: {
              select: {
                id: true,
                fullName: true,
                icNumber: true,
                email: true,
                phone: true,
                tshirtType: true,
                tshirtSize: true,
              },
            },
            ticketCategory: { select: { id: true, name: true, distance: true } },
            checkIn: {
              select: {
                checkedInAt: true,
                bibCollected: true,
                shirtCollected: true,
                packCollected: true,
                stationName: true,
              },
            },
          },
        }),
      ]);
      const items = records.map((record) => ({
        ...record,
        participantProfile: {
          ...record.participantProfile,
          icNumber: maskIdentity(record.participantProfile.icNumber),
        },
      }));
      return { items, totalCount, pageCount: Math.ceil(totalCount / input.limit) };
    }),

  exportEventParticipants: protectedProcedure
    .input(z.object({ eventId: z.string().min(1), report: z.enum(["PARTICIPANTS", "TSHIRTS"]) }))
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, PARTICIPANT_ROLES, true);
      const EXPORT_ROW_LIMIT = 10_000;
      const registrations = await ctx.db.registration.findMany({
        where: { eventId: input.eventId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        take: EXPORT_ROW_LIMIT,
        select: {
          registrationCode: true,
          bibNumber: true,
          participantProfile: {
            select: { fullName: true, email: true, phone: true, icNumber: true, tshirtType: true, tshirtSize: true },
          },
          ticketCategory: { select: { name: true, distance: true } },
          checkIn: { select: { checkedInAt: true, bibCollected: true, shirtCollected: true, packCollected: true } },
        },
      });
      const headers = input.report === "TSHIRTS"
        ? ["Registration Code", "Bib Number", "Participant", "Category", "Shirt Type", "Shirt Size", "Shirt Collected"]
        : ["Registration Code", "Bib Number", "Participant", "Identity Last 4", "Email", "Phone", "Category", "Distance KM", "Checked In", "Pack Collected"];
      const rows = registrations.map((registration) =>
        input.report === "TSHIRTS"
          ? [
              registration.registrationCode,
              registration.bibNumber,
              registration.participantProfile.fullName,
              registration.ticketCategory.name,
              registration.participantProfile.tshirtType,
              registration.participantProfile.tshirtSize,
              registration.checkIn?.shirtCollected ? "Yes" : "No",
            ]
          : [
              registration.registrationCode,
              registration.bibNumber,
              registration.participantProfile.fullName,
              registration.participantProfile.icNumber.slice(-4),
              registration.participantProfile.email,
              registration.participantProfile.phone,
              registration.ticketCategory.name,
              registration.ticketCategory.distance,
              registration.checkIn ? "Yes" : "No",
              registration.checkIn?.packCollected ? "Yes" : "No",
            ]
      );
      const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
      const truncated = registrations.length === EXPORT_ROW_LIMIT;
      await writeAuditLog(ctx.db, {
        actorUserId: ctx.userId,
        organizationId: event.organizationId,
        eventId: event.id,
        action: `${input.report}_EXPORTED`,
        entityType: "Event",
        entityId: event.id,
        summary: `${input.report.toLowerCase()} report exported with ${rows.length} rows.${truncated ? ` Truncated at the ${EXPORT_ROW_LIMIT}-row export limit.` : ""}`,
        metadata: truncated ? { truncated: true, limit: EXPORT_ROW_LIMIT } : undefined,
      });
      return {
        filename: `${event.slug}-${input.report.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`,
        csv,
        rowCount: rows.length,
        truncated,
      };
    }),

  getEventDocumentBatch: protectedProcedure
    .input(eventDocumentBatchSchema)
    .query(async ({ ctx, input }) => {
      await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          eventDate: true,
          venue: true,
          state: true,
          raceBibTemplate: true,
          certificateTemplate: true,
        },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      if (input.documentType === "CERTIFICATE" && event.status !== "COMPLETED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Certificates can be prepared after the event is completed." });
      }

      const where: Prisma.RegistrationWhereInput = {
        eventId: event.id,
        status: "ACTIVE",
        ...(input.documentType === "CERTIFICATE" ? { isFinisher: true } : {}),
      };
      const [totalCount, records] = await ctx.db.$transaction([
        ctx.db.registration.count({ where }),
        ctx.db.registration.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: [{ bibNumber: "asc" }, { id: "asc" }],
          select: {
            id: true,
            registrationCode: true,
            bibNumber: true,
            participantProfile: { select: { fullName: true } },
            ticketCategory: { select: { name: true, distance: true } },
          },
        }),
      ]);
      return {
        event: {
          id: event.id,
          title: event.title,
          slug: event.slug,
          status: event.status,
          eventDate: event.eventDate,
          venue: event.venue,
          state: event.state,
        },
        template: input.documentType === "BIB"
          ? normalizeBibTemplate(event.raceBibTemplate)
          : normalizeCertificateTemplate(event.certificateTemplate),
        items: records.map((registration) => ({
          id: registration.id,
          registrationCode: registration.registrationCode,
          bibNumber: registration.bibNumber,
          participantName: registration.participantProfile.fullName,
          categoryName: registration.ticketCategory.name,
          distance: registration.ticketCategory.distance,
        })),
        totalCount,
        pageCount: Math.ceil(totalCount / input.limit),
      };
    }),

  recordEventDocumentPrint: protectedProcedure
    .input(recordDocumentPrintSchema)
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      if (input.documentType === "CERTIFICATE" && event.status !== "COMPLETED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Certificates can be printed after the event is completed." });
      }
      const eligibleDocuments = await ctx.db.registration.count({
        where: {
          id: { in: input.registrationIds },
          eventId: event.id,
          status: "ACTIVE",
          ...(input.documentType === "CERTIFICATE" ? { isFinisher: true } : {}),
        },
      });
      if (eligibleDocuments !== input.registrationIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "One or more selected documents are no longer eligible. Refresh the list and try again." });
      }
      await writeAuditLog(ctx.db, {
        actorUserId: ctx.userId,
        organizationId: event.organizationId,
        eventId: event.id,
        action: input.documentType === "BIB" ? "BIB_BATCH_PRINTED" : "CERTIFICATE_BATCH_PRINTED",
        entityType: "Event",
        entityId: event.id,
        summary: `${eligibleDocuments} ${input.documentType.toLowerCase()} document${eligibleDocuments === 1 ? "" : "s"} prepared for print.`,
        metadata: { documentType: input.documentType, count: eligibleDocuments },
      });
      return { count: eligibleDocuments };
    }),

  updateTshirtSize: protectedProcedure
    .input(updateTshirtSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.participantProfile.findUnique({
        where: { id: input.profileId },
        select: { id: true, tshirtType: true, tshirtSize: true, registrations: { select: { eventId: true }, take: 1 } },
      });
      const eventId = profile?.registrations[0]?.eventId;
      if (!profile || !eventId) throw new TRPCError({ code: "NOT_FOUND", message: "Participant not found." });
      const { event } = await requireEventAccess(ctx.db, ctx, eventId, PARTICIPANT_ROLES, true);
      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.participantProfile.update({
          where: { id: profile.id },
          data: { tshirtType: input.tshirtType, tshirtSize: input.tshirtSize },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId,
          action: "PARTICIPANT_SHIRT_UPDATED",
          entityType: "ParticipantProfile",
          entityId: profile.id,
          summary: "A participant's shirt selection was updated.",
          metadata: {
            before: { tshirtType: profile.tshirtType, tshirtSize: profile.tshirtSize },
            after: { tshirtType: input.tshirtType, tshirtSize: input.tshirtSize },
          },
        });
        return updated;
      });
    }),

  updateFinisherStatus: protectedProcedure
    .input(z.object({ eventId: z.string().min(1), registrationId: z.string().min(1), isFinisher: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, PARTICIPANT_ROLES, true);
      if (event.status !== "COMPLETED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Finisher status can be confirmed after the event is completed." });
      }
      return ctx.db.$transaction(async (tx) => {
        const result = await tx.registration.updateMany({
          where: { id: input.registrationId, eventId: input.eventId, status: "ACTIVE" },
          data: { isFinisher: input.isFinisher, finishedAt: input.isFinisher ? new Date() : null },
        });
        if (result.count !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found." });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId: event.id,
          action: input.isFinisher ? "FINISHER_CONFIRMED" : "FINISHER_REVOKED",
          entityType: "Registration",
          entityId: input.registrationId,
          summary: input.isFinisher ? "Finisher status was confirmed." : "Finisher status was removed.",
        });
        return { success: true };
      });
    }),

  bulkUpdateFinisherStatus: protectedProcedure
    .input(
      z.object({
        eventId: z.string().min(1),
        registrationIds: z.array(z.string().min(1)).min(1).max(500),
        isFinisher: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, PARTICIPANT_ROLES, true);
      if (event.status !== "COMPLETED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Finisher status can be confirmed after the event is completed." });
      }
      return ctx.db.$transaction(async (tx) => {
        const result = await tx.registration.updateMany({
          where: { id: { in: input.registrationIds }, eventId: input.eventId, status: "ACTIVE" },
          data: { isFinisher: input.isFinisher, finishedAt: input.isFinisher ? new Date() : null },
        });
        if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No matching registrations were found." });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId: event.id,
          action: input.isFinisher ? "FINISHER_CONFIRMED" : "FINISHER_REVOKED",
          entityType: "Registration",
          entityId: event.id,
          summary: input.isFinisher
            ? `Finisher status was confirmed for ${result.count} participant${result.count === 1 ? "" : "s"}.`
            : `Finisher status was removed for ${result.count} participant${result.count === 1 ? "" : "s"}.`,
          metadata: { count: result.count, registrationIds: input.registrationIds },
        });
        return { success: true, count: result.count };
      });
    }),

  markBibCheckedIn: protectedProcedure
    .input(checkInSchema)
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, CHECK_IN_ROLES, true);
      if (!["PUBLISHED", "REGISTRATION_CLOSED", "COMPLETED"].includes(event.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Check-in is unavailable for this event status." });
      }
      const registration = await ctx.db.registration.findUnique({
        where: { registrationCode: input.registrationCode.trim().toUpperCase() },
        include: {
          participantProfile: { select: { fullName: true, tshirtType: true, tshirtSize: true } },
          ticketCategory: { select: { name: true, distance: true } },
          checkIn: true,
        },
      });
      if (!registration || registration.eventId !== input.eventId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Registration code is not valid for this event." });
      }
      if (registration.status !== "ACTIVE") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This registration is inactive." });
      }
      if (registration.checkIn) {
        return { ...registration.checkIn, registration, alreadyCheckedIn: true };
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`checkin:${registration.id}`})) IS NULL AS locked`;
        const existing = await tx.checkIn.findUnique({ where: { registrationId: registration.id } });
        if (existing) return { ...existing, registration, alreadyCheckedIn: true };
        const checkIn = await tx.checkIn.create({
          data: {
            registrationId: registration.id,
            checkedInByUserId: ctx.userId,
            stationName: input.stationName?.trim() || null,
            bibCollected: input.bibCollected,
            shirtCollected: input.shirtCollected,
            packCollected: input.packCollected,
            notes: input.notes?.trim() || null,
          },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId: event.id,
          action: "PARTICIPANT_CHECKED_IN",
          entityType: "Registration",
          entityId: registration.id,
          summary: `${registration.registrationCode} was checked in.`,
          metadata: {
            stationName: input.stationName || null,
            bibCollected: input.bibCollected,
            shirtCollected: input.shirtCollected,
            packCollected: input.packCollected,
          },
        });
        return { ...checkIn, registration, alreadyCheckedIn: false };
      });
    }),

  updateCheckInRecord: protectedProcedure
    .input(updateCheckInSchema)
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, CHECK_IN_ROLES, true);
      const registration = await ctx.db.registration.findUnique({
        where: { id: input.registrationId },
        select: { id: true, eventId: true, registrationCode: true },
      });
      if (!registration || registration.eventId !== input.eventId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Check-in record not found for this event." });
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`checkin:${registration.id}`})) IS NULL AS locked`;
        const current = await tx.checkIn.findUnique({ where: { registrationId: registration.id } });
        if (!current) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Check-in record not found." });
        }
        const updated = await tx.checkIn.update({
          where: { id: current.id },
          data: {
            stationName: input.stationName?.trim() || null,
            bibCollected: input.bibCollected,
            shirtCollected: input.shirtCollected,
            packCollected: input.packCollected,
            notes: input.notes?.trim() || null,
          },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId: event.id,
          action: "CHECKIN_COLLECTION_UPDATED",
          entityType: "CheckIn",
          entityId: current.id,
          summary: `${registration.registrationCode} collection details were corrected.`,
          metadata: {
            before: {
              stationName: current.stationName,
              bibCollected: current.bibCollected,
              shirtCollected: current.shirtCollected,
              packCollected: current.packCollected,
              notes: current.notes,
            },
            after: {
              stationName: updated.stationName,
              bibCollected: updated.bibCollected,
              shirtCollected: updated.shirtCollected,
              packCollected: updated.packCollected,
              notes: updated.notes,
            },
          },
        });
        return updated;
      });
    }),

  getEventFinancialSummary: protectedProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await requireEventAccess(ctx.db, ctx, input.eventId, FINANCE_ROLES, true);
      const [financials, categories, tshirts, settlement] = await Promise.all([
        ctx.db.order.aggregate({
          where: { eventId: input.eventId, status: "PAID" },
          _count: { _all: true },
          _sum: {
            subtotalSen: true,
            discountSen: true,
            adminFeeSen: true,
            processingFeeSen: true,
            totalPaidSen: true,
            organizerNetSen: true,
          },
        }),
        ctx.db.ticketCategory.findMany({
          where: { eventId: input.eventId },
          select: {
            id: true,
            name: true,
            distance: true,
            priceSen: true,
            _count: { select: { registrations: { where: { status: "ACTIVE" } } } },
          },
        }),
        ctx.db.participantProfile.groupBy({
          by: ["tshirtSize"],
          where: { registrations: { some: { eventId: input.eventId, status: "ACTIVE" } } },
          _count: { _all: true },
        }),
        ctx.db.settlement.findUnique({ where: { eventId: input.eventId } }),
      ]);
      return {
        eventId: input.eventId,
        ordersCount: financials._count._all,
        aggregates: {
          ticketSubtotalSen: financials._sum.subtotalSen ?? 0,
          discountSen: financials._sum.discountSen ?? 0,
          adminFeeSen: financials._sum.adminFeeSen ?? 0,
          processingFeeSen: financials._sum.processingFeeSen ?? 0,
          totalPaidSen: financials._sum.totalPaidSen ?? 0,
          organizerNetSen: financials._sum.organizerNetSen ?? 0,
        },
        categoriesBreakdown: categories.map((category) => ({
          ...category,
          registrationsCount: category._count.registrations,
          revenueSen: category.priceSen * category._count.registrations,
          _count: undefined,
        })),
        tshirtBreakdown: tshirts.map((item) => ({ size: item.tshirtSize || "NOT_SPECIFIED", count: item._count._all })),
        settlement,
      };
    }),

  getEventOverview: protectedProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { event, access } = await requireEventAccess(ctx.db, ctx, input.eventId, undefined, false);
      const canSeeFinance =
        access.memberRole === "PLATFORM_ADMIN" ||
        (FINANCE_ROLES as readonly OrganizationMemberRole[]).includes(access.memberRole);

      const [eventDetail, activeRegistrations, checkedIn, finisherCount, categories, financials, trendRows] =
        await Promise.all([
          ctx.db.event.findUnique({
            where: { id: event.id },
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              eventDate: true,
              registrationOpenDate: true,
              registrationCloseDate: true,
              venue: true,
              state: true,
            },
          }),
          ctx.db.registration.count({ where: { eventId: event.id, status: "ACTIVE" } }),
          ctx.db.checkIn.count({ where: { registration: { eventId: event.id } } }),
          ctx.db.registration.count({ where: { eventId: event.id, status: "ACTIVE", isFinisher: true } }),
          ctx.db.ticketCategory.findMany({
            where: { eventId: event.id, isActive: true },
            select: {
              id: true,
              name: true,
              distance: true,
              priceSen: true,
              maxSlots: true,
              currentRegistrations: true,
              isActive: true,
            },
            orderBy: { distance: "asc" },
          }),
          canSeeFinance
            ? ctx.db.order.aggregate({
                where: { eventId: event.id, status: "PAID" },
                _count: { _all: true },
                _sum: { organizerNetSen: true, totalPaidSen: true },
              })
            : Promise.resolve(null),
          ctx.db.$queryRaw<Array<{ day: Date; count: bigint }>>`
            SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kuala_Lumpur') AS day, COUNT(*) AS count
            FROM "Registration"
            WHERE "eventId" = ${event.id}
              AND "createdAt" >= (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date - INTERVAL '6 days'
            GROUP BY day
            ORDER BY day ASC
          `,
        ]);
      if (!eventDetail) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });

      // Build a 7-day (today minus 6 days to today) series in Malaysia time, filling gaps with 0.
      const trendMap = new Map<string, number>();
      for (const row of trendRows) {
        const isoDate = new Date(row.day).toISOString().slice(0, 10);
        trendMap.set(isoDate, Number(row.count));
      }
      const todayMalaysia = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })
      );
      const registrationTrend = Array.from({ length: 7 }, (_, index) => {
        const day = new Date(todayMalaysia);
        day.setDate(day.getDate() - (6 - index));
        const isoDate = day.toISOString().slice(0, 10);
        return { date: isoDate, count: trendMap.get(isoDate) ?? 0 };
      });

      const totalCapacity = categories.every((category) => category.maxSlots === null)
        ? null
        : categories.reduce((sum, category) => sum + (category.maxSlots ?? 0), 0);
      const totalRegisteredInCategories = categories.reduce(
        (sum, category) => sum + category.currentRegistrations,
        0
      );
      const fillRatePercent =
        totalCapacity && totalCapacity > 0
          ? Math.round((totalRegisteredInCategories / totalCapacity) * 100)
          : null;

      return {
        event: eventDetail,
        stats: {
          activeRegistrations,
          totalCapacity,
          fillRatePercent,
          checkedIn,
          finisherCount,
        },
        finance: canSeeFinance && financials
          ? {
              organizerNetSen: financials._sum.organizerNetSen ?? 0,
              totalPaidSen: financials._sum.totalPaidSen ?? 0,
              ordersCount: financials._count._all,
            }
          : null,
        registrationTrend,
        categories: categories.map((category) => {
          const categoryFillRate =
            category.maxSlots && category.maxSlots > 0
              ? Math.round((category.currentRegistrations / category.maxSlots) * 100)
              : null;
          return {
            id: category.id,
            name: category.name,
            distance: category.distance,
            priceSen: category.priceSen,
            currentRegistrations: category.currentRegistrations,
            maxSlots: category.maxSlots,
            isActive: category.isActive,
            fillRatePercent: categoryFillRate,
            isSoldOut: category.maxSlots !== null && category.currentRegistrations >= category.maxSlots,
          };
        }),
      };
    }),

  getEventVouchers: protectedProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      return ctx.db.voucher.findMany({ where: { eventId: input.eventId }, orderBy: { createdAt: "desc" } });
    }),

  createVoucher: protectedProcedure
    .input(createVoucherSchema)
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      const code = input.code.trim().toUpperCase();
      const existing = await ctx.db.voucher.findUnique({
        where: { eventId_code: { eventId: input.eventId, code } },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "This voucher code already exists for the event." });
      return ctx.db.$transaction(async (tx) => {
        const voucher = await tx.voucher.create({
          data: {
            eventId: input.eventId,
            code,
            discountType: input.discountType,
            discountValue: input.discountValue,
            maxUses: input.maxUses,
            validFrom: new Date(input.validFrom),
            validUntil: new Date(input.validUntil),
            applicationPolicy: input.applicationPolicy,
            isActive: true,
          },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId: event.id,
          action: "VOUCHER_CREATED",
          entityType: "Voucher",
          entityId: voucher.id,
          summary: `Voucher ${code} was created.`,
        });
        return voucher;
      });
    }),

  deactivateVoucher: protectedProcedure
    .input(z.object({ voucherId: z.string().min(1), eventId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      return ctx.db.$transaction(async (tx) => {
        const result = await tx.voucher.updateMany({
          where: { id: input.voucherId, eventId: input.eventId },
          data: { isActive: false },
        });
        if (result.count !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "Voucher not found." });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId: event.id,
          action: "VOUCHER_DEACTIVATED",
          entityType: "Voucher",
          entityId: input.voucherId,
          summary: "A voucher was deactivated.",
        });
        return { success: true };
      });
    }),
});
