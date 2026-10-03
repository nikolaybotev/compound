import fs from "node:fs";
import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const leaks = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC3 example loan, chart, and November 2039 card", async ({ page }) => {
  await openExample(page);
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,792.22");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$570,000.00");
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$795,200.72");
  await expect(page.getByRole("region", { name: "Total cost of loan" })).toContainText("$1,365,200.72");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("October 2056");
  await expect(page.getByText("Interest saved")).toHaveCount(0);

  const year = page.locator("tbody[data-year='2026']");
  await expect(year.getByText("Nov 2026")).toBeVisible();
  await expect(year.getByText("Dec 2026")).toBeVisible();
  await expect(year.getByText("Oct 2026")).toHaveCount(0);
  await expect(year.getByText("Jan 2027")).toHaveCount(0);

  const november = page.getByRole("row", { name: /Nov 2026/ });
  await expect(november).toContainText("1");
  await expect(november).toContainText("$467.22");
  await expect(november).toContainText("$3,325.00");
  await expect(november).toContainText("$569,532.78");
  await expect(november).toContainText("$791,875.72");
  await expect(november.getByRole("cell").nth(4)).toHaveText("");

  await expect(page.locator("[data-bar]")).toHaveCount(360);
  await indicateMonth(page, 157);
  const card = page.getByTestId("legend");
  await expect(card.getByRole("heading", { name: "Nov 2039" })).toBeVisible();
  await expect(card).toContainText("Principal paid");
  await expect(card).toContainText("$119,519.95");
  await expect(card).toContainText("Interest paid");
  await expect(card).toContainText("$475,859.25");
  await expect(card).toContainText("Loan balance");
  await expect(card).toContainText("$450,480.05");
  await expect(card).toContainText("Interest remaining");
  await expect(card).toContainText("$319,341.47");
  await expect(card).toContainText("Principal");
  await expect(card).toContainText("$1,157.67");
  await expect(card).toContainText("$2,634.55");
  await expect(card).toContainText("Extra principal");
  await expect(card).toContainText("$0.00");
  await expect(page.getByRole("img", { name: "Piggy bank" })).toHaveCount(2);
  await expect(page.getByRole("img", { name: "Hooded figure" })).toHaveCount(2);
});

test("AC4 down payment changes the loan amount", async ({ page }) => {
  await openExample(page);
  await page.locator("#price").fill("712500");
  await page.locator("#down").fill("20");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$570,000.00");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,792.22");

  await page.locator("#price").fill("399999.00");
  await page.locator("#down").fill("3.5");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$385,999.03");
});

test("AC9 built JavaScript does not name bankrate", async () => {
  const dist = path.resolve(process.cwd(), "dist");
  const scripts = walk(dist).filter((file) => file.endsWith(".js"));
  expect(scripts.length).toBeGreaterThan(0);
  for (const file of scripts) {
    expect(fs.readFileSync(file, "utf8")).not.toContain("bankrate.com");
  }
});

test("AC11 pinned clock loads October 2026 and an invalid price keeps the loan", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#start")).toHaveValue("2026-10");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,792.22");
  await expect(page.locator("[data-bar]")).toHaveCount(360);

  const price = page.locator("#price");
  await price.focus();
  await page.keyboard.press("End");
  await page.keyboard.type("x");
  await expect(page.getByRole("alert")).toContainText("Purchase price");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,792.22");
  await expect(page.locator("[data-bar]")).toHaveCount(360);
});

test("AC12 keyboard, tap, and expand all years", async ({ page }) => {
  await openExample(page);
  await indicateMonth(page, 157);
  await page.getByTestId("chart").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("legend").getByRole("heading", { name: "Dec 2039" })).toBeVisible();

  const chart = page.getByTestId("chart");
  const box = await chart.boundingBox();
  if (!box) throw new Error("chart has no box");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.7);
  await expect(page.getByTestId("legend")).toBeVisible();
  await page.touchscreen.tap(20, 20);
  await expect(page.getByTestId("legend")).toHaveCount(0);

  await expect(page.getByText("Jan 2027")).toHaveCount(0);
  const expand = page.getByRole("button", { name: "Expand all years" });
  await expand.click();
  await expect(page.getByText("Jan 2027")).toBeVisible();
  await expand.click();
  await expect(page.getByText("Jan 2027")).toHaveCount(0);
});

async function openExample(page: Page) {
  await page.goto("/");
  await page.locator("#start").fill("2026-10");
  await page.locator("#price").fill("570000");
  await page.locator("#down").fill("0");
  await page.locator("#years").fill("30");
  await page.locator("#rate").fill("7");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,792.22");
}

async function indicateMonth(page: Page, month: number) {
  const chart = page.getByTestId("chart");
  const box = await chart.boundingBox();
  if (!box) throw new Error("chart has no box");
  const x = box.x + ((month - 0.5) / 360) * box.width;
  const y = box.y + box.height * 0.72;
  await page.mouse.move(x, y);
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

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
