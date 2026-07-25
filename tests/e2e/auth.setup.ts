import { expect, test as setup, type Browser } from "@playwright/test";

const password = process.env.E2E_PASSWORD ?? "NexRun2026!";
const accounts = [
  ["developer", process.env.E2E_DEVELOPER_EMAIL ?? "developer@nexrun.my"],
  ["admin", process.env.E2E_ADMIN_EMAIL ?? "admin@nexrun.my"],
  ["organizer", process.env.E2E_ORGANIZER_EMAIL ?? "organizer@runmalaysia.my"],
  ["user", process.env.E2E_USER_EMAIL ?? "participant@gmail.com"],
] as const;

async function authenticate(browser: Browser, name: string, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, { timeout: 20_000 });
  await context.storageState({ path: `playwright/.auth/${name}.json` });
  await context.close();
}

setup("authenticate seeded responsive-test roles", async ({ browser }) => {
  for (const [name, email] of accounts) await authenticate(browser, name, email);
});
