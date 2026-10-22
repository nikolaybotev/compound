# plan.md — Mortgage start timeline

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

The walk stays in `amortize.js` for every phase. No phase adds a Node API, a command-line flag, or a JSON key. Fixed-rate output stays byte for byte.

## Stops

None for Phases 1 through 3. The formula for a due date is `paymentDate(startMonth, paymentNumber + 1)` (D2), and the schedule keeps `paymentDate` (D1).

Phase 4 uses the midpoint formula in spec requirement 9. The open question in the spec asks the owner whether to replace that sentence before Phase 4. Phases 1 through 3 do not wait on it.

The build starts when the owner says to build. Each phase below is its own pull request, merged when CI is green, in order. This design pull request is not one of those phases. It does not change `apps/web/package.json` or `PAGES_POINT_VERSION`. It does not start a Pages build. Both stay at `0.16` until Phase 1.

## Point versions

| Pull request | Sets |
|---|---|
| This docs pull request | stays `0.16.0` and `PAGES_POINT_VERSION` `0.16` |
| Phase 1, dates and footnotes | `0.17.0` and `0.17` |
| Phase 2, ARM timing | `0.18.0` and `0.18` |
| Phase 3, Moving in | `0.19.0` and `0.19` |
| Phase 4, tax table and PMI drop-off | `0.20.0` and `0.20` |

The research’s escrow calendar is not a phase and does not get a version. A later intent can open it. The scenario document stays version 2 in every phase.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Unit test of `dueDate` and the payoff formatter; `paymentDate` for payment 1 unchanged | 1 |
| AC2 | Playwright, clock 2026-10-15: November 1, 2056 footnote, schedule footnote, Date header, Nov 2026 row; then November start and December 1, 2056 | 1 |
| AC3 | Playwright payoff strings moved one month later with the day, parenthetical unchanged | 1 |
| AC8 | `node --test`, fixed-rate hashes, loan-skill phrases | 1, and again in 2, 3, and 4 for the phrases those phases add |
| AC4 | Playwright sheet ARM due notes and five timeline lines; new tests do not contain `credit union` | 2 |
| AC5 | Playwright Moving in lines, signing date 2026-11-12, schedule row unmoved | 3 |
| AC6 | Unit: case-study interest cents, PMI months, acquisition-debt fraction, empty AGI, insurance excluded, fresh draft unchanged | 4 |
| AC7 | Playwright Tax table placement and the three sentences | 4 |
| AC9 | Version files at the end of each phase | 1, 2, 3, 4 |

## Phase 1 — Dates and footnotes

Page version 0.17. Files: `apps/web/src/loan.ts`, `apps/web/src/app.tsx`, `apps/web/src/schedule.tsx`, `apps/web/src/styles.css`, `apps/web/unit/loan.ts`, `apps/web/e2e/page.spec.ts`, `apps/web/e2e/extras.spec.ts`, `apps/web/e2e/arm.spec.ts`, `apps/web/e2e/saved-by-extra.spec.ts`, any other e2e file a payoff-date search hits, `apps/web/package.json`, `.github/workflows/publish-gh-pages-production.yml`, `.agents/skills/mortgage-loan-calculator/SKILL.md`, `compound_interest_monthly.test.js`, `README.md`, `AGENTS.md`, `REVIEW.md`.

1. Add `dueDate` per requirement 1. Format the payoff value per requirement 2, including the day and the unchanged `yearsAndMonths(report.payoff_month)` parenthetical. Put the payoff footnote inside the existing `Payoff date` region, under the date. Put the schedule footnote under the Schedule heading and above the table, per requirement 3. Style it as secondary text. Do not add a column, do not change `Date`, and do not change row labels.
2. Update every Playwright assertion that matches a payoff month. Start October 2026 and month 360 becomes `November 1, 2056 (30 years)`. Start November 2026 and month 360 becomes `December 1, 2056 (30 years)`. The example loan with $100 every month becomes `July 1, 2054 (27 years 8 months)`. The January yearly extra becomes `November 1, 2054 (28 years)`. Search `apps/web/e2e` for `2056`, `2054`, and `2041` payoff text and move each displayed month forward one, adding ` 1,` after the month name. Leave `yearsAndMonths` text as it is. Assert both footnote sentences.
3. Skill and README per requirement 10’s loan-calculator and README bullets only. In `compound_interest_monthly.test.js`, keep the phrase `first payment month`. Replace the required phrase `closing month or the first payment month` with phrases for the funding month, payment 1 accruing in the next calendar month and due on the 1st of the month after that, the payoff due date, and asking before an interest credit. Do not change calculator output or the fixed-rate hashes.
4. `AGENTS.md` and `REVIEW.md` per requirement 11 for this phase only: payoff due date, two footnotes, rows stay accrual months, version 0.16 sentence kept, version 0.17 recorded. Set `apps/web/package.json` to `0.17.0` and `PAGES_POINT_VERSION` to `0.17`.

DoD: `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. `amortize.js` and `compound_interest_monthly.js` have no diff. A fixed-rate `--json` run matches the previous bytes.

### Build notes (Phase 1)

Shipped `dueDate`, `formatPayoffDate`, and the two footnote constants from `loan.ts`. Payoff footnote lives inside the `Payoff date` summary region; schedule footnote sits between the Schedule heading row and the table scroll area. No `amortize.js` change.

## Phase 2 — ARM timing

Page version 0.18. Files: `apps/web/src/app.tsx`, `apps/web/src/styles.css`, `apps/web/unit/loan.ts` or a small date helper test next to it, `apps/web/e2e/arm.spec.ts`, `apps/web/e2e/arm-adjustment-stats.spec.ts`, `apps/web/package.json`, `.github/workflows/publish-gh-pages-production.yml`, `.agents/skills/arm-loan-concepts/SKILL.md`, `arm_loan_concepts.test.js`, `AGENTS.md`, `REVIEW.md`.

1. Append the First adjustment due clause and the Highest payment due clause per requirement 4. Leave Highest rate alone. Update the existing sentences that pin `First adjustment November 2033 (payment 85)` and `$5,037.71 from November 2033` so they also contain the December 1, 2033 due words. Do that for the range form of the first-adjustment line as well. Derive other pinned adjustment months with `dueDate` rather than typing a second calendar by hand.
2. Render requirement 5’s five lines inside the ARM terms disclosure after the monthly-extra line, and after the fallback first-adjustment line when the report has no `first_adjustment`. Compute the index day and the notice windows in UTC. The inference sentence is visible. `{N}` is the interval. A 7/1 sheet loan says `every 12 months`.
3. Concepts skill per requirement 10. Extend `arm_loan_concepts.test.js` so it requires the new payment-after-change-date sentence and still requires that the skill does not name a calendar date for the user’s loan and does not run the calculator. Keep the invented-example phrases. Do not add Alex’s dollars to that skill.
4. Version files to `0.18.0` and `0.18`. `AGENTS.md` records the due clause and the timeline, and still says not to name a credit union in the new copy or the new tests.

DoD: `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `node --test` exits 0. `amortize.js` has no diff. A search of the phase’s new test file contents finds no `credit union`.

### Build notes (Phase 2)

Shipped `formatDueOnFirst`, `armTimelineLines`, and `armChangeDate` in `loan.ts`. First adjustment and Highest payment append the due clause; Highest rate does not. The five-line `.arm-timeline` list follows the monthly-extra line (or the fallback first-adjustment line). UI copy uses **initial period** and **adjustment period**; stored `fixedYears` / `fixedMonths` keys and `--fixed-years` / `--fixed-months` CLI flags are unchanged. The change-date line states that the payment due that day is still the previous amount. `amortize.js` interest math is unchanged aside from the initial-period validation message text.

## Phase 3 — Moving in

Page version 0.19. Files: `apps/web/src/app.tsx`, `apps/web/src/picture.ts`, `apps/web/src/loan.ts` if storage passes the new picture keys through, `apps/web/src/styles.css`, `apps/web/unit/picture.ts` or the existing picture unit file, `apps/web/e2e/moving-in.spec.ts` (new), `apps/web/package.json`, `.github/workflows/publish-gh-pages-production.yml`, `.agents/skills/mortgage-origination-fees/SKILL.md`, the origination-fees phrase test if one asserts skill text, `AGENTS.md`, `REVIEW.md`.

1. Store `graceDays`, `lateChargePercent`, `signingDate`, and `lastRent` on the version-2 picture per requirement 6. Missing keys load the defaults. Do not bump the document to version 3. Do not change closing-day or interest-basis parsing. Invalid live edits keep the last valid value.
2. Render the Moving in disclosure after Closing Costs and before the schedule. Lines follow requirement 6, including the UTC weekday, the existing prepaid-interest functions, the no-payment sentence, the first due date, the grace money, the empty and filled Closing Disclosure lines, the last-rent sentence, the statement sentence, and the interest-credit sentence. Business-day counting skips Sundays and the 5 U.S.C. 6103(a) holidays with the observed Friday or Monday. Unit-test 2026-11-12 → 2026-11-07. Do not pre-fill the signing date.
3. Playwright AC5 on the fresh loan, clock 2026-10-15. After the signing date is filled, the first schedule row is still Nov 2026.
4. Origination-fees skill per requirement 10. One sentence on odd-days interest and the page’s second-month rule. The formula and its tests stay.
5. Version files to `0.19.0` and `0.19`. `AGENTS.md` records the disclosure and that interest credit does not relabel rows.

DoD: `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `node --test` exits 0. `amortize.js` has no diff. A stored v2 scenario that lacks the new keys still loads, and the loan amounts are unchanged.

### Build notes (Phase 3)

Added only after the phase lands.

## Phase 4 — Tax table and PMI drop-off

Page version 0.20. Files: `apps/web/src/tax.ts` (new, no Node APIs), `apps/web/src/picture.ts` only if a stored field needs a parser next to the other picture fields, `apps/web/src/app.tsx`, `apps/web/src/styles.css`, `apps/web/unit/tax.ts` (new, under `apps/web/unit/`, not a `*.test.ts` at the repo root), `apps/web/e2e/tax-table.spec.ts` (new), `apps/web/package.json`, `.github/workflows/publish-gh-pages-production.yml`, `.agents/skills/mortgage-loan-calculator/SKILL.md`, `compound_interest_monthly.test.js`, `AGENTS.md`, `REVIEW.md`.

1. Implement requirements 7 through 9 in `tax.ts`, calling `buildReport` for the no-extra and applied-extra searches. Do not modify `amortize.js`. Half-up division follows principle P5. The case-study fixture asserts 145469, 3475200, and 3438574 cents, and payments 130, 142, and 180 with start `2026-11` and price $525,000. A second fixture with a loan over $750,000 prorates. Empty AGI skips the MI phaseout and the SALT phase-down. Homeowners insurance is not in the housing total. The fresh-visit draft test still expects the Conventional loan, not the case study.
2. Render the Tax table disclosure after the schedule per requirement 8. The unverified sentences are visible, including Publication 936, the §70111 sentence, the 2026-figure label on later standard deductions, the SALT 1% sentence, the servicer-practice sentence, and `This is not tax advice.` The table is not inside `.schedule`. Store the new fields on the version-2 picture. Missing keys load the defaults. Document version stays 2.
3. If the midpoint open question is still unanswered, ship requirement 9’s formula and the `this page's reading` label. Do not present it as the only statutory reading.
4. Loan skill per requirement 10’s calendar-year interest paragraph. Extend the phrase test with the funding-year shift and a refusal to compute SALT, the standard deduction, or an AGI. Do not add a flag.
5. Version files to `0.20.0` and `0.20`. `AGENTS.md` records the Tax table, the unpaid-versus-accrued distinction, and that PMI is not a schedule badge.

DoD: `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `node --test` exits 0. `amortize.js` has no diff. `git diff` of `defaultDraft` does not contain `525000` or `498750`.

### Build notes (Phase 4)

Added only after the phase lands.
