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

test("AC3 fresh visit label, heading, and single row without trash", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#scenario")).toHaveAttribute(
    "aria-label",
    "$4,853 - 600K | 5% down | 7.375% | 30 years | fixed",
  );
  await expect(page.locator("#price")).toHaveValue("600");
  expect(await headingText(page)).toBe("600K | 5% down | 7.375% fixed = $4,853 / month");
  await expect(page.getByLabel("Prevailing monthly payment")).toHaveText("$4,853");
  const payment = page.locator("span.complete-payment");
  const bar = page.locator(".prevailing-bar--heading");
  await expect(bar).toHaveAttribute(
    "aria-label",
    "Principal and interest $3,936.85, taxes and insurance $916.25, prevailing extra $0.00",
  );
  await expect(payment.locator(".prevailing-bar")).toHaveCount(0);
  await expect(bar).toHaveCSS("column-gap", "1px");
  const segments = bar.locator(".prevailing-segment");
  await expect(segments).toHaveCount(2);
  await expect(segments.nth(0)).toHaveCSS("background-color", "rgb(27, 122, 77)");
  await expect(segments.nth(1)).toHaveCSS("background-color", "rgb(42, 67, 101)");
  await expect(bar.locator(".prevailing-pe")).toHaveCount(0);
  const legend = page.locator(".prevailing-legend");
  await expect(legend).toHaveText(/PI.*TI.*PE/);
  await expect(page.locator(".heading-line").locator(".prevailing-legend")).toHaveCount(0);
  await page.locator("summary", { hasText: "Monthly payment and closing costs" }).click();
  await expect(page.locator("[data-line='prevailing-principal-and-interest']")).toContainText("$3,936.85");
  await expect(page.locator("[data-line='prevailing-extra']")).toContainText("$0.00");
  await expect(page.locator("[data-line='prevailing-monthly-total']")).toContainText("$4,853.10");
  await expect(page.locator(".scenario-trash")).toHaveCount(0);
});

test("AC4 New scenario, switch, reload, and outside close", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.locator("#scenario").click();
  await page.getByRole("button", { name: "New scenario" }).click();
  await expect(page.locator("#scenario")).toHaveAttribute(
    "aria-label",
    "$4,853 - 600K | 5% down | 7.375% | 30 years | fixed",
  );
  await expect(page.locator("#start")).toHaveAttribute("data-value", "2026-10");
  await page.locator("#scenario").click();
  await expect(page.locator(".scenario-row-button[aria-current='true']")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.locator(".scenario-row-button").first().click();
  await page.locator("#price").fill("abc");
  await page.locator("#scenario").click();
  await page.locator(".scenario-row-button").first().click();
  await expect(page.locator("#price")).toHaveValue("600");
  await page.keyboard.press("Escape");
  await page.locator("h1").click();
  await expect(page.getByRole("dialog", { name: "Loan scenarios" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#scenario")).toHaveAttribute("aria-label", /600K/);
});

test("AC5 trash hover, confirm, and remove to one row", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  for (let count = 0; count < 2; count += 1) {
    await page.locator("#scenario").click();
    await page.getByRole("button", { name: "New scenario" }).click();
  }
  await page.locator("#scenario").click();
  await page.mouse.move(0, 0);
  const inactiveTrash = page.locator(".scenario-list-item").first().locator(".scenario-trash");
  await expect(inactiveTrash).toHaveCSS("opacity", "0");
  await page.locator(".scenario-list-item").first().hover();
  await expect(inactiveTrash).toHaveCSS("opacity", "1");
  await inactiveTrash.click();
  await expect(page.getByRole("dialog", { name: /Remove scenario 1/ })).toHaveAttribute(
    "aria-modal",
    "true",
  );
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.locator("#scenario").click();
  await expect(page.getByRole("dialog", { name: /Remove scenario 1/ })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await inactiveTrash.click();
  await page
    .getByRole("dialog", { name: /Remove scenario 1/ })
    .getByRole("button", { name: "Remove" })
    .click();
  await page.locator("#scenario").click();
  await expect(page.locator(".scenario-list-item")).toHaveCount(2);
  await page.locator(".scenario-trash").first().click();
  await page
    .getByRole("dialog", { name: /Remove scenario 1/ })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(page.locator(".scenario-trash")).toHaveCount(0);
  await expect(page.locator("#scenario")).toBeFocused();
});

test("AC6 export, import, bad files, and error clearing", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.locator("#scenario").click();
  await page.getByRole("button", { name: "New scenario" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const file = await downloadPromise;
  expect(file.suggestedFilename()).toBe("compound-loan-scenarios.json");
  const path = await file.path();
  expect(path).toBeTruthy();
  await page.locator("#price").fill("700");
  await page.locator("#price").blur();
  await page.getByRole("button", { name: "Import" }).click();
  await page.locator('input[type="file"]').setInputFiles(path!);
  await expect(page.locator("#price")).toHaveValue("600");
  await page.reload();
  await expect(page.locator("#scenario")).toHaveAttribute("aria-label", /600K/);
  await page.getByRole("button", { name: "Import" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await expect(page.getByText("This file is not a saved set of loan scenarios.")).toBeVisible();
  await page.getByRole("button", { name: "Import" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await page.locator('input[type="file"]').setInputFiles(path!);
  await expect(page.getByText("This file is not a saved set of loan scenarios.")).toHaveCount(0);
});

test("AC7 prevailing heading after Apply patterns", async ({ page }) => {
  await openExample(page);
  await applyMonthly(page, "100");
  await expect(page.getByLabel("Prevailing monthly payment")).toHaveText("$4,953");
  await expect(page.locator("#scenario")).toHaveAttribute("aria-label", /^\$4,953/);
  await page.locator("summary", { hasText: "Monthly payment and closing costs" }).click();
  await expect(page.locator("[data-line='prevailing-extra']")).toContainText("$100.00");
  await expect(page.locator("[data-line='prevailing-monthly-total']")).toContainText("$4,953.10");
  const gold = page.locator(".prevailing-bar--heading .prevailing-pe");
  await expect(gold).toHaveCSS("background-color", "rgb(138, 98, 24)");
  await expect(gold).toHaveCSS("flex-grow", "10000");
  await page.locator("#extra-monthly").fill("");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "Expand all years" }).click();
  for (let month = 1; month <= 12; month += 1) {
    await extra(page, month).fill("100");
    await extra(page, month).press("Enter");
  }
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByLabel("Prevailing monthly payment")).toHaveText("$4,853");
  await expect(page.locator("[data-line='prevailing-extra']")).toContainText("$0.00");
  await expect(page.locator(".prevailing-bar--heading .prevailing-pe")).toHaveCount(0);
  await extra(page, 1).fill("250");
  await extra(page, 1).press("Enter");
  await expect(page.getByLabel("Prevailing monthly payment")).toHaveText("$4,853");
});

test("AC10 version-1 legacy loads and writes v2 on edit", async ({ page }) => {
  await page.addInitScript(() => {
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
    localStorage.removeItem("compound-amortization-v2");
  });
  await page.goto("/");
  await expect(page.locator("#price")).toHaveValue("570");
  const legacyBefore = await page.evaluate(() => localStorage.getItem("compound-amortization-v1"));
  expect(legacyBefore).toContain('"version":1');
  await page.locator("#rate").fill("7.01");
  await page.locator("#rate").blur();
  const legacyAfter = await page.evaluate(() => localStorage.getItem("compound-amortization-v1"));
  const setAfter = await page.evaluate(() => localStorage.getItem("compound-amortization-v2"));
  expect(legacyAfter).toContain('"version":1');
  expect(setAfter).toContain('"version":2');
  expect(JSON.parse(setAfter ?? "{}").scenarios[0].price).toBe("570000");
});

test("AC9 schedule Prevailing extra column", async ({ page }) => {
  await openExample(page);
  await applyMonthly(page, "100");
  const headers = page.locator("thead th");
  await expect(headers).toHaveCount(9);
  const interestIndex = await headers.evaluateAll((cells) =>
    cells.findIndex((cell) => cell.textContent === "Interest"),
  );
  const prevailingIndex = await headers.evaluateAll((cells) =>
    cells.findIndex((cell) => cell.textContent === "Prevailing extra"),
  );
  const extraIndex = await headers.evaluateAll((cells) =>
    cells.findIndex((cell) => cell.textContent === "Extra payment"),
  );
  expect(prevailingIndex).toBe(interestIndex + 1);
  const monthRow = page.getByRole("row", { name: /Nov 2026/ });
  await expect(monthRow.getByRole("cell").nth(4)).toHaveText("$100.00");
  await page.getByRole("button", { name: "Expand all years" }).click();
  const yearCell = page.locator("tbody[data-year='2026'] tr.year-row td").nth(4);
  await expect(yearCell).toHaveText("");
});

test("AC13 save failure alert and rollback", async ({ page }) => {
  await page.addInitScript(() => {
    const storage = window as Window & { __blockLegacySave?: boolean };
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "compound-amortization-v1" && storage.__blockLegacySave) {
        throw new Error("blocked");
      }
      return original.call(this, key, value);
    };
  });
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.locator("#scenario").click();
  await page.getByRole("button", { name: "New scenario" }).click();
  await page.evaluate(() => {
    (window as Window & { __blockLegacySave?: boolean }).__blockLegacySave = true;
  });
  await page.locator("#scenario").click();
  await page.locator(".scenario-row-button").first().click();
  await expect(page.getByRole("alert")).toContainText("Could not save this loan.");
  await page.locator("#scenario").click();
  await page.getByRole("button", { name: "New scenario" }).click();
  await expect(page.getByRole("alert")).toContainText("Could not save this loan.");
  await page.evaluate(() => {
    (window as Window & { __blockLegacySave?: boolean }).__blockLegacySave = false;
  });
  await page.locator("#rate").fill("7.4");
  await page.locator("#rate").blur();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

async function openExample(page: Page) {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await setStartMonth(page, 2026, 10);
  await page.locator("#price").fill("600");
  await page.locator("#down").fill("5");
  await page.locator("#years").fill("30");
  await page.locator("#rate").fill("7.375");
}

async function applyMonthly(page: Page, amount: string) {
  const summary = page.locator("summary", { hasText: "Make extra payments" });
  if ((await summary.getAttribute("aria-expanded")) !== "true") await summary.click();
  await page.locator("#extra-monthly").fill(amount);
  await page.getByRole("button", { name: "Apply" }).click();
}

function extra(page: Page, month: number) {
  return page.locator(`[aria-label="Extra payment for month ${month}"]`);
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
