# plan.md — ARM prevailing extra on the fixed period

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The window is `min(payoff_month, fixed_months)` on an ARM report (D1), read from `report.arm.fixed_months` inside `prevailingExtraCents` (D2). The modal payment keeps its full payoff count (D4).

The build starts when the owner says to build. The phase below is its own pull request, merged when CI is green. This design pull request is not that phase. It does not change `apps/web/package.json` or `PAGES_POINT_VERSION`. It does not start a Pages build. The page phase sets `0.14.0` and `0.14`.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Unit: F1 through F10, the stored-ARM fixed product, the existing fixed-rate cases, and `levelArmExtras` agreeing with the months 1–84 map | 0 |
| AC2 | Playwright: level checkbox on, $100, scenario name, summary cents, PE segment, month 1 and month 85, no schedule column | 0 |
| AC3 | Playwright: checkbox off, $100 every month, summary `$4,388.02` and scenario `$4,388` | 0 |
| AC4 | `node --test`, page unit tests, Playwright, no calculator or skill diff, version `0.14` | 0 |

## Phase 0 — Page

Files: `apps/web/src/loan.ts`, `apps/web/unit/loan.ts`, `apps/web/e2e/arm-fixed-period-pe.spec.ts` (new), `apps/web/package.json`, `.github/workflows/publish-gh-pages-production.yml`, `AGENTS.md`, `REVIEW.md`

1. In `prevailingExtraCents`, when `report.arm` is present set `n` to the lesser of `report.payoff_month` and `report.arm.fixed_months`. When it is absent, keep `n` as `payoff_month`. Slice `report.schedule` to `n` and keep the positive-`extra_cents` grouping and the `c * 5 >= n * 4` test (requirements 1 and 2, D1–D3). Do not add a parameter. Do not change `modalPaymentCents` (requirement 4, D4). Do not read the checkbox, `appliedLevel`, or the index (requirement 5, D5).
2. Unit tests in `apps/web/unit/loan.ts` for F1 through F10, using `scenarioFigures` on a scenario whose applied map is the fixture. Build the ARM with `defaultArm()`, `enabled` true, and `armStored` true, and override `fixedYears` for the 60-month cases. F1’s fixed product keeps `enabled` false while the ARM draft is still stored, and asserts prevailing extra 0. Assert F2’s modal 493534 and total 595159, F6’s 10000 rather than 50000, F7’s 100 and 0, F8’s 57000000, F9’s 500000, and F10’s 490000. Call `levelArmExtras` from month 1 with monthly 100 and yearly 0 and assert month 85 is absent and `scenarioFigures` matches the hand-built F2 map (AC1). Leave the existing fixed-rate tests in place.
3. Playwright in `apps/web/e2e/arm-fixed-period-pe.spec.ts`, clock `2026-10-15`, blocking foreign hosts the way `extra-level.spec.ts` does. Start from the fresh loan, set `#product` to ARM and `#rate` to `5.875`, and wait on `Ceiling 10.875% · Floor 2.5%`. Open Extra Payments. For AC2, check `#extra-level`, fill `#extra-monthly` with `100`, leave the yearly amount empty, and Apply. Expect `#scenario`’s accessible name `1: $5,952 - 600K | 5% down | 5.875% | 30 years | 7/1`, the Monthly payment region to contain `$5,951.59` and `$100.00 PE`, and the summary bar’s name to be `Principal and interest $4,935.34, Taxes and insurance $916.25, Prevailing extra $100.00` with the PE segment’s `flex-grow` `10000`. Month 1’s extra, in the open 2026 year, is `100.00`. Month 85’s extra, in the open 2033 year, is empty. `columnheader` named `Prevailing extra` has count 0. The heading line does not contain `= $5,952 / month`. For AC3, leave the checkbox off, Apply `$100`, and expect the Monthly payment region to contain `$4,388.02` and `$100.00 PE` and `#scenario`’s name `1: $4,388 - 600K | 5% down | 5.875% | 30 years | 7/1`.
4. `AGENTS.md` and `REVIEW.md` follow requirement 7. Record the app version as 0.14 and leave the 0.13 sentence on the adjustment-stats bullet. Set `apps/web/package.json` to `0.14.0` and `PAGES_POINT_VERSION` in `.github/workflows/publish-gh-pages-production.yml` to `"0.14"`. That is the only workflow edit.

DoD: `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `node --test` exits 0. `apps/web/package.json` is `0.14.0` and `PAGES_POINT_VERSION` is `0.14`. The diff does not contain `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, or `.agents/skills/`.
