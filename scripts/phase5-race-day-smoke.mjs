import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const runId = crypto.randomBytes(6).toString("hex");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const organizerEmail = "organizer@runmalaysia.my";
const participantEmail = "participant@gmail.com";
const password = "NexRun2026!";
let organizationId = null;
let orderId = null;
let profileId = null;

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
  const suffix = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const response = await fetch(`${baseUrl}/api/trpc/${path}${suffix}`, { headers: { cookie } });
  const body = await response.text();
  assert.equal(response.ok, true, `${path} returned ${response.status}: ${body}`);
  return parseTrpc(body);
}

try {
  const [organizer, participant] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: organizerEmail } }),
    prisma.user.findUniqueOrThrow({ where: { email: participantEmail } }),
  ]);
  const organization = await prisma.organization.create({
    data: {
      companyName: `Phase 5 Runs ${runId}`,
      ssmNumber: `PHASE5-${runId.toUpperCase()}`,
      contactPerson: organizer.name ?? "Phase 5 Organizer",
      email: organizerEmail,
      phone: "012-0000000",
      address: "1 Jalan Integration, Cyberjaya",
      bankName: "NexRun Test Bank",
      bankAccountNo: `77${Date.now()}`,
      bankAccountName: "PHASE 5 RUNS",
      status: "APPROVED",
      userId: organizer.id,
    },
  });
  organizationId = organization.id;
  const event = await prisma.event.create({
    data: {
      title: `Phase 5 Race Day Event ${runId}`,
      slug: `phase5-race-day-${runId}`,
      description: "Temporary production-like event for race-day operations integration verification.",
      bannerImageUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5",
      eventDate: new Date("2027-01-10T00:00:00.000Z"),
      startTime: "06:30 AM",
      endTime: "11:00 AM",
      venue: "NexRun Test Venue",
      fullAddress: "1 Jalan Integration, 63000 Cyberjaya, Selangor",
      state: "Selangor",
      registrationOpenDate: new Date("2026-01-01T00:00:00.000Z"),
      registrationCloseDate: new Date("2027-01-01T00:00:00.000Z"),
      repcDate: "8 January 2027",
      repcTime: "10:00 AM",
      repcLocation: "NexRun Test Venue",
      ageReferenceDate: new Date("2027-01-10T00:00:00.000Z"),
      organizationId: organization.id,
      status: "PUBLISHED",
      categories: { create: { name: "5KM Open", distance: 5, ageMin: 18, ageMax: 70, priceSen: 6500 } },
    },
    include: { categories: true },
  });
  const profile = await prisma.participantProfile.create({
    data: {
      fullName: `Phase Five Runner ${runId}`,
      icNumber: `P5${runId.toUpperCase()}`,
      nationality: "Malaysian",
      gender: "MALE",
      phone: "0123456789",
      email: `phase5-${runId}@nexrun.test`,
      dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
      tshirtType: "MICROFIBER",
      tshirtSize: "M",
      emergencyContactName: "Phase Five Contact",
      emergencyContactPhone: "0198765432",
    },
  });
  profileId = profile.id;
  const order = await prisma.order.create({
    data: {
      orderNumber: `P5-ORD-${runId}`,
      invoiceNumber: `P5-INV-${runId}`,
      userId: participant.id,
      eventId: event.id,
      subtotalSen: 6500,
      adminFeeSen: 195,
      processingFeeSen: 195,
      totalPaidSen: 6695,
      organizerNetSen: 6305,
      status: "PAID",
      paidAt: new Date(),
      items: {
        create: {
          participantProfileId: profile.id,
          ticketCategoryId: event.categories[0].id,
          ticketNameSnapshot: "5KM Open",
          ticketPriceSenSnapshot: 6500,
          distanceSnapshot: 5,
          adminFeeSnapshotSen: 195,
          processingFeeSnapshotSen: 195,
        },
      },
    },
    include: { items: true },
  });
  orderId = order.id;
  const registration = await prisma.registration.create({
    data: {
      registrationCode: `P5-REG-${runId.toUpperCase()}`,
      orderId: order.id,
      orderItemId: order.items[0].id,
      eventId: event.id,
      participantProfileId: profile.id,
      ticketCategoryId: event.categories[0].id,
      bibNumber: "5001",
      qrCodeData: `https://nexrun.test/verify/registration/P5-REG-${runId.toUpperCase()}`,
    },
  });

  const organizerCookie = await signIn(organizerEmail);
  const before = await query("operational.getCheckInDesk", { eventId: event.id }, organizerCookie);
  assert.equal(before.stats.checkedIn, 0);
  const checkedIn = await mutate("operational.markBibCheckedIn", {
    eventId: event.id,
    registrationCode: registration.registrationCode,
    stationName: "REPC Counter A",
    bibCollected: true,
    shirtCollected: false,
    packCollected: true,
    notes: "Shirt collection deferred",
  }, organizerCookie);
  assert.equal(checkedIn.alreadyCheckedIn, false);
  const replay = await mutate("operational.markBibCheckedIn", {
    eventId: event.id,
    registrationCode: registration.registrationCode,
  }, organizerCookie);
  assert.equal(replay.alreadyCheckedIn, true);
  await mutate("operational.updateCheckInRecord", {
    eventId: event.id,
    registrationId: registration.id,
    stationName: "REPC Counter B",
    bibCollected: true,
    shirtCollected: true,
    packCollected: true,
    notes: "Shirt issued after size confirmation",
  }, organizerCookie);
  const desk = await query("operational.getCheckInDesk", { eventId: event.id }, organizerCookie);
  assert.equal(desk.stats.checkedIn, 1);
  assert.equal(desk.stats.shirtCollected, 1);
  assert.equal(desk.recent[0].stationName, "REPC Counter B");
  const audit = await prisma.auditLog.findFirst({ where: { eventId: event.id, action: "CHECKIN_COLLECTION_UPDATED" } });
  assert.ok(audit, "collection correction must be audited");

  console.log(JSON.stringify({
    sharedDeskSummary: true,
    initialCheckInRecorded: true,
    repeatScanIdempotent: true,
    collectionCorrectionAudited: true,
    stationActivityUpdated: true,
  }, null, 2));
} finally {
  if (organizationId) {
    await prisma.auditLog.deleteMany({ where: { organizationId } });
    if (orderId) await prisma.order.delete({ where: { id: orderId } });
    if (profileId) await prisma.participantProfile.delete({ where: { id: profileId } });
    await prisma.event.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
  await pool.end();
}
