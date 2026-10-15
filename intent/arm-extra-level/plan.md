# plan.md — ARM extra level

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The library stays untouched, the checkbox commits at Apply, and the point version stays 0.11. Those are decisions D1, D3, and D7 in the spec.

The build starts when the owner says to build. Each phase below is its own pull request, merged when CI is green, in order. This design pull request is not one of those phases. It does not change `apps/web/package.json` or `PAGES_POINT_VERSION`.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `pnpm --dir apps/web test` on F2, F3, F4, and `anyExtraEdited` | 0 |
| AC2 | Playwright: no checkbox on a fixed loan; unchecked ARM checkbox; F1 amounts on months 85 and 87 | 1 |
| AC3 | Playwright: F2 cells after Apply, then F3 cells after index `0` at month 85 | 1 |
| AC4 | Playwright: an edited month 1 blocks a later index clear | 1 |
| AC5 | Unit load of a prefill with no `level`; version files unchanged; `node --test`; `amortize.js` absent from the diff | 0 (pure function and `node --test`), 1 (storage load and version files) |

## Phase 0 — Level extras from the walk

Files: `apps/web/src/loan.ts`, `apps/web/unit/extra-level.ts` (new)

1. Export `levelArmExtras(loan, financedCents, monthlyDollars, yearlyDollars, yearlyMonth, fromMonth, kept)` and `anyExtraEdited(extras, applied)`. `financedCents` is the same principal `loanReport` already takes; on the current picture it equals `loan.loanCents`. `fromMonth` is 1 for Apply and the changed reset for an index commit. `kept` supplies months before `fromMonth`.
2. Implement spec requirements 2 and 3. Build the form map with `buildPrefillMap` and `loan.startMonth`. Read `monthly_payment_cents` from `loanReport`. For the fixed period, write the form extra. For each reset at or after `fromMonth`, delete extras from that reset through the term, call `loanReport`, and if the reset is after `payoff_month` omit the rest and stop. Otherwise take `payment_cents` from that reset row, write the fixed-period total minus that payment, floored at zero, with `centsToDollars`, and omit zero. Then go to the next reset. Do not read a later reset's payment from a walk that has not yet received this period's extras.
3. `anyExtraEdited` is true when any month in either map fails `isEditedExtra`.
4. Unit tests assert F2, F3, and F4 from spec requirement 8, including the equal maps for F3's two entry paths, month 97 at 67947 cents of extra rather than 59811, month 109 at 307656 cents rather than 302329, and month 169 absent on the F4 Apply. The loan's `arm` object is the requirement 8 terms, passed through `toBuildReportArm` the way `loanReport` already does.

DoD: `pnpm --dir apps/web test` exits 0. `node --test` exits 0. The diff does not contain `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, or a skill. `apps/web/package.json` is still `0.11.0`.

## Phase 1 — Checkbox, Apply, and the index write

Files: `apps/web/src/app.tsx`, `apps/web/src/loan.ts`, `apps/web/src/styles.css`, `apps/web/unit/loan.ts`, `apps/web/e2e/extra-level.spec.ts` (new), `AGENTS.md`, `REVIEW.md`

1. Add `level` and `appliedLevel` to `Prefill`, both defaulting false. `parsePrefill` treats a missing or non-boolean value as false and still returns the prefill. `scenariosDiffer` compares both. A save of a scenario that never stored them omits nothing special: they are booleans on `prefill`, so old files load as false (AC5).
2. Render `#extra-level` only when the product is ARM and the terms in use parse, with the label in requirement 1, placed before `.apply-row`. Give it the `.arm-check` flex alignment (a row class is fine). Do not set `--edited` on it. Checking it updates `prefill.level` only.
3. `applyPrefill` follows requirement 4. The ARM branch calls `levelArmExtras` with `fromMonth` 1, an empty `kept`, `lines.financedCents`, and the parsed dollar amounts. Both branches still snapshot the three form fields, replace `extras` and `applied`, and clear the cell being edited.
4. `commitIndex`, after the stored index actually changes, runs requirement 5. `fromMonth` is the committed month. `kept` is the current extras for months before it. The form amounts are `appliedMonthly`, `appliedYearly`, and `appliedMonth`, parsed with `parseDollarField`. Write the returned months from `fromMonth` on into both maps, and leave earlier months. Skip the call when `appliedLevel` is false or `anyExtraEdited` is true.
5. Playwright for AC2, AC3, and AC4 in `apps/web/e2e/extra-level.spec.ts`, clock `2026-10-15`, on the fresh $600,000 / 5% down loan with the rate set to `5.875` and the product set to ARM. Open Extra Payments the way `extras.spec.ts` does. Open 2033 and 2034 the way `arm.spec.ts` opens a year. Month 87 is January 2034. The extra inputs are `Extra payment for month N`. The index input is `Index for month 85`.
6. `AGENTS.md`: the Extra Payments form has `#extra-level`, labeled `Match the fixed-period total after each reset`, shown for ARM and defaulting off. Apply with it on writes `levelArmExtras`. That function calls `buildReport` once a period is filled and does not modify `amortize.js`. An index commit, when the last Apply stored `appliedLevel` and no extra cell differs from `applied`, rewrites that reset and every later period. Things agents get wrong: do not add this math to `amortize.js`; do not read every reset payment before the earlier extras are in the map; do not stop an index update at the edited period; do not name a credit union here. `REVIEW.md`: Compliance adds `intent/arm-extra-level/`. Bugs adds a level extra other than spec requirement 3, and an index commit that leaves a later period's extra unchanged while `appliedLevel` is true and no extra amount is edited.

DoD: `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `node --test` exits 0. AC2, AC3, and AC4 are the Playwright checks. `apps/web/package.json` is `0.11.0` and `PAGES_POINT_VERSION` in `.github/workflows/publish-gh-pages-production.yml` is `0.11`. The diff does not contain `amortize.js`.
