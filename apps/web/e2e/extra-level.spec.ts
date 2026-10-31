import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { configuredOrigin } from "./configured";

const leaks = new WeakMap<BrowserContext, string[]>();

const LEVEL_LABEL = "Match the initial-period total after each reset";

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC2 fixed loan has no level checkbox; ARM F1 amounts with box off", async ({ page }) => {
  await openFresh(page);
  await openPrefill(page);
  await expect(page.locator("#extra-level")).toHaveCount(0);
  await openArm(page);
  const checkbox = page.locator("#extra-level");
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toHaveAccessibleName(LEVEL_LABEL);
  await page.locator("#extra-monthly").fill("100");
  await page.locator("#extra-yearly").fill("250");
  await page.locator("#extra-yearly-month").selectOption("1");
  await page.getByRole("button", { name: "Apply" }).click();
  await openYear(page, 2033);
  await expect(extra(page, 85)).toHaveValue("100.00");
  await openYear(page, 2034);
  await expect(extra(page, 87)).toHaveValue("350.00");
});

test("AC3 level Apply then index 0 at month 85", async ({ page }) => {
  await openArm(page);
  await openPrefill(page);
  await page.locator("#extra-monthly").fill("100");
  await page.locator("#extra-yearly").fill("250");
  await page.locator("#extra-yearly-month").selectOption("1");
  await page.locator("#extra-level").check();
  await page.getByRole("button", { name: "Apply" }).click();
  await openYear(page, 2026);
  await expect(extra(page, 1)).toHaveValue("100.00");
  await openYear(page, 2027);
  await expect(extra(page, 3)).toHaveValue("350.00");
  await openYear(page, 2033);
  await expect(extra(page, 84)).toHaveValue("100.00");
  await expect(extra(page, 85)).toHaveValue("");
  await openYear(page, 2034);
  await expect(extra(page, 87)).toHaveValue("");
  await setIndex(page, 85, "0");
  await expect(extra(page, 85)).toHaveValue("1101.02");
  await expect(extra(page, 87)).toHaveValue("1351.02");
  await openYear(page, 2034);
  await expect(extra(page, 97)).toHaveValue("679.47");
  await openYear(page, 2033);
  await expect(extra(page, 84)).toHaveValue("100.00");
});

test("AC4 an edited month 1 blocks a later index clear", async ({ page }) => {
  await openArm(page);
  await openPrefill(page);
  await page.locator("#extra-monthly").fill("100");
  await page.locator("#extra-yearly").fill("250");
  await page.locator("#extra-yearly-month").selectOption("1");
  await page.locator("#extra-level").check();
  await page.getByRole("button", { name: "Apply" }).click();
  await setIndex(page, 85, "0");
  await extra(page, 1).fill("50.00");
  await extra(page, 1).press("Enter");
  await setIndex(page, 85, "");
  await openYear(page, 2033);
  await expect(extra(page, 85)).toHaveValue("1101.02");
  await openYear(page, 2034);
  await expect(extra(page, 97)).toHaveValue("679.47");
});

test("AC6 clearing month 85 index empties level extras", async ({ page }) => {
  await openArm(page);
  await openPrefill(page);
  await page.locator("#extra-monthly").fill("100");
  await page.locator("#extra-yearly").fill("250");
  await page.locator("#extra-yearly-month").selectOption("1");
  await page.locator("#extra-level").check();
  await page.getByRole("button", { name: "Apply" }).click();
  await setIndex(page, 85, "0");
  await setIndex(page, 85, "");
  await openYear(page, 2033);
  await expect(extra(page, 85)).toHaveValue("");
  await openYear(page, 2034);
  await expect(extra(page, 87)).toHaveValue("");
  await openYear(page, 2034);
  await expect(extra(page, 97)).toHaveValue("");
  await openYear(page, 2033);
  await expect(extra(page, 84)).toHaveValue("100.00");
});

function extra(page: Page, month: number) {
  return page.locator(`[aria-label="Extra payment for month ${month}"]`);
}

function extraSummary(page: Page) {
  return page.locator("summary", { hasText: "Extra Payments" });
}

async function openPrefill(page: Page) {
  const summary = extraSummary(page);
  if ((await summary.getAttribute("aria-expanded")) !== "true") await summary.click();
}

async function openYear(page: Page, year: number) {
  const body = page.locator(`tbody[data-year='${year}']`);
  const toggle = body.locator("tr.year-row button");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

function index(page: Page, month: number) {
  return page.getByLabel(`Index for month ${month}`);
}

async function setIndex(page: Page, month: number, value: string) {
  await openYear(page, month <= 96 ? 2033 : 2034);
  const cell = index(page, month);
  await cell.fill(value);
  await cell.press("Enter");
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
  const origin = configuredOrigin();
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
