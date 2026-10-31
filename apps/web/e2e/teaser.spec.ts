import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { configuredOrigin } from "./configured";
import { setStartMonth } from "./start-month";

const leaks = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC3 teaser indicator opens knowledge without changing the loan", async ({ page }) => {
  await openFresh(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator("#teaser")).toHaveCount(0);

  await setStartMonth(page, 2026, 10);
  await page.locator("#product").selectOption("arm");
  await page.locator("#rate").fill("3");
  await page.locator("#arm-margin").fill("2.5");
  const piLine = page.getByRole("region", { name: "Monthly payment" });
  await expect(piLine).toContainText("$2,403.14");
  await page.locator("#arm-current-index").fill("2");
  await expect(piLine).toContainText("$2,403.14");

  const teaser = page.locator("button#teaser");
  await expect(teaser).toBeVisible();
  await expect(teaser).toContainText("teaser");
  await expect(teaser).toContainText("1.5 points below the fully indexed rate of 4.5%");

  await page.getByRole("button", { name: "Expand all years" }).click();
  await expect(page.getByLabel("Index for month 85")).toHaveValue("");

  const url = page.url();
  await teaser.click();
  const panel = page.locator("#knowledge");
  await expect(panel.getByRole("heading", { name: /teaser/i })).toBeVisible();
  await expect(page.locator("#price")).toHaveValue("600");
  expect(page.url()).toBe(url);

  await panel.getByRole("button", { name: "Close knowledge" }).click();
  await expect(panel).toHaveCount(0);
  await expect(teaser).toBeFocused();

  await page.locator("summary", { hasText: "ARM terms" }).click();
  await expect(page.locator("summary", { hasText: "ARM terms" })).toHaveAttribute("aria-expanded", "false");
  await expect(teaser).toBeVisible();
});

test("AC4 teaser edges, invalid index, fixed mode, and round eighth", async ({ page }) => {
  await openFresh(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await setStartMonth(page, 2026, 10);
  await page.locator("#product").selectOption("arm");
  await page.locator("#rate").fill("3");
  await page.locator("#arm-margin").fill("2.5");
  await page.locator("#arm-current-index").fill("2");
  await expect(page.locator("button#teaser")).toContainText("1.5 points below the fully indexed rate of 4.5%");

  await page.locator("#rate").fill("4.5");
  await expect(page.locator("#teaser")).toHaveCount(0);
  await page.locator("#rate").fill("5");
  await expect(page.locator("#teaser")).toHaveCount(0);

  await page.locator("#rate").fill("3");
  await page.locator("#arm-margin").fill("2.5");
  await page.locator("#arm-current-index").fill("2");
  await expect(page.locator("button#teaser")).toContainText("1.5 points below the fully indexed rate of 4.5%");

  await page.locator("#arm-current-index").fill("nope");
  await expect(page.getByRole("alert").filter({ hasText: "Current index must" })).toBeVisible();
  await expect(page.locator("button#teaser")).toContainText("1.5 points below the fully indexed rate of 4.5%");

  await page.locator("#arm-current-index").fill("");
  await expect(page.locator("#teaser")).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: "Current index must" })).toHaveCount(0);

  await page.locator("#arm-current-index").fill("2");
  await expect(page.locator("button#teaser")).toBeVisible();
  await page.locator("#product").selectOption("fixed");
  await expect(page.locator("#teaser")).toHaveCount(0);

  await page.locator("#product").selectOption("arm");
  await page.locator("#arm-round-eighth").check();
  await page.locator("#arm-current-index").fill("2.04");
  await page.locator("#rate").fill("4.5");
  await page.locator("#arm-margin").fill("2.5");
  await expect(page.locator("button#teaser")).toContainText(
    "0.04 points below the fully indexed rate of 4.54%",
  );
});

async function openFresh(page: Page) {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#price")).toHaveValue("600");
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
