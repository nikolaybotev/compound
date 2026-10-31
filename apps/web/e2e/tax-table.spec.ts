import { expect, test, type BrowserContext } from "@playwright/test";
import { configuredOrigin, SET_KEY } from "./configured";

const leaks = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC7 Tax table after the schedule", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#price")).toHaveValue("600");

  const order = await page.locator("main").evaluate((main) => {
    const tags: string[] = [];
    for (const child of main.children) {
      if (child.matches("details")) {
        tags.push(child.querySelector("summary")?.textContent?.trim() ?? "details");
      } else if (child.matches("section.schedule")) {
        tags.push("Schedule");
      }
    }
    return tags;
  });
  expect(order.indexOf("Tax table")).toBe(order.indexOf("Schedule") + 1);

  const tax = page.locator("details.tax-table");
  await expect(tax).toHaveCount(1);
  expect(await tax.evaluate((element) => element.closest("section.schedule") !== null)).toBe(false);
  await expect(page.locator("section.schedule").getByRole("columnheader", { name: "Tax year" })).toHaveCount(0);
  await expect(page.locator("section.schedule")).not.toContainText("Interest paid in 2026");
  await expect(page.locator("section.schedule")).not.toContainText("PMI");

  const summary = page.locator("summary", { hasText: "Tax table" });
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  await summary.click();
  await expect(tax.locator(".tax-interest")).toHaveText("Interest paid in 2026: $7,123.03.");
  await expect(tax).toContainText("Homeowners insurance, principal, and the escrow cushion are not deductible.");
  await expect(tax).toContainText(
    "Unverified. The 2026 Publication 936 is an IRS draft. The reduction is shown as 10 percentage points per $1,000 of AGI, or part of $1,000, over $100,000 ($50,000 if married filing separately), and none above $109,000 ($54,500 if married filing separately).",
  );
  await expect(tax).toContainText(
    "This is not tax advice. It applies the figures named here to this loan. It does not prepare a return.",
  );
  await expect(tax).toContainText(
    "An overall limit on itemized deductions (§70111) begins in 2026. Who it affects is not verified here, and this table does not apply it.",
  );
  await expect(tax).toContainText("2026 figure; later years are not published here");
  await expect(tax).toContainText(
    "The 2026 cap is $40,400 ($20,200 if married filing separately). Later caps through 2029 are this page's 1% steps, rounded half up to the dollar, not a figure copied from a published table. The cap shown for 2030 and after is $10,000 ($5,000 if married filing separately).",
  );
  await expect(tax).toContainText(
    "Which payment is the last one that includes mortgage insurance is servicer practice and is not verified. This column includes the automatic-termination payment.",
  );
  await expect(tax).toContainText("Midpoint backstop (this page's reading): November 1, 2041.");
  await expect(tax).not.toContainText("With extra principal");
  await expect(tax).toContainText("Enter AGI to apply the phaseout.");
  await expect(tax).toContainText("Enter AGI to apply the phase-down.");
  await expect(tax.locator("tr[data-tax-year='2026']")).toContainText("$16,100.00");
  await expect(tax.locator("tr[data-tax-year='2026']")).not.toContainText("2026 figure; later years are not published here");
  await expect(tax.locator("tr[data-tax-year='2027']")).toContainText("2026 figure; later years are not published here");
  await expect(page.locator("#tax-filing-status")).toHaveValue("single");
  await expect(page.locator("#tax-agi")).toHaveValue("");
  await expect(page.locator("#tax-appraisal")).toHaveValue("");
  await expect(page.locator("#picture-appraisal")).toHaveCount(0);

  await page.locator("#tax-other-salt").fill("100000");
  await expect(tax.locator("tr[data-tax-year='2026']")).toContainText("$40,400.00");
  await expect(tax.locator("tr[data-tax-year='2027']")).toContainText("$40,804.00");
  await expect(tax.locator("tr[data-tax-year='2030']")).toContainText("$10,000.00");
  await page.locator("#tax-filing-status").selectOption("separate");
  await expect(tax.locator("tr[data-tax-year='2026']")).toContainText("$20,200.00");
  await expect(tax.locator("tr[data-tax-year='2030']")).toContainText("$5,000.00");
  await page.locator("#tax-filing-status").selectOption("joint");
  await expect(tax.locator("tr[data-tax-year='2026']")).toContainText("$32,200.00");
  await page.locator("#tax-filing-status").selectOption("single");

  await page.locator("#tax-agi").fill("600000");
  await expect(tax).not.toContainText("Enter AGI to apply the phaseout.");
  await expect(tax.locator("tr[data-tax-year='2026']")).toContainText("$11,900.00");
  await page.locator("#tax-agi").fill("nope");
  await expect(tax.getByRole("alert")).toContainText(
    "AGI must be a dollar amount greater than or equal to zero, with at most two decimal places, or empty.",
  );
  await expect(tax.locator("tr[data-tax-year='2026']")).toContainText("$11,900.00");
  await page.locator("#tax-agi").fill("");
  await expect(tax).toContainText("Enter AGI to apply the phaseout.");
  await expect(tax.locator("tr[data-tax-year='2026']")).toContainText("$40,400.00");

  await page.reload();
  await expect(page.locator("summary", { hasText: "Tax table" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#tax-filing-status")).toHaveValue("single");
  await expect(page.locator("#tax-other-salt")).toHaveValue("100000");
  await expect(page.locator("#tax-agi")).toHaveValue("");
  const stored = await page.evaluate((setKey) =>
    JSON.parse(localStorage.getItem(setKey) ?? "{}"),
  SET_KEY);
  expect(stored.version).toBe(2);
  expect(stored.scenarios[0].price).toBe("600000");
  expect(stored.scenarios[0].picture.taxOpen).toBe(true);
  expect(stored.scenarios[0].picture.filingStatus).toBe("single");
  expect(stored.scenarios[0].picture.otherSalt).toBe("100000");
  expect(stored.scenarios[0].picture.agi).toBe("");
});

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
