# plan.md — ARM prevailing principal and interest

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. An ARM report’s prevailing principal and interest is `monthly_payment_cents` (D1). The fixed path stays the current count (requirement 2). The Highest payment line stays the schedule walk’s maximum (D4). The level-extra checkbox is not an input (D5).

The build starts when the owner says to build. The phase below is its own pull request, merged when CI is green. This design pull request is not that phase. It does not change `apps/web/package.json` or `PAGES_POINT_VERSION`. It does not start a Pages build. The page phase sets `0.15.0` and `0.15`.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Unit: S1 through S8, including the stored-ARM fixed product and the month-1 lump | 0 |
| AC2 | Playwright: 5.5% ARM, November 2026 start, no extra, dropdown, summary, Highest payment | 0 |
| AC3 | Playwright: import the S1 document, dropdown, summary, Highest payment, two schedule rows | 0 |
| AC4 | Playwright: 5.875% 7/1 totals, fresh-rate ARM total, existing $100 fixed-period extra totals | 0 |
| AC5 | `node --test`, page unit tests, Playwright, no calculator implementation or test diff, no skill diff, version `0.15` | 0 |

## Phase 0 — Page

Files: `apps/web/src/loan.ts`, `apps/web/unit/loan.ts`, `apps/web/e2e/arm-fixed-period-pi.spec.ts` (new), `apps/web/e2e/arm.spec.ts`, `apps/web/e2e/arm-fixed-period-pe.spec.ts`, `apps/web/package.json`, `.github/workflows/publish-gh-pages-production.yml`, `AGENTS.md`, `REVIEW.md`

1. In `modalPaymentCents`, when `report.arm` is present return `report.monthly_payment_cents` (requirement 1, D1). Leave the existing loop in place for a report with no `arm` key (requirement 2, D2). Do not add a parameter. Do not read a checkbox, `appliedLevel`, or the index (D5). Do not change `prevailingExtraCents`.
2. Unit tests in `apps/web/unit/loan.ts`. Build S1 from the page’s $600,000 / 5% down loan: `draft.rate` `"5.5"`, `draft.start` `"2026-11"`, `defaultArm()` with `enabled` true and `armStored` true, and `$823.60` in `applied` for months 1–84 only. Assert modal 323640, prevailing extra 82360, and total 497625. Build that same map’s `buildReport` and assert `arm.max_payment_cents` 406000 and `arm.max_payment_month` 85. Assert `paymentDate("2026-11", 85)` is `{ year: 2033, month: 12 }`. A month-1 lump of 570000 on that ARM asserts modal 323640. S2 is that ARM with an empty applied map: modal 323640 and total 415265. Change the existing 5.875% no-extra test from modal 503771 and total 595396 to 337177 and 428802 (S3). Change the months 1–84 `$100` test from modal 493534 and total 595159 to 337177 and 438802 (S4). Add S5 at rate `"7.375"`, product ARM, empty applied map: modal 393685 and total 485310. Leave the 15-year fixed-period assertions at modal 337177 and total 428802, and retitle that test so it records the initial payment (S6). The `$1` boundary totals become 428902 for months 1–68 and 428802 for months 1–67 (S7). Leave the fixed-rate modal assertions at 393685, including the stored ARM draft with `enabled` false (S8).
3. Playwright in `apps/web/e2e/arm-fixed-period-pi.spec.ts`, clock `2026-10-15`, blocking foreign hosts the way `arm-fixed-period-pe.spec.ts` does. For AC2, start from the fresh loan, set `#rate` to `5.5` and `#product` to ARM, and set the start month to November 2026 with `setStartMonth`. Wait on `Ceiling 10.5% · Floor 2.5%`. The Monthly payment region contains `$4,152.65` and `$3,236.40 PI`. The summary bar’s name is `Principal and interest $3,236.40, Taxes and insurance $916.25`. `#scenario`’s accessible name is `1: $4,153 - 600K | 5% down | 5.5% | 30 years | 7/1`. Highest payment contains `$4,869.46 from December 2033`. For AC3, import a version-2 document with one scenario: `price` `"600000"`, `down` `"5"`, `years` `"30"`, `rate` `"5.5"`, `start` `"2026-11"`, `fico` `"780"`, `extras` and `applied` both `[[month, 823.6], …]` for months 1 through 84, `openYears` null, and `arm` enabled with the page’s default term strings (`fixedYears` `"7"`, `adjustMonths` `"12"`, `margin` `"2.5"`, caps `"5"`, `"2"`, `"5"`, floors `"2.5"`, `roundEighth` false, `index` `[]`, `evenYearly` `""`, `evenMonth` 1, `open` true). Omit `picture`. Omit `level` and `appliedLevel`. The import control is the existing Export and import menu. After import, the Monthly payment region contains `$4,976.25` and `$3,236.40 PI`. The summary bar’s name is `Principal and interest $3,236.40, Taxes and insurance $916.25, Prevailing extra $823.60`, and the PI segment’s `flex-grow` is `323640`. `#scenario`’s accessible name is `1: $4,976 - 600K | 5% down | 5.5% | 30 years | 7/1`. Highest payment contains `$4,060.00 from December 2033`. The row named like `Dec 2026` contains `$3,236.40`. The row named like `Dec 2033` contains `$4,060.00`.
4. In `apps/web/e2e/arm.spec.ts`, the Monthly payment text `$5,953.96` becomes `$4,288.02` in both tests that have it. Leave the Highest payment text `$5,037.71 from November 2033`. The Monthly payment text `$6,641.84` becomes `$4,853.10`. Leave `$5,725.59 from November 2033`. The Monthly payment text `$4,597.73` becomes `$4,288.02`: that assertion follows an invalid rate edit that keeps the 5.875% note, and the initial payment plus taxes and insurance is `$4,288.02`. In `apps/web/e2e/arm-fixed-period-pe.spec.ts`, the `$100` fixed-period case changes the scenario name’s dollar from `$5,952` to `$4,388`, the Monthly payment text from `$5,951.59` to `$4,388.02`, and the bar’s principal and interest from `$4,935.34` to `$3,371.77`. Leave the prevailing extra `$100.00`, month 1’s `100.00`, month 85’s empty extra, and the `$100` every-month case at `$4,388.02` and `$4,388`. Do not add a test whose subject is the level-extra checkbox.
5. `AGENTS.md` and `REVIEW.md` follow requirement 7. In the architecture paragraph, record that an ARM’s prevailing principal and interest is the applied-map report’s `monthly_payment_cents`. A fixed-rate loan still uses its one scheduled payment. The Highest payment line stays the schedule walk’s maximum. Record the app version as 0.15 and leave the 0.14 sentence on the fixed-period prevailing-extra bullet. In Things agents get wrong, remove the warning against windowing the modal payment to the fixed period. Add the four warnings in requirement 7. Keep the payoff-month principal-plus-interest warning. Set `apps/web/package.json` to `0.15.0` and `PAGES_POINT_VERSION` in `.github/workflows/publish-gh-pages-production.yml` to `"0.15"`. That is the only workflow edit.

DoD: `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `node --test` exits 0. `apps/web/package.json` is `0.15.0` and `PAGES_POINT_VERSION` is `0.15`. The diff does not contain `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, `.agents/skills/`, `amortize.test.js`, `compound_interest_monthly.test.js`, `origination_fees.test.js`, or `arm_loan_concepts.test.js`. A passing `node --test` after an edit to one of those test files does not meet this check.
