# spec.md — ARM adjustment stats

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-16) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

`amortize.js` adds the first-adjustment range and the even-out extra to an ARM report. The figures come from the existing walk, including the extra's effect on the balance. `compound_interest_monthly.js` prints them and accepts a yearly extra that changes only that balance. The mortgage skill reads the JSON and does not solve the extra. The page reads the same report fields and shows them in the ARM terms section. The schedule and the Extra Payments form are unchanged. The point version stays 0.12.

This folder builds on [intent/arm-loan/](../arm-loan/spec.md) and [intent/arm-extra-level/](../arm-extra-level/spec.md). Where this spec changes the ceiling line and the first-adjustment line in `intent/arm-loan/` requirement 13, this spec wins. The walk, the index cell, the eleven-column schedule, and the level-extra checkbox stay as those specs left them.

## 2. Goals and non-goals

**Goals**

- G1. Report the lifetime floor, and the minimum and maximum change in principal and interest at the first adjustment, from the library.
- G2. Report the monthly extra that evens the worst-case first adjustment, including the extra's effect on the balance.
- G3. Accept a yearly extra and the month it lands, and report the monthly extra that evens a normal month of that same adjustment.
- G4. Show G1 through G3 from the command-line tool, answer them from the mortgage skill by running that tool, and show them on the page from the library.

**Non-goals**

- A second solver in the page, the skill, or the command-line tool.
- A Node API in `amortize.js`.
- Writing these figures into the schedule, the extra column, the `--extra` CSV, or the Extra Payments form. The level-extra checkbox is unchanged.
- Using the stored index, or the extras on the schedule, as an input to these figures.
- A fixed-rate JSON, CSV, or summary change.
- A number from the ARM concepts skill.
- A point-version bump. `apps/web/package.json` stays `0.12.0`. `PAGES_POINT_VERSION` stays `0.12`.
- Naming a credit union in the page, the tests, the skill, or these files.

**Release phasing.** G1 through G4 ship in the order in the plan: library, command-line tool, skill, page. Nothing is tagged for later.

## 3. Principles

- P1. One formula. A displayed or reported payment is the walk's `payment_cents` or `monthly_payment_cents`. The page imports `buildReport`. The skill runs the command-line tool.
- P2. The even-out extra is the monthly amount which, paid through the fixed period, makes the worst-case principal and interest at the first adjustment equal the initial principal and interest plus that amount. The no-extra jump is a different number.
- P3. The yearly amount changes the balance the first adjustment re-amortizes. It is not added on the left side of the equality. The equality is a month that does not also include the yearly amount.
- P4. These figures describe the note. They do not follow the schedule's extras or its index, and they do not change either.

## 4. Users and scenarios

- The owner runs the sheet loan in requirement 9 with no yearly extra. The JSON `even_out_cents` is 82321. The human summary ends with the floor, the first-adjustment range, `Even-out extra: 823.21`, and `Monthly extra: 823.21`.
- The owner asks the skill for that even-out extra. The skill runs the tool and reads 82321 cents. It does not subtract the two payments and call that the extra.
- The owner adds `$250` every January and a start month of October 2026. The monthly extra is 81249 cents. The even-out extra stays 82321.
- On the page, the ceiling line reads `Ceiling 10.875% · Floor 2.5%` and the first-adjustment line reads `First adjustment November 2033 (payment 85) · -$941.16 to +$1,665.94`. Typing the yearly amount does not fill the Extra Payments form or month 1 of the schedule. Apply and an index edit leave the even-out line at `$823.21`.
- With caps 2/2/5 the maximum change is `+$632.08`, from the 7.875% payment, and the even-out extra is `$348.52`.

## 5. Functional requirements

1. **Library.** `buildReport`'s signature stays `buildReport(principal, ratePercent, monthCount, extrasByMonth, yearsForJson, arm)`. On an ARM report, `arm` gains:

   ```
   first_adjustment: {
     month, min_rate_percent, max_rate_percent,
     min_payment_cents, max_payment_cents,
     min_change_cents, max_change_cents
   }
   even_out_cents
   monthly_extra_cents
   ```

   `floor_percent` and `ceiling_percent` stay the fields `intent/arm-loan/` already reports. `max_rate_percent` stays the highest rate on the walked loan, not the first adjustment's maximum. A fixed-rate report has none of the new fields. `amortize.d.ts` declares the new object and the optional input below. `amortize.js` still has no Node APIs.

   The optional input is `arm.adjustmentStats`, absent or `{ yearlyExtraCents, yearlyMonth, startMonth }`. `yearlyExtraCents` is an integer cent count of at least 0. `yearlyMonth` and `startMonth` are integers from 1 through 12. `startMonth` is the loan's start month. Payment 1 is the next calendar month, the same rule the page already uses: payment `m` falls in calendar month `((startMonth + m - 1) % 12) + 1`. Checked 2026-10-16: start month 10 puts payment 1 in November, payment 3 in January, and payment 85 in November. A positive `yearlyExtraCents` with a month outside 1 through 12 throws an `Error` that names the field. Zero ignores the two months. Absent `adjustmentStats` means no yearly extra.

2. **Range.** Both ends use a walk with no extras and, for the maximum, an empty index. The maximum payment is that walk's `payment_cents` at month `F + 1`. Its rate is the rate the walk already chooses with no index: the worst-case upper bound, or the first-adjustment floor when that floor sits above the upper bound and at or under the lifetime ceiling. The minimum payment is a second walk with no extras and an index of `0` at month `F + 1` only. The loan's margin, caps, floors, and round-to-eighth flag are unchanged, so a margin above the first-adjustment floor keeps the rate at the fully indexed rate. Each change is that payment minus `monthly_payment_cents`. The minimum change can be negative. With no extras the first adjustment is inside the term, so both walks list it. `min_change_cents` and `max_change_cents` are those differences. `min_rate_percent` and `first_adjustment.max_rate_percent` are the two rates.

3. **Even-out extra.** `even_out_cents` is the smallest integer cent `E ≥ 0` such that the worst-case first-adjustment `payment_cents` is less than or equal to the initial `monthly_payment_cents` plus `E`, when every month from 1 through the fixed period carries an extra of `E` cents and no later month does. The dollars in that map are the page's cent-to-dollar conversion: `Number(`${whole}.${two digits}`)` from the integer cents. A zero is omitted. The walk uses an empty index. If that walk has paid off and the reset is absent, the payment in the comparison is 0. If the no-extra payment is already less than or equal to the initial payment, `E` is 0. A positive `E` is one cent past the last cent that still leaves the reset payment above the initial payment plus that cent. The no-extra jump is not `E`.

4. **Yearly extra.** `monthly_extra_cents` is requirement 3's search with one change to the map. On each month from 1 through the fixed period whose calendar month equals `yearlyMonth`, the extra is `E` plus `yearlyExtraCents`. A normal month in the fixed period carries only `E`. A month after the fixed period is not in the map. The equality does not add the yearly cents to the initial payment. When `yearlyExtraCents` is 0 or `adjustmentStats` is absent, `monthly_extra_cents` equals `even_out_cents`.

5. **What the figures ignore.** `extrasByMonth` and `indexByMonth` change the schedule, the interest, and `arm.adjustments` exactly as they do today. They do not change `first_adjustment`, `even_out_cents`, or `monthly_extra_cents`. The probe maps are not written back onto the schedule. No schedule row gains a field. The CSV columns do not change.

6. **Command-line tool.** Three flags join the ARM flags. `--even-yearly` is a dollar amount, `^(?:\d+)(?:\.\d{1,2})?$`, and zero is allowed. `--even-month` is an integer from 1 through 12. `--start` is `^\d{4}-(0[1-9]|1[0-2])$`; the year is accepted and only the month number is `startMonth`. Any of the three turns ARM mode on, the same way `--index` does, and without the required ARM flags the existing missing-ARM-argument error applies. After the ARM terms are present, a positive `--even-yearly` requires both `--even-month` and `--start`, and the error names every one that is missing. `--even-month` or `--start` without a positive `--even-yearly` exits non-zero and names `--even-yearly`. `--even-yearly 0`, or no even flag, leaves `monthly_extra_cents` equal to `even_out_cents`. Duplicate flags still fail. The parsed yearly cents go in `arm.adjustmentStats` and nowhere in the `--extra` map.

   The human summary keeps its seven lines and the four ARM lines, then appends, for the requirement 9 loan with no yearly extra:

   ```
   Floor: 2.5%
   First adjustment month 85: -941.16 to +1,665.94
   Even-out extra: 823.21
   Monthly extra: 823.21
   ```

   The floor is `floor_percent`. The range uses `formatGroupedCents` on the absolute cents, a leading `-` when `min_change_cents` is negative, no sign on zero, and a leading `+` when a change is positive. There is no `$`. `--schedule` stays the CSV alone. `--json` includes the new `arm` fields and still omits `schedule` unless `--schedule` is set.

7. **Skill.** `.agents/skills/mortgage-loan-calculator/SKILL.md` answers a floor, a first-adjustment range, an even-out extra, or a yearly-extra question by running the script and reading `arm.floor_percent`, `arm.ceiling_percent`, `arm.first_adjustment`, `arm.even_out_cents`, and `arm.monthly_extra_cents`. It does not solve `E`, and it does not write `E` into the `month,extra` CSV. A range or even-out question with no yearly amount omits the three even flags. A yearly question passes `--even-yearly`, `--even-month`, and `--start`. The skill asks for a missing yearly amount, a missing month of the year, or a missing loan start month, and it does not invent one. It still asks for a missing ARM term before it runs. `rate - margin` remains the only arithmetic it does. The ARM concepts skill is unchanged.

8. **Page.** The ARM terms disclosure, after the round-to-eighth checkbox, keeps the two computed lines and then adds the even-out line, a yearly inputs row, and the monthly-extra line. The yearly row is not part of the terms grid above the checkbox, and it is not inside Extra Payments. `#arm-even-yearly`, labeled `Yearly extra`, and `#arm-even-month`, labeled `Yearly extra month`, use the twelve `MONTH_NAMES`. The select sits in `.field`. Neither control uses the edited color. Empty text is 0. Any other text uses `parseDollarField`, then `dollarsToCents`; a value that does not become a safe non-negative cent count is invalid, sets `aria-invalid`, and shows `Yearly extra must be a dollar amount greater than or equal to zero, with at most two decimal places.` in its own `role="alert"`, without clearing an ARM term error. The report keeps using the last valid cents, and that amount starts at 0.

   The page passes those cents, the selected month, and the start month's number (`2026-10` passes `10`, not `11`) on `arm.adjustmentStats` into the same `buildReport` call that draws the schedule. It reads the new fields off that report. It does not search. The ceiling line is `Ceiling {ceiling_percent}% · Floor {floor_percent}%`, with the percents printed by `formatPercentThousandths` and a space, a middle dot, and a space between them. The first-adjustment line keeps its date and payment number and adds ` · {minimum change} to {maximum change}`. A negative change is `-$941.16`, zero is `$0.00`, and a positive change is `+$1,665.94`. The even-out line is `Even-out extra {formatMoney(even_out_cents)}`. The result line is `Monthly extra {formatMoney(monthly_extra_cents)}`. Where `intent/arm-loan/` requirement 13 gives the two lines without the floor and the range, this requirement wins.

9. **Storage and what stays.** `evenYearly` and `evenMonth` live on the stored `arm` object and are not walk inputs except as requirement 8's `adjustmentStats` on the way into `buildReport`. A missing or non-string `evenYearly` loads as `""`. A string, including an invalid one, loads as typed and is what a later save writes. A missing `evenMonth`, or a value that is not an integer from 1 through 12, loads as `1`. Neither fault rejects the scenario. `armToStorage` writes both, so two ARM scenarios that differ only in either field differ. A fixed loan that has never stored `arm` still stores none. The schedule columns, Extra Payments, `#extra-level`, the summary, the heading, and the chart are unchanged. `amortize.js` gains no Node API. The point version stays `0.12.0` and `PAGES_POINT_VERSION` stays `0.12`.

10. **Fixtures.** The loan, unless a fixture says otherwise, is $570,000 at 5.875% for 360 months, fixed 84, adjust every 12, margin 2.5, caps 5/2/5, lifetime floor 2.5, first-adjustment floor 2.5, round to 1/8 off, no yearly extra. Checked 2026-10-16 with `buildReport`. The initial payment is 337177 cents. The first adjustment is payment 85. Start month 10. January payments inside the fixed period are 3, 15, 27, 39, 51, 63, and 75. Payment 87 is not an input.

    **F1.** Minimum payment 243061 at 2.5%. Maximum payment 503771 at 10.875%. Changes -94116 and +166594. `even_out_cents` 82321. At that extra the payment is 419498, equal to 337177 + 82321. At 82320 the payment is 419499, above 337177 + 82320. Paying 166594 instead makes the payment 333226, against a target of 503771. `even_out_cents` stays 82321 and `first_adjustment.max_payment_cents` stays 503771 when the schedule extras are $100 in months 1 through 12 and the index at 85 is 4.42. That schedule's own month-85 payment is not 503771.

    **F2.** Yearly 25000 cents in month 1, start month 10. `monthly_extra_cents` 81249. The payment is 418426, equal to 337177 + 81249. `even_out_cents` stays 82321.

    **F3.** Yearly 120000 cents in January. `monthly_extra_cents` 77176. The payment is 414352, one cent under 337177 + 77176. At 77175 the payment is one cent over. The result is 77176, not 77175.

    **F4.** Yearly 2000000 cents in January. `monthly_extra_cents` is 0. With no monthly extra the payment is 330235, already below 337177.

    **F5.** Caps 2/2/5. Maximum payment 400385 at 7.875%, change +63208. Not 503771. `even_out_cents` 34852. The payment is 372028, one cent under 337177 + 34852. At 34851 the payment is one cent over.

    **F6.** Margin 3% and lifetime cap 3%, floors 2.5%. `ceiling_percent` 8.875, `floor_percent` 2.5. Minimum rate 3%, payment 255926, change -81251. Not the 2.5% payment. Maximum payment 433797, change +96620.

    **F7.** First-adjustment floor 4%, lifetime floor 2.5%. `floor_percent` stays 2.5. Minimum payment 282810 at 4%, change -54367.

    **F8.** Initial cap 0 and lifetime cap 0. `even_out_cents` 0. Maximum change 0. Minimum change -94116.

    **F9.** No `adjustmentStats`, or `yearlyExtraCents` 0, matches F1's `monthly_extra_cents` of 82321.

    **F10.** Initial cap 1%, lifetime cap 5%, first-adjustment floor 8%, lifetime floor 2.5%. Both walks return 404499 cents at 8%. Both changes are +67322. The ceiling line's floor stays 2.5%.

    At 7.375% with the other F1 terms, the page lines are `Ceiling 12.375% · Floor 2.5%` and `-$1,445.68 to +$1,788.74`. With the rate at 5.875% and the fixed period at 10 years, the line is `First adjustment November 2036 (payment 121) · -$852.58 to +$1,494.94`.

11. **Docs, on the implementation.** `AGENTS.md` names the new `arm` fields, the three flags, and the page lines. It says the page reads `buildReport` and the skill reads the CLI. Things agents get wrong: do not set the even-out extra equal to the no-extra jump; do not re-amortize a 2/2/5 first adjustment at the lifetime ceiling; do not show the lifetime-floor payment when the margin keeps the rate above that floor; do not solve the extra in the page or the skill; do not write the figures into the schedule or the Extra Payments form; do not add a Node API to `amortize.js`; do not name a credit union. The six-argument `buildReport` signature string stays at two occurrences unless a sentence has to repeat it, in which case the assertion changes in that same commit. `README.md` documents the three flags. `REVIEW.md` Compliance names `intent/arm-adjustment-stats/`. Bugs names an even-out extra equal to the no-extra jump, a figure the skill or the page computes instead of reading, a displayed payment that is not the walk's `payment_cents`, and a figure written into the schedule or the Extra Payments form.

## 6. Acceptance criteria

| AC | Check |
|---|---|
| AC1 | `node --test`: F1 through F10 on `buildReport`. F1 stays 82321 and 503771 when the schedule has the first-year $100 and an index of 4.42 at month 85. The fixed-rate summary, CSV, and JSON hashes stay `adc8f5d8b2e6695d469ad69923bc4ef46ef2b4677a58c89fc57fd02c8d540ad5`, `d3129f7e97827934a05d350a599c3b375c2296a604ca0ec076ff2c3920cea620`, and `8a214dc5815a70c16721113f23c186b90340d7ec633c017209f1915860819292`. |
| AC2 | The sheet-loan summary is 15 lines. The four existing ARM lines stay after `Months saved`, and the four new lines are the requirement 6 block. `--even-yearly 250 --even-month 1 --start 2026-10` sets `monthly_extra_cents` to 81249 and leaves `even_out_cents` at 82321. The CSV header is unchanged. A positive `--even-yearly` without `--even-month` or `--start` exits non-zero and names each missing flag. `--even-month` without `--even-yearly` names `--even-yearly`. |
| AC3 | The skill text tells the runner to read `arm.even_out_cents`, `arm.monthly_extra_cents`, and `arm.first_adjustment`, to ask for a missing start month, and not to write the extra into the CSV. It still contains `the only arithmetic this skill does`. |
| AC4 | Playwright, clock 2026-10-15, rate `5.875`, product ARM: the F1 page lines and `Monthly extra $823.21` while the yearly input is empty and the month is January. Filling `250` shows `Monthly extra $812.49`. `#extra-yearly` and the extra for month 1 stay empty. Apply of `100` and index `0` on month 85 leave `Even-out extra $823.21`. A fixed loan has no `#arm-even-yearly`. |
| AC5 | A stored `arm` with no `evenYearly` and no `evenMonth` loads `""` and `1` and still loads. `250` survives a reload. Two ARM scenarios that differ only in `evenYearly` differ. The existing ceiling and first-adjustment assertions use the requirement 10 sentences, including `Ceiling 12.375% · Floor 2.5%`, `Ceiling 10.875% · Floor 2.5%`, `Ceiling 8.875% · Floor 2.5%`, and the November 2033 and November 2036 lines. `apps/web/package.json` is `0.12.0` and `PAGES_POINT_VERSION` is `0.12`. |
| AC6 | Playwright: initial cap and lifetime cap `0` show `Even-out extra $0.00` and a first-adjustment line ending `-$941.16 to $0.00`. Filling `nope` shows the dollar-amount alert, and the monthly-extra line stays on the last valid amount. |

## 7. Design decisions

**D1 — The walk in `amortize.js` is the formula.** Each probe is a walk, and the compared payment is that walk's cent-rounded `payment_cents`. A solver in the page or the skill was rejected because the request puts one formula in the library, has the page import it, and has the skill run the command-line tool. A seventh `buildReport` argument was rejected so the six-argument signature, and the fixed-rate hashes, stay put. `adjustmentStats` is optional input on the arm object. The file stays free of Node APIs. Checked 2026-10-16 against `buildReport`.

**D2 — The maximum is the worst case at the first adjustment.** The request's ceiling-rate payment is that payment. On the sheet's 5/2/5 terms the no-index walk reaches 10.875% and 503771 cents. On 2/2/5 it reaches 7.875% and 400385 cents. Re-amortizing at the lifetime ceiling when the initial cap is lower was rejected. When the first-adjustment floor sits above the cap upper, the walk's rate is that floor (F10, 8% and 404499), not the cap upper.

**D3 — The minimum is an index of zero on this loan.** The lowest legal index is 0. The walk then applies the margin, the round-to-eighth flag, the caps, and the first-adjustment floor. F6 is the case a probe that ignored the margin gets wrong: the rate is 3%, not 2.5%. F7 is the case the printed lifetime floor and the minimum payment use different floors.

**D4 — The extra is the smallest cent that does not leave a higher reset payment.** Exact equality is used when a cent hits it (F1, F2). When the neighbors are each one cent off, the cent that leaves the reset payment at or below the initial payment plus the extra is the one that evens the adjustment (F3, F5). The no-extra jump was rejected: on F1 it is 166594 cents and the payment falls to 333226. The extra is paid only in months 1 through the fixed period. The dollar amount uses the string conversion so the cent that satisfies the walk is the cent in these fixtures.

**D5 — The yearly amount is only a balance change, and the calendar rule lives in the library.** The equality stays initial principal and interest plus the monthly extra. Payment 1 is the month after `startMonth`, so the page passes `10` for an October start and does not also add one. Months after the fixed period are left out. An empty yearly amount is the F1 extra again (F9). A yearly amount that already holds the reset payment at or below the initial payment leaves the monthly extra at 0 (F4).

**D6 — The figures are not the schedule.** The schedule extras and the stored index stay out of the probe, so F1's index and $100 do not move `even_out_cents`. Writing the solved extra into `--extra` or the column was rejected. The CSV header stays the ten ARM columns.

**D7 — The skill only reads.** It passes `--even-yearly`, `--even-month`, and `--start` when the user gave a yearly extra, and it asks when the start month is missing. Computing `E` in the skill, or inventing October 2026, was rejected.

**D8 — The lifetime floor is the floor beside the ceiling.** The ceiling is the lifetime ceiling, so the rate beside it is `floor_percent`. The first-adjustment floor is the lower bound inside the minimum walk.

**D9 — The point version stays 0.12.** This docs pull request and the implementation pull requests leave `0.12.0` and `PAGES_POINT_VERSION` `0.12` as they are.

## 8. Open questions

None.
