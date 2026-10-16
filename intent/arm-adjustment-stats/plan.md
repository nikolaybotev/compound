# plan.md — ARM adjustment stats

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The formula is the walk in `amortize.js` (D1), and the even-out extra is the solved cent, not the no-extra jump (D4).

The build starts when the owner says to build. Each phase below is its own pull request, merged when CI is green, in order. This design pull request is not one of those phases. It does not change `apps/web/package.json` or `PAGES_POINT_VERSION`. It does not start a Pages build.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `node --test` on F1 through F10, the ignored schedule extras, and the three fixed-rate hashes | 0 |
| AC2 | Summary lines, JSON yearly flags, CSV header, and the missing-flag errors | 1 |
| AC3 | Skill phrases: read the fields, ask for the start month, do not write the CSV, keep the only-arithmetic sentence | 2 |
| AC4 | Playwright: F1 lines, `$812.49`, the extra form and month 1 untouched, Apply and index leave the even-out line | 3 |
| AC5 | Storage load, version files, and the existing ceiling and first-adjustment sentences | 3 |
| AC6 | Playwright: caps of 0, then an invalid yearly amount | 3 |

## Phase 0 — Library

Files: `amortize.js`, `amortize.d.ts`, `compound_interest_monthly.test.js`

1. Add `first_adjustment`, `even_out_cents`, and `monthly_extra_cents` to the ARM report inside `buildReport`. Leave the six-argument signature as it is. Read an optional `arm.adjustmentStats` of `{ yearlyExtraCents, yearlyMonth, startMonth }`. `validateArm` ignores that object. Do not import or call a Node API.
2. Implement spec requirements 2 through 5 by walking. The worst-case probe uses an empty extra map and an empty index. The minimum probe uses an empty extra map and an index of `0` at `fixedMonths + 1` only. The even-out search pays the string-converted dollars of the candidate in months `1` through `fixedMonths` only. A zero candidate omits the month. Compare `dollarsToCents` of the reset payment, or 0 when that reset is absent, with `monthly_payment_cents` plus the candidate. Return the smallest cent that passes, or 0 when the no-extra payment already passes. The yearly search adds `yearlyExtraCents` on the calendar months inside the fixed period. Payment `m` uses `((startMonth + m - 1) % 12) + 1`, and the caller passes the start month rather than the first payment month. Do not read `extrasByMonth` or `indexByMonth` for these fields, and do not write the probe onto the schedule.
3. Tests assert F1 through F10. Include F1's second walk with $100 in months 1 through 12 and index 4.42 at month 85: `even_out_cents` stays 82321 and `first_adjustment.max_payment_cents` stays 503771. Assert the three fixed-rate hashes and that a fixed-rate JSON has no `arm` key.

DoD: `node --test` exits 0. The diff does not contain `apps/web`, the skill, or `compound_interest_monthly.js`.

## Phase 1 — Command-line tool

Files: `compound_interest_monthly.js`, `compound_interest_monthly.test.js`, `README.md`

1. Parse `--even-yearly`, `--even-month`, and `--start` per requirement 6. Add them to the ARM-flag list so they turn ARM mode on. Put a positive yearly amount on `arm.adjustmentStats` as integer cents from `dollarsToCents`, with `startMonth` taken from the `--start` month and not from the year. Do not add those cents to the `--extra` map.
2. Append the four summary lines after `Adjustments`. Update the test that expects 11 lines and the four ARM lines at the end: the summary is 15 lines, those four lines stay immediately after `Months saved`, and the requirement 6 block is the new end. `--even-yearly 250 --even-month 1 --start 2026-10` on the sheet loan yields `monthly_extra_cents` 81249 and `even_out_cents` 82321. The ten-column CSV header stays. Cover the two non-zero exits in AC2.
3. Document the three flags in `README.md`.

DoD: `node --test` exits 0. The fixed-rate hashes still match. The diff does not contain `apps/web` or the skill.

## Phase 2 — Skill

Files: `.agents/skills/mortgage-loan-calculator/SKILL.md`, `compound_interest_monthly.test.js`

1. Tell the skill to answer these questions from `--json`, reading `arm.floor_percent`, `arm.ceiling_percent`, `arm.first_adjustment`, `arm.even_out_cents`, and `arm.monthly_extra_cents`. It asks for a missing yearly amount, month of the year, or loan start month, and it does not invent a start month. It passes the three flags only for a yearly question. It does not solve `E` and does not write `E` into the extra CSV. Leave `the only arithmetic this skill does` in place for `rate - margin`.
2. Extend the skill phrase test with the field names, the ask for a missing start month, and a sentence that the extra is not written into the CSV. Do not drop the phrases that test already requires.

DoD: `node --test` exits 0. The diff does not contain `amortize.js` or `apps/web`.

## Phase 3 — Page

Files: `apps/web/src/app.tsx`, `apps/web/src/arm.ts`, `apps/web/src/loan.ts`, `apps/web/src/styles.css`, `apps/web/unit/loan.ts`, `apps/web/e2e/arm.spec.ts`, `apps/web/e2e/extra-level.spec.ts`, `apps/web/e2e/arm-adjustment-stats.spec.ts` (new), `AGENTS.md`, `REVIEW.md`

1. Add `evenYearly` (`""`) and `evenMonth` (`1`) to the ARM draft. Storage follows requirement 9, including a unit load of an arm with neither field and a `scenariosDiffer` case that only `evenYearly` changes. Do not put the two fields on `ArmValues`. On the way into `buildReport`, set `adjustmentStats` from the last valid yearly cents, the selected month, and the start month number. October is `10`.
2. Render requirement 8's lines inside the ARM terms disclosure, under the round-to-eighth checkbox. The yearly row is its own inputs row there. Format the range with `-$`, `$0.00`, and `+$`. Read `first_adjustment`, `even_out_cents`, `monthly_extra_cents`, `floor_percent`, and `ceiling_percent` from the report. Do not search, and do not write `extras`, `applied`, or the index from these controls.
3. Update the exact assertions in AC5. `openArm` waits on `Ceiling 10.875% · Floor 2.5%`. The same ceiling sentence in `extra-level.spec.ts` changes with it. The default-rate ceiling becomes `Ceiling 12.375% · Floor 2.5%`. The margin-3 ceiling becomes `Ceiling 8.875% · Floor 2.5%`. The 7-year first-adjustment sentence gains ` · -$941.16 to +$1,665.94`. The 10-year sentence gains ` · -$852.58 to +$1,494.94`.
4. Playwright for AC4 and AC6 in `apps/web/e2e/arm-adjustment-stats.spec.ts`, clock `2026-10-15`, on the fresh $600,000 / 5% down loan with the rate set to `5.875` and the product set to ARM. The extra for month 1 is `Extra payment for month 1`. The index input is `Index for month 85`.
5. `AGENTS.md` and `REVIEW.md` follow requirement 11.

DoD: `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `node --test` exits 0. `apps/web/package.json` is `0.12.0` and `PAGES_POINT_VERSION` in `.github/workflows/publish-gh-pages-production.yml` is `0.12`. `amortize.js` has no new Node API.
