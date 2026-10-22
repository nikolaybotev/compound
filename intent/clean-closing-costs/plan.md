# plan.md — Clean closing costs

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. Lender fees are one dollar amount, default $3,000 (D3). There is no percentage origination fee (D2). The clean fixture is 1657241 cents, quarter point excluded (D1, D5, D6). The prompt’s 1657240-cent table is not the assertion.

The build starts when the owner says to build. The phase below is its own pull request, merged when CI is green. This design pull request is not that phase. It does not change `apps/web/package.json` or `PAGES_POINT_VERSION`. It does not start a Pages build. The page phase sets `0.16.0` and `0.16`.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Unit: reference fixture, 1657241 clean, points 142500 outside that sum, interest 283050 not 283048, impound 49299 not 49300 | 0 |
| AC2 | Unit: fresh visit 1810240 above 1657241, 365 switch, calendar clamps, negative proration, `-$813.92` | 0 |
| AC3 | Unit: migration to `6900` / title `0.5`, existing `lenderFees` wins, missing picture is `3000`, no origination field on the draft | 0 |
| AC4 | Unit: seller-credit warning boundaries and the sentence | 0 |
| AC5 | Playwright: fresh Closing Costs dollars, no old controls, 365 then 360 | 0 |
| AC6 | Playwright: presets, 0.64925, November day counts, 20% down MI impound `$0.00` | 0 |
| AC7 | Playwright: warning, picture-less version-1 loan, imported old picture maps to `6900` | 0 |
| AC8 | `node --test`, page unit tests, Playwright, version `0.16`, no calculator or skill diff, no institution name | 0 |

## Phase 0 — Page

Files: `apps/web/src/picture.ts`, `apps/web/src/loan.ts`, `apps/web/src/app.tsx`, `apps/web/src/styles.css` only if the preset or the note needs a rule that the existing `.field select` and `.note` rules do not already give, `apps/web/unit/picture.ts`, `apps/web/e2e/picture.spec.ts`, `apps/web/package.json`, `.github/workflows/publish-gh-pages-production.yml`, `AGENTS.md`, `REVIEW.md`

1. In `picture.ts`, replace the closing inputs named in requirement 2. Keep tax, insurance, PMI, `title`, `interestBasis`, `open`, and `closingOpen`. Add the fields in requirement 13. Lender fees default `3000`. Title grammar accepts five decimal places and rejects six. Points stay on the three-decimal percent grammar. Proration accepts a leading minus. Closing day is 1 through 31. Impound months are 0 through 999, defaults 6, 3, and 2. `daysInMonth` uses the Gregorian rule in requirement 5. Do not use `31` for every month. Prepaid interest calls the existing `prepaidInterestCents360` and `prepaidInterestCents365` and does not add an end-round 365 path (D5). The twelve-month insurance line is `percentOfCents(priceCents, insuranceThousandths)` once. Each impound is the displayed monthly cents times its count, and the MI impound is 0 when the monthly PMI cents are 0 (D6). Do not add a percentage origination fee and do not add the points cents to closing costs (D2, requirement 10). `formatMoney` in `loan.ts` puts a minus before the dollar sign. Positive amounts stay as they are.
2. Load and save per requirement 13. `pictureFromStorage` takes the loan cents and the start month so the origination map and the closing-day clamp have them. A missing picture is the new defaults, not a 1% origination fee. A picture without `lenderFees` maps origination, missing as 1%, plus processing, missing as $1,200, into a dollar string. A valid `lenderFees` wins. Do not add a stored appraisal or recording amount. Do not copy `interestDays` into `closingDay`, `taxMonths` into the tax impound, or `cushion` into proration. The save omits the retired keys. `pictureDraftEqual` compares the new fields. The set key stays version 2 and the legacy key stays version 1. The two-key restore is unchanged (D13).
3. In `app.tsx`, rebuild the Closing Costs table in requirement 10’s order, with the ids and labels in requirements 3 through 10. The preset select writes `0.75`, `1`, or `0.40` and shows a blank option only when the percent matches none. Default selection is `50/50`. Show the start month’s long date, the day count (`1 day` or `{n} days`), and the static `12 months`. Clamp the closing day when the start month changes. The seller-credit note is requirement 9’s sentence, a note rather than `role="alert"`. An invalid closing field still names the field and keeps the last valid picture. Taxes and Insurance are unchanged. Do not put the institution’s name, a title company, or a street address in the page.
4. Unit tests in `apps/web/unit/picture.ts` for AC1 through AC4. Retire the assertions that the fresh closing total is 2035156 cents and that the 20% down closing total is 1917500 cents. Keep the monthly picture assertions that are not closing costs: principal and interest 393685, tax 57500, insurance 17500, PMI 16625, total monthly 485310, heading 4853. The reference fixture passes 197200 cents as the annual insurance. It does not type a percent to get $1,972. Assert `prepaidInterestCents365` is 283050 and that the end-round helper, if one is used only inside the test, is 283048 and is not the line. Assert November 2026 day 6 yields 25 days and `paymentDate("2026-11", 1)` is December 2026. Do not add `apps/web/test/` or a `*.test.ts` file that `node --test` collects. Do not name the institution, a title company, or a street address.
5. Playwright in `apps/web/e2e/picture.spec.ts`, clock `2026-10-15`. Replace the AC10 closing-cost assertions ($4,800 origination, $19,175 closing, $139,175 cash to close, day count 15) with AC5 and AC6. The start-month change uses `setStartMonth`. Replace the picture-less version-1 assertions that `#picture-origination` is `1` and that processing, appraisal, and recording are `1200`, `500`, and `800`: that loan shows lender fees `3000` and title `0.75` (AC7). Add the import of a version-2 document whose picture still has origination `1`, processing `1200`, and title `0.5` on price `600000`, down `5`, years `30`, rate `7.375`, start `2026-10`, and assert lender fees `6900`, title `0.5`, and closing day `1`. The seller-credit note appears and disappears on the boundaries in AC7. Block foreign hosts the way the other picture specs do.
6. `AGENTS.md` and `REVIEW.md` follow requirement 15. Describe the closing-cost form, the $3,000 default, the 1.00% buyer-pays-all preset, the 0.75% default preset, and the clean reference of $16,572.41 with the quarter point excluded. Say there is no percentage origination fee. Say the closing month is the start month. Leave the 0.15 sentence on the fixed-period principal-and-interest bullet and record this app version as 0.16. Things agents get wrong gains the warnings in requirement 15. Do not name the institution. `REVIEW.md` Compliance adds `intent/clean-closing-costs/`. Bugs adds a percentage origination fee, a clean total that includes the quarter point, a closing-cost total other than the fixture’s 1657241 cents on those inputs, a 365 charge that was single-rounded, and the institution’s name on the page. Set `apps/web/package.json` to `0.16.0` and `PAGES_POINT_VERSION` in `.github/workflows/publish-gh-pages-production.yml` to `"0.16"`. That is the only workflow edit. Do not start a Pages build.

DoD: `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `node --test` exits 0. `apps/web/package.json` is `0.16.0` and `PAGES_POINT_VERSION` is `0.16`. The diff does not contain `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, `.agents/skills/`, `amortize.test.js`, `compound_interest_monthly.test.js`, `origination_fees.test.js`, or `arm_loan_concepts.test.js`. The page, the tests, and `AGENTS.md` do not name the institution. A passing `node --test` after an edit to one of those calculator files does not meet this check.
