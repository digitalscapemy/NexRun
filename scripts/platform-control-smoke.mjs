import assert from "node:assert/strict";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const password = "NexRun2026!";
const adminEmail = "admin@nexrun.my";
const developerEmail = "developer@nexrun.my";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
let adminCookie = null;
let original = null;
const startedAt = new Date();

async function signIn(email) {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password, rememberMe: false }),
  });
  assert.equal(response.ok, true, `sign-in failed for ${email}`);
  const cookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie")];
  return cookies.filter(Boolean).map((cookie) => cookie.split(";")[0]).join("; ");
}

function parseTrpc(body) {
  const parsed = JSON.parse(body);
  if (parsed.error) throw new Error(parsed.error.json?.message ?? "tRPC request failed");
  return parsed.result?.data?.json;
}

async function query(path, input, cookie) {
  const suffix = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const response = await fetch(`${baseUrl}/api/trpc/${path}${suffix}`, { headers: cookie ? { cookie } : undefined });
  const body = await response.text();
  assert.equal(response.ok, true, `${path} returned ${response.status}: ${body}`);
  return parseTrpc(body);
}

async function mutate(path, input, cookie) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie, origin: baseUrl },
    body: JSON.stringify({ json: input }),
  });
  const body = await response.text();
  assert.equal(response.ok, true, `${path} returned ${response.status}: ${body}`);
  return parseTrpc(body);
}

try {
  adminCookie = await signIn(adminEmail);
  const developerCookie = await signIn(developerEmail);
  original = await query("settings.getPlatformControlCenter", undefined, adminCookie);
  const developerView = await query("settings.getPlatformControlCenter", undefined, developerCookie);
  assert.equal(developerView.fees.eventActivationFeeSen, original.fees.eventActivationFeeSen);

  await mutate("settings.updateHomepageCarouselSettings", { enabled: false, includeUpcomingEvents: false, maxEvents: 3 }, adminCookie);
  const publicDisplay = await query("settings.getPublicPlatformExperience", undefined);
  assert.equal(publicDisplay.carousel.enabled, false);

  await mutate("settings.updatePlatformAnnouncement", {
    enabled: true,
    tone: "WARNING",
    message: "Scheduled platform notice",
    linkLabel: "View events",
    href: "/events",
  }, adminCookie);
  const publicAnnouncement = await query("settings.getPublicPlatformExperience", undefined);
  assert.equal(publicAnnouncement.announcement.message, "Scheduled platform notice");

  await mutate("settings.updateSecurityControls", { verificationRequestsPerMinute: 35, voucherRequestsPerMinute: 25 }, adminCookie);
  await mutate("settings.updateRaceReminderSettings", { enabled: false, daysBeforeEvent: 1, sendHourMalaysia: 9 }, adminCookie);
  const manualRun = await mutate("settings.runRaceDayRemindersNow", undefined, adminCookie);
  assert.equal(manualRun.status, "SKIPPED");

  const unauthorizedCron = await fetch(`${baseUrl}/api/internal/send-race-reminders`, { method: "POST" });
  assert.equal(unauthorizedCron.status, process.env.CRON_SECRET ? 401 : 503);
  if (process.env.CRON_SECRET) {
    const authorizedCron = await fetch(`${baseUrl}/api/internal/send-race-reminders`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    assert.equal(authorizedCron.ok, true);
  }

  console.log(JSON.stringify({ adminDeveloperAccess: true, publicDisplayControlled: true, publicAnnouncementControlled: true, reminderCronProtected: true, manualReminderRunTracked: true }, null, 2));
} finally {
  if (adminCookie && original) {
    await Promise.all([
      mutate("settings.updateHomepageCarouselSettings", original.carousel, adminCookie),
      mutate("settings.updateRaceReminderSettings", original.reminders, adminCookie),
      mutate("settings.updateSecurityControls", original.security, adminCookie),
      mutate("settings.updatePlatformAnnouncement", original.announcement, adminCookie),
    ]);
  }
  await prisma.platformJobRun.deleteMany({ where: { jobName: "RACE_DAY_REMINDERS", startedAt: { gte: startedAt } } });
  await prisma.$disconnect();
  await pool.end();
}
