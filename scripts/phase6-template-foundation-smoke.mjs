import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";

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

async function request(path, input, cookie, method = "POST") {
  const suffix = method === "GET" ? `?input=${encodeURIComponent(JSON.stringify({ json: input }))}` : "";
  const response = await fetch(`${baseUrl}/api/trpc/${path}${suffix}`, {
    method,
    headers: method === "GET" ? { cookie } : { "content-type": "application/json", cookie, origin: baseUrl },
    body: method === "GET" ? undefined : JSON.stringify({ json: input }),
  });
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
      companyName: `Phase 6 Templates ${runId}`,
      ssmNumber: `PHASE6-${runId.toUpperCase()}`,
      contactPerson: organizer.name ?? "Phase 6 Organizer",
      email: organizerEmail,
      phone: "012-0000000",
      address: "1 Jalan Integration, Cyberjaya",
      bankName: "NexRun Test Bank",
      bankAccountNo: `66${Date.now()}`,
      bankAccountName: "PHASE 6 TEMPLATES",
      status: "APPROVED",
      userId: organizer.id,
    },
  });
  organizationId = organization.id;
  const event = await prisma.event.create({
    data: {
      title: `Phase 6 Template Event ${runId}`,
      slug: `phase6-template-${runId}`,
      description: "Temporary event for template configuration verification.",
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
      repcTime: "10:00 AM - 6:00 PM",
      repcLocation: "NexRun Test Venue",
      ageReferenceDate: new Date("2027-01-10T00:00:00.000Z"),
      organizationId: organization.id,
      status: "DRAFT",
      categories: { create: { name: "5KM Open", distance: 5, ageMin: 18, ageMax: 70, priceSen: 6500 } },
    },
    include: { categories: true },
  });
  const profile = await prisma.participantProfile.create({
    data: {
      fullName: `Phase Six Runner ${runId}`,
      icNumber: `P6${runId.toUpperCase()}`,
      nationality: "Malaysian",
      gender: "MALE",
      phone: "0123456789",
      email: `phase6-${runId}@nexrun.test`,
      dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
      tshirtType: "MICROFIBER",
      tshirtSize: "M",
      emergencyContactName: "Phase Six Contact",
      emergencyContactPhone: "0198765432",
    },
  });
  profileId = profile.id;
  const order = await prisma.order.create({
    data: {
      orderNumber: `P6-ORD-${runId}`,
      invoiceNumber: `P6-INV-${runId}`,
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
      registrationCode: `P6-REG-${runId.toUpperCase()}`,
      orderId: order.id,
      orderItemId: order.items[0].id,
      eventId: event.id,
      participantProfileId: profile.id,
      ticketCategoryId: event.categories[0].id,
      bibNumber: "6001",
      qrCodeData: `https://nexrun.test/verify/registration/P6-REG-${runId.toUpperCase()}`,
    },
  });
  const organizerCookie = await signIn(organizerEmail);
  await request("settings.saveBibTemplate", {
    eventId: event.id, themeColor: "#0F766E", fontFamily: "serif", startingBibNumber: 4000, locationText: "NexRun Test Venue",
    headerImageUrl: "https://cdn.nexrun.test/header.png", footerImageUrl: null,
    templateData: { organizerLabel: "NexRun Race Bib", runnerLabel: "Runner", categoryLabel: "Race category", showQrCode: true, showCategory: false },
  }, organizerCookie);
  await request("settings.saveCertificateTemplate", {
    eventId: event.id, orientation: "LANDSCAPE", preset: "MODERN", themeColor: "#0F766E",
    customTexts: { title: "Certificate of Completion", subtitle: "Awarded to", completionText: "For completing the NexRun test event.", signatureTitle: "Race Director", issuerName: "NexRun Test" },
    templateData: { showEventDate: true, showDistance: false },
  }, organizerCookie);
  const templates = await request("settings.getEventTemplates", { eventId: event.id }, organizerCookie, "GET");
  assert.equal(templates.bib.startingBibNumber, 4000);
  assert.equal(templates.bib.templateData.showCategory, false);
  assert.equal(templates.cert.customTexts.issuerName, "NexRun Test");
  assert.equal(templates.cert.templateData.showDistance, false);
  const auditCount = await prisma.auditLog.count({ where: { eventId: event.id, action: { in: ["BIB_TEMPLATE_UPDATED", "CERTIFICATE_TEMPLATE_UPDATED"] } } });
  assert.equal(auditCount, 2, "template changes must be audited");
  const bibBatch = await request("operational.getEventDocumentBatch", { eventId: event.id, documentType: "BIB", page: 1, limit: 50 }, organizerCookie, "GET");
  assert.equal(bibBatch.items.length, 1);
  assert.equal(bibBatch.items[0].registrationCode, registration.registrationCode);
  await request("operational.recordEventDocumentPrint", { eventId: event.id, documentType: "BIB", registrationIds: [registration.id] }, organizerCookie);
  await prisma.event.update({ where: { id: event.id }, data: { status: "COMPLETED" } });
  await prisma.registration.update({ where: { id: registration.id }, data: { isFinisher: true, finishedAt: new Date() } });
  const certificateBatch = await request("operational.getEventDocumentBatch", { eventId: event.id, documentType: "CERTIFICATE", page: 1, limit: 50 }, organizerCookie, "GET");
  assert.equal(certificateBatch.items.length, 1);
  await request("operational.recordEventDocumentPrint", { eventId: event.id, documentType: "CERTIFICATE", registrationIds: [registration.id] }, organizerCookie);
  const printAuditCount = await prisma.auditLog.count({ where: { eventId: event.id, action: { in: ["BIB_BATCH_PRINTED", "CERTIFICATE_BATCH_PRINTED"] } } });
  assert.equal(printAuditCount, 2, "document preparation must be audited");
  const participantCookie = await signIn(participantEmail);
  const denied = await fetch(`${baseUrl}/api/trpc/settings.getEventTemplates?input=${encodeURIComponent(JSON.stringify({ json: { eventId: event.id } }))}`, { headers: { cookie: participantCookie } });
  assert.equal(denied.ok, false, "unrelated participant must not read an organizer template");
  const documentDenied = await fetch(`${baseUrl}/api/trpc/operational.getEventDocumentBatch?input=${encodeURIComponent(JSON.stringify({ json: { eventId: event.id, documentType: "BIB", page: 1, limit: 50 } }))}`, { headers: { cookie: participantCookie } });
  assert.equal(documentDenied.ok, false, "unrelated participant must not read a document batch");
  console.log(JSON.stringify({ templatePersistence: true, structuredDefaults: true, documentBatchesProtected: true, auditRecorded: true, tenantAccessProtected: true }, null, 2));
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
