import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { configuredOrigin, LEGACY_KEY, SET_KEY } from "./configured";
import { setStartMonth } from "./start-month";
import { headingText } from "./heading";

const leaks = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC3 fresh Conventional taxes disclosure", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#price")).toHaveValue("600");
  await expect(page.locator("#down")).toHaveValue("5");
  await expect(page.locator("#rate")).toHaveValue("7.375");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,853.10");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$570,000.00");

  const taxes = page.locator("summary", { hasText: "Taxes and Insurance" });
  const extras = page.locator("summary", { hasText: "Extra Payments" });
  const closing = page.locator("summary", { hasText: "Closing Costs" });
  await expect(taxes).toHaveAttribute("aria-expanded", "false");
  await expect(extras).toHaveAttribute("aria-expanded", "false");
  await expect(closing).toHaveAttribute("aria-expanded", "false");

  await taxes.click();
  const picture = page.locator("details.picture");
  await expect(picture.locator("[data-line='property-tax']")).toContainText("$575.00");
  await expect(picture.locator("[data-line='property-tax']")).toContainText(
    "Nashua: 1.683%; Brentwood: 1.32%.",
  );
  await expect(picture.locator("[data-line='insurance']")).toContainText("$175.00");
  await expect(picture.locator("[data-line='pmi']")).toContainText("$166.25");
  await expect(picture.locator("[data-line='subtotal']")).toContainText("Subtotal");
  await expect(picture.locator("[data-line='subtotal']")).toContainText("$916.25");
  const lines = await picture.locator("tbody tr").evaluateAll((rows) =>
    rows.map((row) => row.getAttribute("data-line")),
  );
  expect(lines.at(-1)).toBe("subtotal");
  await expect(picture.locator("#picture-pmi")).toHaveValue("0.35");
  await expect(picture.locator("[data-line='pmi']")).not.toContainText("between");
  await expect(page.locator(".loan-type")).toHaveCount(0);
  await expect(page.getByText("FHA MIP")).toHaveCount(0);
  await expect(page.getByText("Upfront MIP")).toHaveCount(0);
});

test("AC4 section order on a fresh visit", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  const order = await page.locator("main").evaluate((main) => {
    const tags: string[] = [];
    for (const child of main.children) {
      if (child.matches("details")) {
        const summary = child.querySelector("summary");
        tags.push(summary?.textContent?.trim() ?? "details");
      } else if (child.matches("section.summary")) {
        tags.push("Loan summary");
      } else if (child.matches(".chart")) {
        tags.push("Chart");
      } else if (child.classList.contains("heading-line")) {
        tags.push("Heading");
      }
    }
    return tags;
  });
  const taxesIndex = order.indexOf("Taxes and Insurance");
  const extraIndex = order.indexOf("Extra Payments");
  const summaryIndex = order.indexOf("Loan summary");
  const closingIndex = order.indexOf("Closing Costs");
  expect(taxesIndex).toBeGreaterThan(order.indexOf("Heading"));
  expect(extraIndex).toBe(taxesIndex + 1);
  expect(summaryIndex).toBe(extraIndex + 1);
  expect(closingIndex).toBeGreaterThan(summaryIndex);
  await expect(page.locator("summary", { hasText: "Monthly payment and closing costs" })).toHaveCount(0);
});

test("AC4 down payment clears PMI", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.locator("summary", { hasText: "Taxes and Insurance" }).click();
  await page.locator("#down").fill("20");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$480,000.00");
  await expect(page.locator("[data-line='pmi']")).toContainText("$0.00");
  await expect(page.locator("#picture-pmi")).toHaveValue("0");
  await expect(page.locator("[data-line='subtotal']")).toContainText("$750.00");
});

test("AC5 fresh Closing Costs dollars and basis switch", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("summary", { hasText: "Closing Costs" }).click();
  const closing = page.locator("details.picture-closing");
  await expect(page.locator("#picture-lender-fees")).toHaveValue("3000");
  await expect(closing.locator("[data-line='lender-fees']")).toContainText("$3,000.00");
  await expect(page.locator("#picture-title-preset")).toHaveValue("50/50");
  await expect(page.locator("#picture-title")).toHaveValue("0.75");
  await expect(closing.locator("[data-line='title']")).toContainText("$4,500.00");
  await expect(page.locator("#picture-closing-day")).toHaveValue("1");
  await expect(closing.locator("[data-line='prepaid-interest']")).toContainText("October 2026");
  await expect(closing.locator("[data-line='prepaid-interest']")).toContainText("31 days");
  await expect(page.locator("#picture-interest-basis")).toHaveValue("360");
  await expect(closing.locator("[data-line='prepaid-interest']")).toContainText("$3,619.90");
  await expect(closing.locator("[data-line='homeowners-insurance']")).toContainText("$2,100.00");
  await expect(closing.locator("[data-line='homeowners-insurance']")).toContainText("12 months");
  await expect(closing.locator("[data-line='tax-impound']")).toContainText("$3,450.00");
  await expect(closing.locator("[data-line='insurance-impound']")).toContainText("$525.00");
  await expect(closing.locator("[data-line='mi-impound']")).toContainText("$332.50");
  await expect(page.locator("#picture-proration")).toHaveValue("575");
  await expect(closing.locator("[data-line='proration']")).toContainText("$575.00");
  await expect(closing.locator("[data-line='closing']")).toContainText("$18,102.40");
  await expect(page.locator("#picture-points")).toHaveValue("0");
  await expect(closing.locator("[data-line='points']")).toContainText("$0.00");
  await expect(closing.locator("[data-line='closing-and-points']")).toContainText("$18,102.40");
  await expect(closing.locator("[data-line='cash-to-close']")).toContainText("$48,102.40");
  await expect(closing.locator("[data-line='due-at-closing']")).toContainText("$48,102.40");
  await expect(page.locator("#picture-origination")).toHaveCount(0);
  await expect(page.locator("#picture-processing")).toHaveCount(0);
  await expect(page.locator("#picture-appraisal")).toHaveCount(0);
  await expect(page.locator("#picture-recording")).toHaveCount(0);
  await expect(page.locator("#picture-interest-days")).toHaveCount(0);
  await expect(page.locator("#picture-cushion")).toHaveCount(0);

  await page.locator("#picture-interest-basis").selectOption("365");
  await expect(closing.locator("[data-line='prepaid-interest']")).toContainText("$3,570.27");
  await expect(closing.locator("[data-line='closing']")).toContainText("$18,052.77");
  await expect(closing.locator("[data-line='cash-to-close']")).toContainText("$48,052.77");
  await page.locator("#picture-interest-basis").selectOption("360");
  await expect(closing.locator("[data-line='prepaid-interest']")).toContainText("$3,619.90");
  await expect(closing.locator("[data-line='closing']")).toContainText("$18,102.40");
  await expect(closing.locator("[data-line='cash-to-close']")).toContainText("$48,102.40");
});

test("AC6 presets, closing calendar, and 20% down MI impound", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("summary", { hasText: "Closing Costs" }).click();
  const closing = page.locator("details.picture-closing");
  await page.locator("#picture-title-preset").selectOption("Buyer pays all");
  await expect(page.locator("#picture-title")).toHaveValue("1");
  await expect(closing.locator("[data-line='title']")).toContainText("$6,000.00");
  await page.locator("#picture-title-preset").selectOption("Seller pays the owner's policy and escrow");
  await expect(page.locator("#picture-title")).toHaveValue("0.40");
  await expect(closing.locator("[data-line='title']")).toContainText("$2,400.00");
  await page.locator("#picture-title-preset").selectOption("50/50");
  await expect(page.locator("#picture-title")).toHaveValue("0.75");
  await expect(closing.locator("[data-line='title']")).toContainText("$4,500.00");
  await page.locator("#picture-title").fill("0.64925");
  await page.locator("#picture-title").press("Tab");
  await expect(page.locator("#picture-title-preset")).toHaveValue("");
  await expect(closing.locator("[data-line='title']")).toContainText("$3,895.50");

  await setStartMonth(page, 2026, 11);
  await expect(closing.locator("[data-line='prepaid-interest']")).toContainText("November 2026");
  await page.locator("#picture-closing-day").fill("6");
  await page.locator("#picture-closing-day").press("Tab");
  await expect(closing.locator("[data-line='prepaid-interest']")).toContainText("25 days");
  await page.locator("#picture-closing-day").fill("31");
  await page.locator("#picture-closing-day").press("Tab");
  await expect(page.locator("#picture-closing-day")).toHaveValue("30");
  await expect(closing.locator("[data-line='prepaid-interest']")).toContainText("1 day");

  await page.locator("#down").fill("20");
  await expect(closing.locator("[data-line='mi-impound']")).toContainText("$0.00");
  await expect(page.locator("#picture-mi-impound-months")).toHaveValue("2");
});

test("AC7 seller credit warning and picture migration", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("summary", { hasText: "Closing Costs" }).click();
  const note =
    "The usual conventional cap is 3% of the lower of price or appraisal. This check uses price because there is no appraisal.";
  await page.locator("#picture-seller-credit").fill("18000.01");
  await page.locator("#picture-seller-credit").press("Tab");
  await expect(page.locator(".picture-closing .note")).toContainText(note);
  await page.locator("#picture-seller-credit").fill("18000");
  await page.locator("#picture-seller-credit").press("Tab");
  await expect(page.locator(".picture-closing .note")).toHaveCount(0);
  await page.locator("#down").fill("10");
  await page.locator("#picture-seller-credit").fill("100000");
  await page.locator("#picture-seller-credit").press("Tab");
  await expect(page.locator(".picture-closing .note")).toHaveCount(0);
  await page.locator("#down").fill("5");

  await page.evaluate((legacyKey) => {
    localStorage.setItem(
      legacyKey,
      JSON.stringify({
        version: 1,
        price: "570000",
        down: "0",
        years: "30",
        rate: "7",
        start: "2026-10",
      }),
    );
  }, LEGACY_KEY);
  await page.reload();
  await page.locator("summary", { hasText: "Closing Costs" }).click();
  await expect(page.locator("#picture-lender-fees")).toHaveValue("3000");
  await expect(page.locator("#picture-title")).toHaveValue("0.75");
  await expect(page.locator("#picture-origination")).toHaveCount(0);

  await page.getByRole("button", { name: "Import" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "compound-loan-scenarios.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        active: 0,
        scenarios: [
          {
            price: "600000",
            down: "5",
            years: "30",
            rate: "7.375",
            start: "2026-10",
            fico: "780",
            extras: [],
            applied: [],
            prefill: {
              monthly: "",
              yearly: "",
              month: 1,
              open: false,
              level: false,
              appliedLevel: false,
            },
            openYears: null,
            picture: { origination: "1", processing: "1200", title: "0.5" },
          },
        ],
      }),
    ),
  });
  await page.locator("summary", { hasText: "Closing Costs" }).click();
  await expect(page.locator("#picture-lender-fees")).toHaveValue("6900");
  await expect(page.locator("#picture-title")).toHaveValue("0.5");
  await expect(page.locator("#picture-closing-day")).toHaveValue("1");
});

test("AC5 summaries have no border and a picture edit survives Apply", async ({ page }) => {
  await page.goto("/");
  for (const title of ["Extra Payments", "Taxes and Insurance", "Closing Costs"]) {
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

  const extras = page.locator("summary", { hasText: "Extra Payments" });
  if ((await extras.getAttribute("aria-expanded")) !== "true") await extras.click();
  await page.locator("#extra-monthly").fill("100");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(extra(page, 1)).toHaveValue("100.00");

  await page.locator("summary", { hasText: "Taxes and Insurance" }).click();
  await page.locator("#picture-tax").fill("2");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.locator("#picture-tax")).toHaveValue("2");
});

test("AC6 a saved version-1 loan keeps its payment and shows thousands", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.evaluate((legacyKey) => {
    localStorage.setItem(
      legacyKey,
      JSON.stringify({
        version: 1,
        price: "570000",
        down: "0",
        years: "30",
        rate: "7",
        start: "2026-10",
      }),
    );
  }, LEGACY_KEY);
  await page.reload();
  await expect(page.locator("#price")).toHaveValue("570");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$570,000.00");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,718.47");
  const taxesSummary = page.locator("summary", { hasText: "Taxes and Insurance" });
  await expect(taxesSummary).toHaveAttribute("aria-expanded", "false");
  await taxesSummary.click();
  await expect(page.locator("#picture-tax")).toHaveValue("1.15");
  await expect(page.locator("#picture-insurance")).toHaveValue("0.35");
  await expect(page.locator("#picture-pmi")).toHaveValue("0.45");
  await page.locator("summary", { hasText: "Closing Costs" }).click();
  await expect(page.locator("#picture-lender-fees")).toHaveValue("3000");
  await expect(page.locator("#picture-title")).toHaveValue("0.75");
});

test("AC11 FICO range and PMI ladder", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.locator("summary", { hasText: "Taxes and Insurance" }).click();
  await page.locator("#fico").selectOption("740");
  await expect(page.locator("#fico option:checked")).toHaveText("740–779");
  expect(await headingText(page)).toContain("740–779");
  expect(await headingText(page)).not.toContain("FICO");
  await expect(page.locator("#picture-pmi")).toHaveValue("0.53");

  await page.locator("#fico").selectOption("780");
  await expect(page.locator("#picture-pmi")).toHaveValue("0.35");

  await page.locator("#fico").selectOption("620");
  await expect(page.locator("#picture-pmi")).toHaveValue("1.42");

  await page.locator("#fico").selectOption("740");
  await page.locator("#picture-pmi").fill("0.5");
  await page.evaluate(({ legacyKey, setKey }) => {
    const legacy = JSON.parse(localStorage.getItem(legacyKey) ?? "{}");
    legacy.fico = "770";
    localStorage.setItem(legacyKey, JSON.stringify(legacy));
    const setRaw = localStorage.getItem(setKey);
    if (setRaw) {
      const set = JSON.parse(setRaw);
      set.scenarios[set.active].fico = "770";
      localStorage.setItem(setKey, JSON.stringify(set));
    }
  }, { legacyKey: LEGACY_KEY, setKey: SET_KEY });
  await page.reload();
  await expect(page.locator("#fico")).toHaveValue("740");
  await expect(page.locator("#fico option:checked")).toHaveText("740–779");
  await expect(page.locator("#picture-pmi")).toHaveValue("0.5");
  await page.locator("#fico").selectOption("740");
  await expect(page.locator("#picture-pmi")).toHaveValue("0.5");

  await page.locator("#down").fill("6");
  await expect(page.locator("#picture-pmi")).toHaveValue("0.53");
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
