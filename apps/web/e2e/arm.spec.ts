import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { configuredOrigin, LEGACY_KEY } from "./configured";
import { headingText } from "./heading";

const leaks = new WeakMap<BrowserContext, string[]>();

const ARM_NOTE =
  "Initial payment. The extra payment is on top of this amount, and the payment resets at each adjustment.";

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC9 a fresh visit is the fixed heading with eight columns", async ({ page }) => {
  await openFresh(page);
  expect(await headingText(page)).toBe(
    "600K | 5% down | 7.375% 30-year fixed | 780+ | starting October 2026",
  );
  await expect(page.locator("#product")).toHaveValue("fixed");
  await expect(page.locator("#product option:checked")).toHaveText("fixed");
  await expect(page.getByTestId("arm-label")).toHaveCount(0);
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveCount(0);
  await expect(page.locator("thead th")).toHaveCount(8);
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,853.10");
  await expectNoFixedNote(page);
  await expect(page.getByRole("region", { name: "Highest payment" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Highest rate" })).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key)?.includes('"arm"'), LEGACY_KEY),
  ).toBeFalsy();
});

test("AC9 selecting ARM at the default rate shows the 12.375% ceiling", async ({ page }) => {
  await openFresh(page);
  await page.locator("#product").selectOption("arm");
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-line='arm-ceiling']")).toHaveText("Ceiling 12.375% · Floor 2.5%");
  await expect(page.getByTestId("arm-label")).toHaveText("7/1");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,853.10");
  await expect(page.getByRole("region", { name: "Highest rate" })).toContainText("12.375% from November 2033");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$5,725.59 from November 2033",
  );
});

test("AC9 the Example Credit Union 7/1 example heading, terms, and summary", async ({ page }) => {
  await openArm(page);
  expect(await headingText(page)).toBe(
    "600K | 5% down | 5.875% 30-year 7/1 ARM | 780+ | starting October 2026",
  );
  await expect(page.locator(".heading-line")).not.toContainText("= $5,954 / month");
  await expect(page.locator(".heading-line")).not.toContainText("= $4,288 / month");
  const heading = page.locator(".heading-line");
  await expect(heading).toContainText("7/1");
  await expect(heading).toContainText("ARM");

  await expect(page.locator("#product option:checked")).toHaveText("ARM");
  const terms = page.locator("summary", { hasText: "ARM terms" });
  await expect(terms).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#arm-fixed-years")).toHaveValue("7");
  await expect(page.locator("#arm-adjust-months")).toHaveValue("12");
  await expect(page.locator("#arm-margin")).toHaveValue("2.5");
  await expect(page.locator("#arm-initial-cap")).toHaveValue("5");
  await expect(page.locator("#arm-periodic-cap")).toHaveValue("2");
  await expect(page.locator("#arm-lifetime-cap")).toHaveValue("5");
  await expect(page.locator("#arm-floor")).toHaveValue("2.5");
  await expect(page.locator("#arm-initial-floor")).toHaveValue("2.5");
  await expect(page.locator("#arm-round-eighth")).not.toBeChecked();
  await expect(page.locator("#arm-fixed-years")).toBeVisible();
  await expect(page.getByLabel("Round to nearest 1/8 point")).toBeVisible();
  await expect(page.locator("[data-line='arm-ceiling']")).toHaveText("Ceiling 10.875% · Floor 2.5%");
  await expect(page.locator("[data-line='arm-first-adjustment']")).toHaveText(
    "First adjustment November 2033 (payment 85) · -$941.16 to +$1,665.94 · new payment first due December 1, 2033",
  );

  const monthly = page.getByRole("region", { name: "Monthly payment" });
  await expect(monthly).toContainText("$4,288.02");
  await expect(monthly.locator(".note")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Highest rate" })).toContainText("10.875% from November 2033");
  await expect(page.getByRole("region", { name: "Highest rate" })).not.toContainText("first due");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$5,037.71 from November 2033 · first due December 1, 2033",
  );
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$1,103,636.33");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("November 1, 2056");

  await page.locator("#product").selectOption("fixed");
  expect(await headingText(page)).toBe(
    "600K | 5% down | 5.875% 30-year fixed | 780+ | starting October 2026",
  );
});

test("AC4 sheet ARM due notes and adjustment timeline", async ({ page }) => {
  await openArm(page);
  await expect(page.locator("[data-line='arm-first-adjustment']")).toContainText(
    "November 2033 (payment 85)",
  );
  await expect(page.locator("[data-line='arm-first-adjustment']")).toContainText(
    "new payment first due December 1, 2033",
  );
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText("from November 2033");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "first due December 1, 2033",
  );
  const timeline = page.locator(".arm-timeline");
  await expect(timeline).toContainText("Change date November 1, 2033");
  await expect(timeline).toContainText("previous amount");
  await expect(timeline).toContainText("45 days before the change date");
  await expect(timeline).toContainText("210 to 240");
  await expect(timeline).toContainText("60 to 120");
  await expect(timeline).toContainText("every 12 months");
  await expect(timeline).toContainText("inference, not a separate rule");

  await page.locator("#arm-adjust-months").fill("1");
  await expect(page.getByTestId("arm-label")).toHaveText("7/1mo");
  await expect(timeline).toContainText("25 to 120");
  await expect(timeline).toContainText("210 to 240");
});

test("AC9 the structure label follows the interval", async ({ page }) => {
  await openArm(page);
  await page.locator("#arm-adjust-months").fill("6");
  await expect(page.getByTestId("arm-label")).toHaveText("7/6");
  await page.locator("#arm-adjust-months").fill("1");
  await expect(page.getByTestId("arm-label")).toHaveText("7/1mo");
  await page.locator("#arm-adjust-months").fill("12");
  await page.locator("#arm-fixed-years").fill("10");
  await expect(page.getByTestId("arm-label")).toHaveText("10/1");
  await expect(page.locator("[data-line='arm-first-adjustment']")).toHaveText(
    "First adjustment November 2036 (payment 121) · -$852.58 to +$1,494.94 · new payment first due December 1, 2036",
  );
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$4,866.71 from November 2036 · first due December 1, 2036",
  );
});

test("a floor of 0 or above the ceiling keeps the last valid terms", async ({ page }) => {
  await openArm(page);
  await page.locator("#arm-floor").fill("0");
  await expect(page.getByRole("alert")).toContainText("Lifetime floor");
  await expect(page.locator("#arm-floor")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText("$5,037.71");
  await page.locator("#arm-floor").fill("11");
  await expect(page.getByRole("alert")).toContainText("10.875%");
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$1,103,636.33");
  await page.locator("#arm-floor").fill("2.5");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a rate edit under a floor already entered keeps the last valid rate", async ({ page }) => {
  await openArm(page);
  await page.locator("#arm-lifetime-cap").fill("1");
  await page.locator("#arm-floor").fill("6.5");
  await expect(page.locator("#arm-floor")).not.toHaveAttribute("aria-invalid", "true");
  await page.locator("#rate").fill("5");
  await expect(page.getByRole("alert")).toContainText("Lifetime floor");
  await expect(page.locator("#arm-floor")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,288.02");
});

test("a term that is not longer than the initial period is reported on the initial period", async ({ page }) => {
  await openArm(page);
  await page.locator("#years").fill("7");
  await expect(page.getByRole("alert")).toContainText("Initial period must be shorter than the term");
  await expect(page.locator("#arm-fixed-years")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("November 1, 2056");
  await page.locator("#years").fill("15");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("November 1, 2041");
});

test("switching to fixed and back keeps the terms and a closed disclosure stays closed", async ({ page }) => {
  await openArm(page);
  await page.locator("#arm-margin").fill("3");
  await page.locator("#arm-lifetime-cap").fill("3");
  await page.locator("summary", { hasText: "ARM terms" }).click();
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "false");

  await page.locator("#product").selectOption("fixed");
  expect(await headingText(page)).toBe(
    "600K | 5% down | 5.875% 30-year fixed | 780+ | starting October 2026",
  );
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Highest payment" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$643,835.49");
  await expectNoFixedNote(page);
  const stored = await page.evaluate((key) =>
    JSON.parse(localStorage.getItem(key) ?? "{}"),
    LEGACY_KEY,
  );
  expect(stored.arm.enabled).toBe(false);
  expect(stored.arm.margin).toBe("3");
  expect(stored.arm.open).toBe(false);

  await page.locator("#product").selectOption("arm");
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "false");
  await page.locator("summary", { hasText: "ARM terms" }).click();
  await expect(page.locator("#arm-margin")).toHaveValue("3");
  await expect(page.locator("#arm-lifetime-cap")).toHaveValue("3");
  await expect(page.locator("[data-line='arm-ceiling']")).toHaveText("Ceiling 8.875% · Floor 2.5%");
  await expect(page.getByRole("region", { name: "Highest rate" })).toContainText("8.875% from November 2033");
  await expect(page.getByRole("region", { name: "Total interest paid" })).not.toContainText("$1,103,636.33");
});

test("a reload keeps the ARM scenario", async ({ page }) => {
  await openArm(page);
  await page.reload();
  expect(await headingText(page)).toBe(
    "600K | 5% down | 5.875% 30-year 7/1 ARM | 780+ | starting October 2026",
  );
  await expect(page.locator(".heading-line")).not.toContainText("= $5,954 / month");
  await expect(page.locator(".heading-line")).not.toContainText("= $4,288 / month");
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$5,037.71 from November 2033 · first due December 1, 2033",
  );
});

test("a rate edit before the first switch does not store a closed disclosure", async ({ page }) => {
  await openFresh(page);
  await page.locator("#rate").fill("5.875");
  expect(
    await page.evaluate((key) => "arm" in JSON.parse(localStorage.getItem(key) ?? "{}"), LEGACY_KEY),
  ).toBe(false);
  await page.locator("#product").selectOption("arm");
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "true");
  const stored = await page.evaluate((key) =>
    JSON.parse(localStorage.getItem(key) ?? "{}"),
    LEGACY_KEY,
  );
  expect(stored.arm).toMatchObject({ enabled: true, open: true, fixedYears: "7", margin: "2.5", index: [] });
});

test("a broken stored arm never puts the page into ARM mode", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        price: "600000",
        down: "5",
        years: "30",
        rate: "5.875",
        start: "2026-10",
        arm: { enabled: true, open: true, fixedYears: 7 },
      }),
    );
  }, LEGACY_KEY);
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  expect(await headingText(page)).toBe(
    "600K | 5% down | 5.875% 30-year fixed | 780+ | starting October 2026",
  );
  await expect(page.locator("#product")).toHaveValue("fixed");
  await expect(page.locator("thead th")).toHaveCount(8);
});

test("AC9 the ARM schedule has eleven columns with Rate, Payment, and Index", async ({ page }) => {
  await openArm(page);
  const headers = page.locator("thead th");
  await expect(headers).toHaveText([
    "#",
    "Date",
    "Rate",
    "Payment",
    "Principal",
    "Interest",
    "Index",
    "Extra payment",
    "Saved by extra",
    "Principal balance",
    "Interest balance",
  ]);
  const extraIndex = await headers.evaluateAll((cells) =>
    cells.findIndex((cell) => cell.textContent === "Extra payment"),
  );
  const indexIndex = await headers.evaluateAll((cells) =>
    cells.findIndex((cell) => cell.textContent === "Index"),
  );
  expect(indexIndex).toBe(extraIndex - 1);

  await openYear(page, 2033);
  const october = page.getByRole("row", { name: /Oct 2033/ });
  await expect(october).toContainText("5.875%");
  await expect(october).toContainText("$3,371.77");
  await expect(october.getByLabel("Index for month 84")).toHaveCount(0);
  const november = page.getByRole("row", { name: /Nov 2033/ });
  await expect(november).toContainText("10.875%");
  await expect(november).toContainText("$5,037.71");
  await expect(november).toContainText("$4,620.03");
  await expect(november.getByLabel("Index for month 85")).toHaveValue("");

  const yearRow = page.locator("tbody[data-year='2033'] tr.year-row");
  const cells = yearRow.locator("td");
  await expect(cells).toHaveCount(11);
  await expect(cells.nth(2)).toHaveText("");
  await expect(cells.nth(3)).toHaveText("");
  await expect(cells.nth(6)).toHaveText("");
  await expect(cells.nth(7)).toHaveText("$0.00");
  await expect(cells.nth(8)).toHaveText("$0.00");
});

test("AC10 an index at the first adjustment recomputes the path", async ({ page }) => {
  await openArm(page);
  await openYear(page, 2033);
  const nov = page.getByRole("row", { name: /Nov 2033/ });

  await setIndex(page, 85, "4.42");
  await expect(nov).toContainText("6.92%");
  await expect(nov).toContainText("$2,939.82");
  await expect(nov).toContainText("$3,695.72");
  await expect(index(page, 85)).toHaveValue("4.42");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$4,978.20 from November 2035",
  );
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$1,064,081.79");

  await setIndex(page, 85, "abc");
  await expect(index(page, 85)).toHaveValue("4.42");
  await expect(nov).toContainText("6.92%");

  await setIndex(page, 85, "0");
  await expect(index(page, 85)).toHaveValue("0");
  await expect(nov).toContainText("2.5%");
  await setIndex(page, 85, "4.437");
  await expect(nov).toContainText("6.937%");
  await setIndex(page, 85, "4.42");
  await expect(nov).toContainText("6.92%");

  await page.locator("#product").selectOption("fixed");
  await expect(page.locator("thead th")).toHaveCount(8);
  await expect(page.getByRole("region", { name: "Highest payment" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$643,835.49");
  await expect(page.getByLabel("Index for month 85")).toHaveCount(0);

  await page.locator("#product").selectOption("arm");
  await expect(page.locator("thead th")).toHaveCount(11);
  await expect(index(page, 85)).toHaveValue("4.42");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText("$4,978.20");

  await page.reload();
  await openYear(page, 2033);
  await expect(index(page, 85)).toHaveValue("4.42");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$4,978.20 from November 2035",
  );
  const stored = await page.evaluate((key) =>
    JSON.parse(localStorage.getItem(key) ?? "{}"),
    LEGACY_KEY,
  );
  expect(stored.arm.index).toEqual([[85, 4.42]]);

  await setIndex(page, 85, "");
  await expect(index(page, 85)).toHaveValue("");
  await expect(nov).toContainText("10.875%");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$5,037.71 from November 2033 · first due December 1, 2033",
  );
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$1,103,636.33");

  const extra = page.getByLabel("Extra payment for month 1");
  await openYear(page, 2026);
  await extra.fill("100");
  await extra.press("Enter");
  const first = page.getByRole("row", { name: /Nov 2026/ });
  await expect(first).toContainText("$309.06");
  await expect(page.getByRole("region", { name: "Interest saved" })).toContainText("$309.06");
  await expect(page.getByRole("region", { name: "Extra principal paid" })).toContainText("$100.00");
  await expect(page.getByRole("region", { name: "Months saved" })).toHaveText(/Months saved\s*0$/);
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("November 1, 2056 (30 years)");
  await expect(page.getByRole("region", { name: "Monthly payment" }).locator(".note")).toHaveCount(0);

  await page.locator("#product").selectOption("fixed");
  await expectNoFixedNote(page);
});

test("Apply replaces only the extra column and leaves the index", async ({ page }) => {
  await openArm(page);
  await openYear(page, 2033);
  await setIndex(page, 85, "4.42");
  await page.locator("summary", { hasText: "Extra Payments" }).click();
  await page.locator("#extra-monthly").fill("100");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(index(page, 85)).toHaveValue("4.42");
  await expect(page.getByLabel("Extra payment for month 85")).toHaveValue("100.00");
});

test("a term change drops index entries that are no longer adjustment months", async ({ page }) => {
  await openArm(page);
  await openYear(page, 2033);
  await setIndex(page, 85, "4.42");
  await page.locator("#arm-fixed-years").fill("10");
  await expect(page.getByLabel("Index for month 85")).toHaveCount(0);
  const stored = await page.evaluate((key) =>
    JSON.parse(localStorage.getItem(key) ?? "{}"),
    LEGACY_KEY,
  );
  expect(stored.arm.index).toEqual([]);
  await page.locator("#arm-fixed-years").fill("7");
  await openYear(page, 2033);
  await expect(index(page, 85)).toHaveValue("");
});

test("AC14 ARM order, summary, and no picture principal row", async ({ page }) => {
  await openArm(page);
  const mainOrder = await page.locator("main").evaluate((main) => {
    const tags: string[] = [];
    for (const child of main.children) {
      if (child.matches("details.arm")) tags.push("ARM terms");
      if (child.matches("details.picture")) tags.push("Taxes and Insurance");
      if (child.matches("section.summary")) tags.push("Summary");
      if (child.matches(".chart")) tags.push("Chart");
    }
    return tags;
  });
  expect(mainOrder.indexOf("ARM terms")).toBeLessThan(mainOrder.indexOf("Taxes and Insurance"));
  expect(mainOrder.indexOf("Taxes and Insurance")).toBeLessThan(mainOrder.indexOf("Summary"));
  expect(mainOrder.indexOf("Summary")).toBeLessThan(mainOrder.indexOf("Chart"));

  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,288.02");
  await expect(page.getByText(ARM_NOTE)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Highest rate" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Highest payment" })).toBeVisible();

  await page.locator("summary", { hasText: "Taxes and Insurance" }).click();
  await expect(page.locator("[data-line='principal-and-interest']")).toHaveCount(0);
});

async function expectNoFixedNote(page: Page) {
  await expect(page.getByRole("region", { name: "Monthly payment" }).locator(".note")).toHaveCount(0);
  await expect(page.getByText("The extra payment is on top of this amount.")).toHaveCount(0);
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
