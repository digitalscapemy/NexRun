import { expect, test } from "@playwright/test";

const completedEvent = {
  title: "Malacca Heritage Run 2025",
  slug: "malacca-heritage-run-2025",
} as const;

test("shows completed events in the public archive with a working detail page", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Past Events" }).click();

    const pastEventHeading = page.getByRole("heading", { name: completedEvent.title });
    await expect(pastEventHeading).toBeVisible();
    const pastEventCard = pastEventHeading.locator("xpath=ancestor::div[contains(@class, 'group')]");
    await expect(pastEventCard.getByText("Completed", { exact: true })).toBeVisible();
    await expect(page.getByText("Langkawi Sunrise Marathon 2026", { exact: true })).toHaveCount(0);

    await page.locator(`a[href="/events/${completedEvent.slug}"]`).last().click();
    await expect(page).toHaveURL(new RegExp(`/events/${completedEvent.slug}$`));
    await expect(page).toHaveTitle(new RegExp(completedEvent.title));
    await expect(page.getByRole("heading", { level: 1, name: completedEvent.title })).toBeVisible();
    await expect(page.getByText("Event completed", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "REGISTER NOW" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "EVENT COMPLETED" })).toBeDisabled();

    await page.goto(`/events/${completedEvent.slug}/register`);
    await expect(page.getByRole("heading", { level: 1, name: "Registration unavailable" })).toBeVisible();
    await expect(page.getByText("This event has been completed and is no longer accepting registrations.")).toBeVisible();
    await expect(page.getByRole("link", { name: "View event details" })).toHaveAttribute(
      "href",
      `/events/${completedEvent.slug}`
    );
  } finally {
    await context.close();
  }
});

test("keeps search, state, and date filters inside the selected tab", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Past Events" }).click();
    await expect(page.getByRole("heading", { name: completedEvent.title })).toBeVisible();

    const stateFilter = page.getByLabel("Filter events by state");
    await stateFilter.selectOption("Selangor");
    await expect(page.getByRole("heading", { name: "No past events found" })).toBeVisible();
    await stateFilter.selectOption("Melaka");
    await expect(page.getByRole("heading", { name: completedEvent.title })).toBeVisible();

    const search = page.getByLabel("Search events");
    await search.fill("Cyberjaya");
    await expect(page.getByRole("heading", { name: "No past events found" })).toBeVisible();
    await search.clear();
    await expect(page.getByRole("heading", { name: completedEvent.title })).toBeVisible();

    await page.getByRole("button", { name: "Toggle advanced filters" }).click();
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill("2026-01-01");
    await expect(page.getByRole("heading", { name: "No past events found" })).toBeVisible();
    await dateInputs.first().fill("2025-01-01");
    await dateInputs.last().fill("2025-12-31");
    await expect(page.getByRole("heading", { name: completedEvent.title })).toBeVisible();

    await stateFilter.selectOption("ALL");
    await dateInputs.first().clear();
    await dateInputs.last().clear();
    await page.getByRole("button", { name: "Upcoming Events" }).click();
    await expect(page.getByRole("heading", { level: 3, name: "Cyberjaya Tech Dash 2026" })).toBeVisible();
    await expect(page.getByRole("heading", { name: completedEvent.title })).toHaveCount(0);
    await expect(page.getByText("Langkawi Sunrise Marathon 2026", { exact: true })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
