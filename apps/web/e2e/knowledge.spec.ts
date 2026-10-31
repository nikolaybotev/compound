import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { configuredOrigin } from "./configured";

const leaks = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("wide screens open the side panel on the same page", async ({ page }) => {
  await openFresh(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  const url = page.url();
  await page.getByRole("button", { name: "Knowledge", exact: true }).click();
  const panel = page.locator("#knowledge");
  await expect(panel).toHaveAttribute("data-presentation", "side");
  await expect(panel).toHaveAttribute("role", "complementary");
  await expect(panel.getByRole("heading", { name: "ARM knowledge base" })).toBeVisible();
  await expect(page.locator("#price")).toHaveValue("600");
  expect(page.url()).toBe(url);

  await panel.getByRole("button", { name: "ARM types" }).click();
  await expect(panel.getByRole("heading", { name: "Types" })).toBeVisible();
  await expect(panel).toContainText("Traditional ARM");
  await expect(panel).toContainText("Hybrid ARM");
  await expect(panel).toContainText("$600,000");
  await expect(panel).toContainText("$3,936.85");
  await expect(panel).not.toContainText("How to answer");
  expect(page.url()).toBe(url);
  await page.locator("#price").click();
  await expect(page.locator("#price")).toBeFocused();
  await expect(panel).toBeVisible();

  await panel.getByRole("button", { name: "Close knowledge" }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Knowledge", exact: true })).toBeFocused();
});

test("terms open the knowledge-base entries without leaving the loan", async ({ page }) => {
  await openFresh(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  const url = page.url();

  await page.getByRole("button", { name: "Extra principal paid" }).click();
  const panel = page.locator("#knowledge");
  await expect(panel).toContainText("I have the right to make payments of Principal");
  await expect(panel).toContainText("partial Prepayment");
  expect(page.url()).toBe(url);

  await page.locator("summary", { hasText: "Moving in" }).click();
  await page.getByRole("button", { name: "Closing Disclosure" }).click();
  await expect(panel.getByRole("heading", { name: /Closing Disclosure vs/ })).toBeVisible();
  await expect(panel).toContainText("deed of trust");
  await expect(panel).toContainText("ARM rider");
  const citation = panel.locator('a[href*="ecfr.gov"]').first();
  await expect(citation).toHaveAttribute("target", "_blank");
  expect(page.url()).toBe(url);

  await page.getByRole("button", { name: "Grace days" }).click();
  await expect(panel).toContainText("Acceleration");
  await expect(panel).toContainText("Due-on-sale");

  await page.locator("#product").selectOption("arm");
  await page.getByRole("button", { name: "Initial period" }).click();
  await expect(panel).toContainText("adjustment period");
  await panel.getByRole("button", { name: "Back" }).click();
  await panel.getByRole("button", { name: "Part A. How an ARM's rate works" }).click();
  await expect(panel).toContainText("payment shock");
  await expect(panel).toContainText("discounted");
  await expect(page.locator("#price")).toHaveValue("600");
  expect(page.url()).toBe(url);
});

test("phones open a bottom sheet and leave the loan visible", async ({ page }) => {
  await openFresh(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const url = page.url();
  await page.getByRole("button", { name: "Knowledge", exact: true }).click();
  const panel = page.locator("#knowledge");
  await expect(panel).toHaveAttribute("data-presentation", "sheet");
  await expect(panel).toHaveAttribute("role", "dialog");
  await expect(panel).toHaveAttribute("aria-modal", "true");
  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error("missing box");
  expect(box.y).toBeGreaterThan(viewport.height * 0.2);
  expect(box.y + box.height).toBeGreaterThan(viewport.height * 0.95);
  expect(box.width).toBeGreaterThan(viewport.width * 0.9);
  await expect(page.locator("#price")).toBeVisible();
  await expect(page.locator("#price")).toHaveValue("600");
  expect(page.url()).toBe(url);
  const focusInside = await page.evaluate(() => {
    const root = document.getElementById("knowledge");
    return root?.contains(document.activeElement) ?? false;
  });
  expect(focusInside).toBe(true);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(page.locator("#price")).toHaveValue("600");
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
