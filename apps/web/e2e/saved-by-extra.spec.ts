import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { setStartMonth } from "./start-month";

const origin = "http://127.0.0.1:4173";
const leaks = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC2 header, month 1 only, and the 2026 year subtotal", async ({ page }) => {
  await openExample(page);
  await expect(yearSaved(page, 2026)).toHaveText("$0.00");
  const headers = page.locator("thead th");
  await expect(headers.nth(5)).toHaveText("Extra payment");
  await expect(headers.nth(6)).toHaveText("Saved by extra");
  await expect(headers.nth(7)).toHaveText("Principal balance");

  await extra(page, 1).fill("100");
  await extra(page, 1).press("Enter");
  await expect(savedByExtra(page, 1)).toHaveText("$706.94");
  await expect(page.getByRole("region", { name: "Interest saved" })).toContainText("$706.94");
  await expect(savedByExtra(page, 2)).toHaveText("$0.00");
  await expect(yearSaved(page, 2026)).toHaveText("$706.94");

  const row = page.getByRole("row", { name: /Nov 2026/ });
  await expect(row.locator("input")).toHaveCount(1);
  await expect(row.getByRole("cell").nth(6).locator("input")).toHaveCount(0);
});

test("AC7 typing without commit leaves Saved by extra at zero", async ({ page }) => {
  await openExample(page);
  await extra(page, 1).fill("100");
  await expect(savedByExtra(page, 1)).toHaveText("$0.00");
  await extra(page, 1).press("Enter");
  await expect(savedByExtra(page, 1)).toHaveText("$706.94");
});

test("AC3 first-year $100 extras", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "Expand all years" }).click();
  for (let month = 1; month <= 12; month += 1) {
    await extra(page, month).fill("100");
    await extra(page, month).press("Enter");
  }
  await expect(savedByExtra(page, 1)).toHaveText("$697.61");
  await expect(savedByExtra(page, 12)).toHaveText("$648.18");
  await expect(savedByExtra(page, 13)).toHaveText("$0.00");
  await expect(page.getByRole("region", { name: "Interest saved" })).toContainText("$8,137.70");
  await expect(yearSaved(page, 2026)).toHaveText("$1,390.60");
  await expect(yearSaved(page, 2027)).toHaveText("$6,681.28");
  await expect(yearSaved(page, 2028)).toHaveText("$0.00");
});

test("AC4 Apply $100 monthly through payoff", async ({ page }) => {
  await openExample(page);
  await applyMonthly(page, "100");
  await expect(savedByExtra(page, 1)).toHaveText("$585.67");
  await expect(yearSaved(page, 2026)).toHaveText("$1,167.36");
  await expect(yearSaved(page, 2027)).toHaveText("$6,678.37");
  await expect(page.getByRole("region", { name: "Interest saved" })).toContainText("$76,366.09");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("June 2054");
  await page.getByRole("button", { name: "Expand all years" }).click();
  await expect(savedByExtra(page, 332)).toHaveText("$0.00");
});

async function openExample(page: Page) {
  await page.goto("/");
  await setStartMonth(page, 2026, 10);
  await page.locator("#price").fill("570");
  await page.locator("#down").fill("0");
  await page.locator("#years").fill("30");
  await page.locator("#rate").fill("7");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,792.22");
}

async function applyMonthly(page: Page, amount: string) {
  const summary = page.locator("summary", { hasText: "Make extra payments" });
  if ((await summary.getAttribute("aria-expanded")) !== "true") await summary.click();
  await page.locator("#extra-monthly").fill(amount);
  await page.getByRole("button", { name: "Apply" }).click();
}

function extra(page: Page, month: number) {
  return page.locator(`[aria-label="Extra payment for month ${month}"]`);
}

function yearSaved(page: Page, year: number) {
  return page.locator(`tbody[data-year='${year}'] tr.year-row td`).nth(6);
}

function savedByExtra(page: Page, month: number) {
  const row = page.locator("tr").filter({
    has: page.locator("td.money").first().getByText(String(month), { exact: true }),
  });
  return row.getByRole("cell").nth(6);
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
