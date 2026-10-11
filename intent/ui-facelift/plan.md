# plan.md — UI facelift

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

This design pull request adds `intent/ui-facelift/` only. It does not implement the page, it does not start a build, and it does not change `apps/web/package.json` or `PAGES_POINT_VERSION`. Both stay 0.7. The build starts when Nikolay says to start. The pull request that ships the page sets the point version to 0.8.

## Stops

None. The 360/365 dropdown is decided. It stays on the prepaid-interest line. The cash-to-close gap on the pictured 20% down loan is $20.15, and that is not a reason to drop the control.

## Process

The build starts when Nikolay says to start. Four phases, four pull requests into `main`, each merged when CI is green, in this order: header and scenario row (0), summary and chart (1), taxes, extra payments, and closing costs (2), FICO, PMI, and the extra-form color (3). Each build phase edits only `apps/web/**`, `AGENTS.md`, `REVIEW.md`, and this file, plus the version files named in Phase 3. `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, the skills, and `node --test` have no diff in any phase (AC12). `intent/loan-scenarios/`, `intent/amortization-app/`, `intent/complete-loan-picture/`, `intent/ui-followups/`, and `intent/arm-loan/` are not edited. Where this spec changes a sentence of theirs, D22 names it and this spec wins.

Do not drop `#picture-interest-basis`. Do not round a 360 per diem to the cent before multiplying. Do not single-round the 365 charge. Do not replace the 780+ ladder with the Arch 760+ column. Do not put the summary or the chart above Extra Payments.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Unit: PMI thousandths for every band and rung, 780+ unchanged, 20% down is 0, fresh-loan cents 16625 and 25175 | 3 |
| AC2 | Unit: 360 and 365 prepaid interest, including 175156, 175680, 178125, 147500, 145485, and a zero day count | 2 |
| AC3 | Playwright: title, unnumbered `#scenario` under the title, heading text, no complete-payment span, no legend, one font size. The FICO segment of the heading is Phase 3 | 0 (title, row, heading without FICO), 3 (`780 FICO`) |
| AC4 | Playwright: section order, closed disclosures, old title and FHA rows gone | 2 |
| AC5 | Playwright: `$4,853.10`, PI and TI labels, no PE label, three zero rows | 1 |
| AC6 | Playwright: numbered open row, ink selected row, shared font weight, hover-only trash, remove dialog, export menu | 0 |
| AC7 | Playwright: `$5,853.10` and the PE label; `28 (2 years 4 months)`; `0` | 1 |
| AC8 | Playwright: `87: Jan 2034`; hooded figure faces the pig | 1 |
| AC9 | Playwright: edited blue on the three extra-form fields, cleared by Apply and by restoring the value | 3 |
| AC10 | Playwright: 20% down closing figures, basis select on the prepaid-interest row, 365 then back to 360 | 2 |
| AC11 | Playwright: range 740 writes 740 and `0.53%`; 800 keeps `0.35%`; a hand edit sticks until the down payment changes | 3 |
| AC12 | `node --test`, page unit, page e2e; no `amortize.js` diff; version stays 0.7 until Phase 3 sets 0.8 | 0, 1, 2, 3 |
| AC13 | `AGENTS.md` and `REVIEW.md` sentences | 3 |

## Phase 0 — Title, scenario row, and heading

Files: `apps/web/src/app.tsx`, `apps/web/src/scenarios.tsx`, `apps/web/src/styles.css`, `apps/web/e2e/page.spec.ts`, `apps/web/e2e/scenarios.spec.ts` (or the scenario specs that already cover the list)

1. Move the `h1` above the scenario row. Set its text to `Compound` and add the tagline `A mortgage amortization calculator` in muted type at weight 400, smaller than the title, wrapping under the title when the line is narrow (requirement 2, D1, D20).
2. Make `#scenario` flex to fill the row, and put a down arrow inside its right end. Move Export and Import into a menu button at the row's end, accessible name `Export and import`. Keep the hidden file input and the current export bytes (requirement 3, D2).
3. Number open rows `1: ` plus the existing label. Leave `scenarioLabelText` and the closed button unnumbered. Paint the selected row with `var(--ink)` and `var(--card)`, and remove the bold rule. Render no trash button on the selected row. On the others, show it only on row hover, not on focus and not under `(hover: none)`, and keep it out of the tab order (requirement 4, D3).
4. Split the remove dialog into the question `Remove scenario {n}?`, a blank line, and the unnumbered label (requirement 5, D4).
5. Rebuild the heading line without the payment, the heading bar, and the legend. Put `#years` on the line as `-year` plus the product, and `#start` at the end as `starting {long date}`. One font size for the line and its controls (requirement 6, D5, D21). Leave the FICO segment for Phase 3. The ARM structure label stays between the term and `#product`.
6. Playwright for AC3 except the FICO words, and for AC6.

DoD: `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. The fresh visit shows Compound above the scenario control and the heading without a dollar amount. `git diff --stat main` touches nothing outside `apps/web/`, `AGENTS.md`, `REVIEW.md`, and `intent/ui-facelift/`.

## Phase 1 — Summary and chart

Files: `apps/web/src/app.tsx`, `apps/web/src/chart.tsx`, `apps/web/src/icons.tsx`, `apps/web/src/loan.ts`, `apps/web/src/styles.css`, `apps/web/unit/loan.ts`, `apps/web/e2e/page.spec.ts`, `apps/web/e2e/extras.spec.ts`

1. Show the prevailing total in cents as Monthly payment. Put the prevailing bar on that line, filling the remaining width, with `$3,936.85 PI` style labels above the segments. Omit a zero PE segment and its label (requirement 10, D6, D7).
2. Always render Extra principal paid, Interest saved, and Months saved. Format months saved as the bare count under 12 and `{count} ({yearsAndMonths(count)})` from 12 up (requirement 10, D8).
3. Remove the ARM note under Monthly payment. Leave Highest rate and Highest payment (D7).
4. Prefix the chart popup heading with the payment number and `: ` (requirement 11, D16). Mirror the hooded figure so it faces right, the same way the pig faces, if it does not already (requirement 11).
5. Playwright for AC5, AC7, and AC8. Update assertions that still expect the summary payment to be `$3,936.85` or the months-saved text to be `2 years 4 months` without the leading count.

DoD: the same three commands exit 0. The fresh summary reads `$4,853.10`, and the $1,000-every-month loan reads `$5,853.10` with a PE label.

## Phase 2 — Taxes, Extra Payments, and Closing Costs

Files: `apps/web/src/app.tsx`, `apps/web/src/picture.ts`, `apps/web/src/loan.ts`, `apps/web/src/styles.css`, `apps/web/unit/picture.ts`, `apps/web/e2e/picture.spec.ts`

1. Rename and reorder the disclosures to requirement 1 and requirement 12. Taxes and Insurance keep property tax (with the Nashua and Brentwood note), home insurance, and Conventional PMI. Drop the other rows, the Conventional label, FHA MIP, and upfront MIP. Stop adding upfront MIP to the financed principal (requirement 13, D14, D17).
2. Put `%` immediately to the right of the tax and insurance inputs, and right-align the PMI percent in that column (requirement 13). The PMI percent stays computed from the 780+ ladder until Phase 3.
3. Add Closing Costs under the chart and above the schedule, closed when `closingOpen` is absent. Add the unit suffixes, the insurance month count default 12, the tax month count default 4, and the cushion dollar default `1500` (requirement 14, D13).
4. Add `picture-interest-days`, default `15`, and `picture-interest-basis`, options `360` and `365`, default `360`, on the same line as the day count (requirement 15, D12). Implement 360 as one half-up of base × rate × days ÷ 360. Implement 365 as half-up of the per diem, then times the days. Do not remove the select. The $20.15 gap on the 20% down loan is expected.
5. Unit tests for AC2. Playwright for AC4 and AC10, including choosing `365` and then `360` again.

DoD: the same three commands exit 0. On the 20% down loan, closing costs are `$19,175.00` and cash to close is `$139,175.00` at 360, and choosing 365 changes prepaid interest to `$1,454.85` and cash to close to `$139,154.85`. The basis select is on that row.

## Phase 3 — FICO, PMI, form color, and version 0.8

Files: `apps/web/src/app.tsx`, `apps/web/src/picture.ts`, `apps/web/src/loan.ts`, `apps/web/src/styles.css`, `apps/web/unit/picture.ts`, `apps/web/unit/loan.ts`, `apps/web/e2e/picture.spec.ts`, `apps/web/e2e/extras.spec.ts`, `apps/web/package.json`, `.github/workflows/publish-gh-pages-production.yml`, `AGENTS.md`, `REVIEW.md`

1. Add `#fico` and `#fico-range` to the heading where requirement 6 puts them, default `780`. Choosing a range writes that range's lower score (requirement 7, D9).
2. Replace the PMI rate with requirement 8's table. Refill only when the band or the down payment changes. A missing stored percent uses the ladder. A stored percent is kept (requirement 9, D10, D11).
3. Store the last-Apply snapshot for the three extra-form fields and paint `--edited` on the controls themselves while they differ (requirement 12, D15).
4. Set `apps/web/package.json` to `0.8.0` and `PAGES_POINT_VERSION` to `"0.8"` (requirement 18, D19). That is the only workflow edit. Feature publishes are not tagged.
5. Update `AGENTS.md` and `REVIEW.md` per requirement 18 and AC13. Unit tests for AC1. Playwright for the FICO half of AC3, plus AC9 and AC11.

DoD: the same three commands exit 0. The fresh heading includes `780 FICO`. Choosing 740–779 shows PMI `0.53%` at 5% down. `#extra-monthly` turns `rgb(29, 78, 216)` when it differs from the last Apply. The package version is `0.8.0` and `PAGES_POINT_VERSION` is `0.8`.
