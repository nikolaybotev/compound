import { expect, type Page } from "@playwright/test";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export async function setStartMonth(page: Page, year: number, month: number) {
  await page.locator("#start").click();
  const dialog = page.getByRole("dialog", { name: "Choose start month" });
  await expect(dialog).toBeVisible();
  const yearText = dialog.locator(".month-picker-year span");
  for (let guard = 0; guard < 2000; guard += 1) {
    const shown = Number(await yearText.textContent());
    if (shown === year) break;
    await dialog.getByRole("button", { name: shown < year ? "Next year" : "Previous year" }).click();
  }
  await dialog.getByRole("button", { name: `${MONTHS[month - 1]} ${year}` }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#start")).toHaveAttribute(
    "data-value",
    `${year}-${String(month).padStart(2, "0")}`,
  );
}
