# spec.md — Extra savings column

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-03) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

The amortization schedule gains a column immediately after Extra payment. The cell is the lifetime interest saved by that month's requested extra, given every other extra on the schedule. It is the difference between two `buildReport` results. The command-line JSON does not change.

## 2. Goals and non-goals

**Goals**

- G1. Show, on each schedule row, how much interest that row's extra payment saves over the life of the loan.
- G2. Recompute the column when the loan or any extra changes.
- G3. Keep the summary's Interest saved as the savings of the whole plan.

**Non-goals**

- A second amortization formula.
- A new field on `--json` or in the `--schedule` CSV.
- Putting this figure on the chart card.
- Summing the column into the year row or into the summary.
- Changing what `interest_saved_cents` means on a schedule row. That field stays the cumulative difference against the no-extra loan.

**Release phasing.** G1–G3 are this release.

## 3. Principles

- P1. Both interest totals come from `buildReport`. The page subtracts those reported cent totals. It does not subtract the unrounded walk.
- P2. The column is marginal. Removing that month's extra and leaving the rest of the map is the counterfactual.
- P3. The summary's Interest saved stays `interest_saved_cents` for the whole map. It is not the sum of the column.
- P4. A requested extra of zero saves nothing. The cell is $0.00. No second walk is required for that row.

## 4. Users and scenarios

- The owner sets only month 1's extra to $100 on the $570,000, 7%, 30-year loan. The new cell shows $706.94. The summary's Interest saved shows the same $706.94, because that extra is the whole plan.
- The owner then puts $100 on each of months 1 through 12. Month 1's cell falls to $697.61. Month 12 shows $648.18. Month 13 shows $0.00. The summary still shows $8,137.70.
- The owner applies $100 on every month. Month 1 shows $585.67. The summary shows $76,366.09. Month 332, the payoff month, shows $0.00.
- The year row does not add the column up.

## 5. Functional requirements

1. The schedule columns are, in order: `#`, Date, Principal, Interest, Extra payment, Saved by extra, Principal balance, Interest balance. Saved by extra is immediately to the right of Extra payment.

2. For a month whose requested extra is zero or absent, Saved by extra is 0 cents and is displayed as $0.00.

3. For a month whose requested extra is positive, Saved by extra is `interest_cents` from `buildReport` on the same principal, rate, and month count with that month removed from the requested-extra map, minus `interest_cents` from `buildReport` on the full map. The page uses `loanReport` for both calls. Other months in the map stay as they are. The result is an integer number of cents. A negative result is shown as a negative amount; the checked fixtures are positive or zero.

4. The column uses `formatGroupedCents` through the page's existing money formatter. It is not an editable field.

5. Editing a loan input, committing an extra cell, or clicking Apply recomputes every Saved by extra cell. A keystroke in an extra cell that has not been committed leaves the column on the last committed map.

6. The year row's Saved by extra cell is empty. It is not the sum of the months in that year. Checked 2026-10-03: the twelve marginal savings inside the first-year $100 plan add to $8,071.88, and the plan's lifetime savings are $8,137.70.

7. The summary's Interest saved is unchanged. It remains the full map's `interest_saved_cents`.

8. `--json` and the `--schedule` CSV gain no field. `interest_saved_cents` on a schedule row stays the cumulative figure. `node --test` stays green, including the recast and `--months` tests.

9. Checked 2026-10-03 with `buildReport(570000, 7, 360, map, 30)` on the current `amortize.js`:
   - $100 only in month 1: the cell and the summary are both 70694 cents ($706.94).
   - $100 only in month 12: 65693 cents ($656.93).
   - $100 only in month 180: 18489 cents ($184.89).
   - $100 in each of months 1–12: month 1 is 69761 cents ($697.61), month 12 is 64818 cents ($648.18), month 13 is 0, and the summary is 813770 cents ($8,137.70). The cumulative `interest_saved_cents` on month 1 of that plan is 0 and on month 12 is 3926 cents ($39.26). The column must not show those cumulative amounts.
   - $100 in every month 1–360: the summary is 7636609 cents ($76,366.09), month 1's cell is 58567 cents ($585.67), and month 332's cell is 0. Month 332 is the payoff month. That extra replaces principal the scheduled payment would have paid in the same month, and no later month is left to charge less interest.

## 6. Acceptance criteria

The example loan is purchase price $570,000, 0% down, 30 years, 7%, start month October 2026, unless a row says otherwise.

| ID | Check |
|---|---|
| AC1 | A unit test, calling `buildReport` for both sides, reports 70694 cents for $100 only in month 1, 65693 cents for month 12 alone, and 18489 cents for month 180 alone. For $100 in months 1–12 it reports 69761, 64818, and 0 for months 1, 12, and 13. The sum of those twelve cells is not 813770. |
| AC2 | On the page, with only month 1 set to $100, Saved by extra on month 1 is $706.94 and the summary Interest saved is $706.94. Month 2 is $0.00. The 2026 year row's Saved by extra cell is empty. |
| AC3 | With $100 in months 1–12 and nowhere else, the page shows $697.61 on month 1, $648.18 on month 12, $0.00 on month 13, and summary Interest saved $8,137.70. |
| AC4 | Apply of $100 monthly on the example loan shows $585.67 on month 1 and summary Interest saved $76,366.09. The payoff row's Saved by extra is $0.00. |
| AC5 | `node --test` exits 0. A `--json --schedule` run of the example loan has the same keys as before this change. |
| AC6 | After the merge, https://nikolaybotev.github.io/compound/ with start month October 2026 and only month 1's extra set to $100 shows $706.94 in Saved by extra. |

## 7. Design decisions

**D1 — A new intent on the shipped page.** The column is a change to the page specified in `intent/amortization-app/`. That folder still describes the first release's columns. This folder adds one.

**D2 — One counterfactual per extra.** Saved by extra is the full map's reported interest minus the reported interest of that same map with this month deleted. Checked against `buildReport` on 2026-10-03. The numbers are in requirement 9.

**D3 — The cumulative column is a different number.** `interest_saved_cents` on month 1 of the first-year plan is 0. This column on that same row is $697.61. The page keeps the cumulative field inside the calculator and does not display it in this column.

**D4 — The year row stays blank.** Adding the cells does not produce the plan's lifetime savings, and it does not produce that year's share of it. The year row already sums principal, interest, and extra. This column is left empty there.

**D5 — The header is "Saved by extra".** The summary already says Interest saved for the whole plan. The same words on the row would read as that running total. The row header names the extra.

**D6 — Zero extra is $0.00, without a second walk.** A blank cell would look like a missing value. $0.00 says the month has no extra and therefore saves nothing.

**D7 — The CLI contract is unchanged.** The page can derive the column from `loanReport`. Adding a JSON field would make every `--json` consumer carry a number the command line was not asked to print.

**D8 — An extra on the payoff month can save $0.00.** Checked 2026-10-03: $100 on every month pays the example loan off in month 332, and removing month 332's $100 does not change total interest. The scheduled payment finishes that month either way, and the extra is applied after the interest. The cell shows $0.00. That is the calculation, not a hole in the column.

## 8. Open questions

None.
