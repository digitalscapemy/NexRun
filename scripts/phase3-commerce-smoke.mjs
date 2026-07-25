import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const runId = crypto.randomBytes(6).toString("hex");
const organizerEmail = "organizer@runmalaysia.my";
const adminEmail = "admin@nexrun.my";
const developerEmail = "developer@nexrun.my";
const password = "NexRun2026!";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
let organizationId = null;
let originalFeeSchedule = null;

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
  if (parsed.error) throw new Error(parsed.error.json?.message ?? parsed.error.message ?? "tRPC request failed");
  return parsed.result?.data?.json;
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

async function query(path, input, cookie) {
  const encoded = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const response = await fetch(`${baseUrl}/api/trpc/${path}${encoded}`, {
    headers: cookie ? { cookie } : undefined,
  });
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  return parseTrpc(await response.text());
}

function eventData({ organizationId: orgId, title, slug }) {
  return {
    organizationId: orgId,
    title,
    slug,
    description: "A production-quality temporary event used to verify the activation commerce workflow.",
    bannerImageUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5",
    eventDate: new Date("2027-01-10T00:00:00.000Z"),
    startTime: "06:30 AM",
    endTime: "11:00 AM",
    venue: "NexRun Test Venue",
    fullAddress: "1 Jalan Integration, 63000 Cyberjaya, Selangor",
    state: "Selangor",
    registrationOpenDate: new Date("2026-08-01T00:00:00.000Z"),
    registrationCloseDate: new Date("2027-01-01T00:00:00.000Z"),
    repcDate: "8 January 2027",
    repcTime: "10:00 AM",
    repcLocation: "NexRun Test Venue",
    ageReferenceDate: new Date("2027-01-10T00:00:00.000Z"),
    status: "PENDING_APPROVAL",
  };
}

try {
  const organizer = await prisma.user.findUniqueOrThrow({ where: { email: organizerEmail } });
  await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: adminEmail } }),
    prisma.user.findUniqueOrThrow({ where: { email: developerEmail } }),
  ]);
  const organization = await prisma.organization.create({
    data: {
      companyName: `Phase 3 Runs ${runId}`,
      ssmNumber: `PHASE3-${runId.toUpperCase()}`,
      contactPerson: organizer.name ?? "Phase 3 Organizer",
      email: organizerEmail,
      phone: "012-0000000",
      address: "1 Jalan Integration, Cyberjaya",
      bankName: "NexRun Test Bank",
      bankAccountNo: `99${Date.now()}`,
      bankAccountName: "PHASE 3 RUNS",
      status: "APPROVED",
      userId: organizer.id,
      members: {
        create: { userId: organizer.id, role: "OWNER", status: "ACTIVE", acceptedAt: new Date() },
      },
    },
  });
  organizationId = organization.id;
  const [paymentEvent, waiverEvent] = await Promise.all([
    prisma.event.create({ data: eventData({ organizationId: organization.id, title: `Phase 3 Payment Event ${runId}`, slug: `phase3-payment-${runId}` }) }),
    prisma.event.create({ data: eventData({ organizationId: organization.id, title: `Phase 3 Waiver Event ${runId}`, slug: `phase3-waiver-${runId}` }) }),
  ]);

  const adminCookie = await signIn(adminEmail);
  const developerCookie = await signIn(developerEmail);
  const organizerCookie = await signIn(organizerEmail);
  originalFeeSchedule = await query("settings.getPlatformFees", undefined, adminCookie);
  await mutate("settings.updatePlatformFees", {
    adminFeePercentage: 4,
    processingFeePercentage: 5,
    eventActivationFeeSen: 321000,
  }, adminCookie);
  const adminSchedule = await query("settings.getPlatformFees", undefined, adminCookie);
  const developerSchedule = await query("settings.getPlatformFees", undefined, developerCookie);
  assert.deepEqual(adminSchedule, { adminFeePercentage: 4, processingFeePercentage: 5, eventActivationFeeSen: 321000 });
  assert.deepEqual(developerSchedule, adminSchedule, "Developer must share platform-fee access with Admin");
  await mutate("event.moderateEvent", { eventId: paymentEvent.id, action: "APPROVE" }, adminCookie);
  await mutate("event.moderateEvent", { eventId: paymentEvent.id, action: "APPROVE" }, adminCookie);
  const fees = await query("activation.getActivationFees", { eventId: paymentEvent.id }, organizerCookie);
  const paymentFee = fees.find((fee) => fee.eventId === paymentEvent.id);
  assert.ok(paymentFee, "approval must expose an activation invoice");
  assert.equal(await prisma.organizerFee.count({ where: { eventId: paymentEvent.id } }), 1, "approval must issue one invoice");
  assert.equal(paymentFee.amountSen, 321000, "activation invoice must snapshot the configured amount");
  assert.equal((await prisma.event.findUniqueOrThrow({ where: { id: paymentEvent.id } })).status, "AWAITING_EVENT_FEE");

  const decline = await mutate("activation.processActivationFeePayment", {
    organizerFeeId: paymentFee.id,
    scenario: "DECLINED",
    idempotencyKey: `phase3-decline-${runId}`,
  }, organizerCookie);
  assert.equal(decline.paymentStatus, "FAILED");
  assert.equal(decline.organizerFeeStatus, "PENDING");

  const successKey = `phase3-success-${runId}`;
  const paid = await mutate("activation.processActivationFeePayment", {
    organizerFeeId: paymentFee.id,
    scenario: "SUCCESS",
    idempotencyKey: successKey,
  }, organizerCookie);
  const replayed = await mutate("activation.processActivationFeePayment", {
    organizerFeeId: paymentFee.id,
    scenario: "SUCCESS",
    idempotencyKey: successKey,
  }, organizerCookie);
  assert.equal(paid.eventStatus, "PUBLISHED");
  assert.equal(paid.organizerFeeStatus, "PAID");
  assert.equal(replayed.transactionId, paid.transactionId);
  assert.equal(await prisma.organizerFeePaymentAttempt.count({ where: { organizerFeeId: paymentFee.id } }), 2);

  await mutate("event.moderateEvent", { eventId: waiverEvent.id, action: "APPROVE" }, adminCookie);
  const waiverFee = await prisma.organizerFee.findUniqueOrThrow({ where: { eventId: waiverEvent.id } });
  await mutate("activation.waiveActivationFee", {
    organizerFeeId: waiverFee.id,
    reason: "Approved integration verification waiver",
  }, adminCookie);
  assert.equal((await prisma.organizerFee.findUniqueOrThrow({ where: { id: waiverFee.id } })).status, "WAIVED");
  assert.equal((await prisma.event.findUniqueOrThrow({ where: { id: waiverEvent.id } })).status, "PUBLISHED");
  assert.equal((await query("event.getEventBySlug", { slug: paymentEvent.slug })).id, paymentEvent.id);
  assert.equal((await query("event.getEventBySlug", { slug: waiverEvent.slug })).id, waiverEvent.id);

  console.log(JSON.stringify({
    approvalIdempotent: true,
    declineRetryRecorded: true,
    successfulPaymentPublished: true,
    paymentReplayIdempotent: true,
    auditedWaiverPublished: true,
    configurableActivationFeeSnapshotted: true,
    adminAndDeveloperFeeAccessVerified: true,
    publicDiscoveryAfterActivation: true,
  }, null, 2));
} finally {
  if (originalFeeSchedule) {
    await Promise.all([
      prisma.platformSetting.upsert({ where: { key: "adminFeePercentage" }, update: { value: String(originalFeeSchedule.adminFeePercentage) }, create: { key: "adminFeePercentage", value: String(originalFeeSchedule.adminFeePercentage) } }),
      prisma.platformSetting.upsert({ where: { key: "processingFeePercentage" }, update: { value: String(originalFeeSchedule.processingFeePercentage) }, create: { key: "processingFeePercentage", value: String(originalFeeSchedule.processingFeePercentage) } }),
      prisma.platformSetting.upsert({ where: { key: "eventActivationFeeSen" }, update: { value: String(originalFeeSchedule.eventActivationFeeSen) }, create: { key: "eventActivationFeeSen", value: String(originalFeeSchedule.eventActivationFeeSen) } }),
    ]);
  }
  if (organizationId) {
    await prisma.auditLog.deleteMany({ where: { organizationId } });
    await prisma.organizerFee.deleteMany({ where: { organizationId } });
    await prisma.event.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
  await pool.end();
}
