# plan.md — ARM prevailing extra on the fixed period

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 3 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The window is the lesser of `payoff_month` and `fixed_months` on an ARM report (D1). The first adjustment month stays out, and a configured `fixed_months` past payoff does not count the later zero rows. `prevailingExtraCents` reads `report.arm.fixed_months` and takes that lesser count (D2). The modal payment keeps its full payoff count (D4).

The build starts when the owner says to build. The phase below is its own pull request, merged when CI is green. This design pull request is not that phase. It does not change `apps/web/package.json` or `PAGES_POINT_VERSION`. It does not start a Pages build. The page phase sets `0.14.0` and `0.14`.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Unit: F1 through F11, the stored-ARM fixed product, the existing fixed-rate cases, and `levelArmExtras` agreeing with the months 1–84 map | 0 |
| AC2 | Playwright: level checkbox on, $100, scenario name, summary cents, PE segment, month 1 and month 85, no schedule column | 0 |
| AC3 | Playwright: checkbox off, $100 every month, summary `$4,388.02` and scenario `$4,388` | 0 |
| AC4 | `node --test`, page unit tests, Playwright, no calculator implementation or test diff, no skill diff, version `0.14` | 0 |

## Phase 0 — Page

Files: `apps/web/src/loan.ts`, `apps/web/unit/loan.ts`, `apps/web/e2e/arm-fixed-period-pe.spec.ts` (new), `apps/web/package.json`, `.github/workflows/publish-gh-pages-production.yml`, `AGENTS.md`, `REVIEW.md`

1. In `prevailingExtraCents`, when `report.arm` is present set `n` to the lesser of `report.payoff_month` and `report.arm.fixed_months`. When it is absent, keep `n` as `payoff_month`. Slice `report.schedule` to `n` and keep the positive-`extra_cents` grouping and the `c * 5 >= n * 4` test (requirements 1 and 2, D1–D3). Month `fixed_months + 1` stays outside that slice. A payoff inside the fixed period stops the slice at `payoff_month`, so the later zero rows are out. Do not add a parameter. Do not change `modalPaymentCents` (requirement 4, D4). Do not read the checkbox, `appliedLevel`, or the index (requirement 5, D5). An index commit rewrites from the first adjustment or later, so it leaves this figure unchanged whether or not the loan is still alive at the end of the fixed period.
2. Unit tests in `apps/web/unit/loan.ts` for F1 through F11, using `scenarioFigures` on a scenario whose applied map is the fixture. Start from the page’s $600,000 / 5% down loan and keep start `2026-10`. F1 stays that loan at note rate 7.375%, product fixed, with $100 in months 1–84. Its stored ARM draft stays present with `enabled` false, and the prevailing extra is 0. F2 through F11 set `draft.rate` to `"5.875"`. Build those ARM scenarios with `defaultArm()`, `enabled` true, and `armStored` true. `defaultArm()` has no rate, and the loan constructors are 7.375%. Leaving F2 at 7.375% makes the modal payment 560558 and the total 662183, not 493534 and 595159. F5 and F6 are a 60-month fixed period, so set `fixedYears` to `"5"`. The field is years. `"60"` is sixty years. `parseArm` rejects it because it is not shorter than the term, `scenarioFigures` drops the arm, and F6 is then the fixed-rate count that returns 50000. Assert F2’s modal 493534 and total 595159, F6’s 10000 rather than 50000, F7’s 100 and 0, F8’s 57000000, F9’s 500000, F10’s 490000, and F11’s 0 for $1 in months 1–67 and month 85. Call `levelArmExtras` from month 1 with monthly 100 and yearly 0 and assert month 85 is absent and `scenarioFigures` matches the hand-built F2 map (AC1). Leave the existing fixed-rate tests in place. The window is unchanged: `n` is the lesser of `payoff_month` and `fixed_months`, and month `fixed_months + 1` stays out.
3. Playwright in `apps/web/e2e/arm-fixed-period-pe.spec.ts`, clock `2026-10-15`, blocking foreign hosts the way `extra-level.spec.ts` does. Start from the fresh loan, set `#product` to ARM and `#rate` to `5.875`, and wait on `Ceiling 10.875% · Floor 2.5%`. Open Extra Payments. For AC2, check `#extra-level`, fill `#extra-monthly` with `100`, leave the yearly amount empty, and Apply. Expect `#scenario`’s accessible name `1: $5,952 - 600K | 5% down | 5.875% | 30 years | 7/1`, the Monthly payment region to contain `$5,951.59` and `$100.00 PE`, and the summary bar’s name to be `Principal and interest $4,935.34, Taxes and insurance $916.25, Prevailing extra $100.00` with the PE segment’s `flex-grow` `10000`. Month 1’s extra, in the open 2026 year, is `100.00`. Month 85’s extra, in the open 2033 year, is empty. `columnheader` named `Prevailing extra` has count 0. The heading line does not contain `= $5,952 / month`. For AC3, leave the checkbox off, Apply `$100`, and expect the Monthly payment region to contain `$4,388.02` and `$100.00 PE` and `#scenario`’s name `1: $4,388 - 600K | 5% down | 5.875% | 30 years | 7/1`.
4. `AGENTS.md` and `REVIEW.md` follow requirement 7. In the architecture paragraph, replace the sentence `Prevailing extra is the applied-map report's extra_cents on rows 1 .. payoff_month, grouped by amount: a positive amount counts only when c * 5 >= n * 4 for n equal to that report's payoff_month, not the parsed contract term.` The replacement keeps the applied-map `extra_cents`, the grouping, and `c * 5 >= n * 4`. It says an ARM’s `n` is the lesser of `payoff_month` and `arm.fixed_months`, and the rows are 1 through that `n`. A fixed-rate loan still uses `payoff_month`, and its rows are `1 .. payoff_month`. `n` is not the parsed contract term. Adding the new Things-agents-get-wrong bullets does not replace that sentence. The existing warning, `use payoff_month on the applied-extra report` rather than the parsed contract term, stays. Record the app version as 0.14 and leave the 0.13 sentence on the adjustment-stats bullet. Set `apps/web/package.json` to `0.14.0` and `PAGES_POINT_VERSION` in `.github/workflows/publish-gh-pages-production.yml` to `"0.14"`. That is the only workflow edit.

DoD: `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `node --test` exits 0. `apps/web/package.json` is `0.14.0` and `PAGES_POINT_VERSION` is `0.14`. The diff does not contain `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, `.agents/skills/`, `amortize.test.js`, `compound_interest_monthly.test.js`, `origination_fees.test.js`, or `arm_loan_concepts.test.js`. A passing `node --test` after an edit to one of those test files does not meet this check.
