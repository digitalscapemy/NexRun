import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD ?? "NexRun2026!";
const roleEmails = {
  developer: process.env.E2E_DEVELOPER_EMAIL ?? "developer@nexrun.my",
  admin: process.env.E2E_ADMIN_EMAIL ?? "admin@nexrun.my",
  organizer: process.env.E2E_ORGANIZER_EMAIL ?? "organizer@runmalaysia.my",
  user: process.env.E2E_USER_EMAIL ?? "participant@gmail.com",
} as const;

const viewports = [
  { name: "phone-320", width: 320, height: 568 },
  { name: "phone-360", width: 360, height: 800 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-412", width: 412, height: 915 },
  { name: "phone-landscape", width: 844, height: 390 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-1023", width: 1023, height: 768 },
  { name: "desktop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

async function openDashboard(page: Page, email = roleEmails.developer) {
  await page.goto("/dashboard");
  const emailInput = page.getByLabel("Email address");
  const authenticatedShell = page
    .getByRole("button", { name: "Open navigation menu" })
    .or(page.locator("aside").getByRole("navigation", { name: "Dashboard navigation" }));

  // The client-side session check can redirect after page.goto() has already
  // returned, so wait for a stable UI state instead of sampling page.url().
  await expect(emailInput.or(authenticatedShell)).toBeVisible({ timeout: 20_000 });
  if (await emailInput.isVisible()) {
    await emailInput.fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, { timeout: 20_000 });
  }
  await expect(authenticatedShell).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#main-content")).toBeVisible({ timeout: 10_000 });
}

async function navigateDashboard(page: Page, route: string) {
  if (new URL(page.url()).pathname === route) return;
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  if (await trigger.isVisible()) {
    await trigger.click();
    await page.getByTestId("dashboard-mobile-navigation").locator(`a[href="${route}"]`).click();
  } else {
    await page.locator("aside").locator(`a[href="${route}"]`).click();
  }
  await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}$`));
  await expect(page.locator("#main-content")).toBeVisible();
}

async function expectNoDocumentOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  )).toBe(true);
}

test.describe("responsive dashboard shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDashboard(page);
  });

  test("mobile drawer closes with X, backdrop, Escape, navigation, and restores focus", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open navigation menu" });
    const drawer = page.getByTestId("dashboard-mobile-navigation");

    await expect(drawer).toBeHidden();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(drawer).toBeVisible();
    await page.getByRole("button", { name: "Close navigation menu" }).click();
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.getByTestId("dashboard-drawer-backdrop").click({ position: { x: 380, y: 420 } });
    await expect(drawer).toBeHidden();

    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await drawer.getByRole("link", { name: "Events" }).click();
    await expect(page).toHaveURL(/\/dashboard\/events$/);
    await expect(drawer).toBeHidden();
  });

  test("drawer is dismissed by a left swipe", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "This test uses Chromium touch emulation for a real touch gesture.");
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const drawer = page.getByTestId("dashboard-mobile-navigation");
    const box = await drawer.boundingBox();
    expect(box).not.toBeNull();

    const client = await page.context().newCDPSession(page);
    const startX = box!.x + box!.width * 0.75;
    const endX = box!.x + 8;
    const y = box!.y + box!.height * 0.5;
    await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y }],
    });
    for (let step = 1; step <= 12; step += 1) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX + ((endX - startX) * step) / 12, y }],
      });
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await client.detach();
    await expect(drawer).toBeHidden();
  });

  test("resizing to desktop closes the drawer and releases page scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1023, height: 768 });
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await expect(page.getByTestId("dashboard-mobile-navigation")).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByTestId("dashboard-mobile-navigation")).toBeHidden();
    await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeHidden();
    await expect(page.locator("aside").getByRole("navigation", { name: "Dashboard navigation" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow !== "hidden")).toBe(true);
  });
});

test("all supported viewports keep dashboard routes within the document", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await openDashboard(page);
  for (const viewport of viewports) {
    await test.step(viewport.name, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of ["/dashboard", "/dashboard/events", "/dashboard/users", "/dashboard/settlements", "/dashboard/audit-log"]) {
        await navigateDashboard(page, route);
        await expectNoDocumentOverflow(page);
      }
    });
  }
});

test("mobile cards and desktop tables switch at the data breakpoint", async ({ page }) => {
  const pairs = [
    ["/dashboard", "analytics-mobile-ranking", "analytics-desktop-ranking"],
    ["/dashboard/users", "users-mobile-list", "users-desktop-table"],
    ["/dashboard/events", "events-mobile-list", "events-desktop-table"],
  ] as const;

  await page.setViewportSize({ width: 390, height: 844 });
  await openDashboard(page);
  for (const [route, mobileId, desktopId] of pairs) {
    await navigateDashboard(page, route);
    await expect(page.getByTestId(mobileId)).toBeVisible();
    await expect(page.getByTestId(desktopId)).toBeHidden();
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  for (const [route, mobileId, desktopId] of pairs) {
    await navigateDashboard(page, route);
    await expect(page.getByTestId(mobileId)).toBeHidden();
    await expect(page.getByTestId(desktopId)).toBeVisible();
  }
});

test("all top-level dashboard routes reflow on phone and desktop", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "The full route inventory is covered once; cross-browser layout is covered by the viewport matrix.");
  test.setTimeout(120_000);
  const routes = [
    "/dashboard",
    "/dashboard/profile",
    "/dashboard/registrations",
    "/dashboard/events",
    "/dashboard/check-in",
    "/dashboard/reports",
    "/dashboard/tshirts",
    "/dashboard/vouchers",
    "/dashboard/organizer-onboarding",
    "/dashboard/event-fees",
    "/dashboard/settlements",
    "/dashboard/settings",
    "/dashboard/users",
    "/dashboard/developer-settings",
    "/dashboard/broadcast",
    "/dashboard/audit-log",
  ] as const;

  for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("#main-content")).toBeVisible({ timeout: 10_000 });
      await expectNoDocumentOverflow(page);
    }
  }
});

const roleNavigationExpectations = {
  user: { visible: ["My Registrations"], hidden: ["Events", "User Management"] },
  organizer: { visible: ["Events", "Activity Log"], hidden: ["User Management", "Audit Log"] },
  admin: { visible: ["Events", "User Management", "Audit Log"], hidden: ["Activity Log"] },
  developer: { visible: ["Events", "User Management", "Control Center"], hidden: ["Activity Log"] },
} as const;

for (const role of ["user", "organizer", "admin", "developer"] as const) {
  test(`seeded ${role} reaches the permitted dashboard experience`, async ({ browser, browserName }) => {
    test.skip(browserName === "webkit", "Role authorization is browser-independent and is covered in Chromium.");
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: `playwright/.auth/${role}.json` });
    const page = await context.newPage();
    try {
      await openDashboard(page, roleEmails[role]);
      await expectNoDocumentOverflow(page);
      await page.getByRole("button", { name: "Open navigation menu" }).click();
      const navigation = page.getByTestId("dashboard-mobile-navigation").getByRole("navigation", { name: "Dashboard navigation" });
      for (const label of roleNavigationExpectations[role].visible) {
        await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
      }
      for (const label of roleNavigationExpectations[role].hidden) {
        await expect(navigation.getByRole("link", { name: label, exact: true })).toHaveCount(0);
      }
    } finally {
      await context.close();
    }
  });
}
