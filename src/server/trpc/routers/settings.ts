import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  organizerProcedure,
} from "../trpc";
import {
  organizerOnboardingSchema,
  platformFeeSchema,
  homepageCarouselSettingsSchema,
  raceReminderSettingsSchema,
  securityControlsSettingsSchema,
  platformAnnouncementSettingsSchema,
  bibTemplateSchema,
  certificateTemplateSchema,
} from "@/lib/validation/settings";
import {
  updateUserProfileSchema,
  updateOrganizationDetailsSchema,
} from "@/lib/validation/user-profile";
import { ROLES, DEFAULT_SETTINGS } from "@/lib/constants";
import {
  getWorkspaceContext,
  ORGANIZATION_PERMISSIONS,
  requireEventAccess,
  requireApprovedOrganizationAccess,
  requireOrganizationAccess,
  requireSelectedOrganizationAccess,
} from "@/server/policies/rbac";
import { writeAuditLog } from "@/server/services/audit-service";
import { createNotification } from "@/server/services/notification-service";
import { utapi } from "@/server/uploadthing";
import { serverEnv } from "@/server/env";
import { getActiveFeeSchedule } from "@/server/services/pricing-service";
import { dispatchRaceDayReminders } from "@/server/services/race-reminder-service";
import {
  getPlatformControlConfig,
  PLATFORM_CONTROL_KEYS,
  savePlatformControlValue,
} from "@/server/services/platform-control-service";
import {
  bibTemplateAuditSummary,
  certificateTemplateAuditSummary,
  normalizeBibTemplate,
  normalizeCertificateTemplate,
} from "@/lib/templates/template-config";

const EVENT_MANAGER_ROLES = ORGANIZATION_PERMISSIONS.MANAGE_EVENT;

export const settingsRouter = createTRPCRouter({
  registerOrganizerProfile: protectedProcedure
    .input(organizerOnboardingSchema)
    .mutation(async ({ ctx, input }) => {
      const [existingSsm, existingOrganization] = await Promise.all([
        ctx.db.organization.findUnique({ where: { ssmNumber: input.ssmNumber.trim().toUpperCase() } }),
        ctx.db.organization.findFirst({
          where: {
            OR: [
              { userId: ctx.userId },
              { members: { some: { userId: ctx.userId, status: { in: ["ACTIVE", "INVITED"] } } } },
            ],
          },
        }),
      ]);
      if (existingSsm && existingSsm.id !== existingOrganization?.id) {
        throw new TRPCError({ code: "CONFLICT", message: "This registration number is already associated with an organizer." });
      }
      if (existingOrganization && existingOrganization.status !== "REJECTED") {
        throw new TRPCError({ code: "CONFLICT", message: "Your account already belongs to an organizer workspace." });
      }

      if (existingOrganization?.status === "REJECTED") {
        return ctx.db.$transaction(async (tx) => {
          const organization = await tx.organization.update({
            where: { id: existingOrganization.id },
            data: {
              ...input,
              companyName: input.companyName.trim(),
              ssmNumber: input.ssmNumber.trim().toUpperCase(),
              email: input.email.trim().toLowerCase(),
              status: "PENDING",
              applications: { create: { status: "PENDING" } },
              documents: { create: { documentType: "SSM", fileUrl: input.ssmDocumentUrl } },
            },
          });
          await tx.user.update({
            where: { id: ctx.userId },
            data: { activeOrganizationId: organization.id },
          });
          await writeAuditLog(tx, {
            actorUserId: ctx.userId,
            organizationId: organization.id,
            action: "ORGANIZER_APPLICATION_RESUBMITTED",
            entityType: "Organization",
            entityId: organization.id,
            summary: `${organization.companyName} resubmitted its organizer application.`,
          });
          await createNotification(tx, {
            userId: ctx.userId,
            type: "ORGANIZER_APPLICATION_RESUBMITTED",
            title: "Application resubmitted",
            message: "Your revised organizer application is back in review.",
            href: "/dashboard/organizer-onboarding",
          });
          return organization;
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            ...input,
            companyName: input.companyName.trim(),
            ssmNumber: input.ssmNumber.trim().toUpperCase(),
            email: input.email.trim().toLowerCase(),
            userId: ctx.userId,
            status: "PENDING",
            members: {
              create: {
                userId: ctx.userId,
                role: "OWNER",
                status: "ACTIVE",
                acceptedAt: new Date(),
              },
            },
            applications: { create: { status: "PENDING" } },
            documents: {
              create: { documentType: "SSM", fileUrl: input.ssmDocumentUrl },
            },
          },
        });
        await tx.user.update({
          where: { id: ctx.userId },
          data: { activeOrganizationId: organization.id },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: organization.id,
          action: "ORGANIZER_APPLICATION_SUBMITTED",
          entityType: "Organization",
          entityId: organization.id,
          summary: `${organization.companyName} submitted an organizer application.`,
        });
        await createNotification(tx, {
          userId: ctx.userId,
          type: "ORGANIZER_APPLICATION_SUBMITTED",
          title: "Application received",
          message: "Your organizer application is now in review.",
          href: "/dashboard/organizer-onboarding",
        });
        return organization;
      });
    }),

  getPlatformFees: adminProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.platformSetting.findMany({
      where: { key: { in: ["adminFeePercentage", "processingFeePercentage", "eventActivationFeeSen"] } },
    });
    const values = new Map(settings.map((setting) => [setting.key, Number(setting.value)]));
    return {
      adminFeePercentage: values.get("adminFeePercentage") ?? DEFAULT_SETTINGS.ADMIN_FEE_PERCENTAGE,
      processingFeePercentage: values.get("processingFeePercentage") ?? DEFAULT_SETTINGS.PROCESSING_FEE_PERCENTAGE,
      eventActivationFeeSen: values.get("eventActivationFeeSen") ?? DEFAULT_SETTINGS.EVENT_ACTIVATION_FEE_SEN,
    };
  }),

  updatePlatformFees: adminProcedure
    .input(platformFeeSchema)
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const before = await tx.platformSetting.findMany({
          where: { key: { in: ["adminFeePercentage", "processingFeePercentage", "eventActivationFeeSen"] } },
          select: { key: true, value: true },
        });
        const values = [
          ["adminFeePercentage", input.adminFeePercentage, "Platform commission percentage"],
          ["processingFeePercentage", input.processingFeePercentage, "Payment processing percentage"],
          ["eventActivationFeeSen", input.eventActivationFeeSen, "Event activation fee in sen"],
        ] as const;
        for (const [key, value, description] of values) {
          await tx.platformSetting.upsert({
            where: { key },
            update: { value: String(value), updatedByUserId: ctx.userId, description },
            create: { key, value: String(value), updatedByUserId: ctx.userId, description },
          });
        }
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          action: "PLATFORM_FEES_UPDATED",
          entityType: "PlatformSetting",
          entityId: "fee-schedule",
          summary: "The platform fee schedule was updated.",
          metadata: { before, after: input },
        });
        return { success: true };
      })
    ),

  getPlatformControlCenter: adminProcedure.query(async ({ ctx }) => {
    const [fees, control, lastReminderRun, activeRateLimitBuckets] = await Promise.all([
      getActiveFeeSchedule(ctx.db),
      getPlatformControlConfig(ctx.db),
      ctx.db.platformJobRun.findFirst({ where: { jobName: "RACE_DAY_REMINDERS" }, orderBy: { startedAt: "desc" } }),
      ctx.db.rateLimit.count(),
    ]);
    return {
      fees,
      ...control,
      health: {
        database: "CONNECTED" as const,
        cronConfigured: Boolean(serverEnv.CRON_SECRET),
        uploadServiceConfigured: Boolean(serverEnv.UPLOADTHING_TOKEN),
        paymentMode: serverEnv.MOCK_PAYMENT_MODE ? "SIMULATED" : "LIVE",
        trustProxyHeaders: serverEnv.TRUST_PROXY_HEADERS,
        activeRateLimitBuckets,
        lastReminderRun,
      },
    };
  }),

  getPublicPlatformExperience: publicProcedure.query(async ({ ctx }) => {
    const control = await getPlatformControlConfig(ctx.db);
    return {
      carousel: { enabled: control.carousel.enabled },
      announcement: control.announcement.enabled
        ? control.announcement
        : { ...control.announcement, message: "", linkLabel: "", href: null },
    };
  }),

  updateHomepageCarouselSettings: adminProcedure
    .input(homepageCarouselSettingsSchema)
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const before = (await getPlatformControlConfig(tx)).carousel;
        await savePlatformControlValue(tx, {
          key: PLATFORM_CONTROL_KEYS.HOMEPAGE_CAROUSEL,
          value: input,
          description: "Homepage carousel display controls",
          updatedByUserId: ctx.userId,
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          action: "HOMEPAGE_CAROUSEL_UPDATED",
          entityType: "PlatformSetting",
          entityId: PLATFORM_CONTROL_KEYS.HOMEPAGE_CAROUSEL,
          summary: "Homepage carousel settings were updated.",
          metadata: { before, after: input },
        });
        return input;
      })
    ),

  updateRaceReminderSettings: adminProcedure
    .input(raceReminderSettingsSchema)
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const before = (await getPlatformControlConfig(tx)).reminders;
        await savePlatformControlValue(tx, {
          key: PLATFORM_CONTROL_KEYS.RACE_REMINDERS,
          value: input,
          description: "Race-day reminder schedule controls",
          updatedByUserId: ctx.userId,
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          action: "RACE_REMINDER_SETTINGS_UPDATED",
          entityType: "PlatformSetting",
          entityId: PLATFORM_CONTROL_KEYS.RACE_REMINDERS,
          summary: "Race-day reminder settings were updated.",
          metadata: { before, after: input },
        });
        return input;
      })
    ),

  updateSecurityControls: adminProcedure
    .input(securityControlsSettingsSchema)
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const before = (await getPlatformControlConfig(tx)).security;
        await savePlatformControlValue(tx, {
          key: PLATFORM_CONTROL_KEYS.SECURITY_CONTROLS,
          value: input,
          description: "Public request rate-limit controls",
          updatedByUserId: ctx.userId,
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          action: "SECURITY_CONTROLS_UPDATED",
          entityType: "PlatformSetting",
          entityId: PLATFORM_CONTROL_KEYS.SECURITY_CONTROLS,
          summary: "Public request security controls were updated.",
          metadata: { before, after: input },
        });
        return input;
      })
    ),

  updatePlatformAnnouncement: adminProcedure
    .input(platformAnnouncementSettingsSchema)
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const before = (await getPlatformControlConfig(tx)).announcement;
        await savePlatformControlValue(tx, {
          key: PLATFORM_CONTROL_KEYS.ANNOUNCEMENT,
          value: input,
          description: "Public platform announcement banner",
          updatedByUserId: ctx.userId,
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          action: "PLATFORM_ANNOUNCEMENT_UPDATED",
          entityType: "PlatformSetting",
          entityId: PLATFORM_CONTROL_KEYS.ANNOUNCEMENT,
          summary: "Public platform announcement settings were updated.",
          metadata: { before, after: input },
        });
        return input;
      })
    ),

  runRaceDayRemindersNow: adminProcedure.mutation(async ({ ctx }) => {
    const result = await dispatchRaceDayReminders(ctx.db);
    await writeAuditLog(ctx.db, {
      actorUserId: ctx.userId,
      action: "RACE_REMINDER_RUN_TRIGGERED",
      entityType: "PlatformJobRun",
      entityId: "RACE_DAY_REMINDERS",
      summary: `Race-day reminder job was manually triggered (${result.status.toLowerCase()}).`,
      metadata: result,
    });
    return result;
  }),

  getEventTemplates: protectedProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      const [bib, cert] = await Promise.all([
        ctx.db.raceBibTemplate.findUnique({ where: { eventId: input.eventId } }),
        ctx.db.certificateTemplate.findUnique({ where: { eventId: input.eventId } }),
      ]);
      return {
        bib: normalizeBibTemplate(bib),
        cert: normalizeCertificateTemplate(cert),
      };
    }),

  saveBibTemplate: protectedProcedure
    .input(bibTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      const { eventId, ...data } = input;
      return ctx.db.$transaction(async (tx) => {
        const before = await tx.raceBibTemplate.findUnique({ where: { eventId } });
        const template = await tx.raceBibTemplate.upsert({
          where: { eventId },
          update: data,
          create: { eventId, ...data },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId,
          action: "BIB_TEMPLATE_UPDATED",
          entityType: "RaceBibTemplate",
          entityId: template.id,
          summary: "The race bib template was updated.",
          metadata: {
            before: before ? bibTemplateAuditSummary(normalizeBibTemplate(before)) : null,
            after: bibTemplateAuditSummary(normalizeBibTemplate(template)),
          },
        });
        return template;
      });
    }),

  saveCertificateTemplate: protectedProcedure
    .input(certificateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { event } = await requireEventAccess(ctx.db, ctx, input.eventId, EVENT_MANAGER_ROLES, true);
      const { eventId, ...data } = input;
      return ctx.db.$transaction(async (tx) => {
        const before = await tx.certificateTemplate.findUnique({ where: { eventId } });
        const template = await tx.certificateTemplate.upsert({
          where: { eventId },
          update: data,
          create: { eventId, ...data },
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId,
          action: "CERTIFICATE_TEMPLATE_UPDATED",
          entityType: "CertificateTemplate",
          entityId: template.id,
          summary: "The certificate template was updated.",
          metadata: {
            before: before ? certificateTemplateAuditSummary(normalizeCertificateTemplate(before)) : null,
            after: certificateTemplateAuditSummary(normalizeCertificateTemplate(template)),
          },
        });
        return template;
      });
    }),

  getMyWorkspaceContext: protectedProcedure.query(async ({ ctx }) => {
    return getWorkspaceContext(ctx.db, ctx);
  }),

  selectWorkspaceOrganization: organizerProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const access = await requireOrganizationAccess(
        ctx.db,
        ctx,
        input.organizationId
      );
      await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { activeOrganizationId: access.organizationId },
      });
      return { selectedOrganizationId: access.organizationId };
    }),

  getMyOrganization: protectedProcedure.query(async ({ ctx }) => {
    const workspace = await getWorkspaceContext(ctx.db, ctx);
    const reference = workspace.selectedOrganization;
    if (!reference) return null;
    await requireOrganizationAccess(ctx.db, ctx, reference.id, ["OWNER", "MANAGER"]);
    return ctx.db.organization.findUnique({
      where: { id: reference.id },
      include: {
        applications: { orderBy: { createdAt: "desc" }, take: 1 },
        members: {
          where: { status: { in: ["ACTIVE", "INVITED"] } },
          select: { id: true, role: true, status: true, invitedAt: true, acceptedAt: true, user: { select: { id: true, name: true, email: true } } },
        },
        events: { select: { id: true, title: true, status: true, eventDate: true }, orderBy: { eventDate: "desc" } },
      },
    });
  }),

  getOrganizations: adminProcedure
    .input(z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const organizations = await ctx.db.organization.findMany({
        where: input?.status ? { status: input.status } : undefined,
        include: {
          user: { select: { id: true, name: true, email: true } },
          applications: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { events: true, members: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return Promise.all(
        organizations.map(async (organization) => {
          if (!organization.ssmDocumentUrl) return organization;
          try {
            const signed = await utapi.generateSignedURL(organization.ssmDocumentUrl, { expiresIn: "10 minutes" });
            return { ...organization, ssmDocumentUrl: signed.ufsUrl };
          } catch {
            return { ...organization, ssmDocumentUrl: null };
          }
        })
      );
    }),

  approveOrganization: adminProcedure
    .input(z.object({ orgId: z.string().min(1), notes: z.string().trim().max(1000).optional() }))
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const current = await tx.organization.findUnique({ where: { id: input.orgId } });
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Organizer application not found." });
        if (current.status === "APPROVED") return current;
        if (current.status !== "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only a pending application can be approved." });
        }
        const organization = await tx.organization.update({ where: { id: current.id }, data: { status: "APPROVED" } });
        await tx.organizerApplication.updateMany({
          where: { organizationId: current.id, status: "PENDING" },
          data: {
            status: "APPROVED",
            reviewerNotes: input.notes?.trim() || null,
            reviewedAt: new Date(),
            reviewedByUserId: ctx.userId,
          },
        });
        await tx.organizationMember.upsert({
          where: { organizationId_userId: { organizationId: current.id, userId: current.userId } },
          update: { role: "OWNER", status: "ACTIVE", acceptedAt: new Date() },
          create: { organizationId: current.id, userId: current.userId, role: "OWNER", status: "ACTIVE", acceptedAt: new Date() },
        });
        await tx.user.update({ where: { id: current.userId }, data: { role: "ORGANIZER" } });
        await createNotification(tx, {
          userId: current.userId,
          type: "ORGANIZER_APPROVED",
          title: "Organizer account approved",
          message: `${current.companyName} is verified and ready to create events.`,
          href: "/dashboard/events",
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: current.id,
          action: "ORGANIZER_APPROVED",
          entityType: "Organization",
          entityId: current.id,
          summary: `${current.companyName} was approved.`,
          metadata: input.notes ? { notes: input.notes } : undefined,
        });
        return organization;
      })
    ),

  rejectOrganization: adminProcedure
    .input(z.object({ orgId: z.string().min(1), notes: z.string().trim().min(5).max(1000).optional() }))
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const current = await tx.organization.findUnique({ where: { id: input.orgId } });
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Organizer application not found." });
        if (current.status !== "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only a pending application can be rejected." });
        }
        const organization = await tx.organization.update({ where: { id: current.id }, data: { status: "REJECTED" } });
        await tx.organizerApplication.updateMany({
          where: { organizationId: current.id, status: "PENDING" },
          data: {
            status: "REJECTED",
            reviewerNotes: input.notes?.trim() || null,
            reviewedAt: new Date(),
            reviewedByUserId: ctx.userId,
          },
        });
        const otherApprovedOrganizations = await tx.organization.count({
          where: {
            id: { not: current.id },
            status: "APPROVED",
            OR: [{ userId: current.userId }, { members: { some: { userId: current.userId, status: "ACTIVE" } } }],
          },
        });
        if (otherApprovedOrganizations === 0) {
          await tx.user.update({ where: { id: current.userId }, data: { role: "USER" } });
        }
        await createNotification(tx, {
          userId: current.userId,
          type: "ORGANIZER_REJECTED",
          title: "Organizer application needs attention",
          message: input.notes || "Your organizer application could not be approved.",
          href: "/dashboard/organizer-onboarding",
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: current.id,
          action: "ORGANIZER_REJECTED",
          entityType: "Organization",
          entityId: current.id,
          summary: `${current.companyName} was rejected.`,
          metadata: input.notes ? { notes: input.notes } : undefined,
        });
        return organization;
      })
    ),

  setOrganizationSuspension: adminProcedure
    .input(z.object({ orgId: z.string().min(1), suspended: z.boolean(), reason: z.string().trim().min(5).max(1000) }))
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const current = await tx.organization.findUnique({ where: { id: input.orgId } });
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Organizer not found." });
        const expectedStatus = input.suspended ? "APPROVED" : "SUSPENDED";
        if (current.status !== expectedStatus) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Organizer must be ${expectedStatus.toLowerCase()} for this action.` });
        }
        const status = input.suspended ? "SUSPENDED" : "APPROVED";
        const organization = await tx.organization.update({ where: { id: current.id }, data: { status } });
        if (input.suspended) {
          const otherAccess = await tx.organization.count({
            where: {
              id: { not: current.id },
              status: "APPROVED",
              OR: [{ userId: current.userId }, { members: { some: { userId: current.userId, status: "ACTIVE" } } }],
            },
          });
          if (otherAccess === 0) await tx.user.update({ where: { id: current.userId }, data: { role: "USER" } });
        } else {
          await tx.user.update({ where: { id: current.userId }, data: { role: "ORGANIZER" } });
        }
        await createNotification(tx, {
          userId: current.userId,
          type: input.suspended ? "ORGANIZER_SUSPENDED" : "ORGANIZER_REINSTATED",
          title: input.suspended ? "Organizer workspace suspended" : "Organizer workspace reinstated",
          message: input.reason,
          href: "/dashboard/organizer-onboarding",
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: current.id,
          action: input.suspended ? "ORGANIZER_SUSPENDED" : "ORGANIZER_REINSTATED",
          entityType: "Organization",
          entityId: current.id,
          summary: `${current.companyName} was ${input.suspended ? "suspended" : "reinstated"}.`,
          metadata: { reason: input.reason },
        });
        return organization;
      })
    ),

  addOrganizationMember: organizerProcedure
    .input(z.object({
      organizationId: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["MANAGER", "OPERATIONS", "FINANCE", "CHECKIN_STAFF"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireApprovedOrganizationAccess(ctx.db, ctx, input.organizationId, ["OWNER", "MANAGER"]);
      const user = await ctx.db.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Ask this team member to create a NexRun account first." });
      return ctx.db.$transaction(async (tx) => {
        const member = await tx.organizationMember.upsert({
          where: { organizationId_userId: { organizationId: input.organizationId, userId: user.id } },
          update: { role: input.role, status: "ACTIVE", acceptedAt: new Date() },
          create: { organizationId: input.organizationId, userId: user.id, role: input.role, status: "ACTIVE", invitedAt: new Date(), acceptedAt: new Date() },
        });
        if (user.role === "USER") await tx.user.update({ where: { id: user.id }, data: { role: "ORGANIZER" } });
        await createNotification(tx, {
          userId: user.id,
          type: "ORGANIZATION_MEMBER_ADDED",
          title: "You joined an organizer team",
          message: `You now have ${input.role.toLowerCase().replaceAll("_", " ")} access.`,
          href: "/dashboard",
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: input.organizationId,
          action: "ORGANIZATION_MEMBER_ADDED",
          entityType: "OrganizationMember",
          entityId: member.id,
          summary: `${user.email} was added as ${input.role}.`,
        });
        return member;
      });
    }),

  removeOrganizationMember: organizerProcedure
    .input(z.object({ organizationId: z.string().min(1), memberId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireApprovedOrganizationAccess(ctx.db, ctx, input.organizationId, ["OWNER"]);
      const member = await ctx.db.organizationMember.findFirst({
        where: { id: input.memberId, organizationId: input.organizationId, role: { not: "OWNER" } },
      });
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Team member not found." });
      const organization = await ctx.db.organization.findUnique({
        where: { id: input.organizationId },
        select: { companyName: true },
      });
      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.organizationMember.update({ where: { id: member.id }, data: { status: "SUSPENDED" } });
        const remainingAccess = await tx.organization.count({
          where: {
            status: "APPROVED",
            OR: [
              { userId: member.userId },
              { members: { some: { userId: member.userId, status: "ACTIVE" } } },
            ],
          },
        });
        if (remainingAccess === 0) {
          await tx.user.update({
            where: { id: member.userId },
            data: { role: "USER", activeOrganizationId: null },
          });
        }
        await tx.user.updateMany({
          where: {
            id: member.userId,
            activeOrganizationId: input.organizationId,
          },
          data: { activeOrganizationId: null },
        });
        await createNotification(tx, {
          userId: member.userId,
          type: "ORGANIZATION_MEMBER_REMOVED",
          title: "Removed from organizer workspace",
          message: `You have been removed from ${organization?.companyName ?? "an organizer workspace"}.`,
          href: "/dashboard",
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: input.organizationId,
          action: "ORGANIZATION_MEMBER_REMOVED",
          entityType: "OrganizationMember",
          entityId: member.id,
          summary: "A team member was removed from the organizer workspace.",
        });
        return updated;
      });
    }),

  getPendingSettlements: organizerProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.userRole === ROLES.ADMIN || ctx.userRole === ROLES.DEVELOPER;
    const selectedAccess = isAdmin
      ? null
      : await requireSelectedOrganizationAccess(
          ctx.db,
          ctx,
          ORGANIZATION_PERMISSIONS.MANAGE_FINANCE,
          true
        );
    const events = await ctx.db.event.findMany({
      where: isAdmin
        ? undefined
        : { organizationId: selectedAccess!.organizationId },
      include: {
        organization: true,
        settlements: true,
        orders: {
          where: { status: "PAID" },
          select: { totalPaidSen: true, adminFeeSen: true, processingFeeSen: true, organizerNetSen: true },
        },
      },
      orderBy: { eventDate: "desc" },
    });
    return events.map((event) => {
      const settlement = event.settlements[0] ?? null;
      return {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.eventDate,
        status: event.status,
        organizationId: event.organizationId,
        companyName: event.organization.companyName,
        bankName: event.organization.bankName,
        bankAccountNo: event.organization.bankAccountNo,
        bankAccountName: event.organization.bankAccountName,
        totalPaidSen: event.orders.reduce((sum, order) => sum + order.totalPaidSen, 0),
        totalAdminFeeSen: event.orders.reduce((sum, order) => sum + order.adminFeeSen, 0),
        totalProcessingFeeSen: event.orders.reduce((sum, order) => sum + order.processingFeeSen, 0),
        netPayableSen: event.orders.reduce((sum, order) => sum + order.organizerNetSen, 0),
        settlementStatus: settlement?.status ?? "UNSETTLED",
        settledAt: settlement?.settledAt ?? null,
        referenceNumber: settlement?.referenceNumber ?? null,
      };
    });
  }),

  // B-18: Settlement history & payout timeline for an organizer's single event
  getSettlementTimeline: organizerProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.userRole === ROLES.ADMIN || ctx.userRole === ROLES.DEVELOPER;
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        include: {
          organization: { select: { id: true, companyName: true, bankName: true, bankAccountNo: true, bankAccountName: true } },
          settlements: true,
          orders: {
            where: { status: "PAID" },
            select: { totalPaidSen: true, adminFeeSen: true, processingFeeSen: true, organizerNetSen: true, paidAt: true },
            orderBy: { paidAt: "asc" },
          },
        },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      if (!isAdmin) {
        await requireSelectedOrganizationAccess(ctx.db, ctx, ORGANIZATION_PERMISSIONS.MANAGE_FINANCE, true);
        if (event.organizationId !== (await getWorkspaceContext(ctx.db, ctx)).selectedOrganization?.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This event does not belong to your workspace." });
        }
      }

      const settlement = event.settlements[0] ?? null;
      const firstPaidAt = event.orders[0]?.paidAt ?? null;
      const lastPaidAt = event.orders.length > 0 ? event.orders[event.orders.length - 1].paidAt : null;

      const milestones: { key: string; label: string; at: Date | null; done: boolean }[] = [
        { key: "FIRST_SALE", label: "First ticket sale received", at: firstPaidAt, done: !!firstPaidAt },
        { key: "EVENT_COMPLETED", label: "Event completed", at: ["COMPLETED", "REGISTRATION_CLOSED"].includes(event.status) ? event.updatedAt : null, done: ["COMPLETED", "REGISTRATION_CLOSED"].includes(event.status) },
        { key: "READY_FOR_SETTLEMENT", label: "Ready for settlement review", at: settlement?.createdAt ?? (["COMPLETED", "REGISTRATION_CLOSED"].includes(event.status) ? event.updatedAt : null), done: !!settlement || ["COMPLETED", "REGISTRATION_CLOSED"].includes(event.status) },
        { key: "PROCESSING", label: "Payout processing by admin", at: settlement && settlement.status !== "UNSETTLED" ? settlement.updatedAt : null, done: !!settlement && settlement.status !== "UNSETTLED" },
        { key: "SETTLED", label: "Payout settled to bank account", at: settlement?.settledAt ?? null, done: settlement?.status === "SETTLED" },
      ];

      return {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.eventDate,
        status: event.status,
        companyName: event.organization.companyName,
        bankName: event.organization.bankName,
        bankAccountNo: event.organization.bankAccountNo,
        bankAccountName: event.organization.bankAccountName,
        totalPaidSen: event.orders.reduce((sum, order) => sum + order.totalPaidSen, 0),
        totalAdminFeeSen: event.orders.reduce((sum, order) => sum + order.adminFeeSen, 0),
        totalProcessingFeeSen: event.orders.reduce((sum, order) => sum + order.processingFeeSen, 0),
        netPayableSen: event.orders.reduce((sum, order) => sum + order.organizerNetSen, 0),
        settlementStatus: settlement?.status ?? "UNSETTLED",
        settledAt: settlement?.settledAt ?? null,
        referenceNumber: settlement?.referenceNumber ?? null,
        firstSaleAt: firstPaidAt,
        lastSaleAt: lastPaidAt,
        totalOrders: event.orders.length,
        milestones,
      };
    }),

  processSettlement: adminProcedure
    .input(z.object({ eventId: z.string().min(1), referenceNumber: z.string().trim().min(3).max(100) }))
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (tx) => {
        const event = await tx.event.findUnique({
          where: { id: input.eventId },
          include: { organization: true, orders: { where: { status: "PAID" } }, settlements: true },
        });
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
        if (!["REGISTRATION_CLOSED", "COMPLETED"].includes(event.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Settlement is available after registrations are closed." });
        }
        if (!event.organization.bankName || !event.organization.bankAccountNo || !event.organization.bankAccountName) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Organizer bank details are incomplete." });
        }
        const existing = event.settlements[0];
        if (existing?.status === "SETTLED") return existing;
        // Guard against overwriting a settlement that's already in PROCESSING status
        if (existing?.status === "PROCESSING") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This settlement is already being processed. Contact support if stuck.",
          });
        }
        const totals = event.orders.reduce(
          (sum, order) => ({
            gross: sum.gross + order.totalPaidSen,
            admin: sum.admin + order.adminFeeSen,
            processing: sum.processing + order.processingFeeSen,
            net: sum.net + order.organizerNetSen,
          }),
          { gross: 0, admin: 0, processing: 0, net: 0 }
        );
        if (totals.net <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "There is no organizer balance to settle." });
        const settlement = await tx.settlement.upsert({
          where: { eventId: event.id },
          update: {
            status: "SETTLED",
            settledAt: new Date(),
            settledByUserId: ctx.userId,
            referenceNumber: input.referenceNumber,
            totalGrossRevenueSen: totals.gross,
            totalAdminFeeSen: totals.admin,
            totalProcessingFeeSen: totals.processing,
            netPayableSen: totals.net,
            bankDetailsComplete: true,
            periodEnd: new Date(),
          },
          create: {
            organizationId: event.organizationId,
            eventId: event.id,
            totalGrossRevenueSen: totals.gross,
            totalAdminFeeSen: totals.admin,
            totalProcessingFeeSen: totals.processing,
            netPayableSen: totals.net,
            status: "SETTLED",
            settledAt: new Date(),
            settledByUserId: ctx.userId,
            referenceNumber: input.referenceNumber,
            bankDetailsComplete: true,
            periodStart: event.registrationOpenDate,
            periodEnd: new Date(),
          },
        });
        await createNotification(tx, {
          userId: event.organization.userId,
          type: "SETTLEMENT_COMPLETED",
          title: "Settlement completed",
          message: `The settlement for ${event.title} has been recorded.`,
          href: "/dashboard/settlements",
        });
        await writeAuditLog(tx, {
          actorUserId: ctx.userId,
          organizationId: event.organizationId,
          eventId: event.id,
          action: "SETTLEMENT_COMPLETED",
          entityType: "Settlement",
          entityId: settlement.id,
          summary: `${event.title} settlement was completed with reference ${input.referenceNumber}.`,
          metadata: { netPayableSen: totals.net },
        });

        const fullOrg = await tx.organization.findUnique({
          where: { id: event.organizationId },
          select: { companyName: true, user: { select: { email: true } } },
        });

        if (fullOrg) {
          const { sendTransactionalEmail } = await import("@/server/services/email-service");
          const { SettlementCompletedEmail } = await import("@/server/services/email-templates/settlement-completed");
          const { formatInTimeZone } = await import("date-fns-tz");

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const settlementDate = formatInTimeZone(settlement.settledAt!, "Asia/Kuala_Lumpur", "dd MMMM yyyy");

          await sendTransactionalEmail({
            to: fullOrg.user.email,
            subject: `Settlement completed — ${event.title}`,
            reactTemplate: SettlementCompletedEmail({
              organizationName: fullOrg.companyName,
              eventTitle: event.title,
              netPayoutSen: totals.net,
              referenceNumber: input.referenceNumber,
              settlementDate,
              settlementsUrl: `${appUrl}/dashboard/settlements`,
            }),
          });
        }

        return settlement;
      })
    ),

  getNotifications: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const [items, unreadCount] = await Promise.all([
        ctx.db.notification.findMany({
          where: { userId: ctx.userId },
          orderBy: { createdAt: "desc" },
          take: input?.limit ?? 20,
        }),
        ctx.db.notification.count({ where: { userId: ctx.userId, readAt: null } }),
      ]);
      return { items, unreadCount };
    }),

  markNotificationRead: protectedProcedure
    .input(z.object({ notificationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.notification.updateMany({
        where: { id: input.notificationId, userId: ctx.userId },
        data: { readAt: new Date() },
      });
      if (result.count !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found." });
      return { success: true };
    }),

  markAllNotificationsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.db.notification.updateMany({
      where: { userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, count: result.count };
  }),

  withdrawConsent: protectedProcedure
    .input(z.object({ consentType: z.enum(["EVENT_TERMS", "PRIVACY"]) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.consentRecord.updateMany({
        where: { userId: ctx.userId, consentType: input.consentType, withdrawnAt: null },
        data: { withdrawnAt: new Date() },
      });
      return { success: true, count: result.count };
    }),

  getAuditLogs: adminProcedure
    .input(z.object({ search: z.string().trim().max(100).optional(), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) =>
      ctx.db.auditLog.findMany({
        where: input.search
          ? { OR: [
              { action: { contains: input.search, mode: "insensitive" } },
              { summary: { contains: input.search, mode: "insensitive" } },
              { entityType: { contains: input.search, mode: "insensitive" } },
            ] }
          : undefined,
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      })
    ),

  getOrganizationAuditLogs: organizerProcedure
    .input(z.object({ search: z.string().trim().max(100).optional(), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const access = await requireSelectedOrganizationAccess(
        ctx.db,
        ctx,
        ORGANIZATION_PERMISSIONS.MANAGE_EVENT
      );
      return ctx.db.auditLog.findMany({
        where: {
          organizationId: access.organizationId,
          ...(input.search
            ? { OR: [
                { action: { contains: input.search, mode: "insensitive" } },
                { summary: { contains: input.search, mode: "insensitive" } },
                { entityType: { contains: input.search, mode: "insensitive" } },
              ] }
            : {}),
        },
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        userProfile: true,
      },
    });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." });
    }
    return user;
  }),

  updateUserProfile: protectedProcedure
    .input(updateUserProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.userId },
        data: {
          name: input.name,
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
          userProfile: true,
        },
      });

      await writeAuditLog(ctx.db, {
        actorUserId: ctx.userId,
        action: "USER_PROFILE_UPDATED",
        entityType: "User",
        entityId: ctx.userId,
        summary: `${user.email} updated personal profile details.`,
      });

      return user;
    }),

  updateOrganizationDetails: organizerProcedure
    .input(updateOrganizationDetailsSchema)
    .mutation(async ({ ctx, input }) => {
      const access = await requireSelectedOrganizationAccess(
        ctx.db,
        ctx,
        ORGANIZATION_PERMISSIONS.MANAGE_EVENT
      );

      const organization = await ctx.db.organization.update({
        where: { id: access.organizationId },
        data: {
          contactPerson: input.contactPerson.trim(),
          phone: input.phone.trim(),
          address: input.address.trim(),
          bankName: input.bankName.trim(),
          bankAccountNo: input.bankAccountNo.trim(),
          bankAccountName: input.bankAccountName.trim(),
        },
      });

      await writeAuditLog(ctx.db, {
        actorUserId: ctx.userId,
        organizationId: access.organizationId,
        action: "ORGANIZATION_DETAILS_UPDATED",
        entityType: "Organization",
        entityId: access.organizationId,
        summary: `Updated organization contact and bank settlement details for ${organization.companyName}.`,
      });

      return organization;
    }),
});
