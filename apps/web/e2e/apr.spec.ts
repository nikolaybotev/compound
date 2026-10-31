import { expect, test } from "@playwright/test";
import { setStartMonth } from "./start-month";

test("AC8 summary APR row and ARM blank index", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.getByLabel("Purchase price (thousands)").fill("200");
  await page.locator("#down").fill("20");
  await page.locator("#rate").fill("6.75");
  await setStartMonth(page, 2013, 4);

  await page.locator("summary", { hasText: "Closing Costs" }).click();
  await page.locator("#picture-lender-fees").fill("3000");
  await page.locator("#picture-points").fill("0");
  await page.locator("#picture-closing-day").fill("15");
  await page.locator("#picture-interest-basis").selectOption("360");

  const apr = page.getByRole("region", { name: "Annual percentage rate" });
  await expect(apr.locator("#apr")).toHaveText("6.966%");
  await expect(apr).toContainText("This is not your interest rate.");

  await page.locator("#picture-title").fill("1.00");
  await expect(apr.locator("#apr")).toHaveText("6.966%");

  await page.locator("#picture-lender-fees").fill("0");
  await expect(apr.locator("#apr")).not.toHaveText("6.966%");

  await page.locator("#picture-lender-fees").fill("3000");
  await setStartMonth(page, 2013, 10);
  await page.locator("#picture-closing-day").fill("1");
  await expect(apr.locator("#apr")).not.toHaveText("6.966%");

  await page.locator("#product").selectOption("ARM");
  await expect(apr.locator("#apr")).toHaveText("Enter the current index to calculate the APR.");
  await expect(apr.locator("#apr")).not.toContainText("%");
});
