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

test("AC2 5.5% ARM November 2026 start with no extra", async ({ page }) => {
  await openFresh(page);
  await page.locator("#rate").fill("5.5");
  await page.locator("#product").selectOption("arm");
  await expect(page.locator("[data-line='arm-ceiling']")).toHaveText("Ceiling 10.5% · Floor 2.5%");
  await setStartMonth(page, 2026, 11);
  await expect(page.locator("[data-line='arm-first-adjustment']")).toContainText(
    "new payment first due January 1, 2034",
  );

  const monthly = page.getByRole("region", { name: "Monthly payment" });
  await expect(monthly).toContainText("$4,152.65");
  await expect(monthly).toContainText("$3,236.40 PI");
  const bar = monthly.locator(".summary-prevailing-track");
  await expect(bar).toHaveAttribute(
    "aria-label",
    "Principal and interest $3,236.40, Taxes and insurance $916.25",
  );
  await expect(page.locator("#scenario")).toHaveAttribute(
    "aria-label",
    "1: $4,153 - 600K | 5% down | 5.5% | 30 years | 7/1",
  );
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$4,869.46 from December 2033 · first due January 1, 2034",
  );
});

test("AC3 import S1 scenario with fixed-period extra", async ({ page }) => {
  await openFresh(page);
  const extras: [number, number][] = [];
  for (let month = 1; month <= 84; month += 1) extras.push([month, 823.6]);
  const document = {
    version: 2,
    active: 0,
    scenarios: [
      {
        price: "600000",
        down: "5",
        years: "30",
        rate: "5.5",
        start: "2026-11",
        fico: "780",
        extras,
        applied: extras,
        openYears: null,
        arm: {
          enabled: true,
          open: true,
          fixedYears: "7",
          adjustMonths: "12",
          margin: "2.5",
          initialCap: "5",
          periodicCap: "2",
          lifetimeCap: "5",
          floor: "2.5",
          initialFloor: "2.5",
          roundEighth: false,
          index: [],
          evenYearly: "",
          evenMonth: 1,
        },
      },
    ],
  };

  await page.getByRole("button", { name: "Export and import" }).click();
  await page.getByRole("menuitem", { name: "Import" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "compound-loan-scenarios.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(document)),
  });

  const monthly = page.getByRole("region", { name: "Monthly payment" });
  await expect(monthly).toContainText("$4,976.25");
  await expect(monthly).toContainText("$3,236.40 PI");
  const bar = monthly.locator(".summary-prevailing-track");
  await expect(bar).toHaveAttribute(
    "aria-label",
    "Principal and interest $3,236.40, Taxes and insurance $916.25, Prevailing extra $823.60",
  );
  const piGrow = await monthly.locator(".prevailing-pi").evaluate((el) => el.style.flexGrow);
  expect(piGrow).toBe("323640");
  await expect(page.locator("#scenario")).toHaveAttribute(
    "aria-label",
    "1: $4,976 - 600K | 5% down | 5.5% | 30 years | 7/1",
  );
  await expect(page.getByRole("region", { name: "Highest payment" })).toContainText(
    "$4,060.00 from December 2033",
  );

  await openYear(page, 2026);
  await expect(page.getByRole("row", { name: /Dec 2026/ })).toContainText("$3,236.40");
  await openYear(page, 2033);
  await expect(page.getByRole("row", { name: /Dec 2033/ })).toContainText("$4,060.00");
});

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
