# spec.md — ARM extra level

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-15) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

The Extra Payments form gains one checkbox for an ARM. When it is on, Apply writes extras after the fixed period so each month's principal-and-interest plus extra equals that month's fixed-period total, floored at zero. A committed index change then rewrites that adjustment period and every later one, by the same rule, unless an extra amount has been edited since Apply. The page reads each period's payment from `buildReport`. `amortize.js` does not change. The point version stays 0.11.

This folder builds on [intent/arm-loan/](../arm-loan/spec.md) and [intent/ui-facelift/](../ui-facelift/spec.md). The walk, the index cell, the eleven-column ARM schedule, and the Extra Payments fields stay as those specs and the later page specs left them. This spec adds the checkbox and the two writes below.

## 2. Goals and non-goals

**Goals**

- G1. Show an ARM-only checkbox on Extra Payments, default off.
- G2. On Apply with the checkbox on, set each post-reset extra from that month's fixed-period total and the period's reset payment.
- G3. After that Apply, a committed index change updates that period and every later adjustment period, and leaves earlier months alone, unless an extra amount has been edited since Apply.

**Non-goals**

- A change to `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, the skills, or a fixed-rate JSON, CSV, or summary.
- Putting taxes, insurance, PMI, or MIP into the matched total.
- Rewriting extras when the note rate, term, fixed period, adjustment interval, or form fields change. Only Apply, and the index commit in requirement 5, write extras.
- A point-version bump. `apps/web/package.json` stays `0.11.0`. `PAGES_POINT_VERSION` stays `0.11`.
- Naming a credit union in the page, the tests, or these files.

**Release phasing.** G1, G2, and G3 ship together. Nothing is tagged for later.

## 3. Principles

- P1. The period payment is the one the walk sets at the reset. Extras inside the period leave that payment where it is. They change the balance the next reset re-amortizes, so the next period's extra is chosen only after this period's extras are in the map.
- P2. The page calls `buildReport`. It does not grow a second payment formula and it does not add a level-extra argument to the library.
- P3. Apply is the write. The checkbox, like the monthly and yearly amounts, does not change the column until Apply. An index commit is the only later write, and only on the terms in requirement 5.
- P4. The matched total is principal-and-interest plus the form extra. Picture taxes and insurance stay on the summary bar and out of this arithmetic.

## 4. Users and scenarios

- On a fixed loan the owner opens Extra Payments and sees the monthly amount, the yearly amount, the month of year, and Apply. There is no level checkbox.
- The owner switches to ARM. The checkbox is there, unchecked. Apply of $100 a month still writes $100 on a reset month.
- The owner checks the box and Applies on the 7/1 loan in requirement 8, with $100 a month and $250 each January. Through the fixed period the column is the form. From the first reset, the extra is $0 because the reset payment is already above the ordinary total and the January total.
- The owner then commits an index of `0` on payment 85. The extra on payment 85 becomes $1,101.02, and the extra on payment 87 becomes $1,351.02. Payment 97, whose own index was left alone, gets an extra of $679.47. The extra on payment 84 stays $100.
- After either of those writes, the owner edits an extra cell. A further index commit leaves every extra where it is.

## 5. Functional requirements

1. **Checkbox.** Inside the Extra Payments disclosure, after the monthly, yearly, and month-of-year fields and before the Apply row, an ARM loan renders a checkbox `#extra-level`. Its label, and its accessible name, is `Match the fixed-period total after each reset`. A fixed loan does not render the control. The first visit, a new scenario, and a stored scenario with no `level` field show it unchecked when the product is ARM. The control does not use the edited color. Checking or unchecking it does not change the extra column.

2. **Fixed-period total.** For each month, the form extra is the dollar amount `buildPrefillMap` would store for the monthly amount, yearly amount, and month of year passed into the calculation, read back with `dollarsToCents`, or 0 when that month is absent. Apply passes the parsed fields. An index commit passes `appliedMonthly`, `appliedYearly`, and `appliedMonth`. The fixed-period principal-and-interest is the report's `monthly_payment_cents`. The fixed-period total for that month is those two cents added. The yearly extra is included only in the calendar month the form names, including years after the fixed period. Start month `2026-10` puts January on payments 3, 15, 27, and so on, so payment 87 is a January. Taxes, insurance, PMI, and MIP are not added.

3. **Period payment and the extra.** Adjustment periods are the ones `intent/arm-loan/` already uses: payments `F + 1`, `F + 1 + A`, `F + 1 + 2A`, through the term. The extra for a month in a period is the fixed-period total minus the period payment, floored at zero, in integer cents, then stored with `centsToDollars`. A zero extra omits the month, the same way `buildPrefillMap` omits a zero. The period payment is `payment_cents` on that period's reset row from a `buildReport` call whose extra map already contains the chosen extras for every earlier month. Extras on the reset month and later are not an input to that payment. The same cent is used for every month of the period, including a month after the walk's payoff month that is still inside the period. The fixed period itself keeps the form extra: its payment is `monthly_payment_cents`, so the formula returns the form extra. When a reset month is after `payoff_month` on the walk that already includes every earlier extra, the remaining months through the term are omitted and the loop stops. Checked 2026-10-15 against `buildReport` with no edit to `amortize.js`: on this loan with an empty extra map, $100 at months 85, 90, and 96 leaves month 85 at 503771 cents and moves month 97 from 503771 to 503456.

4. **Apply.** Apply still parses the two dollar fields as it does today and still snapshots `appliedMonthly`, `appliedYearly`, and `appliedMonth`. With the product fixed, or with the checkbox off, Apply writes `buildPrefillMap` for the whole term and stores `appliedLevel` false. With the product ARM, the terms in use, and the checkbox on, Apply writes the map from requirement 3 starting at month 1 and stores `appliedLevel` true. Either Apply replaces `extras` and `applied` with that whole map, so no extra cell is edited afterward. The sentence `Apply rewrites all extra-payment column values.` stays.

5. **Index commit.** A committed index change is the existing blur or Enter commit that changes the stored index, including clearing the cell so the worst case returns. An invalid index still reverts and writes nothing. A commit of the same index writes nothing. When `appliedLevel` is true and no extra amount is edited, the page runs requirement 3 again from the changed reset through the term and writes those months into both `extras` and `applied`. Months before that reset stay in both maps. Later periods are included when their own index did not change. The form snapshots and the checkbox stay as they are. The target uses `appliedMonthly`, `appliedYearly`, and `appliedMonth`, and the fixed-period principal-and-interest is the current loan's `monthly_payment_cents`. An extra amount is edited when any committed month differs from `applied` (`isEditedExtra`). The monthly field, the yearly field, and the month-of-year select do not count, and a keystroke in a cell does not count until it commits a different amount. Unchecking the checkbox does not clear `appliedLevel` and does not block this write. The next Apply with the checkbox off does. While `appliedLevel` is false, an index commit does not change extras.

6. **Storage.** `prefill.level` and `prefill.appliedLevel` are booleans on the scenario. A missing or non-boolean value loads as false and does not reject the prefill or the scenario. `scenariosDiffer` compares both. Export and import carry them because they carry `prefill`. A fixed-mode Apply sets `appliedLevel` false and leaves `level` as stored, so the box is checked again when the product returns to ARM, and extras stay the plain map until the next Apply. Switching product without Apply does not rewrite extras.

7. **What stays.** The schedule columns stay eight in fixed mode and eleven in ARM mode. Extra payment stays the requested amount. Saved by extra stays the marginal lifetime interest. The summary prevailing bar stays the picture plus the prevailing extra. ARM terms stay where they are. `amortize.js` has no diff. The point version stays `0.11.0` and `PAGES_POINT_VERSION` stays `0.11`.

8. **Fixtures.** The loan is $570,000 at 5.875% for 360 months. That is the page's $600,000 purchase with 5% down. ARM terms are fixed 84 months, adjust every 12, margin 2.5, caps 5/2/5, lifetime floor 2.5, first-adjustment floor 2.5, round to 1/8 off. Start month `2026-10`. Checked 2026-10-15 by calling `buildReport` and applying requirement 3. The no-extra first reset of 503771 cents is a different walk: once the fixed period has extras, the reset payment is the one in these tables.

   **F1. Checkbox off is not these tables.** $100 a month and $250 in January, checkbox off, writes $100 on month 85 and $350 on month 87.

   **F2. Apply with the checkbox on, no index.** $100 a month and $250 in January. `monthly_payment_cents` is 337177. Month 1 (November 2026) is $100. Month 3 (January 2027) is $350. Month 84 is $100. The first reset payment is 491365 cents at 10.875%, which is above both 347177 and 372177, so months 85 through 360 have no extra. Total interest is 107954472 cents.

   **F3. Index `0` at month 85 after F2, or Apply with that index already set.** The two maps are equal. Months 1, 3, and 84 stay $100, $350, and $100. Ordinary months target 347177 cents. January months target 372177 cents.

   | Reset | Rate | Period payment (cents) | Extra on the reset month | Extra on the January in that period |
   |---|---|---|---|---|
   | 85 | 2.5% | 237075 | $1,101.02 (month 85) | $1,351.02 (month 87) |
   | 97 | 4.5% | 279230 | $679.47 (month 97) | $929.47 (month 99) |
   | 109 | 6.5% | 324924 | $222.53 (month 109) | $472.53 (month 111) |
   | 121 | 8.5% | 375586 | $0 | $0 (month 123) |

   Reading month 97's payment before months 85–96 hold those extras returns 287366 cents and would write $598.11. The extra that matches the total is the $679.47 from 279230. From month 121 through month 360 the extra is $0. Total interest on the finished map is 89710406 cents. Month 84 is not rewritten.

   **F4. A later index leaves the earlier period and still updates periods after it.** Apply with the checkbox on, $2,000 a month, no yearly extra, no index. The fixed-period total is 537177 cents. Month 85's period payment is 299028 cents and its extra is $2,381.49. Then commit index `0` at month 97 only. Months 85–96 stay $2,381.49 and month 85's payment stays 299028. Month 97's rate is 8.875% (the periodic cap, not the 2.5% floor) and its payment is 232500 cents, so months 97–108 are $3,046.77. Months 109–120 are $3,076.56 from a period payment of 229521 cents. Leaving month 109 at the pre-edit extra of $3,023.29 makes 229521 + 302329 = 531850 cents, short of 537177. The finished walk's total interest is 29795365 cents and its payoff month is 162. On the F4 Apply before that index edit, the walk that includes the level extras through month 168 pays off at month 164, so month 164 is $4,970.92 and month 169 is omitted.

9. **Docs, on the implementation.** `AGENTS.md` gains the checkbox, the rule that the extras come from `buildReport` one period at a time, and a Things-agents-get-wrong line for rewriting `amortize.js`, for stopping the index update at the edited period, and for naming a credit union. `REVIEW.md` Compliance names `intent/arm-extra-level/`. Bugs names a level extra other than requirement 3, and an index commit that leaves a later period unchanged while `appliedLevel` is true and no extra amount is edited.

## 6. Acceptance criteria

| AC | Check |
|---|---|
| AC1 | `pnpm --dir apps/web test`: F2, F3, and F4 cents, including month 97 at $679.47 rather than $598.11, month 109 at $3,076.56 rather than $3,023.29, F3's two entry paths equal, and month 169 omitted on the F4 Apply. `anyExtraEdited` is false when the maps match and true when one month differs. |
| AC2 | Playwright, clock 2026-10-15: a fixed loan has no `#extra-level`. After ARM at 5.875% the checkbox is unchecked and named `Match the fixed-period total after each reset`. Apply of F1's amounts with the box off shows month 85 as `100.00` and month 87 as `350.00`. |
| AC3 | Playwright, same loan: check the box, Apply, month 1 is `100.00`, month 3 is `350.00`, month 84 is `100.00`, and months 85 and 87 are empty. Commit index `0` on month 85. Month 85 is `1101.02`, month 87 is `1351.02`, month 97 is `679.47`, and month 84 is still `100.00`. |
| AC4 | Playwright: after AC3, commit month 1's extra as `50.00`, then clear the month 85 index. Month 85 is still `1101.02` and month 97 is still `679.47`. |
| AC5 | A stored prefill with no `level` loads unchecked and `appliedLevel` false, and the scenario still loads. `apps/web/package.json` is `0.11.0` and `PAGES_POINT_VERSION` is `0.11`. `amortize.js` has no diff. `node --test` exits 0. |

## 7. Design decisions

**D1 — Read the walk, one period at a time.** The reset payment is `paymentFor` on the balance after the previous month, and the walk does that before it applies that month's extra. A new library mode was rejected because the intent says `amortize.js` does not change. One `buildReport` of the whole term, with the post-reset extras still empty or still the form extras, was rejected because F3's month 97 is then 287366 cents and the extra is $598.11. The page fills a period, then asks for the next payment.

**D2 — The form extra is `buildPrefillMap`.** The yearly month already follows `paymentDate` from the start month. A second calendar rule was rejected. The fixed-period total adds `dollarsToCents` of that stored dollar to `monthly_payment_cents`. Checked 2026-10-15: `dollarsToCents(100 + 250.25)` and `dollarsToCents(100.10 + 0.05)` match the sum of the cents.

**D3 — The checkbox commits at Apply.** `prefill.level` is the control. `prefill.appliedLevel` records that the last Apply wrote the level map. An index commit follows `appliedLevel`, so unchecking without Apply leaves the column and the later index write in place until Apply. Treating a live uncheck as a freeze was rejected because the request gates the index write on an edited extra amount, and the rest of this form waits for Apply.

**D4 — Edited means the column differs from `applied`.** That is the rule the blue extra cells already use. A sticky "was touched" flag was rejected because putting the cell back clears the blue state and should clear the gate. The form fields were rejected as a gate because they are the next Apply's inputs; the index write keeps using the applied snapshot.

**D5 — The index write starts at the changed reset and runs to the stop.** Months before that reset keep the extras that Apply, or an earlier index write, stored. Later periods are rewritten even when their index and their rate are unchanged, because F4's month 109 otherwise sums to 531850 cents. The cap that turns an index of 0 at month 97 into 8.875% stays inside `buildReport`.

**D6 — The label uses the request's words.** `Match the fixed-period total after each reset` is the visible label and the accessible name. The definition of the total stays in requirement 2.

**D7 — The point version stays 0.11.** This docs pull request and the implementation pull requests leave `0.11.0` and `PAGES_POINT_VERSION` `0.11` as they are.

## 8. Open questions

None.
