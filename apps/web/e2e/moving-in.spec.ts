import { expect, test, type BrowserContext } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const leaks = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ context }) => {
  await blockForeignHosts(context);
});

test.afterEach(({ context }) => {
  expect(leaks.get(context) ?? []).toEqual([]);
});

test("AC5 Moving in on the fresh loan", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#price")).toHaveValue("600");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$570,000.00");

  const order = await page.locator("main").evaluate((main) => {
    const tags: string[] = [];
    for (const child of main.children) {
      if (child.matches("details")) {
        tags.push(child.querySelector("summary")?.textContent?.trim() ?? "details");
      } else if (child.matches("section.summary")) {
        tags.push("Loan summary");
      } else if (child.matches(".chart")) {
        tags.push("Chart");
      } else if (child.matches("section.schedule")) {
        tags.push("Schedule");
      }
    }
    return tags;
  });
  const closing = order.indexOf("Closing Costs");
  const movingIndex = order.indexOf("Moving in");
  expect(order.indexOf("Taxes and Insurance")).toBeLessThan(order.indexOf("Extra Payments"));
  expect(order.indexOf("Extra Payments")).toBeLessThan(order.indexOf("Loan summary"));
  expect(order.indexOf("Loan summary")).toBeLessThan(order.indexOf("Chart"));
  expect(order.indexOf("Chart")).toBeLessThan(closing);
  expect(movingIndex).toBe(closing + 1);
  expect(order.indexOf("Schedule")).toBe(movingIndex + 1);

  const summary = page.locator("summary", { hasText: "Moving in" });
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  await summary.click();
  const moving = page.locator("details.moving-in");
  await expect(moving.getByText("Funding date Thursday, October 1, 2026. Interest starts this day.")).toBeVisible();
  await expect(
    moving.getByText(
      "Prepaid interest 31 days, $3,619.90, 360-day basis. These days are paid at closing, not on the schedule.",
    ),
  ).toBeVisible();
  await expect(
    moving.getByText(
      "No mortgage payment is due in November 2026. Payments are made in arrears: the December 1, 2026 payment covers November 2026.",
    ),
  ).toBeVisible();
  await expect(
    moving.getByText(
      "First payment due December 1, 2026. Principal and interest is $3,936.85. Property tax, home insurance, and mortgage insurance are on top of that amount.",
    ),
  ).toBeVisible();
  await expect(moving.getByText(/A late charge of 5% of principal and interest/)).toBeVisible();
  await expect(moving.getByText(/end of day 15 after the due date/)).toBeVisible();
  await expect(page.locator("#moving-grace-days")).toHaveValue("15");
  await expect(page.locator("#moving-late-charge")).toHaveValue("5");
  await expect(
    moving.getByText(
      "The Closing Disclosure has to be received at least three business days before you sign. Sundays and federal legal public holidays are not business days for this count. A mailed disclosure is presumed received three business days after it is mailed.",
    ),
  ).toBeVisible();
  const signing = page.locator("#moving-signing-date");
  await expect(signing).toHaveAttribute("type", "date");
  await expect(signing).toHaveValue("");
  await expect(page.locator("#moving-last-rent")).toHaveAttribute("type", "date");
  await expect(page.locator("#moving-last-rent")).toHaveValue("");
  await expect(page.locator('input[type="month"]')).toHaveCount(0);
  await expect(
    moving.getByText("The note makes the first payment due even if a statement has not arrived."),
  ).toBeVisible();
  await expect(
    moving.getByText(
      "Some lenders credit the first days of a month and set the first payment one month earlier. This page uses the standard rule.",
    ),
  ).toBeVisible();

  await page.reload();
  await expect(page.locator("summary", { hasText: "Moving in" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#moving-signing-date")).toHaveValue("");

  await page.locator("#moving-grace-days").fill("32");
  await expect(page.getByRole("alert")).toContainText("Grace days must be a whole number from 0 through 31.");
  await expect(page.locator("details.moving-in")).toContainText("end of day 15 after the due date");
  await page.locator("#moving-grace-days").fill("15");
  await expect(page.locator("details.moving-in")).toContainText("end of day 15 after the due date");

  await page.locator("#moving-signing-date").fill("2026-11-12");
  await expect(
    page
      .locator("details.moving-in")
      .getByText(
        "For a signing on November 12, 2026, the Closing Disclosure has to be received by November 7, 2026.",
      ),
  ).toBeVisible();
  await expect(page.getByText("at least three business days before you sign")).toHaveCount(0);

  await page.locator("#moving-last-rent").fill("2026-10-15");
  await expect(page.locator("details.moving-in")).toContainText(
    "Last rent October 15, 2026. Rent is paid in advance; the mortgage is paid in arrears. Those days are covered by both the rent and the prepaid interest.",
  );

  await expect(page.getByRole("columnheader", { name: "Date" })).toBeVisible();
  const november = page.getByRole("row", { name: /Nov 2026/ });
  await expect(november).toBeVisible();
  await expect(november).toContainText("1");
  await expect(page.getByRole("region", { name: "Loan amount" })).toContainText("$570,000.00");
  await expect(page.getByRole("region", { name: "Monthly payment" })).toContainText("$4,853");

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("compound-amortization-v2") ?? "{}"),
  );
  expect(stored.version).toBe(2);
  expect(stored.scenarios[0].picture.signingDate).toBe("2026-11-12");
  expect(stored.scenarios[0].picture.graceDays).toBe("15");
  expect(stored.scenarios[0].picture.movingOpen).toBe(true);
  expect(stored.scenarios[0].price).toBe("600000");
});

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
