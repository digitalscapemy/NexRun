const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const expectedRole = process.env.SMOKE_EXPECTED_ROLE;

const checks = [];

async function request(name, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.text();
  checks.push({ name, status: response.status, ok: response.ok });
  return { response, body };
}

function parseTrpcData(body) {
  try {
    return JSON.parse(body).result.data.json;
  } catch {
    return null;
  }
}

const homepage = await request("homepage", "/");
const health = await request("health", "/api/health");
const eventsPage = await request("events", "/events");

const cssHref = homepage.body.match(/href="([^"]+\.css[^"]*)"/)?.[1];
if (cssHref) await request("css", cssHref);

const publicEventsInput = encodeURIComponent(
  JSON.stringify({ json: { tab: "UPCOMING", limit: 12 } }),
);
const publicEvents = await request(
  "published-events-api",
  `/api/trpc/event.getPublishedEvents?input=${publicEventsInput}`,
);
const firstPublishedEvent = parseTrpcData(publicEvents.body)?.items?.[0] ?? null;
if (firstPublishedEvent?.slug) {
  await request("published-event-detail", `/events/${firstPublishedEvent.slug}`);
}

const result = {
  baseUrl,
  statuses: {},
  health: health.body,
  cssFound: Boolean(cssHref),
  security: {
    contentSecurityPolicy: Boolean(homepage.response.headers.get("content-security-policy")),
    frameOptions: homepage.response.headers.get("x-frame-options"),
    contentTypeOptions: homepage.response.headers.get("x-content-type-options"),
    strictTransportSecurity: homepage.response.headers.get("strict-transport-security"),
  },
  homepageHasMvp: /\bmvp\b/i.test(homepage.body),
  homepageHasPrototypeWords: /\b(mock|sandbox|demo)\b/i.test(homepage.body),
  eventsHasDiscoveryHeading: /Discover Events/i.test(eventsPage.body),
  eventsHasOrganizerManagementUi: /\bManage Events\b|\bCreate Event\b/i.test(eventsPage.body),
  publishedEventCount: parseTrpcData(publicEvents.body)?.items?.length ?? null,
  publishedEventDetailChecked: Boolean(firstPublishedEvent?.slug),
};

if (email && password) {
  const login = await request("login", "/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password, rememberMe: false }),
  });
  const setCookies = login.response.headers.getSetCookie?.() ?? [login.response.headers.get("set-cookie")];
  const cookie = setCookies
    .filter(Boolean)
    .map((value) => value.split(";")[0])
    .join("; ");

  const authenticatedHeaders = { cookie };
  const session = await request("session", "/api/auth/get-session", {
    headers: authenticatedHeaders,
  });
  const notificationInput = encodeURIComponent(JSON.stringify({ json: { limit: 8 } }));
  const notifications = await request(
    "notifications-api",
    `/api/trpc/settings.getNotifications?input=${notificationInput}`,
    { headers: authenticatedHeaders },
  );
  const dashboardStats = await request("dashboard-stats-api", "/api/trpc/event.getDashboardStats", {
    headers: authenticatedHeaders,
  });
  const dashboardEvents = await request("dashboard-events-api", "/api/trpc/event.getDashboardEvents", {
    headers: authenticatedHeaders,
  });
  const userRegistrations = await request(
    "user-registrations-api",
    "/api/trpc/registration.getUserRegistrations",
    { headers: authenticatedHeaders },
  );
  const recoverableOrders = await request(
    "recoverable-orders-api",
    "/api/trpc/registration.getRecoverableOrders",
    { headers: authenticatedHeaders },
  );
  await request("dashboard", "/dashboard", { headers: authenticatedHeaders });

  const registrationOrders = parseTrpcData(userRegistrations.body);
  const firstPaidOrder = Array.isArray(registrationOrders) ? registrationOrders[0] : null;
  const firstRegistration = firstPaidOrder?.registrations?.[0] ?? null;

  if (firstPaidOrder?.id) {
    const orderDetailsInput = encodeURIComponent(
      JSON.stringify({ json: { orderId: firstPaidOrder.id } }),
    );
    await request(
      "paid-order-details-api",
      `/api/trpc/registration.getOrderDetails?input=${orderDetailsInput}`,
      { headers: authenticatedHeaders },
    );
    await request("paid-order-receipt", `/orders/${firstPaidOrder.id}/receipt`, {
      headers: authenticatedHeaders,
    });
  }

  if (firstRegistration?.registrationCode) {
    const registrationCode = firstRegistration.registrationCode;
    const verificationInput = encodeURIComponent(
      JSON.stringify({ json: { registrationCode } }),
    );
    await request(
      "registration-verification-api",
      `/api/trpc/registration.verifyRegistration?input=${verificationInput}`,
    );
    await request("registration-verification-page", `/verify/registration/${registrationCode}`);

    if (firstRegistration.isFinisher && firstPaidOrder.event?.status === "COMPLETED") {
      await request("certificate-verification-page", `/verify/certificate/${registrationCode}`);
    }
  }

  let role = null;
  try {
    role = JSON.parse(session.body)?.user?.role ?? null;
  } catch {
    // The failed status is reported below without printing a session body.
  }

  result.auth = {
    cookieIssued: Boolean(cookie),
    role,
    notificationsAuthorized: notifications.response.ok,
    dashboardStatsAuthorized: dashboardStats.response.ok,
    dashboardEventsAuthorized: dashboardEvents.response.ok,
    userRegistrationsAuthorized: userRegistrations.response.ok,
    recoverableOrdersAuthorized: recoverableOrders.response.ok,
    paidOrderChecked: Boolean(firstPaidOrder?.id),
    registrationVerificationChecked: Boolean(firstRegistration?.registrationCode),
    certificateChecked: Boolean(
      firstRegistration?.isFinisher && firstPaidOrder?.event?.status === "COMPLETED"
    ),
  };

  if (role === "ORGANIZER") {
    const workspaceContext = await request(
      "organizer-workspace-context-api",
      "/api/trpc/settings.getMyWorkspaceContext",
      { headers: authenticatedHeaders },
    );
    const organization = await request("organizer-workspace-api", "/api/trpc/settings.getMyOrganization", {
      headers: authenticatedHeaders,
    });
    const activationFees = await request(
      "organizer-activation-fees-api",
      "/api/trpc/activation.getActivationFees",
      { headers: authenticatedHeaders },
    );
    await request("organizer-activation-fees-page", "/dashboard/event-fees", {
      headers: authenticatedHeaders,
    });
    const workspace = parseTrpcData(workspaceContext.body);
    const organizerEvents = parseTrpcData(dashboardEvents.body);
    const firstOrganizerEvent = Array.isArray(organizerEvents) ? organizerEvents[0] : null;
    let checkInDeskAuthorized = true;
    if (firstOrganizerEvent?.id) {
      const checkInDeskInput = encodeURIComponent(
        JSON.stringify({ json: { eventId: firstOrganizerEvent.id } }),
      );
      const checkInDesk = await request(
        "organizer-checkin-desk-api",
        `/api/trpc/operational.getCheckInDesk?input=${checkInDeskInput}`,
        { headers: authenticatedHeaders },
      );
      checkInDeskAuthorized = checkInDesk.response.ok;
    }
    result.auth.organizerWorkspaceAuthorized = organization.response.ok;
    result.auth.workspaceContextAuthorized = workspaceContext.response.ok;
    result.auth.activationFeesAuthorized = activationFees.response.ok;
    result.auth.checkInDeskAuthorized = checkInDeskAuthorized;
    result.auth.selectedOrganizationId = workspace?.selectedOrganization?.id ?? null;
    result.auth.dashboardEventsScopedToWorkspace =
      Array.isArray(organizerEvents) &&
      Boolean(workspace?.selectedOrganization?.id) &&
      organizerEvents.every(
        (event) => event.organizationId === workspace.selectedOrganization.id,
      );
  }

  if (role === "ADMIN" || role === "DEVELOPER") {
    const organizations = await request("admin-organizations-api", "/api/trpc/settings.getOrganizations", {
      headers: authenticatedHeaders,
    });
    const auditInput = encodeURIComponent(JSON.stringify({ json: { limit: 10 } }));
    const auditLogs = await request(
      "admin-audit-api",
      `/api/trpc/settings.getAuditLogs?input=${auditInput}`,
      { headers: authenticatedHeaders },
    );
    result.auth.adminOrganizationsAuthorized = organizations.response.ok;
    result.auth.adminAuditAuthorized = auditLogs.response.ok;
  }
}

result.statuses = Object.fromEntries(checks.map(({ name, status }) => [name, status]));

console.log(JSON.stringify(result, null, 2));

const failed = checks.filter((check) => !check.ok);
if (
  failed.length > 0 ||
  !cssHref ||
  result.homepageHasMvp ||
  result.homepageHasPrototypeWords ||
  !result.eventsHasDiscoveryHeading ||
  result.eventsHasOrganizerManagementUi ||
  (email &&
    password &&
    (!result.auth?.cookieIssued ||
      !result.auth?.notificationsAuthorized ||
      !result.auth?.dashboardStatsAuthorized ||
      !result.auth?.dashboardEventsAuthorized ||
      !result.auth?.userRegistrationsAuthorized ||
      !result.auth?.recoverableOrdersAuthorized ||
      (result.auth?.role === "ORGANIZER" &&
        (!result.auth?.workspaceContextAuthorized ||
          !result.auth?.activationFeesAuthorized ||
          !result.auth?.checkInDeskAuthorized ||
          !result.auth?.selectedOrganizationId ||
          !result.auth?.dashboardEventsScopedToWorkspace)) ||
      (expectedRole && result.auth?.role !== expectedRole)))
) {
  process.exitCode = 1;
}
