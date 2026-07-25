import { expect, test } from "@playwright/test";

const brandAssets = [
  "/brand/nexrun-mark.png",
  "/brand/nexrun-wordmark.png",
  "/brand/nexrun-lockup.png",
  "/brand/nexrun-social-card.png",
  "/icons/nexrun-pwa-192.png",
  "/icons/nexrun-pwa-512.png",
  "/icons/nexrun-maskable-512.png",
] as const;

test("publishes the NexRun brand metadata and install icons", async ({ page, request }) => {
  await page.goto("/");

  await expect(page.locator('a[aria-label="NexRun home"] img[src="/brand/nexrun-wordmark.png"]').first()).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/brand\/nexrun-social-card\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-icon\.png/);

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: "/icons/nexrun-pwa-192.png", sizes: "192x192", purpose: "any" }),
      expect.objectContaining({ src: "/icons/nexrun-pwa-512.png", sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ src: "/icons/nexrun-maskable-512.png", sizes: "512x512", purpose: "maskable" }),
    ])
  );

  for (const asset of brandAssets) {
    const response = await request.get(asset);
    expect(response.ok(), `${asset} should be available`).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});

test("keeps public, auth, and dashboard branding responsive", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const route of ["/", "/login"]) {
    await page.goto(route);
    await expect(page.locator('a[aria-label="NexRun home"] img').first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  await page.goto("/dashboard");
  const drawerTrigger = page.getByRole("button", { name: "Open navigation menu" });
  await expect(drawerTrigger).toBeVisible({ timeout: 20_000 });
  await drawerTrigger.click();
  const mobileBrand = page
    .getByTestId("dashboard-mobile-navigation")
    .locator('a[aria-label="NexRun home"] img[src="/brand/nexrun-wordmark.png"]');
  await expect(mobileBrand).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopBrand = page
    .locator("aside")
    .locator('a[aria-label="NexRun home"] img[src="/brand/nexrun-wordmark.png"]');
  await expect(desktopBrand).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
