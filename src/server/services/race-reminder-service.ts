import { Prisma, type PrismaClient } from "@/generated/prisma";
import { formatRepcSchedule } from "@/lib/format-repc-schedule";
import { createNotification } from "@/server/services/notification-service";
import { getPlatformControlConfig } from "@/server/services/platform-control-service";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;
const REMINDER_TYPE = "RACE_DAY";
const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur";

function malaysiaDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MALAYSIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour") };
}

function malaysiaDayRange(now: Date, daysFromToday: number) {
  const { year, month, day } = malaysiaDateParts(now);
  // Get midnight (00:00) Malaysia time for target day, then convert to UTC.
  // Malaysia is UTC+8, so 00:00 MYT = 16:00 previous day UTC.
  const midnightMalaysia = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day + daysFromToday).padStart(2, '0')}T00:00:00+08:00`);
  const start = new Date(midnightMalaysia.getTime());
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export async function dispatchRaceDayReminders(db: DatabaseClient, now = new Date()) {
  const job = await db.platformJobRun.create({ data: { jobName: "RACE_DAY_REMINDERS", status: "RUNNING" } });
  try {
    const control = await getPlatformControlConfig(db);
    const malaysiaNow = malaysiaDateParts(now);
    if (!control.reminders.enabled || malaysiaNow.hour < control.reminders.sendHourMalaysia) {
      const reason = !control.reminders.enabled ? "Reminders are disabled." : "Scheduled hour has not been reached.";
      await db.platformJobRun.update({
        where: { id: job.id },
        data: { status: "SKIPPED", finishedAt: new Date(), summary: reason, metadata: { hourMalaysia: malaysiaNow.hour } },
      });
      return { status: "SKIPPED" as const, deliveries: 0, reason };
    }

    const range = malaysiaDayRange(now, control.reminders.daysBeforeEvent);
    const registrations = await db.registration.findMany({
      where: {
        status: "ACTIVE",
        event: {
          status: { in: ["PUBLISHED", "REGISTRATION_CLOSED"] },
          eventDate: { gte: range.start, lt: range.end },
        },
      },
      select: {
        id: true,
        eventId: true,
        order: { select: { userId: true } },
        event: { select: { title: true, eventDate: true, startTime: true, venue: true, state: true, repcDate: true, repcTime: true, repcLocation: true } },
      },
      take: 10_000,
    });

    let deliveries = 0;
    for (const registration of registrations) {
      try {
        let userId: string | null = null;
        await db.$transaction(async (tx) => {
          const delivery = await tx.raceReminderDelivery.create({
            data: {
              eventId: registration.eventId,
              registrationId: registration.id,
              reminderType: REMINDER_TYPE,
              scheduledFor: range.start,
              status: "SENT",
              deliveredAt: new Date(),
            },
          });
          const eventDate = registration.event.eventDate.toLocaleDateString("en-MY", { dateStyle: "full" });
          const notification = await createNotification(tx, {
            userId: registration.order.userId,
            type: "RACE_DAY_REMINDER",
            title: `${registration.event.title} is coming up`,
            message: `Race day is ${eventDate}. Start time: ${registration.event.startTime}. Venue: ${registration.event.venue}, ${registration.event.state}.${registration.event.repcDate ? ` REPC: ${registration.event.repcDate}${registration.event.repcTime ? `, ${registration.event.repcTime}` : ""}${registration.event.repcLocation ? ` at ${registration.event.repcLocation}` : ""}.` : ""}`,
            href: "/dashboard/registrations",
          });
          await tx.raceReminderDelivery.update({ where: { id: delivery.id }, data: { notificationId: notification.id } });
          userId = registration.order.userId;
        });

        if (userId) {
          const user = await db.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
          });

          if (user) {
            const { sendTransactionalEmail } = await import("@/server/services/email-service");
            const { RaceDayReminderEmail } = await import("@/server/services/email-templates/race-day-reminder");
            const { formatInTimeZone } = await import("date-fns-tz");

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const eventDate = formatInTimeZone(registration.event.eventDate, MALAYSIA_TIME_ZONE, "dd MMMM yyyy");
            const venueAddress = `${registration.event.venue}, ${registration.event.state}`;
            const repcDate = formatRepcSchedule(
              registration.event.repcDate,
              registration.event.repcTime,
            );

            await sendTransactionalEmail({
              to: user.email,
              subject: `Race day reminder — ${registration.event.title}`,
              reactTemplate: RaceDayReminderEmail({
                participantName: user.name ?? "Runner",
                eventTitle: registration.event.title,
                eventDate,
                startTime: registration.event.startTime,
                venue: registration.event.venue,
                venueAddress,
                repcDate,
                repcLocation: registration.event.repcLocation ?? undefined,
                registrationCode: registration.id.slice(0, 8).toUpperCase(),
                eTicketUrl: `${appUrl}/dashboard/registrations`,
              }),
            });
          }
        }

        deliveries += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }
    }

    await db.platformJobRun.update({
      where: { id: job.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        summary: `${deliveries} race-day reminder${deliveries === 1 ? "" : "s"} sent.`,
        metadata: { deliveries, eligibleRegistrations: registrations.length, scheduledFor: range.start.toISOString() },
      },
    });
    return { status: "SUCCESS" as const, deliveries, eligibleRegistrations: registrations.length };
  } catch (error) {
    await db.platformJobRun.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), summary: error instanceof Error ? error.message.slice(0, 500) : "Unknown reminder job failure." },
    });
    throw error;
  }
}
