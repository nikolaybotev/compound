import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const leaks = new WeakMap<BrowserContext, string[]>();

const FIRST_ADJUSTMENT_LINE =
  "First adjustment November 2033 (payment 85) · -$941.16 to +$1,665.94";

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC4 F1 lines, yearly extra, extras, and index leave the no-extra range", async ({ page }) => {
  await openFresh(page);
  await expect(page.locator("#arm-even-yearly")).toHaveCount(0);
  await page.locator("#rate").fill("5.875");
  await page.locator("#product").selectOption("arm");
  await expect(page.locator("[data-line='arm-ceiling']")).toHaveText("Ceiling 10.875% · Floor 2.5%");
  await expect(page.locator("[data-line='arm-first-adjustment']")).toHaveText(FIRST_ADJUSTMENT_LINE);
  await expect(page.locator("[data-line='arm-even-out']")).toHaveText("Even-out extra $823.21");
  await expect(page.locator("[data-line='arm-monthly-extra']")).toHaveText("Monthly extra $823.21");

  await page.locator("#arm-even-yearly").fill("250");
  await expect(page.locator("[data-line='arm-monthly-extra']")).toHaveText("Monthly extra $812.49");
  await expect(page.locator("[data-line='arm-even-out']")).toHaveText("Even-out extra $823.21");
  await expect(page.locator("[data-line='arm-first-adjustment']")).toHaveText(FIRST_ADJUSTMENT_LINE);
  await expect(page.locator("#extra-yearly")).toHaveValue("");
  await expect(page.getByLabel("Extra payment for month 1")).toHaveValue("");

  await page.locator("summary", { hasText: "Extra Payments" }).click();
  await page.locator("#extra-monthly").fill("100");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.locator("[data-line='arm-first-adjustment']")).toHaveText(FIRST_ADJUSTMENT_LINE);
  await expect(page.locator("[data-line='arm-even-out']")).toHaveText("Even-out extra $823.21");

  await openYear(page, 2033);
  const indexCell = page.getByLabel("Index for month 85");
  await indexCell.fill("0");
  await indexCell.press("Enter");
  await expect(page.locator("[data-line='arm-first-adjustment']")).toHaveText(FIRST_ADJUSTMENT_LINE);
  await expect(page.locator("[data-line='arm-even-out']")).toHaveText("Even-out extra $823.21");
});

test("AC6 invalid yearly extra and zero caps", async ({ page }) => {
  await openArm(page);
  await page.locator("#arm-even-yearly").fill("250");
  await page.locator("#arm-margin").fill("nope");
  await expect(page.getByRole("alert")).toContainText("Margin");
  await page.locator("#arm-even-yearly").fill("nope");
  await expect(page.locator("#arm-even-yearly")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert").filter({ hasText: "Yearly extra must" })).toBeVisible();
  await expect(page.locator("[data-line='arm-monthly-extra']")).toHaveText("Monthly extra $812.49");

  await page.locator("#arm-margin").fill("2.5");
  await page.locator("#arm-initial-cap").fill("0");
  await page.locator("#arm-lifetime-cap").fill("0");
  await expect(page.locator("[data-line='arm-even-out']")).toHaveText("Even-out extra $0.00");
  await expect(page.locator("[data-line='arm-first-adjustment']")).toHaveText(
    "First adjustment November 2033 (payment 85) · -$941.16 to $0.00",
  );
});

async function openYear(page: Page, year: number) {
  const body = page.locator(`tbody[data-year='${year}']`);
  const toggle = body.locator("tr.year-row button");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

async function openFresh(page: Page) {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#rate")).toHaveValue("7.375");
}

async function openArm(page: Page) {
  await openFresh(page);
  await page.locator("#product").selectOption("arm");
  await page.locator("#rate").fill("5.875");
  await expect(page.locator("[data-line='arm-ceiling']")).toHaveText("Ceiling 10.875% · Floor 2.5%");
}

async function blockForeignHosts(context: BrowserContext) {
  const blocked: string[] = [];
  leaks.set(context, blocked);
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(origin) || url.startsWith("data:") || url.startsWith("blob:")) {
      route.continue();
      return;
    }
    blocked.push(url);
    route.abort();
  });
}
