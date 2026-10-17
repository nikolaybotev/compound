# spec.md — ARM prevailing extra on the fixed period

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-17) |
| Status | Draft 2 |
| Stage | 2 · Design |

## 1. Summary

On an ARM, the prevailing extra is counted from the applied extras in the initial fixed period, the months before the first adjustment. The 80 percent test is the one `intent/loan-scenarios/` already uses, with that shorter count as its denominator. A fixed-rate loan still counts months 1 through payoff. The figure stays in `prevailingExtraCents`. The scenario label, the summary Monthly payment, and the summary bar already read it. `amortize.js` does not change. This docs pull request leaves the point version at 0.13. The pull request that ships the page sets it to 0.14.

This folder builds on [intent/loan-scenarios/](../loan-scenarios/spec.md) and [intent/arm-extra-level/](../arm-extra-level/spec.md). Where `intent/loan-scenarios/` requirement 5 uses `payoff_month` as the denominator, this spec wins for an ARM report. The level-extra checkbox still writes extras the way `intent/arm-extra-level/` says. [intent/schedule-scenario-fixes/](../schedule-scenario-fixes/spec.md) keeps the Prevailing extra column off the schedule.

## 2. Goals and non-goals

**Goals**

- G1. Count an ARM’s prevailing extra on the fixed-period months that actually occur.
- G2. Leave a fixed-rate loan’s count on months 1 through payoff.
- G3. Show the resulting figure in the places that already show the prevailing extra.

**Non-goals**

- A change to `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, the skills, or a fixed-rate JSON, CSV, or summary.
- A command-line flag.
- A change to how the level-extra checkbox writes extras, or to the modal principal-and-interest payment.
- Writing the figure into the schedule or the Extra Payments form.
- A point-version bump on this docs pull request. The pull request that ships the page sets `apps/web/package.json` to `0.14.0` and `PAGES_POINT_VERSION` to `0.14`.
- Naming a credit union in the page, the tests, or these files.

**Release phasing.** G1, G2, and G3 ship together. Nothing is tagged for later.

## 3. Principles

- P1. The count reads the applied walk’s `extra_cents`. The requested map, an uncommitted keystroke, and a blue extra cell do not change it until Apply.
- P2. The walk returns `payoff_month` and, on an ARM, `fixed_months`. The page takes the lesser of those two. `fixed_months` is the configured length. The months that occur are that lesser count. The page does not pass a second length into `buildReport` and does not grow a second formula.
- P3. Months from the first adjustment on are outside the count. The level checkbox and the index are not inputs. They matter only when they change `extra_cents` inside the window.
- P4. The modal payment stays the payment in effect for the most months through payoff. This change adds the extra to that total. It does not shorten the payment’s own count.

## 4. Users and scenarios

- On a fixed loan the owner applies $100 in months 1–84. The prevailing extra stays $0. Applying $100 in every month still shows $100.
- The owner switches to the 7/1 ARM and applies $100 a month with “Match the fixed-period total after each reset” on. Months 1–84 are $100 and the months after the first adjustment have no extra. The prevailing extra is $100. The summary Monthly payment is $5,951.59 and the scenario control shows $5,952.
- With the checkbox off, $100 in every month of that same ARM still has a prevailing extra of $100.
- On a 5/1 ARM, $100 in every month after the fixed period and nothing before it has a prevailing extra of $0. The same loan with $100 during the fixed period and $500 after it has a prevailing extra of $100.

## 5. Functional requirements

1. **The window.** `prevailingExtraCents` keeps its one argument, the report. When `report.arm` is absent, the denominator `n` is `payoff_month`, and the rows are months 1 through that payoff, as they are today. When `report.arm` is present, `n` is the lesser of `payoff_month` and `report.arm.fixed_months`. `fixed_months` is the configured length. The rows in the count are months 1 through `n`. The first adjustment month, `fixed_months + 1`, is outside the count, including when that month is the payoff month. A configured `fixed_months` that runs past payoff does not count the later zero rows: `n` is `payoff_month`, and those rows stay out. The schedule is month 1 at index 0, so the rows are `schedule.slice(0, n)`.

2. **The 80 percent test.** Inside those rows, group `extra_cents`. A zero amount is not a candidate. A positive amount qualifies when `c * 5 >= n * 4`, where `c` is the number of those rows equal to that amount. Exactly 80 percent qualifies. The function returns the first qualifying amount in first-seen order, and 0 when none qualifies. Two positive amounts still cannot both qualify. The amount is the walk’s applied cents. On a payoff month inside the window, a smaller applied extra is its own group. The requested map is not read. `scenarioFigures` already calls this function on the applied-map report, and only that report passes `arm` when the product is ARM and the terms parse. A fixed product passes no `arm`, including when ARM terms are stored with `enabled` false.

3. **What the figure feeds.** The scenario label, the summary Monthly payment, and the summary prevailing bar already use `scenarioFigures`. They pick up the new amount with no second calculation. The summary bar draws a gold PE segment only when the amount is positive, labels it with `formatMoney` of those cents and `PE`, and sets that segment’s `flex-grow` to the cents. Its accessible name lists the segments that render. The closed `#scenario` control shows the whole-dollar prevailing total in the numbered label it already builds. The heading line stays the loan facts. Taxes and Insurance stays Property tax, Home insurance, Conventional PMI, and Subtotal. This change does not put a Principal and interest row back on that table. The schedule keeps eight columns in fixed mode and eleven in ARM mode, with no Prevailing extra column, and Extra payment stays that month’s requested amount.

4. **The modal payment.** `modalPaymentCents` still counts `payment_cents` on an ARM, and `monthly_payment_cents` on a fixed loan, through `payoff_month`. A tie still uses the earlier month. The fixed-period window does not apply to it. On the requirement 6 loan with $100 applied in months 1–84, the modal payment is 493534 cents. Using the initial payment, 337177 cents, as that modal is the fixed-period window applied to the payment, and it is the wrong total.

5. **The checkbox and the index.** The count does not read `#extra-level`, `appliedLevel`, or the index. Apply with the checkbox on writes the map `intent/arm-extra-level/` already defines, and this count then reads that map’s walk. Apply with the checkbox off writes the form across the term. An index commit rewrites extras from a reset. That reset is month `fixed_months + 1` or later, and the commit copies the months before it. It does not change `extra_cents` inside the window, and it does not move a payoff that is already inside the fixed period. The prevailing extra is unchanged whether or not the loan is still alive at the end of the fixed period.

6. **Fixtures.** The loan is the page’s $600,000 purchase with 5% down, so the financed principal is $570,000, unless a fixture says otherwise. The note rate is 5.875% for 360 months. ARM terms are fixed 84 months, adjust every 12, margin 2.5, caps 5/2/5, lifetime floor 2.5, first-adjustment floor 2.5, round to 1/8 off, and no index, unless a fixture says otherwise. Start month `2026-10`. TI on the default picture is 91625 cents. Checked 2026-10-17 with `buildReport` and no edit to `amortize.js`. Whole dollars use `headingDollarsFromCents`.

   **F1. A fixed-rate loan stays on payoff.** The 7.375% loan with $100 applied in months 1–84. `payoff_month` is 346 and 84 rows are `extra_cents` 10000. `84 * 5 = 420` and `346 * 4 = 1384`, so the prevailing extra is 0. The report has no `arm` key. The same map on a scenario whose stored ARM draft is present and whose product is fixed is also 0. The existing fixed-rate fixtures in `intent/loan-scenarios/` stay, including $100 in every month at 10000 cents and the one-month lump at 57000000 cents.

   **F2. Fixed-period $100 on the 7/1.** $100 applied in months 1–84 and nothing after. `payoff_month` is 360. `n` is 84 and all 84 rows are 10000 cents, so the prevailing extra is 10000. The full-payoff count does not qualify: `84 * 5 = 420` and `360 * 4 = 1440`. The modal payment is 493534 cents across 276 months. Total 595159 cents. The summary Monthly payment is `$5,951.59`. The scenario label’s dollar is `$5,952`. The closed control reads `1: $5,952 - 600K | 5% down | 5.875% | 30 years | 7/1`. The summary bar’s name is `Principal and interest $4,935.34, Taxes and insurance $916.25, Prevailing extra $100.00`, and the PE segment’s `flex-grow` is `10000`. `levelArmExtras` from month 1, with monthly $100 and yearly $0, writes this map: month 85’s payment is 493534 cents, the fixed-period total is 347177 cents, and the later months stay at 493534, so they are omitted.

   **F3. $100 in every month of the 7/1.** `payoff_month` is 360 and all 360 rows are 10000 cents. The fixed-period count and the full-payoff count both qualify, so the prevailing extra stays 10000. The modal payment is 337177 cents. Total 438802 cents. The summary Monthly payment is `$4,388.02`. The scenario label’s dollar is `$4,388`.

   **F4. A yearly extra inside the fixed period.** $100 in an ordinary fixed-period month and $350 in January, for months 1–84, with nothing after. Start `2026-10` puts January on payments 3, 15, 27, 39, 51, 63, and 75. That is 77 rows at 10000 cents and 7 rows at 35000 cents. `77 * 5 = 385 >= 336` and `7 * 5 = 35 < 336`, so the prevailing extra is 10000. Months 85–96 are `extra_cents` 0. A positive extra from month 85 on does not change the figure: those months cannot pay the loan off during the fixed period, so `n` stays 84.

   **F5. Extras that start after a 5-year fixed period.** Fixed period 60 months, $100 applied in months 61–360 and nothing before. `payoff_month` is 360. The full-payoff count qualifies: `300 * 5 = 1500 >= 1440`, so today’s figure is 10000. The fixed-period count has no positive extra, so the prevailing extra is 0. The modal payment is 337177 cents. Total 428802 cents. The summary Monthly payment is `$4,288.02`. The scenario label’s dollar is `$4,288`, and the product in that label is `5/1`. The same $100 from month 85 on a 7/1 does not separate the two rules: `276 * 5 = 1380 < 1440`, so both counts return 0. The 5-year period is the one that does.

   **F6. Two amounts, and the later one currently wins.** The F5 loan with $100 in months 1–60 and $500 in months 61–360. `payoff_month` is 358. Months 1–60 are 10000 cents. Months 61–358 are 50000 cents, 298 rows. The full-payoff count returns 50000: `298 * 5 = 1490 >= 1432`. The fixed-period count returns 10000. The modal payment is 337177 cents. Total 438802 cents. The summary Monthly payment is `$4,388.02`. Keeping 50000 would make the total 478802 cents and the label dollar `$4,788`.

   **F7. The 80 percent boundary of 84 months.** $1 applied in months 1–68. `payoff_month` is 360, so `n` is 84. `68 * 5 = 340 >= 336`, and the prevailing extra is 100 cents. The modal payment is 503685 cents. Total 595410 cents. The summary Monthly payment is `$5,954.10`. Months 1–67 only: `67 * 5 = 335 < 336`, the prevailing extra is 0, the modal payment is 503686 cents, and the total is 595311 cents, so the summary is `$5,953.11`. The whole-dollar label for the 68-month case is `$5,954`, the same dollar as the no-extra 7/1, so the check is the cents and the 100-cent extra.

   **F8. Payoff during the fixed period.** $570,000 applied in month 1 of the 7/1. `payoff_month` is 1, that row’s `extra_cents` is 57000000, and `n` is 1, so the prevailing extra is 57000000. Counting all 84 fixed-period months would reject it: `1 * 5 < 84 * 4`. The modal payment is 337177 cents. Total 57428802 cents. The scenario label’s dollar is `$574,288`.

   **F9. The payoff month inside the window can apply a smaller extra.** $5,000 applied in every month of the 7/1. `payoff_month` is 84. Months 1–83 are `extra_cents` 500000 and month 84 is 18635. `n` is 84. `83 * 5 = 415 >= 336`, so the prevailing extra is 500000, not 18635.

   **F10. Payoff on the first adjustment month.** $4,900 applied in every month of the 7/1. `payoff_month` is 85. Months 1–84 are 490000 cents, so `n` is 84 and the prevailing extra is 490000. Month 85’s `extra_cents` is 217511 and is outside the count. Including that month would still return 490000, since `84 * 5 = 420 >= 85 * 4 = 340`. F11 is the case that separates those two windows. $4,950 applied in every month pays off at month 84 with all 84 rows at 495000 cents, so that payoff month stays inside its group.

   **F11. $1 in months 1–67 and in month 85.** On the 7/1, $1 is applied in months 1–67 and in month 85, and nowhere else. `payoff_month` is 360. Months 1–67 and month 85 are `extra_cents` 100. Months 68–84 are 0. `n` is 84. `67 * 5 = 335 < 336`, so the prevailing extra is 0. Treating month 85 as inside the count makes `c` 68 and `n` 85, `68 * 5 = 340 >= 340`, and the prevailing extra is 100 cents. Checked 2026-10-17 with `buildReport`.

7. **Docs and version, on the implementation.** This docs pull request does not edit `AGENTS.md`, `REVIEW.md`, `apps/web/package.json`, or `.github/workflows/`. By the end of the page release, `AGENTS.md` says an ARM’s prevailing extra is the walk’s `extra_cents` on at least 80 percent of the fixed-period months that occur (`n` is the lesser of `payoff_month` and `arm.fixed_months`), and a fixed-rate loan still uses `payoff_month`. It records the app version as 0.14 (`apps/web/package.json` `0.14.0`, `PAGES_POINT_VERSION` `0.14`) and leaves the 0.13 sentence on the adjustment-stats bullet. Things agents get wrong gains: do not count an ARM month at or after the first adjustment toward the prevailing extra; do not stop a fixed-rate count at a stored fixed period; do not window the modal payment to the fixed period; do not add a command-line flag, a skill change, or an `amortize.js` change for this figure; do not write the figure into the schedule. `REVIEW.md` Compliance names `intent/arm-fixed-period-pe/`. Bugs names an ARM prevailing extra that counts a month at or after the first adjustment, a fixed-rate prevailing extra counted only through a stored fixed period, and a modal payment taken from the fixed period only.

## 6. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | `pnpm --dir apps/web test`: F1 through F11. F1’s prevailing extra is 0 with no `arm` key, including a stored ARM draft whose product is fixed. F2 is 10000, modal 493534, total 595159. F3 stays 10000. F4 is 10000 with the January mix. F5 is 0. F6 is 10000, not 50000. F7 is 100 at 68 months and 0 at 67. F8 is 57000000. F9 is 500000, not 18635. F10 is 490000 with month 85 outside the 84-month count. F11 is 0. Counting month 85 in that case would make the prevailing extra 100 cents. The existing fixed-rate prevailing-extra tests stay. `levelArmExtras` for F2’s $100 and yearly $0 omits month 85 and yields the same prevailing extra as the hand-built months 1–84 map. |
| AC2 | Playwright, clock 2026-10-15: on the fresh loan, set the rate to 5.875 and the product to ARM, check `Match the fixed-period total after each reset`, Apply $100 a month with no yearly extra. `#scenario`’s accessible name is `1: $5,952 - 600K \| 5% down \| 5.875% \| 30 years \| 7/1`. The Monthly payment region contains `$5,951.59` and `$100.00 PE`. The summary bar’s name is F2’s sentence, and its PE segment’s `flex-grow` is `10000`. Month 1’s extra is `100.00` and month 85’s extra is empty. The schedule has no Prevailing extra column. The heading line has no `= $5,952 / month`. |
| AC3 | Playwright, same loan and clock: leave the checkbox off, Apply $100 a month. The Monthly payment region contains `$4,388.02` and `$100.00 PE`. `#scenario`’s accessible name is `1: $4,388 - 600K \| 5% down \| 5.875% \| 30 years \| 7/1`. |
| AC4 | `node --test` exits 0 with no change to a calculator test. `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, and `.agents/skills/` have no diff. The page release leaves `apps/web/package.json` at `0.14.0` and `PAGES_POINT_VERSION` at `0.14`. This docs pull request leaves both at `0.13.0` and `0.13`. |

## 7. Design decisions

**D1 — The window is the lesser of `payoff_month` and `fixed_months`.** The months before the first adjustment are 1 through `fixed_months`. A payoff during that stretch ends the count on the payoff month. The later zero rows are outside it. Month `fixed_months + 1` stays out, including when the loan pays off on the first adjustment. Checked 2026-10-17: F8’s `n` is 1, and counting the configured 84 months would drop the lump. F11 is $1 in months 1–67 and in month 85: `n` is 84 and the prevailing extra is 0. Counting month 85 makes it 100 cents. F10’s dollar is the same either way, so F11 is the check.

**D2 — Read `report.arm.fixed_months` in `prevailingExtraCents`, then take the lesser with `payoff_month`.** The report already carries both fields, and the function already receives the report. `fixed_months` is the configured length. The count is the months that occur. A new argument was rejected because a caller could pass a length the walk did not use. `amortize.js` stays untouched. A fixed-rate report has no `arm` key, which is what keeps F1 on `payoff_month` even when ARM terms are stored and the product is fixed.

**D3 — The predicate stays `c * 5 >= n * 4` on positive `extra_cents`.** That is the 80 percent rule, including the exact boundary. F7 is 68 qualifying and 67 not, on `n` of 84. The payoff month’s smaller applied extra stays its own group. F9’s month 84 is 18635 cents and the prevailing extra is the 500000-cent group.

**D4 — The modal payment keeps the full payoff count.** The request changes the extra. On F2 the long reset run is 276 months at 493534 cents, and the initial 84 months are 337177 cents. Windowing the payment to the fixed period would total 438802 cents and show `$4,388`. The heading facts line is unchanged; the dollar the owner sees is the scenario control and the summary.

**D5 — The checkbox and the index are not inputs.** The request covers both checkbox states. F2 is the map the checkbox writes for $100 and no yearly extra. F3 is the map it writes when the checkbox is off, and that amount already qualified across the whole payoff. F4’s tail can change without moving the figure. An index commit rewrites from the first adjustment or later, so the prevailing extra is unchanged whether or not the loan is still alive at the end of the fixed period. Reading the checkbox in the count was rejected because the applied cents already record what Apply wrote.

**D6 — A 7/1 tail of $100 does not prove the later months are out.** On a 30-year 7/1, months 85–360 are 276 of 360, and `276 * 5 < 360 * 4`, so both rules return 0. F5 uses a 5-year fixed period, where 300 of 360 does qualify today and must not after this change. F6 is the case where the later amount is the one that wins today.

**D7 — This docs pull request does not ship the page.** It adds this folder only. `package.json` stays `0.13.0` and `PAGES_POINT_VERSION` stays `0.13`. The pull request that ships the page sets both to 0.14.

## 8. Open questions

None.
