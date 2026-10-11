import fs from "node:fs";
import path from "node:path";
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

test("AC3 example loan, chart, and November 2039 card", async ({ page }) => {
  await openExample(page);
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,718.47");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$570,000.00");
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$795,200.72");
  await expect(page.getByRole("region", { name: "Total cost of loan" })).toContainText("$1,365,200.72");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("October 2056 (30 years)");
  await expect(page.getByRole("region", { name: "Monthly payment" }).locator(".note")).toHaveCount(0);
  await expect(page.getByText("The extra payment is on top of this amount.")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Extra principal paid" })).toContainText("$0.00");
  await expect(page.getByRole("region", { name: "Interest saved" })).toContainText("$0.00");
  await expect(page.getByRole("region", { name: "Months saved" })).toContainText("0");

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
  await expect(november.getByRole("cell").nth(4)).toHaveText("$0.00");
  await expect(november.getByRole("cell").nth(5)).toHaveText("");

  await expect(page.locator("[data-bar]")).toHaveCount(360);
  await indicateMonth(page, 157);
  const card = page.getByTestId("legend");
  await expect(card.getByRole("heading", { name: "157: Nov 2039" })).toBeVisible();
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
  await page.locator("#price").fill("712.5");
  await page.locator("#down").fill("20");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$570,000.00");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,682.84");

  await page.locator("#price").fill("399.999");
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

test("AC3 fresh heading with FICO and heading control size", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  expect(await headingText(page)).toBe(
    "600K | 5% down | 7.375% 30-year fixed | 780 FICO | starting October 2026",
  );
  expect(await headingText(page)).not.toContain("780+");
  await expect(page.locator("#fico-range")).toHaveValue("");
  const ficoSize = await page.locator("#fico").evaluate((el) => getComputedStyle(el).fontSize);
  const lineSize = await page.locator(".heading-line").evaluate((el) => getComputedStyle(el).fontSize);
  expect(ficoSize).toBe(lineSize);
});

test("AC11 pinned clock loads October 2026 and an invalid price keeps the loan", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#start")).toHaveAttribute("data-value", "2026-10");
  await expect(page.locator("#start")).toHaveText("October 2026");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,853.10");
  await expect(page.getByRole("region", { name: "Extra principal paid" })).toContainText("$0.00");
  await expect(page.getByRole("region", { name: "Interest saved" })).toContainText("$0.00");
  await expect(page.getByRole("region", { name: "Months saved" })).toContainText("0");
  const monthly = page.getByRole("region", { name: "Monthly payment" });
  await expect(monthly).toContainText("$3,936.85 PI");
  await expect(monthly).toContainText("$916.25 TI");
  await expect(monthly.locator(".summary-prevailing-tag")).toHaveCount(2);
  await expect(page.locator("[data-bar]")).toHaveCount(360);

  const price = page.locator("#price");
  await price.focus();
  await page.keyboard.press("End");
  await page.keyboard.type("x");
  await expect(page.getByRole("alert")).toContainText("Purchase price");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,853.10");
  await expect(page.locator("[data-bar]")).toHaveCount(360);
});

test("AC7 prevailing extra raises Monthly payment on the fresh loan", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.locator("summary", { hasText: "Extra Payments" }).click();
  await page.locator("#extra-monthly").fill("1000");
  await page.getByRole("button", { name: "Apply" }).click();
  const monthly = page.getByRole("region", { name: "Monthly payment" });
  await expect(monthly).toContainText("$5,853.10");
  await expect(monthly).toContainText("$1,000.00 PE");
});

test("AC8 chart popup prefixes the payment number", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await indicateMonth(page, 87);
  await expect(page.getByTestId("legend").getByRole("heading", { name: "87: Jan 2034" })).toBeVisible();
});

test("AC12 keyboard, tap, and expand all years", async ({ page }) => {
  await openExample(page);
  await indicateMonth(page, 157);
  await page.getByTestId("chart").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("legend").getByRole("heading", { name: "158: Dec 2039" })).toBeVisible();

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

test("AC8 the start month is a page-drawn picker", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  const trigger = page.locator("#start");
  expect(await trigger.evaluate((element) => element.tagName)).toBe("BUTTON");
  await expect(trigger).toHaveText("October 2026");
  await expect(trigger).toHaveAttribute("data-value", "2026-10");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("October 2056 (30 years)");

  const dialog = page.getByRole("dialog", { name: "Choose start month" });
  await expect(dialog).toHaveCount(0);
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".month-picker-year span")).toHaveText("2026");
  await expect(dialog.locator(".month-picker-grid button")).toHaveCount(12);
  await expect(dialog.getByRole("button", { name: "October 2026" })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("button", { name: "November 2026" })).toHaveAttribute("aria-pressed", "false");

  await dialog.getByRole("button", { name: "November 2026" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toHaveText("November 2026");
  await expect(trigger).toHaveAttribute("data-value", "2026-11");
  await expect(trigger).toBeFocused();
  await expect(page.locator("tbody[data-year='2026'] tr").nth(1)).toContainText("Dec 2026");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("November 2056 (30 years)");

  await trigger.click();
  await dialog.getByRole("button", { name: "Previous year" }).click();
  await expect(dialog.locator(".month-picker-year span")).toHaveText("2025");
  await dialog.getByRole("button", { name: "Next year" }).click();
  await dialog.getByRole("button", { name: "Next year" }).click();
  await expect(dialog.locator(".month-picker-year span")).toHaveText("2027");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toHaveText("November 2026");
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await trigger.click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.locator("h1").click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toHaveText("November 2026");

  await page.getByRole("button", { name: "Start month" }).click();
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Start month" }).click();
  await expect(dialog).toHaveCount(0);

  await page.reload();
  await expect(page.locator("#start")).toHaveText("November 2026");
  await expect(page.locator("#start")).toHaveAttribute("data-value", "2026-11");
});

test("AC9 the legend follows the pointer and flips at the window edge", async ({ page }) => {
  await openExample(page);
  const card = page.getByTestId("legend");
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("no viewport");

  const left = await indicateMonth(page, 157);
  await expect(card.getByRole("heading", { name: "157: Nov 2039" })).toBeVisible();
  const first = await card.boundingBox();
  if (!first) throw new Error("no card");
  expect(first.x).toBeGreaterThanOrEqual(left.x + 16 - 0.5);
  expect(first.y).toBeGreaterThanOrEqual(left.y + 16 - 0.5);
  expect(first.x + first.width).toBeLessThanOrEqual(viewport.width);
  expect(first.y + first.height).toBeLessThanOrEqual(viewport.height);

  const chart = await page.getByTestId("chart").boundingBox();
  if (!chart) throw new Error("no chart");
  const coveredX = first.x + 40;
  const coveredY = first.y + 40;
  await page.mouse.move(coveredX, coveredY);
  const expected = Math.floor(((coveredX - chart.x) / chart.width) * 360) + 1;
  await expect(
    card.getByRole("heading", { name: dateLabel(expected) }),
  ).toBeVisible();

  const right = await indicateMonth(page, 355);
  await expect(card.getByRole("heading", { name: dateLabel(355) })).toBeVisible();
  const second = await card.boundingBox();
  if (!second) throw new Error("no card");
  expect(second.x + second.width).toBeLessThanOrEqual(right.x - 16 + 0.5);
  expect(second.x).toBeGreaterThanOrEqual(8);

  await page.mouse.move(5, 5);
  await expect(card).toHaveCount(0);

  await scrollChartToTop(page);
  await page.getByTestId("chart").focus();
  await page.keyboard.press("ArrowRight");
  await expect(card).toBeVisible();
  const keyed = await card.boundingBox();
  const top = await page.getByTestId("chart").boundingBox();
  if (!keyed || !top) throw new Error("no box");
  expect(keyed.y).toBeGreaterThanOrEqual(top.y + 16 - 0.5);
});

test.describe("phone", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("AC10 a tapped card is inside the window and off the tap point", async ({ page }) => {
    await openExample(page);
    await scrollChartToTop(page);
    const chart = await page.getByTestId("chart").boundingBox();
    if (!chart) throw new Error("no chart");
    const x = chart.x + chart.width * 0.5;
    const y = chart.y + chart.height * 0.7;
    await page.touchscreen.tap(x, y);
    const card = page.getByTestId("legend");
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    if (!box) throw new Error("no card");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    expect(box.y + box.height).toBeLessThanOrEqual(667);
    const contains = x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
    expect(contains).toBe(false);
    expect(box.y + box.height).toBeGreaterThan(chart.y + chart.height);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.touchscreen.tap(20, 20);
    await expect(card).toHaveCount(0);
  });
});

async function openExample(page: Page) {
  await page.goto("/");
  await setStartMonth(page, 2026, 10);
  await page.locator("#price").fill("570");
  await page.locator("#down").fill("0");
  await page.locator("#years").fill("30");
  await page.locator("#rate").fill("7");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,718.47");
}

async function scrollChartToTop(page: Page) {
  await page.getByTestId("chart").evaluate((element) => element.scrollIntoView());
}

async function headingText(page: Page): Promise<string> {
  return page.locator(".heading-line").evaluate((element) => {
    const parts: string[] = [];
    const walk = (node: Node) => {
      if (node instanceof HTMLInputElement) {
        parts.push(node.value);
      } else if (node instanceof HTMLSelectElement) {
        if (node.id !== "fico-range") parts.push(node.options[node.selectedIndex]?.text ?? "");
      } else if (node instanceof HTMLButtonElement && node.id === "start") {
        parts.push(node.textContent?.trim() ?? "");
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.replace(/\s+/g, " ") ?? "";
        if (text.trim()) parts.push(text);
      } else {
        node.childNodes.forEach(walk);
      }
    };
    element.childNodes.forEach(walk);
    return parts.join("").replace(/\s+/g, " ").trim();
  });
}

async function indicateMonth(page: Page, month: number) {
  const chart = page.getByTestId("chart");
  await scrollChartToTop(page);
  const box = await chart.boundingBox();
  if (!box) throw new Error("chart has no box");
  const x = box.x + ((month - 0.5) / 360) * box.width;
  const y = box.y + box.height * 0.72;
  await page.mouse.move(x, y);
  return { x, y };
}

function dateLabel(month: number): string {
  const index = 2026 * 12 + 9 + month;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${month}: ${names[index % 12]} ${Math.floor(index / 12)}`;
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
