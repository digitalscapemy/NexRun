import {
  PrismaClient,
  Role,
  EventStatus,
  TicketGender,
  OrganizationStatus,
  OrganizationMemberRole,
  MembershipStatus,
  OrganizerFeeStatus,
  DiscountType,
  VoucherApplicationPolicy,
  SettlementStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  RegistrationStatus,
  MockPaymentScenario,
} from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { ROLES, DEFAULT_SETTINGS } from "../src/lib/constants.js";
import { hashPassword } from "better-auth/crypto";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting NexRun comprehensive database seeding...");

  const hashedPassword = await hashPassword("NexRun2026!");

  // ============================================
  // PHASE 1: USERS
  // ============================================
  console.log("\n📝 Phase 1: Users...");

  const userDefs = [
    { email: "developer@nexrun.my",      name: "Aznan Ab Llah",           role: ROLES.DEVELOPER  },
    { email: "admin@nexrun.my",          name: "Nurul Aimi Abdullah",     role: ROLES.ADMIN      },
    { email: "organizer@runmalaysia.my", name: "Faizal Tahir",            role: ROLES.ORGANIZER  },
    { email: "manager@runmalaysia.my",   name: "Siti Aminah Hassan",      role: ROLES.ORGANIZER  },
    { email: "finance@runmalaysia.my",   name: "Rahman Ali Ahmad",        role: ROLES.ORGANIZER  },
    { email: "checkin@runmalaysia.my",   name: "Hafiz Ismail",            role: ROLES.ORGANIZER  },
    { email: "organizer2@johorrun.my",   name: "Lim Wei Hong",            role: ROLES.ORGANIZER  },
    { email: "suspended@klrunners.my",   name: "Kumar Selvam",            role: ROLES.ORGANIZER  },
    { email: "participant@gmail.com",    name: "Ahmad Hafizuddin",        role: ROLES.USER       },
    { email: "participant2@gmail.com",   name: "Nurul Aisyah Zainal",     role: ROLES.USER       },
    { email: "participant3@gmail.com",   name: "Lee Wei Ming",            role: ROLES.USER       },
    { email: "participant4@gmail.com",   name: "Tan Mei Ling",            role: ROLES.USER       },
  ];

  const U: Record<string, { id: string }> = {};

  for (const def of userDefs) {
    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: { role: def.role as Role, name: def.name },
      create: { email: def.email, name: def.name, role: def.role as Role, emailVerified: true },
    });
    U[def.email] = user;

    await prisma.account.upsert({
      where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
      update: { password: hashedPassword },
      create: { userId: user.id, providerId: "credential", accountId: user.id, password: hashedPassword },
    });

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, fullName: def.name, nationality: "Malaysian" },
    });
  }
  console.log(`  ✓ ${userDefs.length} users created`);

  // ============================================
  // PHASE 2: ORGANIZATIONS
  // ============================================
  console.log("\n📝 Phase 2: Organizations...");

  // Org 1: Run Malaysia Events (APPROVED)
  const runMalaysia = await prisma.organization.upsert({
    where: { ssmNumber: "202401012345" },
    update: { status: "APPROVED" },
    create: {
      companyName: "Run Malaysia Events Sdn Bhd",
      ssmNumber: "202401012345",
      contactPerson: "Faizal Tahir",
      email: "organizer@runmalaysia.my",
      phone: "012-3456789",
      address: "Level 5, Menara KLCC, 50088 Kuala Lumpur",
      bankName: "Maybank Berhad",
      bankAccountNo: "514012345678",
      bankAccountName: "RUN MALAYSIA EVENTS SDN BHD",
      status: OrganizationStatus.APPROVED,
      userId: U["organizer@runmalaysia.my"].id,
    },
  });

  for (const [email, role] of [
    ["organizer@runmalaysia.my", OrganizationMemberRole.OWNER],
    ["manager@runmalaysia.my",   OrganizationMemberRole.MANAGER],
    ["finance@runmalaysia.my",   OrganizationMemberRole.FINANCE],
    ["checkin@runmalaysia.my",   OrganizationMemberRole.CHECKIN_STAFF],
  ] as const) {
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: runMalaysia.id, userId: U[email].id } },
      update: {},
      create: {
        organizationId: runMalaysia.id,
        userId: U[email].id,
        role,
        status: MembershipStatus.ACTIVE,
        acceptedAt: new Date(),
      },
    });
  }

  await prisma.user.update({
    where: { id: U["organizer@runmalaysia.my"].id },
    data: { activeOrganizationId: runMalaysia.id },
  });

  // Org 2: Johor Running Club (PENDING)
  const johorClub = await prisma.organization.upsert({
    where: { ssmNumber: "202401987654" },
    update: {},
    create: {
      companyName: "Johor Running Club",
      ssmNumber: "202401987654",
      contactPerson: "Lim Wei Hong",
      email: "organizer2@johorrun.my",
      phone: "017-9876543",
      address: "No 45, Jalan Tun Razak, 80300 Johor Bahru, Johor",
      bankName: "CIMB Bank Berhad",
      bankAccountNo: "800123456789",
      bankAccountName: "JOHOR RUNNING CLUB",
      status: OrganizationStatus.PENDING,
      userId: U["organizer2@johorrun.my"].id,
    },
  });

  // Org 3: KL Runners (SUSPENDED)
  const klRunners = await prisma.organization.upsert({
    where: { ssmNumber: "202201555666" },
    update: {},
    create: {
      companyName: "KL Runners Association",
      ssmNumber: "202201555666",
      contactPerson: "Kumar Selvam",
      email: "suspended@klrunners.my",
      phone: "011-22334455",
      address: "Lot 12, Jalan Ampang, 50450 Kuala Lumpur",
      bankName: "Public Bank Berhad",
      bankAccountNo: "312987654321",
      bankAccountName: "KL RUNNERS ASSOCIATION",
      status: OrganizationStatus.SUSPENDED,
      userId: U["suspended@klrunners.my"].id,
    },
  });
  console.log("  ✓ 3 organizations created (APPROVED, PENDING, SUSPENDED)");

  // ============================================
  // PHASE 3: EVENTS
  // ============================================
  console.log("\n📝 Phase 3: Events...");

  const E: Record<string, { id: string }> = {};

  const eventDefs = [
    {
      key: "cyberjaya",
      org: runMalaysia.id,
      title: "Cyberjaya Tech Dash 2026",
      slug: "cyberjaya-tech-dash-2026",
      description: "Malaysia's premier tech-themed running event in the heart of Cyberjaya. Join thousands of runners through the green corridors of the tech city.\n\n**What's included:**\n- Exclusive Microfiber event tee\n- Finisher medal\n- E-certificate\n- Goodie bag & refreshments",
      bannerImageUrl: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200",
      eventDate: new Date("2026-09-15T07:00:00+08:00"),
      startTime: "7:00 AM",
      endTime: "12:00 PM",
      venue: "Cyberjaya Lake Gardens",
      fullAddress: "Persiaran Tasik Cyber, Cyber 12, 63000 Cyberjaya, Selangor",
      state: "Selangor",
      registrationOpenDate: new Date("2026-07-01"),
      registrationCloseDate: new Date("2026-09-10"),
      repcDate: "13 - 14 September 2026",
      repcTime: "10:00 AM - 8:00 PM",
      repcLocation: "IOI City Mall, Putrajaya (Atrium Ground Floor)",
      featured: true,
      status: EventStatus.PUBLISHED,
      ageReferenceDate: new Date("2026-09-15"),
    },
    {
      key: "penang",
      org: runMalaysia.id,
      title: "Penang Bridge Half Marathon 2026",
      slug: "penang-bridge-half-marathon-2026",
      description: "Run across the iconic Penang Bridge with breathtaking sea views at dawn. A bucket-list race experience for every Malaysian runner.\n\n**Route:** Queensbay → Penang Bridge → Penang mainland → return",
      bannerImageUrl: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200",
      eventDate: new Date("2026-10-25T05:30:00+08:00"),
      startTime: "5:30 AM",
      endTime: "10:00 AM",
      venue: "Queensbay Mall Outdoor Carpark",
      fullAddress: "Persiaran Bayan Indah, 11900 Bayan Lepas, Pulau Pinang",
      state: "Pulau Pinang",
      registrationOpenDate: new Date("2026-07-15"),
      registrationCloseDate: new Date("2026-10-20"),
      repcDate: "22 - 24 October 2026",
      repcTime: "11:00 AM - 9:00 PM",
      repcLocation: "Queensbay Mall, Level 3 Zone A",
      featured: false,
      status: EventStatus.PUBLISHED,
      ageReferenceDate: new Date("2026-10-25"),
    },
    {
      key: "putrajaya",
      org: runMalaysia.id,
      title: "Putrajaya Night Run 2026",
      slug: "putrajaya-night-run-2026",
      description: "Experience Putrajaya's stunning government buildings illuminated at night. A night run like no other in Malaysia's administrative capital.",
      bannerImageUrl: "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=1200",
      eventDate: new Date("2026-11-05T20:00:00+08:00"),
      startTime: "8:00 PM",
      endTime: "11:30 PM",
      venue: "Dataran Putrajaya, Presint 3",
      fullAddress: "Presint 3, 62000 Putrajaya, Wilayah Persekutuan",
      state: "Wilayah Persekutuan",
      registrationOpenDate: new Date("2026-08-01"),
      registrationCloseDate: new Date("2026-11-01"),
      repcDate: "3 - 4 November 2026",
      repcTime: "10:00 AM - 8:00 PM",
      repcLocation: "Perbadanan Putrajaya Complex, Lobby",
      featured: false,
      status: EventStatus.PENDING_APPROVAL,
      ageReferenceDate: new Date("2026-11-05"),
    },
    {
      key: "klcc",
      org: runMalaysia.id,
      title: "KLCC City Run 2026",
      slug: "klcc-city-run-2026",
      description: "Urban running challenge around the iconic Petronas Twin Towers. This event has been approved and is awaiting activation fee payment.",
      bannerImageUrl: "https://images.unsplash.com/photo-1472745942893-3d6f6df955f7?w=1200",
      eventDate: new Date("2026-12-12T06:00:00+08:00"),
      startTime: "6:00 AM",
      endTime: "11:00 AM",
      venue: "KLCC Park",
      fullAddress: "Jalan Ampang, 50450 Kuala Lumpur, Wilayah Persekutuan",
      state: "Wilayah Persekutuan",
      registrationOpenDate: new Date("2026-09-01"),
      registrationCloseDate: new Date("2026-12-08"),
      repcDate: "10 - 11 December 2026",
      repcTime: "10:00 AM - 8:00 PM",
      repcLocation: "Suria KLCC, Level 2 Foyer",
      featured: false,
      status: EventStatus.AWAITING_EVENT_FEE,
      ageReferenceDate: new Date("2026-12-12"),
    },
    {
      key: "malacca",
      org: runMalaysia.id,
      title: "Malacca Heritage Run 2025",
      slug: "malacca-heritage-run-2025",
      description: "Explore UNESCO World Heritage sites through scenic cobblestone streets of old Malacca. This edition is completed — finisher certificates are available.",
      bannerImageUrl: "https://images.unsplash.com/photo-1549924231-f129b911e442?w=1200",
      eventDate: new Date("2025-11-20T06:00:00+08:00"),
      startTime: "6:00 AM",
      endTime: "11:00 AM",
      venue: "Dutch Square (Stadthuys)",
      fullAddress: "Jalan Gereja, 75000 Bandar Hilir, Melaka",
      state: "Melaka",
      registrationOpenDate: new Date("2025-08-01"),
      registrationCloseDate: new Date("2025-11-15"),
      repcDate: "18 - 19 November 2025",
      repcTime: "10:00 AM - 8:00 PM",
      repcLocation: "Dataran Pahlawan Mall, Ground Floor",
      featured: false,
      status: EventStatus.COMPLETED,
      ageReferenceDate: new Date("2025-11-20"),
    },
    {
      key: "langkawi",
      org: klRunners.id,
      title: "Langkawi Sunrise Marathon 2026",
      slug: "langkawi-sunrise-marathon-2026",
      description: "Island paradise marathon — CANCELLED following organization suspension.",
      bannerImageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
      eventDate: new Date("2026-08-30T05:00:00+08:00"),
      startTime: "5:00 AM",
      endTime: "11:00 AM",
      venue: "Pantai Cenang",
      fullAddress: "Jalan Pantai Cenang, 07000 Langkawi, Kedah",
      state: "Kedah",
      registrationOpenDate: new Date("2026-05-01"),
      registrationCloseDate: new Date("2026-08-25"),
      repcDate: "28 - 29 August 2026",
      repcTime: "9:00 AM - 6:00 PM",
      repcLocation: "Langkawi Eagle Square",
      featured: false,
      status: EventStatus.CANCELLED,
      ageReferenceDate: new Date("2026-08-30"),
    },
    {
      key: "johor",
      org: johorClub.id,
      title: "JB Trail Run 2026",
      slug: "jb-trail-run-2026",
      description: "Trail running through Johor's lush rainforest and scenic hills. Event pending organization approval before submission.",
      bannerImageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200",
      eventDate: new Date("2027-01-15T07:00:00+08:00"),
      startTime: "7:00 AM",
      endTime: "1:00 PM",
      venue: "Gunung Pulai Recreational Forest",
      fullAddress: "Jalan Air Terjun, 81300 Skudai, Johor",
      state: "Johor",
      registrationOpenDate: new Date("2026-10-01"),
      registrationCloseDate: new Date("2027-01-10"),
      repcDate: "13 - 14 January 2027",
      repcTime: "10:00 AM - 6:00 PM",
      repcLocation: "Gunung Pulai Visitor Centre",
      featured: false,
      status: EventStatus.DRAFT,
      ageReferenceDate: new Date("2027-01-15"),
    },
  ];

  for (const ev of eventDefs) {
    const { key, org, ...data } = ev;
    const event = await prisma.event.upsert({
      where: { slug: data.slug },
      update: { status: data.status, featured: data.featured },
      create: { ...data, organizationId: org },
    });
    E[key] = event;
    console.log(`  ✓ ${data.title} [${data.status}]`);
  }

  // ============================================
  // PHASE 4: TICKET CATEGORIES
  // ============================================
  console.log("\n📝 Phase 4: Ticket categories...");

  const categoryDefs: Record<string, Array<{
    name: string; distance: number; ageMin: number; ageMax: number;
    gender: TicketGender; priceSen: number; earlyBirdPriceSen?: number;
    earlyBirdDeadline?: Date; maxSlots?: number;
  }>> = {
    cyberjaya: [
      { name: "5KM Fun Run", distance: 5, ageMin: 13, ageMax: 80, gender: TicketGender.ALL, priceSen: 5000, earlyBirdPriceSen: 4000, earlyBirdDeadline: new Date("2026-08-15"), maxSlots: 800 },
      { name: "10KM Challenge", distance: 10, ageMin: 16, ageMax: 80, gender: TicketGender.ALL, priceSen: 8500, earlyBirdPriceSen: 7000, earlyBirdDeadline: new Date("2026-08-15"), maxSlots: 600 },
      { name: "21KM Half Marathon", distance: 21.1, ageMin: 18, ageMax: 70, gender: TicketGender.ALL, priceSen: 13000, earlyBirdPriceSen: 11000, earlyBirdDeadline: new Date("2026-08-15"), maxSlots: 400 },
    ],
    penang: [
      { name: "10KM Open", distance: 10, ageMin: 16, ageMax: 80, gender: TicketGender.ALL, priceSen: 9500, earlyBirdPriceSen: 8000, earlyBirdDeadline: new Date("2026-08-31"), maxSlots: 2000 },
      { name: "21KM Male", distance: 21.1, ageMin: 18, ageMax: 70, gender: TicketGender.MALE, priceSen: 14000, earlyBirdPriceSen: 12000, earlyBirdDeadline: new Date("2026-08-31"), maxSlots: 1500 },
      { name: "21KM Female", distance: 21.1, ageMin: 18, ageMax: 70, gender: TicketGender.FEMALE, priceSen: 14000, earlyBirdPriceSen: 12000, earlyBirdDeadline: new Date("2026-08-31"), maxSlots: 1500 },
    ],
    putrajaya: [
      { name: "5KM Glow Run", distance: 5, ageMin: 10, ageMax: 80, gender: TicketGender.ALL, priceSen: 5500, maxSlots: 1500 },
      { name: "10KM Night Challenge", distance: 10, ageMin: 16, ageMax: 75, gender: TicketGender.ALL, priceSen: 9000, maxSlots: 1000 },
    ],
    klcc: [
      { name: "5KM Corporate Run", distance: 5, ageMin: 16, ageMax: 80, gender: TicketGender.ALL, priceSen: 6000, maxSlots: 2000 },
      { name: "10KM City Challenge", distance: 10, ageMin: 18, ageMax: 70, gender: TicketGender.ALL, priceSen: 10000, maxSlots: 1500 },
      { name: "21KM Elite", distance: 21.1, ageMin: 20, ageMax: 60, gender: TicketGender.ALL, priceSen: 15000, maxSlots: 500 },
    ],
    malacca: [
      { name: "5KM Heritage Trail", distance: 5, ageMin: 12, ageMax: 80, gender: TicketGender.ALL, priceSen: 4500, maxSlots: 500 },
      { name: "10KM City Run", distance: 10, ageMin: 16, ageMax: 75, gender: TicketGender.ALL, priceSen: 8000, maxSlots: 600 },
      { name: "21KM Half Marathon", distance: 21.1, ageMin: 18, ageMax: 65, gender: TicketGender.ALL, priceSen: 12000, maxSlots: 400 },
    ],
    langkawi: [
      { name: "10KM Island Run", distance: 10, ageMin: 16, ageMax: 80, gender: TicketGender.ALL, priceSen: 9000, maxSlots: 500 },
      { name: "42KM Full Marathon", distance: 42.2, ageMin: 18, ageMax: 60, gender: TicketGender.ALL, priceSen: 18000, maxSlots: 500 },
    ],
    johor: [
      { name: "12KM Trail Run", distance: 12, ageMin: 16, ageMax: 75, gender: TicketGender.ALL, priceSen: 8500, maxSlots: 300 },
      { name: "25KM Trail Challenge", distance: 25, ageMin: 18, ageMax: 60, gender: TicketGender.ALL, priceSen: 12500, maxSlots: 200 },
    ],
  };

  const cats: Record<string, { id: string; priceSen: number; name: string; distance: number }[]> = {};
  for (const [eventKey, defs] of Object.entries(categoryDefs)) {
    cats[eventKey] = [];
    for (const def of defs) {
      const existing = await prisma.ticketCategory.findFirst({
        where: { eventId: E[eventKey].id, name: def.name },
      });
      const cat = existing ?? await prisma.ticketCategory.create({
        data: { ...def, eventId: E[eventKey].id },
      });
      cats[eventKey].push({ id: cat.id, priceSen: def.priceSen, name: def.name, distance: def.distance });
    }
  }
  console.log("  ✓ Ticket categories created for all events");

  // ============================================
  // PHASE 5: PLATFORM SETTINGS
  // ============================================
  console.log("\n📝 Phase 5: Platform settings...");

  const platformConfigs = [
    { key: "adminFeePercentage",      value: String(DEFAULT_SETTINGS.ADMIN_FEE_PERCENTAGE),      description: "Platform profit % applied to participant subtotal" },
    { key: "processingFeePercentage", value: String(DEFAULT_SETTINGS.PROCESSING_FEE_PERCENTAGE), description: "Payment processing % shown to participant" },
    { key: "eventActivationFeeSen",   value: String(DEFAULT_SETTINGS.EVENT_ACTIVATION_FEE_SEN),  description: "Event activation fee in sen (RM2000.00)" },
    { key: "homepageCarouselConfig",  value: JSON.stringify({ enabled: true,  includeUpcomingEvents: true, maxEvents: 5 }),                         description: "Homepage featured carousel config" },
    { key: "raceReminderConfig",      value: JSON.stringify({ enabled: true,  daysBeforeEvent: 1, sendHourMalaysia: 9 }),                          description: "Race-day in-app reminder schedule" },
    { key: "securityControlsConfig",  value: JSON.stringify({ verificationRequestsPerMinute: 40, voucherRequestsPerMinute: 30 }),                  description: "Public API rate limit controls" },
    { key: "platformAnnouncementConfig", value: JSON.stringify({ enabled: false, tone: "INFO", message: "", linkLabel: "", href: null }),          description: "Public announcement banner config" },
  ];

  for (const cfg of platformConfigs) {
    await prisma.platformSetting.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value },
      create: { ...cfg, updatedByUserId: U["developer@nexrun.my"].id },
    });
  }
  console.log(`  ✓ ${platformConfigs.length} platform settings configured`);

  // ============================================
  // PHASE 6: ORGANIZER FEES
  // ============================================
  console.log("\n📝 Phase 6: Organizer fees...");

  // Fee 1: Cyberjaya — PAID (event is published)
  await prisma.organizerFee.upsert({
    where: { eventId: E.cyberjaya.id },
    update: {},
    create: {
      organizationId: runMalaysia.id,
      eventId: E.cyberjaya.id,
      amountSen: DEFAULT_SETTINGS.EVENT_ACTIVATION_FEE_SEN,
      status: OrganizerFeeStatus.PAID,
      invoiceNumber: "INV-2026-001",
      paymentReference: "PAY-2026-001",
      paidAt: new Date("2026-07-15"),
    },
  });

  // Fee 2: Penang — WAIVED by admin
  const feePenang = await prisma.organizerFee.upsert({
    where: { eventId: E.penang.id },
    update: {},
    create: {
      organizationId: runMalaysia.id,
      eventId: E.penang.id,
      amountSen: DEFAULT_SETTINGS.EVENT_ACTIVATION_FEE_SEN,
      status: OrganizerFeeStatus.WAIVED,
      invoiceNumber: "INV-2026-002",
      waivedAt: new Date("2026-07-20"),
      waivedByUserId: U["admin@nexrun.my"].id,
      waiverReason: "Long-standing partner organization — fee waived as a courtesy.",
    },
  });

  // Fee 3: KLCC — PENDING, with failed attempt (edge case)
  const feeKlcc = await prisma.organizerFee.upsert({
    where: { eventId: E.klcc.id },
    update: {},
    create: {
      organizationId: runMalaysia.id,
      eventId: E.klcc.id,
      amountSen: DEFAULT_SETTINGS.EVENT_ACTIVATION_FEE_SEN,
      status: OrganizerFeeStatus.PENDING,
      invoiceNumber: "INV-2026-003",
      dueAt: new Date("2026-09-01"),
    },
  });

  // Add failed payment attempt for KLCC fee
  const existingAttempt = await prisma.organizerFeePaymentAttempt.findFirst({
    where: { organizerFeeId: feeKlcc.id },
  });
  if (!existingAttempt) {
    await prisma.organizerFeePaymentAttempt.create({
      data: {
        organizerFeeId: feeKlcc.id,
        provider: "MOCK_GATEWAY",
        status: "FAILED",
        scenario: "DECLINED",
        amountSen: DEFAULT_SETTINGS.EVENT_ACTIVATION_FEE_SEN,
        idempotencyKey: `fee-klcc-attempt-1-${Date.now()}`,
        failureReason: "Payment declined — insufficient funds",
        processedAt: new Date("2026-07-23T14:30:00Z"),
      },
    });
  }

  // Fee 4: Malacca (completed) — PAID
  await prisma.organizerFee.upsert({
    where: { eventId: E.malacca.id },
    update: {},
    create: {
      organizationId: runMalaysia.id,
      eventId: E.malacca.id,
      amountSen: DEFAULT_SETTINGS.EVENT_ACTIVATION_FEE_SEN,
      status: OrganizerFeeStatus.PAID,
      invoiceNumber: "INV-2025-001",
      paymentReference: "PAY-2025-001",
      paidAt: new Date("2025-09-15"),
    },
  });

  console.log("  ✓ Organizer fees: 1 PAID, 1 WAIVED, 1 PENDING (with failed attempt), 1 PAID (completed event)");

  // ============================================
  // PHASE 7: VOUCHERS
  // ============================================
  console.log("\n📝 Phase 7: Vouchers...");

  const voucherDefs = [
    {
      eventId: E.cyberjaya.id,
      code: "EARLY_BIRD_2026",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      maxUses: 100,
      currentUses: 8,
      validFrom: new Date("2026-07-01"),
      validUntil: new Date("2026-08-31"),
      applicationPolicy: VoucherApplicationPolicy.PER_ORDER,
      isActive: true,
    },
    {
      eventId: E.penang.id,
      code: "REPEAT_RUNNER",
      discountType: DiscountType.FIXED,
      discountValue: 1500, // RM15
      maxUses: 50,
      currentUses: 3,
      validFrom: new Date("2026-07-15"),
      validUntil: new Date("2026-10-15"),
      applicationPolicy: VoucherApplicationPolicy.PER_PARTICIPANT,
      isActive: true,
    },
    {
      // Expired voucher (edge case)
      eventId: E.penang.id,
      code: "OLD_PROMO",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      maxUses: 200,
      currentUses: 45,
      validFrom: new Date("2026-05-01"),
      validUntil: new Date("2026-06-30"), // expired
      applicationPolicy: VoucherApplicationPolicy.PER_ORDER,
      isActive: false,
    },
    {
      // Maxed-out voucher (edge case)
      eventId: E.cyberjaya.id,
      code: "MAXED_OUT",
      discountType: DiscountType.FIXED,
      discountValue: 2000, // RM20
      maxUses: 5,
      currentUses: 5, // fully redeemed
      validFrom: new Date("2026-07-01"),
      validUntil: new Date("2026-09-10"),
      applicationPolicy: VoucherApplicationPolicy.PER_ORDER,
      isActive: true,
    },
  ];

  for (const v of voucherDefs) {
    const exists = await prisma.voucher.findFirst({
      where: { eventId: v.eventId, code: v.code },
    });
    if (!exists) {
      await prisma.voucher.create({ data: v });
    }
  }
  console.log(`  ✓ ${voucherDefs.length} vouchers created (2 active, 1 expired, 1 maxed-out)`);

  // ============================================
  // PHASE 8: SETTLEMENTS (for completed event)
  // ============================================
  console.log("\n📝 Phase 8: Settlements...");

  await prisma.settlement.upsert({
    where: { eventId: E.malacca.id },
    update: {},
    create: {
      organizationId: runMalaysia.id,
      eventId: E.malacca.id,
      totalGrossRevenueSen: 875000,   // RM8,750
      totalAdminFeeSen: 26250,        // 3%
      totalProcessingFeeSen: 26250,   // 3%
      netPayableSen: 822500,          // organizer net
      status: SettlementStatus.SETTLED,
      settledAt: new Date("2025-12-15"),
      settledByUserId: U["admin@nexrun.my"].id,
      referenceNumber: "STTL-2025-001",
      settlementDate: new Date("2025-12-15"),
      bankDetailsComplete: true,
      periodStart: new Date("2025-10-01"),
      periodEnd: new Date("2025-11-20"),
    },
  });
  console.log("  ✓ Settlement for Malacca Heritage Run (SETTLED)");

  // ============================================
  // PHASE 9: AUDIT LOGS (key platform events)
  // ============================================
  console.log("\n📝 Phase 9: Audit logs...");

  const auditEntries = [
    { actorUserId: U["developer@nexrun.my"].id, action: "PLATFORM_SETTING_UPDATED", entityType: "PlatformSetting", entityId: "adminFeePercentage", summary: "Updated admin fee percentage to 3%" },
    { actorUserId: U["admin@nexrun.my"].id, action: "ORGANIZER_APPROVED", entityType: "Organization", entityId: runMalaysia.id, summary: "Approved Run Malaysia Events Sdn Bhd" },
    { actorUserId: U["admin@nexrun.my"].id, action: "ORGANIZER_SUSPENDED", entityType: "Organization", entityId: klRunners.id, summary: "Suspended KL Runners Association — policy violation", organizationId: klRunners.id },
    { actorUserId: U["admin@nexrun.my"].id, action: "ORGANIZER_FEE_WAIVED", entityType: "OrganizerFee", entityId: feePenang.id, summary: "Waived activation fee for Penang Bridge HM — long-standing partner", organizationId: runMalaysia.id },
    { actorUserId: U["organizer@runmalaysia.my"].id, action: "EVENT_SUBMITTED", entityType: "Event", entityId: E.cyberjaya.id, summary: "Submitted Cyberjaya Tech Dash 2026 for approval", organizationId: runMalaysia.id, eventId: E.cyberjaya.id },
    { actorUserId: U["admin@nexrun.my"].id, action: "EVENT_APPROVED", entityType: "Event", entityId: E.cyberjaya.id, summary: "Approved Cyberjaya Tech Dash 2026 — activation invoice created", organizationId: runMalaysia.id, eventId: E.cyberjaya.id },
    { actorUserId: U["organizer@runmalaysia.my"].id, action: "EVENT_PUBLISHED", entityType: "Event", entityId: E.cyberjaya.id, summary: "Cyberjaya Tech Dash 2026 published after activation fee payment", organizationId: runMalaysia.id, eventId: E.cyberjaya.id },
    { actorUserId: U["admin@nexrun.my"].id, action: "EVENT_CANCELLED", entityType: "Event", entityId: E.langkawi.id, summary: "Cancelled Langkawi Sunrise Marathon — organization suspended", organizationId: klRunners.id, eventId: E.langkawi.id },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({ data: { ...entry, metadata: {} } });
  }
  console.log(`  ✓ ${auditEntries.length} audit log entries created`);

  // ============================================
  // PHASE 10: NOTIFICATIONS
  // ============================================
  console.log("\n📝 Phase 10: Notifications...");

  const notifications = [
    { userId: U["organizer@runmalaysia.my"].id, type: "EVENT_APPROVED", title: "Cyberjaya Tech Dash 2026 Approved!", message: "Your event has been approved. Please pay the activation fee of RM2,000 to publish.", href: "/dashboard/events" },
    { userId: U["organizer@runmalaysia.my"].id, type: "EVENT_APPROVED", title: "Penang Bridge Half Marathon 2026 Approved!", message: "Your event activation fee has been waived. Your event is now published.", href: "/dashboard/events" },
    { userId: U["organizer@runmalaysia.my"].id, type: "SETTLEMENT_COMPLETED", title: "Settlement Processed — Malacca Heritage Run", message: "Your settlement of RM8,225.00 has been processed to your bank account.", href: "/dashboard/settlements" },
    { userId: U["admin@nexrun.my"].id, type: "ORGANIZER_APPLICATION", title: "New Organizer Application", message: "Johor Running Club has submitted an organizer application. Review required.", href: "/dashboard/organizations" },
    { userId: U["participant@gmail.com"].id, type: "EVENT_REMINDER", title: "Race Day Tomorrow — Cyberjaya Tech Dash!", message: "Your race is tomorrow. Collection point: IOI City Mall Atrium. Bib: collect on-site.", href: "/dashboard/registrations" },
    { userId: U["participant2@gmail.com"].id, type: "EVENT_CANCELLED", title: "Event Cancelled — Langkawi Sunrise Marathon", message: "We regret to inform you that the Langkawi Sunrise Marathon has been cancelled. Refund in progress.", href: "/dashboard/registrations" },
    { userId: U["organizer2@johorrun.my"].id, type: "ORGANIZATION_PENDING", title: "Application Under Review", message: "Your organizer application for Johor Running Club is currently under review by our admin team.", href: "/dashboard" },
  ];

  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }
  console.log(`  ✓ ${notifications.length} notifications created`);

  // ============================================
  // PHASE 2: ORDERS, REGISTRATIONS & PAYMENTS
  // (This phase creates realistic transaction data)
  // ============================================
  console.log("\n📝 Phase 2: Orders, payments & registrations...");
  console.log("   (This may take 30-60 seconds...)");

  // Helper: Generate Malaysian names
  const malaysianNames = [
    { fullName: "Mohd Haziq Bin Abdullah", icNumber: "950312-10-5234", gender: "MALE", dateOfBirth: new Date("1995-03-12"), phone: "+60123456001", email: "haziq95@gmail.com" },
    { fullName: "Siti Nurhaliza Binti Ahmad", icNumber: "920815-14-6789", gender: "FEMALE", dateOfBirth: new Date("1992-08-15"), phone: "+60187654002", email: "siti.nurhaliza@yahoo.com" },
    { fullName: "Tan Wei Jie", icNumber: "980428-08-1234", gender: "MALE", dateOfBirth: new Date("1998-04-28"), phone: "+60135557003", email: "weijie.tan@hotmail.com" },
    { fullName: "Lim Mei Ling", icNumber: "000204-05-4567", gender: "FEMALE", dateOfBirth: new Date("2000-02-04"), phone: "+60122223004", email: "meiling.lim@gmail.com" },
    { fullName: "Kumar s/o Selvam", icNumber: "880910-01-9876", gender: "MALE", dateOfBirth: new Date("1988-09-10"), phone: "+60199990005", email: "kumar.selvam@gmail.com" },
    { fullName: "Nurul Ain Binti Zainuddin", icNumber: "010522-14-3456", gender: "FEMALE", dateOfBirth: new Date("2001-05-22"), phone: "+60166668006", email: "nurul.ain2001@gmail.com" },
    { fullName: "Wong Kar Mun", icNumber: "930703-06-7890", gender: "MALE", dateOfBirth: new Date("1993-07-03"), phone: "+60143334007", email: "karmun.wong@live.com" },
    { fullName: "Farah Nadia Binti Hassan", icNumber: "960125-10-2345", gender: "FEMALE", dateOfBirth: new Date("1996-01-25"), phone: "+60178889008", email: "farah.nadia@yahoo.com" },
    { fullName: "Raj Kumar a/l Ramesh", icNumber: "850618-05-6789", gender: "MALE", dateOfBirth: new Date("1985-06-18"), phone: "+60125556009", email: "raj.kumar85@gmail.com" },
    { fullName: "Lee Hui Min", icNumber: "990830-12-1234", gender: "FEMALE", dateOfBirth: new Date("1999-08-30"), phone: "+60134445010", email: "huimin.lee@outlook.com" },
    { fullName: "Ahmad Firdaus Bin Ismail", icNumber: "940215-09-4567", gender: "MALE", dateOfBirth: new Date("1994-02-15"), phone: "+60197778011", email: "firdaus.ahmad@gmail.com" },
    { fullName: "Chong Li Ying", icNumber: "870920-11-8901", gender: "FEMALE", dateOfBirth: new Date("1987-09-20"), phone: "+60162223012", email: "liying.chong@hotmail.com" },
    { fullName: "Mohd Azlan Bin Razak", icNumber: "910505-03-2345", gender: "MALE", dateOfBirth: new Date("1991-05-05"), phone: "+60189998013", email: "azlan.razak@yahoo.com" },
    { fullName: "Priya d/o Suresh", icNumber: "020712-07-6789", gender: "FEMALE", dateOfBirth: new Date("2002-07-12"), phone: "+60123339014", email: "priya.suresh02@gmail.com" },
    { fullName: "Tan Kok Wai", icNumber: "890318-10-1234", gender: "MALE", dateOfBirth: new Date("1989-03-18"), phone: "+60146667015", email: "kokwai.tan@live.com" },
  ];

  // Create ParticipantProfiles first (standalone entities)
  const profiles: Array<{ id: string; fullName: string; email: string }> = [];
  for (const person of malaysianNames) {
    const existing = await prisma.participantProfile.findFirst({
      where: { email: person.email },
    });
    if (existing) {
      profiles.push(existing);
    } else {
      const profile = await prisma.participantProfile.create({
        data: {
          fullName: person.fullName,
          icNumber: person.icNumber,
          nationality: "Malaysian",
          gender: person.gender,
          phone: person.phone,
          email: person.email,
          dateOfBirth: person.dateOfBirth,
          tshirtSize: ["S", "M", "L", "XL"][Math.floor(Math.random() * 4)],
          tshirtType: "MICROFIBER",
          emergencyContactName: "Emergency Contact",
          emergencyContactPhone: "+60123456789",
        },
      });
      profiles.push(profile);
    }
  }
  console.log(`  ✓ ${profiles.length} participant profiles created`);

  // Helper: Create orders for an event
  async function createOrdersForEvent(
    eventKey: string,
    eventId: string,
    categoryIds: Array<{ id: string; priceSen: number; name: string; distance: number }>,
    userId: string,
    numOrders: number,
    baseDate: Date
  ) {
    const orders: Array<{ id: string; status: OrderStatus }> = [];

    for (let i = 0; i < numOrders; i++) {
      const profile = profiles[i % profiles.length];
      const category = categoryIds[i % categoryIds.length];

      // Determine order status distribution
      let orderStatus: OrderStatus;
      let paymentStatus: PaymentStatus;
      let paymentMethod: PaymentMethod;
      let scenario: MockPaymentScenario;

      if (i < numOrders * 0.75) {
        // 75% PAID
        orderStatus = OrderStatus.PAID;
        paymentStatus = PaymentStatus.SUCCESS;
        paymentMethod = ["ONLINE_BANKING", "EWALLET", "CARD"][i % 3] as PaymentMethod;
        scenario = MockPaymentScenario.SUCCESS;
      } else if (i < numOrders * 0.85) {
        // 10% PENDING
        orderStatus = OrderStatus.PENDING;
        paymentStatus = PaymentStatus.PENDING;
        paymentMethod = PaymentMethod.ONLINE_BANKING;
        scenario = MockPaymentScenario.PENDING;
      } else if (i < numOrders * 0.92) {
        // 7% EXPIRED
        orderStatus = OrderStatus.EXPIRED;
        paymentStatus = PaymentStatus.FAILED;
        paymentMethod = PaymentMethod.CARD;
        scenario = MockPaymentScenario.TIMEOUT;
      } else {
        // 8% FAILED
        orderStatus = OrderStatus.FAILED;
        paymentStatus = PaymentStatus.FAILED;
        paymentMethod = PaymentMethod.CARD;
        scenario = MockPaymentScenario.DECLINED;
      }

      const createdAt = new Date(baseDate.getTime() + i * 3600000);
      const expiresAt = new Date(createdAt.getTime() + 15 * 60000);

      const subtotalSen = category.priceSen;
      const adminFeeSen = Math.floor(subtotalSen * 0.03);
      const processingFeeSen = Math.floor(subtotalSen * 0.03);
      const totalSen = subtotalSen + adminFeeSen + processingFeeSen;
      const organizerNetSen = subtotalSen - adminFeeSen;

      const order = await prisma.order.create({
        data: {
          userId,
          eventId,
          status: orderStatus,
          subtotalSen,
          adminFeeSen,
          processingFeeSen,
          discountSen: 0,
          totalPaidSen: orderStatus === OrderStatus.PAID ? totalSen : 0,
          organizerNetSen,
          expiresAt: orderStatus === OrderStatus.PENDING ? expiresAt : null,
          paidAt: orderStatus === OrderStatus.PAID ? createdAt : null,
          orderNumber: `ORD-${eventKey.toUpperCase()}-${Date.now()}-${i}`,
          invoiceNumber: `INV-${eventKey.toUpperCase()}-${Date.now()}-${i}`,
          idempotencyKey: `order-${eventKey}-${i}-${Date.now()}`,
          createdAt,
          updatedAt: createdAt,
        },
      });

      await prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: "MOCK_GATEWAY",
          transactionId: `TXN-${Date.now()}-${i}`,
          amountSen: subtotalSen + adminFeeSen + processingFeeSen,
          status: paymentStatus,
          paymentMethod,
          scenario,
          idempotencyKey: `payment-${order.id}`,
          failureReason: paymentStatus === PaymentStatus.FAILED ? "Simulated payment failure" : null,
          processedAt: paymentStatus === PaymentStatus.SUCCESS ? createdAt : null,
          createdAt,
        },
      });

      await prisma.feeSnapshot.create({
        data: {
          orderId: order.id,
          adminFeePercentage: 3,
          processingFeePercentage: 3,
        },
      });

      if (orderStatus === OrderStatus.PAID) {
        const orderItem = await prisma.orderItem.create({
          data: {
            orderId: order.id,
            ticketCategoryId: category.id,
            participantProfileId: profile.id,
            ticketNameSnapshot: category.name,
            ticketPriceSenSnapshot: category.priceSen,
            distanceSnapshot: category.distance,
            adminFeeSnapshotSen: adminFeeSen,
            processingFeeSnapshotSen: processingFeeSen,
          },
        });

        await prisma.registration.create({
          data: {
            eventId,
            orderId: order.id,
            orderItemId: orderItem.id,
            ticketCategoryId: category.id,
            participantProfileId: profile.id,
            status: RegistrationStatus.ACTIVE,
            registrationCode: `REG-${eventKey.toUpperCase()}-${Date.now()}-${i}`,
            bibNumber: `${Date.now()}-${i}`,
          },
        });
      }

      orders.push({ id: order.id, status: orderStatus });
    }

    return orders;
  }

  console.log("  → Cyberjaya: creating 15 orders...");
  const cyberOrders = await createOrdersForEvent(
    "cyberjaya",
    E.cyberjaya.id,
    cats.cyberjaya,
    U["participant@gmail.com"].id,
    15,
    new Date("2026-08-01T10:00:00Z")
  );

  console.log("  → Penang: creating 20 orders...");
  const penangOrders = await createOrdersForEvent(
    "penang",
    E.penang.id,
    cats.penang,
    U["participant2@gmail.com"].id,
    20,
    new Date("2026-08-15T09:00:00Z")
  );

  console.log("  → Malacca (completed): creating 25 orders...");
  const malaccaOrders = await createOrdersForEvent(
    "malacca",
    E.malacca.id,
    cats.malacca,
    U["participant3@gmail.com"].id,
    25,
    new Date("2025-10-01T08:00:00Z")
  );

  const totalOrders = cyberOrders.length + penangOrders.length + malaccaOrders.length;
  const paidOrders = [...cyberOrders, ...penangOrders, ...malaccaOrders].filter(o => o.status === OrderStatus.PAID).length;
  console.log(`  ✓ ${totalOrders} orders, ${paidOrders} PAID`);

  const registrationCount = await prisma.registration.count();
  console.log(`  ✓ ${registrationCount} registrations created`);

  // ============================================
  console.log("\n✅ Database seeding completed successfully!");
  console.log("\n📊 Seed Summary:");
  console.log("  👥 Users: 12 (Developer, Admin, 6 Organizers, 4 Participants)");
  console.log("  🏢 Organizations: 3 (1 APPROVED, 1 PENDING, 1 SUSPENDED)");
  console.log("  🏃 Events: 7 (PUBLISHED×2, PENDING_APPROVAL, AWAITING_FEE, COMPLETED, CANCELLED, DRAFT)");
  console.log("  🎫 Ticket categories: 18 total across all events");
  console.log("  👤 Participant profiles: 15 (Malaysian names, realistic data)");
  console.log(`  📦 Orders: ${totalOrders} (${paidOrders} PAID, rest PENDING/EXPIRED/FAILED)`);
  console.log(`  📝 Registrations: ${registrationCount} (for PAID orders)`);
  console.log(`  💳 Payment transactions: ${totalOrders}`);
  console.log("  💰 Organizer fees: 4 invoices (PAID×2, WAIVED, PENDING w/failed attempt)");
  console.log("  🏷️  Vouchers: 4 (2 active, 1 expired, 1 maxed-out)");
  console.log("  💳 Settlement: 1 SETTLED (Malacca Heritage Run)");
  console.log("  📋 Audit logs: 8 key platform events");
  console.log("  🔔 Notifications: 7 across all roles");
  console.log("\n🔐 All accounts password: NexRun2026!");
  console.log("   developer@nexrun.my      → Developer");
  console.log("   admin@nexrun.my          → Admin");
  console.log("   organizer@runmalaysia.my → Organizer (Owner)");
  console.log("   manager@runmalaysia.my   → Organizer (Manager)");
  console.log("   finance@runmalaysia.my   → Organizer (Finance)");
  console.log("   checkin@runmalaysia.my   → Organizer (Checkin Staff)");
  console.log("   participant@gmail.com    → Participant");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

