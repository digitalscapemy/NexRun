import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const runId = crypto.randomBytes(6).toString("hex");
const startedAt = new Date();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
let organizationId = null;
let eventId = null;
const participantEmail = "participant@gmail.com";
const organizerEmail = "organizer@runmalaysia.my";
const password = "NexRun2026!";

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

function checkoutInput(eventId, categoryId, key) {
  return {
    eventId,
    registrations: [{
      ticketCategoryId: categoryId,
      fullName: `Phase Four Runner ${runId}`,
      icNumber: `P4${runId.toUpperCase()}`,
      nationality: "Malaysian",
      gender: "MALE",
      phone: "0123456789",
      email: `phase4-${runId}@nexrun.test`,
      dateOfBirth: "1990-01-01T00:00:00.000Z",
      tshirtType: "MICROFIBER",
      tshirtSize: "M",
      emergencyContactName: "Phase Four Contact",
      emergencyContactPhone: "0198765432",
    }],
    idempotencyKey: key,
    acceptTerms: true,
    acceptPrivacy: true,
  };
}

try {
  const organizer = await prisma.user.findUniqueOrThrow({ where: { email: organizerEmail } });
  await prisma.user.findUniqueOrThrow({ where: { email: participantEmail } });
  const organization = await prisma.organization.create({
    data: {
      companyName: `Phase 4 Runs ${runId}`,
      ssmNumber: `PHASE4-${runId.toUpperCase()}`,
      contactPerson: organizer.name ?? "Phase 4 Organizer",
      email: organizerEmail,
      phone: "012-0000000",
      address: "1 Jalan Integration, Cyberjaya",
      bankName: "NexRun Test Bank",
      bankAccountNo: `88${Date.now()}`,
      bankAccountName: "PHASE 4 RUNS",
      status: "APPROVED",
      userId: organizer.id,
    },
  });
  organizationId = organization.id;
  const event = await prisma.event.create({
    data: {
      title: `Phase 4 Checkout Event ${runId}`,
      slug: `phase4-checkout-${runId}`,
      description: "Temporary production-like event for checkout recovery integration verification.",
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
      categories: {
        create: { name: "5KM Open", distance: 5, ageMin: 18, ageMax: 70, priceSen: 6500, maxSlots: 5 },
      },
    },
    include: { categories: true },
  });
  eventId = event.id;
  const participantCookie = await signIn(participantEmail);

  const cancelledOrder = await mutate(
    "registration.createOrder",
    checkoutInput(event.id, event.categories[0].id, `phase4-cancel-${runId}`),
    participantCookie,
  );
  const recoverable = await query("registration.getRecoverableOrders", undefined, participantCookie);
  assert.equal(recoverable.some((order) => order.id === cancelledOrder.orderId), true);
  const checkout = await query("registration.getCheckoutOrder", { orderId: cancelledOrder.orderId }, participantCookie);
  assert.equal(checkout.status, "PENDING");
  await mutate("registration.cancelCheckoutOrder", { orderId: cancelledOrder.orderId }, participantCookie);
  const cancelled = await prisma.order.findUniqueOrThrow({ where: { id: cancelledOrder.orderId }, include: { reservations: true } });
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.reservations.every((reservation) => reservation.status === "RELEASED"), true);

  const paidOrder = await mutate(
    "registration.createOrder",
    checkoutInput(event.id, event.categories[0].id, `phase4-pay-${runId}`),
    participantCookie,
  );
  const paid = await mutate("registration.processMockPayment", {
    orderId: paidOrder.orderId,
    paymentMethod: "EWALLET",
    scenario: "SUCCESS",
    idempotencyKey: `phase4-payment-${runId}`,
  }, participantCookie);
  assert.equal(paid.status, "PAID");
  const receipt = await query("registration.getOrderDetails", { orderId: paidOrder.orderId }, participantCookie);
  assert.equal(receipt.status, "PAID");
  assert.equal(receipt.paymentTransactions[0].paymentMethod, "EWALLET");

  console.log(JSON.stringify({
    recoverableCheckoutListed: true,
    checkoutResumeAuthorised: true,
    cancellationReleasedReservations: true,
    selectedPaymentMethodRecorded: true,
    paidCheckoutReceiptAvailable: true,
  }, null, 2));
} finally {
  if (eventId) {
    const notifications = await prisma.notification.findMany({
      where: { createdAt: { gte: startedAt }, message: { contains: `Phase 4 Checkout Event ${runId}` } },
      select: { id: true },
    });
    if (notifications.length > 0) {
      await prisma.notification.deleteMany({ where: { id: { in: notifications.map((notification) => notification.id) } } });
    }
  }
  if (organizationId) {
    const orders = await prisma.order.findMany({ where: { event: { organizationId } }, select: { id: true } });
    const profileIds = await prisma.orderItem.findMany({ where: { orderId: { in: orders.map((order) => order.id) } }, select: { participantProfileId: true } });
    await prisma.auditLog.deleteMany({ where: { organizationId } });
    await prisma.order.deleteMany({ where: { id: { in: orders.map((order) => order.id) } } });
    if (profileIds.length > 0) {
      await prisma.participantProfile.deleteMany({ where: { id: { in: profileIds.map((profile) => profile.participantProfileId) } } });
    }
    await prisma.event.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
  await pool.end();
}
