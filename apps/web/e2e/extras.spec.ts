import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const leaks = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC15 a fresh visit keeps Make extra payments collapsed", async ({ page }) => {
  await page.goto("/");
  const summary = extraSummary(page);
  await expect(summary).toHaveAccessibleName("Make extra payments");
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#extra-monthly")).toHaveValue("");
  await expect(page.locator("#extra-yearly")).toHaveValue("");
  await expect(page.locator("#extra-yearly-month")).toHaveValue("1");
});

test("AC5 Apply $100 monthly, and typing does nothing until Apply", async ({ page }) => {
  await openExample(page);
  await openPrefill(page);
  await page.locator("#extra-monthly").fill("100");
  await expect(extra(page, 1)).toHaveValue("");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(extra(page, 1)).toHaveValue("100.00");
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$718,834.63");
  await expect(page.getByRole("region", { name: "Interest saved" })).toContainText("$76,366.09");
  await expect(page.getByRole("region", { name: "Extra principal paid" })).toContainText("$33,200.00");
  await expect(page.getByRole("region", { name: "Months saved" })).toContainText("2 years 4 months");
  const labels = await page.locator(".summary dl > div").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("aria-label")),
  );
  expect(labels.indexOf("Extra principal paid")).toBe(labels.indexOf("Interest saved") - 1);
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,792.22");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText(
    "June 2054 (27 years 8 months)",
  );
  await expect(page.locator("[data-bar]")).toHaveCount(332);
});

test("AC6 clearing month 1 keeps its interest, and an empty Apply clears the column", async ({ page }) => {
  await openExample(page);
  await applyMonthly(page, "100");
  await extra(page, 1).fill("0");
  await extra(page, 1).press("Enter");
  await expect(extra(page, 1)).toHaveValue("");
  await expect(extra(page, 2)).toHaveValue("100.00");
  await expect(page.getByRole("row", { name: /Nov 2026/ })).toContainText("$3,325.00");

  await page.getByRole("button", { name: "Apply" }).click();
  await expect(extra(page, 1)).toHaveValue("100.00");

  await page.locator("#extra-monthly").fill("");
  await page.locator("#extra-yearly").fill("");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(extra(page, 1)).toHaveValue("");
  await expect(extra(page, 2)).toHaveValue("");
  await expect(page.getByText("Interest saved")).toHaveCount(0);
});

test("AC7 $1,000 every January lands on month 3", async ({ page }) => {
  await openExample(page);
  await openPrefill(page);
  await page.locator("#extra-yearly").fill("1000");
  await page.locator("#extra-yearly-month").selectOption("1");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "2027" }).click();
  await expect(extra(page, 1)).toHaveValue("");
  await expect(extra(page, 3)).toHaveValue("1000.00");
  await expect(page.getByRole("region", { name: "Interest saved" })).toContainText("$66,633.36");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("October 2054 (28 years)");
  await expect(page.getByRole("region", { name: "Extra principal paid" })).toContainText("$28,000.00");
  await expect(page.getByRole("region", { name: "Months saved" })).toHaveText(/Months saved\s*2 years$/);
});

test("a $100 extra in month 1 alone is $100.00 paid and 0 months saved", async ({ page }) => {
  await openExample(page);
  await extra(page, 1).fill("100");
  await extra(page, 1).press("Enter");
  await expect(page.getByRole("region", { name: "Extra principal paid" })).toContainText("$100.00");
  await expect(page.getByRole("region", { name: "Months saved" })).toHaveText(/Months saved\s*0$/);
});

test("AC8 reload keeps the edited cell, the prefill, and an open 2027", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await applyMonthly(page, "100");
  await extra(page, 1).fill("50");
  await extra(page, 1).press("Enter");
  await page.getByRole("button", { name: "2027" }).click();
  await page.reload();
  await expect(extra(page, 1)).toHaveValue("50.00");
  await expect(page.getByRole("button", { name: "2027" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#extra-monthly")).toHaveValue("100");
  await expect(page.locator("#extra-yearly-month")).toHaveValue("1");

  await page.evaluate(() => localStorage.setItem("compound-amortization-v1", "{"));
  await page.reload();
  await expect(page.locator("#start")).toHaveValue("2026-10");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,936.85");
  const summary = extraSummary(page);
  await expect(summary).toHaveAccessibleName("Make extra payments");
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#extra-monthly")).toHaveValue("");
  await expect(page.locator("#extra-yearly")).toHaveValue("");
  await expect(page.locator("#extra-yearly-month")).toHaveValue("1");
});

test("AC13 an invalid extra cell and an invalid Apply leave the column", async ({ page }) => {
  await openExample(page);
  await applyMonthly(page, "100");
  await extra(page, 1).fill("abc");
  await extra(page, 1).press("Enter");
  await expect(extra(page, 1)).toHaveValue("100.00");

  await page.locator("#extra-monthly").fill("12.345");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("alert")).toContainText("Additional amount to monthly payment");
  await expect(extra(page, 1)).toHaveValue("100.00");
});

test("AC14 a shorter term drops month 181 and restoring the term does not bring it back", async ({
  page,
}) => {
  await openExample(page);
  await applyMonthly(page, "100");
  expect(await storedMonths(page)).toContain(181);
  await page.locator("#years").fill("15");
  expect(await storedMonths(page)).not.toContain(181);
  await page.locator("#years").fill("30");
  expect(await storedMonths(page)).not.toContain(181);
  await expect(extra(page, 1)).toHaveValue("100.00");
});

async function openExample(page: Page) {
  await page.goto("/");
  await page.locator("#start").fill("2026-10");
  await page.locator("#price").fill("570");
  await page.locator("#down").fill("0");
  await page.locator("#years").fill("30");
  await page.locator("#rate").fill("7");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,792.22");
}

function extraSummary(page: Page) {
  return page.locator("summary", { hasText: "Make extra payments" });
}

async function openPrefill(page: Page) {
  const summary = extraSummary(page);
  if ((await summary.getAttribute("aria-expanded")) !== "true") await summary.click();
}

async function applyMonthly(page: Page, amount: string) {
  await openPrefill(page);
  await page.locator("#extra-monthly").fill(amount);
  await page.getByRole("button", { name: "Apply" }).click();
}

function extra(page: Page, month: number) {
  return page.locator(`[aria-label="Extra payment for month ${month}"]`);
}

async function storedMonths(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("compound-amortization-v1");
    const saved = JSON.parse(raw ?? "{}") as { extras?: [number, number][] };
    return (saved.extras ?? []).map(([month]) => month);
  });
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
