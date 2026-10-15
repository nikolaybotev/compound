# plan.md — ARM extra level

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 2 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The library stays untouched, the checkbox commits at Apply, and the point version stays 0.11. Those are decisions D1, D3, and D7 in the spec.

The build starts when the owner says to build. Each phase below is its own pull request, merged when CI is green, in order. This design pull request is not one of those phases. It does not change `apps/web/package.json` or `PAGES_POINT_VERSION`.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `pnpm --dir apps/web test` on F2, F3, F4, F5, F6, and `anyExtraEdited` | 0 |
| AC2 | Playwright: no checkbox on a fixed loan; unchecked ARM checkbox; F1 amounts on months 85 and 87 | 1 |
| AC3 | Playwright: F2 cells after Apply, then F3 cells after index `0` at month 85 | 1 |
| AC4 | Playwright: an edited month 1 blocks a later index clear | 1 |
| AC5 | Unit load of a prefill with no `level`; version files unchanged; `node --test`; `amortize.js` absent from the diff | 0 (pure function and `node --test`), 1 (storage load and version files) |
| AC6 | Playwright: clearing month 85 after AC3, with no extra cell edited, empties months 85, 87, and 97 | 1 |

## Phase 0 — Level extras from the walk

Files: `apps/web/src/loan.ts`, `apps/web/unit/extra-level.ts` (new)

1. Export `levelArmExtras(loan, financedCents, monthlyDollars, yearlyDollars, yearlyMonth, fromMonth, kept)` and `anyExtraEdited(extras, applied)`. `financedCents` is the same principal `loanReport` already takes; on the current picture it equals `loan.loanCents`. `fromMonth` is 1 for Apply and the changed reset for an index commit. `kept` supplies months before `fromMonth`.
2. Implement spec requirements 2 and 3. Build the form map with `buildPrefillMap` and `loan.startMonth`. Read `monthly_payment_cents` from `loanReport`. For the fixed period, write the form extra. For each reset at or after `fromMonth`, delete extras from that reset through the term, call `loanReport`, and if the reset is after `payoff_month` leave those months deleted and stop. Otherwise take `payment_cents` from that reset row. That cent is the period payment for every month of the period, including months after the eventual payoff that are still before the next reset. Do not read the zero `payment_cents` on a post-payoff row. For each month, write that month's own fixed-period total minus the period payment, floored at zero, with `centsToDollars`, and delete the month when the result is zero. A yearly month can stay positive when the reset month is deleted. Then go to the next reset. Do not read a later reset's payment from a walk that has not yet received this period's extras.
3. `anyExtraEdited` is true when any month in either map fails `isEditedExtra`.
4. Unit tests assert F2, F3, F4, F5, and F6 from spec requirement 8. Include the equal maps for F3's two entry paths, month 97 at 67947 cents of extra rather than 59811, and month 109 at 307656 cents rather than 302329. On the F4 Apply, month 168 is 497092 cents and month 169 is absent. F5 omits months 85, 86, and 96 and stores 24573 cents at month 87. F6, run from the F3 map with the month 85 index cleared, equals F2. The loan's `arm` object is the requirement 8 terms, passed through `toBuildReportArm` the way `loanReport` already does.

DoD: `pnpm --dir apps/web test` exits 0. `node --test` exits 0. The diff does not contain `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, or a skill. `apps/web/package.json` is still `0.11.0`.

## Phase 1 — Checkbox, Apply, and the index write

Files: `apps/web/src/app.tsx`, `apps/web/src/loan.ts`, `apps/web/src/styles.css`, `apps/web/unit/loan.ts`, `apps/web/e2e/extra-level.spec.ts` (new), `AGENTS.md`, `REVIEW.md`

1. Add `level` and `appliedLevel` to `Prefill`, both defaulting false. `parsePrefill` treats a missing or non-boolean value as false and still returns the prefill. `scenariosDiffer` compares both. A save of a scenario that never stored them omits nothing special: they are booleans on `prefill`, so old files load as false (AC5).
2. Render `#extra-level` only when the product is ARM and the terms in use parse, with the label in requirement 1, placed before `.apply-row`. Give it the `.arm-check` flex alignment (a row class is fine). Do not set `--edited` on it. Checking it updates `prefill.level` only.
3. `applyPrefill` follows requirement 4. The ARM branch calls `levelArmExtras` with `fromMonth` 1, an empty `kept`, `lines.financedCents`, and the parsed dollar amounts. Both branches still snapshot the three form fields, replace `extras` and `applied`, and clear the cell being edited.
4. `commitIndex`, after the stored index actually changes, runs requirement 5. `fromMonth` is the committed month. `kept` is the current extras for months before it. The form amounts are `appliedMonthly`, `appliedYearly`, and `appliedMonth`, parsed with `parseDollarField`. Replace both `extras` and `applied` with the returned map. Months before `fromMonth` stay. Months from `fromMonth` on match the return, including later periods whose index did not change. Zeros and months past the stopping reset are absent from both maps. Skip the call when `appliedLevel` is false or `anyExtraEdited` is true.
5. Playwright for AC2, AC3, AC4, and AC6 in `apps/web/e2e/extra-level.spec.ts`, clock `2026-10-15`, on the fresh $600,000 / 5% down loan with the rate set to `5.875` and the product set to ARM. Open Extra Payments the way `extras.spec.ts` does. Open 2033 and 2034 the way `arm.spec.ts` opens a year. Month 87 is January 2034. The extra inputs are `Extra payment for month N`. The index input is `Index for month 85`. AC6 clears that index after AC3's commit of `0`, with no extra cell edited, and checks months 85, 87, and 97 empty and month 84 still `100.00`. The schedule is not opened past its payoff month for these checks.
6. `AGENTS.md`: the Extra Payments form has `#extra-level`, labeled `Match the fixed-period total after each reset`, shown for ARM and defaulting off. Apply with it on writes `levelArmExtras`. That function calls `buildReport` once a period is filled and does not modify `amortize.js`. An index commit, when the last Apply stored `appliedLevel` and no extra cell differs from `applied`, replaces both extra maps from that reset through the term, including later periods whose index did not change, and deletes zeros. Things agents get wrong: do not add this math to `amortize.js`; do not read every reset payment before the earlier extras are in the map; do not zero a whole period because the reset month's extra is zero; do not stop an index update at the edited period; do not leave a stale positive extra when the new extra is zero; do not retarget a month after payoff from `payment_cents` 0; do not name a credit union here. `REVIEW.md`: Compliance adds `intent/arm-extra-level/`. Bugs adds a level extra other than spec requirement 3, and an index commit that leaves a later period's extra unchanged, or a stale positive extra in place, while `appliedLevel` is true and no extra amount is edited.

DoD: `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `node --test` exits 0. AC2, AC3, AC4, and AC6 are the Playwright checks. `apps/web/package.json` is `0.11.0` and `PAGES_POINT_VERSION` in `.github/workflows/publish-gh-pages-production.yml` is `0.11`. The diff does not contain `amortize.js`.
