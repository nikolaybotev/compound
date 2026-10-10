import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { setStartMonth } from "./start-month";
import { buildReport, formatGroupedCents } from "../../../amortize.js";

const origin = "http://127.0.0.1:4173";
const leaks = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC3 fresh Conventional heading and picture", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#price")).toHaveValue("600");
  await expect(page.locator("#down")).toHaveValue("5");
  await expect(page.locator("#rate")).toHaveValue("7.375");
  await expect(page.getByLabel("Prevailing monthly payment")).toHaveText("$4,853");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,936.85");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$570,000.00");

  const extras = page.locator("summary", { hasText: "Make extra payments" });
  const pictureSummary = page.locator("summary", { hasText: "Monthly payment and closing costs" });
  await expect(extras).toHaveAttribute("aria-expanded", "false");
  await expect(pictureSummary).toHaveAttribute("aria-expanded", "false");

  await pictureSummary.click();
  const picture = page.locator("details.picture");
  await expect(picture).toContainText("Conventional");
  await expect(picture.locator("[data-line='principal-and-interest']")).toContainText("$3,936.85");
  await expect(picture.locator("[data-line='property-tax']")).toContainText("$575.00");
  await expect(picture.locator("[data-line='property-tax']")).toContainText(
    "Nashua: 1.683%; Brentwood: 1.32%.",
  );
  await expect(picture.locator("[data-line='insurance']")).toContainText("$175.00");
  await expect(picture.locator("[data-line='fha-mip']")).toContainText("$0.00");
  await expect(picture.locator("[data-line='pmi']")).toContainText("$166.25");
  await expect(picture.locator("[data-line='pmi'] td").first()).toHaveText("0.35%");
  await expect(picture.locator("[data-line='pmi']")).not.toContainText("between");
  await expect(picture.locator("[data-line='total-monthly']")).toContainText("$4,853.10");
  await expect(picture.locator("[data-line='cash-to-close']")).toContainText("$50,351.56");
  await expect(picture.locator("[data-line='down-payment']")).toHaveCount(1);
});

test("AC4 down payment clears PMI and upfront MIP finances the loan", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.locator("summary", { hasText: "Monthly payment and closing costs" }).click();
  await page.locator("#down").fill("20");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$480,000.00");
  await expect(page.locator("[data-line='pmi']")).toContainText("$0.00");
  await expect(page.locator("[data-line='pmi'] td").first()).toHaveText("0%");

  await page.locator("#down").fill("5");
  await page.locator("#picture-upfront").fill("1.75");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$579,975.00");
  const cents = buildReport(579975, 7.375, 360, new Map()).monthly_payment_cents;
  await expect(page.locator("[data-line='principal-and-interest']")).toContainText(
    `$${formatGroupedCents(cents)}`,
  );
});

test("AC5 summaries have no border and a picture edit survives Apply", async ({ page }) => {
  await page.goto("/");
  for (const title of ["Make extra payments", "Monthly payment and closing costs"]) {
    const summary = page.locator("summary", { hasText: title });
    await expect(summary).toHaveCount(1);
    expect(await summary.evaluate((el) => el.tagName)).toBe("SUMMARY");
    expect(
      await summary.evaluate((el) => {
        const style = getComputedStyle(el);
        return [
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth,
        ];
      }),
    ).toEqual(["0px", "0px", "0px", "0px"]);
  }

  await openExample(page);
  await extra(page, 1).fill("100");
  await extra(page, 1).press("Enter");
  await expect(savedByExtra(page, 1)).toHaveText("$706.94");

  const extras = page.locator("summary", { hasText: "Make extra payments" });
  if ((await extras.getAttribute("aria-expanded")) !== "true") await extras.click();
  await page.locator("#extra-monthly").fill("100");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(extra(page, 1)).toHaveValue("100.00");

  await page.locator("summary", { hasText: "Monthly payment and closing costs" }).click();
  await page.locator("#picture-tax").fill("2");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.locator("#picture-tax")).toHaveValue("2");
});

test("AC6 a saved version-1 loan keeps its payment and shows thousands", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "compound-amortization-v1",
      JSON.stringify({
        version: 1,
        price: "570000",
        down: "0",
        years: "30",
        rate: "7",
        start: "2026-10",
      }),
    );
  });
  await page.reload();
  await expect(page.locator("#price")).toHaveValue("570");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$570,000.00");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,792.22");
  const pictureSummary = page.locator("summary", { hasText: "Monthly payment and closing costs" });
  await expect(pictureSummary).toHaveAttribute("aria-expanded", "false");
  await pictureSummary.click();
  await expect(page.locator("#picture-tax")).toHaveValue("1.15");
  await expect(page.locator("#picture-insurance")).toHaveValue("0.35");
  await expect(page.locator("#picture-upfront")).toHaveValue("0");
  await expect(page.locator("#picture-origination")).toHaveValue("1");
  await expect(page.locator("#picture-title")).toHaveValue("0.75");
  await expect(page.locator("#picture-processing")).toHaveValue("1200");
  await expect(page.locator("#picture-appraisal")).toHaveValue("500");
  await expect(page.locator("#picture-recording")).toHaveValue("800");
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

function extra(page: Page, month: number) {
  return page.locator(`[aria-label="Extra payment for month ${month}"]`);
}

function savedByExtra(page: Page, month: number) {
  const row = page.locator("tr").filter({
    has: page.locator("td.money").first().getByText(String(month), { exact: true }),
  });
  return row.getByRole("cell").nth(5);
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
