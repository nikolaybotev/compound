import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const leaks = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC2 level checkbox on, $100 in fixed period only", async ({ page }) => {
  await openArm(page);
  await openPrefill(page);
  await page.locator("#extra-level").check();
  await page.locator("#extra-monthly").fill("100");
  await page.locator("#extra-yearly").fill("");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.locator("#scenario")).toHaveAttribute(
    "aria-label",
    "1: $4,388 - 600K | 5% down | 5.875% | 30 years | 7/1",
  );

  const monthly = page.getByRole("region", { name: "Monthly payment" });
  await expect(monthly).toContainText("$4,388.02");
  await expect(monthly).toContainText("$100.00 PE");

  const bar = monthly.locator(".summary-prevailing-track");
  await expect(bar).toHaveAttribute(
    "aria-label",
    "Principal and interest $3,371.77, Taxes and insurance $916.25, Prevailing extra $100.00",
  );
  const peGrow = await monthly.locator(".prevailing-pe").evaluate((el) => el.style.flexGrow);
  expect(peGrow).toBe("10000");

  await openYear(page, 2026);
  await expect(extra(page, 1)).toHaveValue("100.00");
  await openYear(page, 2033);
  await expect(extra(page, 85)).toHaveValue("");

  await expect(page.getByRole("columnheader", { name: "Prevailing extra" })).toHaveCount(0);
  await expect(page.locator(".heading-line")).not.toContainText("= $5,952 / month");
});

test("AC3 checkbox off, $100 every month", async ({ page }) => {
  await openArm(page);
  await openPrefill(page);
  await expect(page.locator("#extra-level")).not.toBeChecked();
  await page.locator("#extra-monthly").fill("100");
  await page.locator("#extra-yearly").fill("");
  await page.getByRole("button", { name: "Apply" }).click();

  const monthly = page.getByRole("region", { name: "Monthly payment" });
  await expect(monthly).toContainText("$4,388.02");
  await expect(monthly).toContainText("$100.00 PE");
  await expect(page.locator("#scenario")).toHaveAttribute(
    "aria-label",
    "1: $4,388 - 600K | 5% down | 5.875% | 30 years | 7/1",
  );
});

function extra(page: Page, month: number) {
  return page.locator(`[aria-label="Extra payment for month ${month}"]`);
}

async function openPrefill(page: Page) {
  const summary = page.locator("summary", { hasText: "Extra Payments" });
  if ((await summary.getAttribute("aria-expanded")) !== "true") await summary.click();
}

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
  const leaked: string[] = [];
  leaks.set(context, leaked);
  await context.route("**/*", (route) => {
    const url = route.request().url();
    let allowed = false;
    try {
      allowed = new URL(url).origin === origin;
    } catch {
      allowed = false;
    }
    if (!allowed) {
      leaked.push(url);
      return route.abort();
    }
    return route.continue();
  });
}
