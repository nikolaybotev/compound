import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
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
  expect(await headingText(page)).toBe("600K | 5% down | 7.375% fixed = $4,853 / month");
  await expect(page.locator("#product")).toHaveValue("fixed");
  await expect(page.locator("#product option:checked")).toHaveText("fixed");
  await expect(page.getByTestId("arm-label")).toHaveCount(0);
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveCount(0);
  await expect(page.locator("thead th")).toHaveCount(8);
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,936.85");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText(
    "The extra payment is on top of this amount.",
  );
  await expect(page.getByRole("region", { name: "Highest payment" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Highest rate" })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("compound-amortization-v1")?.includes('"arm"'))).toBeFalsy();
});

test("AC9 selecting ARM at the default rate shows the 12.375% ceiling", async ({ page }) => {
  await openFresh(page);
  await page.locator("#product").selectOption("arm");
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-line='arm-ceiling']")).toHaveText("Ceiling 12.375%");
  await expect(page.getByTestId("arm-label")).toHaveText("7/1");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,936.85");
  await expect(page.getByRole("region", { name: "Highest rate" })).toContainText("12.375% from November 2033");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$5,725.59 from November 2033",
  );
});

test("AC9 the First Entertainment 7/1 heading, terms, and summary", async ({ page }) => {
  await openArm(page);
  expect(await headingText(page)).toBe("600K | 5% down | 5.875% 7/1 ARM = $4,288 / month");
  const heading = page.locator(".heading-line");
  const labelBox = await page.getByTestId("arm-label").boundingBox();
  const selectBox = await page.locator("#product").boundingBox();
  const rateBox = await page.locator("#rate").boundingBox();
  expect(labelBox && selectBox && rateBox).toBeTruthy();
  expect(labelBox!.x).toBeGreaterThan(rateBox!.x);
  expect(labelBox!.x).toBeLessThan(selectBox!.x);
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
  await expect(page.getByLabel("Fixed period")).toBeVisible();
  await expect(page.getByLabel("Round to nearest 1/8 point")).toBeVisible();
  await expect(page.locator("[data-line='arm-ceiling']")).toHaveText("Ceiling 10.875%");
  await expect(page.locator("[data-line='arm-first-adjustment']")).toHaveText(
    "First adjustment November 2033 (payment 85)",
  );

  const monthly = page.getByRole("region", { name: "Monthly payment" });
  await expect(monthly).toContainText("$3,371.77");
  await expect(monthly).toContainText(ARM_NOTE);
  await expect(page.getByRole("region", { name: "Highest rate" })).toContainText("10.875% from November 2033");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$5,037.71 from November 2033",
  );
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$1,103,636.33");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("October 2056");
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
    "First adjustment November 2036 (payment 121)",
  );
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$4,866.71 from November 2036",
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
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$3,371.77");
});

test("a term that is not longer than the fixed period is reported on the fixed period", async ({ page }) => {
  await openArm(page);
  await page.locator("#years").fill("7");
  await expect(page.getByRole("alert")).toContainText("Fixed period must be shorter than the term");
  await expect(page.locator("#arm-fixed-years")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("October 2056");
  await page.locator("#years").fill("15");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Payoff date" })).toContainText("October 2041");
});

test("switching to fixed and back keeps the terms and a closed disclosure stays closed", async ({ page }) => {
  await openArm(page);
  await page.locator("#arm-margin").fill("3");
  await page.locator("#arm-lifetime-cap").fill("3");
  await page.locator("summary", { hasText: "ARM terms" }).click();
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "false");

  await page.locator("#product").selectOption("fixed");
  expect(await headingText(page)).toBe("600K | 5% down | 5.875% fixed = $4,288 / month");
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Highest payment" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Total interest paid" })).toContainText("$643,835.49");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText(
    "The extra payment is on top of this amount.",
  );
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("compound-amortization-v1") ?? "{}"),
  );
  expect(stored.arm.enabled).toBe(false);
  expect(stored.arm.margin).toBe("3");
  expect(stored.arm.open).toBe(false);

  await page.locator("#product").selectOption("arm");
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "false");
  await page.locator("summary", { hasText: "ARM terms" }).click();
  await expect(page.locator("#arm-margin")).toHaveValue("3");
  await expect(page.locator("#arm-lifetime-cap")).toHaveValue("3");
  await expect(page.locator("[data-line='arm-ceiling']")).toHaveText("Ceiling 8.875%");
  await expect(page.getByRole("region", { name: "Highest rate" })).toContainText("8.875% from November 2033");
  await expect(page.getByRole("region", { name: "Total interest paid" })).not.toContainText("$1,103,636.33");
});

test("a reload keeps the ARM scenario", async ({ page }) => {
  await openArm(page);
  await page.reload();
  expect(await headingText(page)).toBe("600K | 5% down | 5.875% 7/1 ARM = $4,288 / month");
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$5,037.71 from November 2033",
  );
});

test("a rate edit before the first switch does not store a closed disclosure", async ({ page }) => {
  await openFresh(page);
  await page.locator("#rate").fill("5.875");
  expect(
    await page.evaluate(() => "arm" in JSON.parse(localStorage.getItem("compound-amortization-v1") ?? "{}")),
  ).toBe(false);
  await page.locator("#product").selectOption("arm");
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "true");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("compound-amortization-v1") ?? "{}"),
  );
  expect(stored.arm).toMatchObject({ enabled: true, open: true, fixedYears: "7", margin: "2.5", index: [] });
});

test("a broken stored arm never puts the page into ARM mode", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "compound-amortization-v1",
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
  });
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  expect(await headingText(page)).toBe("600K | 5% down | 5.875% fixed = $4,288 / month");
  await expect(page.locator("#product")).toHaveValue("fixed");
  await expect(page.locator("thead th")).toHaveCount(8);
});

async function openFresh(page: Page) {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#rate")).toHaveValue("7.375");
}

async function openArm(page: Page) {
  await openFresh(page);
  await page.locator("#product").selectOption("arm");
  await page.locator("#rate").fill("5.875");
  await expect(page.locator("[data-line='arm-ceiling']")).toHaveText("Ceiling 10.875%");
}

async function headingText(page: Page): Promise<string> {
  return page.locator(".heading-line").evaluate((element) => {
    const parts: string[] = [];
    const walk = (node: Node) => {
      if (node instanceof HTMLInputElement) {
        parts.push(node.value);
      } else if (node instanceof HTMLSelectElement) {
        parts.push(node.selectedOptions[0]?.text ?? "");
      } else if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent ?? "");
      } else {
        node.childNodes.forEach(walk);
      }
    };
    element.childNodes.forEach(walk);
    return parts.join("").replace(/\s+/g, " ").trim();
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
