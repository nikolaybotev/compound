import { expect, test, type Page } from "@playwright/test";
import { headingText } from "./heading";

function recastSampleAppliedEntries(): [number, number][] {
  const byMonth = new Map<number, number>();
  for (let month = 1; month <= 360; month += 1) {
    byMonth.set(month, 2400);
  }
  for (let month = 5; month <= 360; month += 12) {
    byMonth.set(month, (byMonth.get(month) ?? 0) + 20_000);
  }
  return [...byMonth.entries()];
}

test("AC5 fresh visit heading and term in years", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#years")).toHaveValue("30");
  expect(await headingText(page)).toBe(
    "600K | 5% down | 7.375% 30-year fixed | 780+ | starting October 2026",
  );
  await expect(page.locator("#teaser")).toHaveCount(0);
  await expect(page.locator("#scenario")).toContainText("30 years");
});

test("AC5 thirteen-month term", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.locator("#term-unit").selectOption("months");
  await page.locator("#months").fill("13");
  expect(await headingText(page)).toContain("13-month");
  await expect(page.locator("#scenario")).toContainText("13 months");
  await expect(page.locator("[data-bar]")).toHaveCount(13);
});

test("AC5 ARM structure labels", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.locator("#product").selectOption("arm");
  await page.locator("#arm-fixed-unit").selectOption("months");
  await page.locator("#arm-fixed-months").fill("18");
  await expect(page.getByTestId("arm-label")).toHaveText("18mo/12mo");
  await page.locator("#arm-fixed-unit").selectOption("years");
  await page.locator("#arm-fixed-years").fill("7");
  await page.locator("#arm-adjust-months").fill("12");
  await expect(page.getByTestId("arm-label")).toHaveText("7/1");
  await page.locator("#arm-adjust-months").fill("1");
  await expect(page.getByTestId("arm-label")).toHaveText("7/1mo");
});

test("AC5 recast sample payment does not change scheduled payment", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-15T12:00:00Z") });
  await page.goto("/");
  await page.locator("#price").fill("570");
  await page.locator("#down").fill("0");
  await page.locator("#rate").fill("7.375");
  const scheduleRow = page.getByRole("row", { name: /Nov 2026/ });
  const principalBefore = await scheduleRow.locator("td").nth(2).textContent();
  const interestBefore = await scheduleRow.locator("td").nth(3).textContent();
  const applied = recastSampleAppliedEntries();
  await page.evaluate((entries) => {
    const key = localStorage.getItem("compound-amortization-v1")
      ? "compound-amortization-v1"
      : Object.keys(localStorage).find((k) => k.endsWith("-v1")) ?? "compound-amortization-v1";
    const legacy = JSON.parse(localStorage.getItem(key) ?? "{}");
    legacy.applied = entries;
    legacy.extras = entries;
    localStorage.setItem(key, JSON.stringify(legacy));
    const setKey = key.endsWith("-v1") ? key.replace(/-v1$/, "-v2") : `${key}-scenarios`;
    const setRaw = localStorage.getItem(setKey);
    if (setRaw) {
      const set = JSON.parse(setRaw);
      const active = set.active ?? 0;
      if (set.scenarios?.[active]) {
        set.scenarios[active].applied = entries;
        set.scenarios[active].extras = entries;
        localStorage.setItem(setKey, JSON.stringify(set));
      }
    }
  }, applied);
  await page.reload();
  await page.locator(".disclosure.recast summary").click();
  await page.locator("#recast-month").fill("24");
  await expect(page.locator(".recast-figures")).toContainText("$3,195.68");
  await expect(scheduleRow.locator("td").nth(2)).toHaveText(principalBefore ?? "");
  await expect(scheduleRow.locator("td").nth(3)).toHaveText(interestBefore ?? "");
});
