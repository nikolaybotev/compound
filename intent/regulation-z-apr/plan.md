# plan.md — Regulation Z APR

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 2 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The published Closing Disclosure pin (D2), the Loan Estimate tolerance pin (D3), three-decimal rounding (D4), the insurance endpoint (D5), and the filled ARM index (D6) are decided in the spec.

## Process

This docs pull request is not a build phase. It does not change `apps/web/package.json` or `PAGES_POINT_VERSION`. It does not start a Pages build.

After it merges, build the phases below in order. Each phase is its own branch and its own pull request into `main`. Squash-merge a phase when the required checks `test`, `web`, and `Analyze (javascript-typescript)` have succeeded, the branch is up to date with `main`, and CodeQL reports no high or critical alert. Do not dispatch a Pages deploy.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `node --test` on `apr.test.js` | 0 |
| AC2 | `node --test` on `apr.test.js` | 0 |
| AC3 | `node --test` on `apr.test.js` | 0 |
| AC4 | `regulation_z_apr.test.js` JSON and human summary | 1 |
| AC5 | `node --test` on `apr.test.js` | 0 |
| AC6 | `regulation_z_apr.test.js` | 1 |
| AC7 | `regulation_z_apr.test.js` reads the skill text and the symlink | 1 |
| AC8 | `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` | 2 |

## Phase 0 — Library

Files: `apr.js`, `apr.d.ts`, `apr.test.js`.

1. Implement `classifyCharges`, `actuarialAprThousandths`, and `buildAprReport` per spec requirements 1–9. Require `buildReport` from `amortize.js`. Do not add a Node API. Do not edit `amortize.js`.
2. `actuarialAprThousandths(amountFinancedCents, paymentCents, oddDays)` returns `{ apr_thousandths, irregular, tolerance_thousandths }`. Round half up with integer arithmetic on the scaled rate, not `Math.round(rate * 1000)`.
3. Insurance months use `remaining_principal_cents` from the no-extra walk and 78% of the original value, half up, capped at the midpoint, inclusive of that payment.
4. The ARM walk writes `currentIndexThousandths` onto every adjustment month before `buildReport`.
5. Cover AC1, AC2, AC3, and AC5 in `apr.test.js`. The Appendix J varying-payment amounts are the thirty yearly figures in that example, each repeated for twelve months. Test titles for AC2 and AC3 say the published fixed-rate Closing Disclosure sample and the published fixed-rate Loan Estimate sample. They do not name a lender, a person, or a street.

DoD: `node --test` exits 0. `amortize.js` has no diff. `apps/web/package.json` stays `0.22.1`.

### Build notes (Phase 0)

Landed with `buildAprReport` options bag for optional original value, insurance months, odd days, ARM terms, and consummation index. Exported `withinTolerance`, `disclosedAprThousandths`, and `formatAprPercent` for the command-line phase. APR thousandths use bigint half-up on `monthlyRate * 12 * 100 * 1000` at 1e12 scale.

## Phase 1 — Command line and skill

Files: `regulation_z_apr.js`, `regulation_z_apr.test.js`, `.agents/skills/regulation-z-apr/SKILL.md`, `.agents/skills/regulation-z-apr/scripts/regulation_z_apr.js`, `README.md`, `AGENTS.md`.

1. Parse requirement 10. Reuse the fee script's amount, rate, and term parsing where the grammar is the same. Reuse the calculator's ARM flag parsing where the grammar is the same. `--charge` is the only repeatable flag. Map each charge through `classifyCharges` and pass the prepaid total to `buildAprReport`.
2. Print requirement 11. A library error is the non-zero exit and the library message on stderr.
3. AC4's JSON reports `apr_thousandths` 7210, `amount_financed_cents` 57274280, and `irregular` false. The human summary includes `Annual percentage rate: 7.21%` and `Tolerance: 0.125%`. AC6 covers the exits. The no-argument stderr names `--amount`, `--rate`, `--years`, and `--months`.
4. Write the skill per requirement 12 and AC7. The symlink target is `../../../../regulation_z_apr.js`.
5. `README.md` gains a short Regulation Z section with the Closing Disclosure command and a pointer to this folder. `AGENTS.md` Commands gains that command (healthy: APR 4.174%, finance charge 118,830.27, 80 months of insurance) and the module sentence. Leave the page version at 0.22.1.

DoD: `node --test` exits 0. The skill file contains the AC7 sentences. `apps/web/package.json` stays `0.22.1`. The diff does not contain `apps/web/`.

### Build notes (Phase 1)

Landed with ARM `--current-index` required whenever ARM mode is on (including when only that flag would trigger mode). Charge parsing rejects kinds outside requirement 2 before `classifyCharges`. `buildCliReport` is exported for tests.

## Phase 2 — Page

Files: `apps/web/src/app.tsx`, the page unit and end-to-end tests that cover the summary, `apps/web/package.json`, `AGENTS.md`, `REVIEW.md`, `README.md`. The workflow file is not in this phase.

1. Import `buildAprReport` from `apr.js`. Render requirement 13's row. Prepaid cents are `pointsCents + lenderFeesCents + prepaidInterestCents - lenderCreditCents`, floored at zero. Monthly insurance is the picture PMI cents. Original value is the parsed appraisal, otherwise the price. Pass the retained current-index thousandths on an ARM and omit `arm` when the product is fixed.
2. Cover AC8. The 6.966% case sets the start month with the page's month picker, not `input type="month"`. The title edit uses the title field. The blank-index case switches to ARM and does not type a current index.
3. Set `apps/web/package.json` to `0.23.0`. Do not edit a workflow. `publish-gh-pages-production.yml` reads that version and exports `PAGES_POINT_VERSION` as `0.23`. Update `AGENTS.md` and `REVIEW.md` per requirement 14, including the two-walk sentence for the current index. `README.md` mentions the summary row in the same sentence as the page.
4. Do not dispatch a workflow. Do not edit `amortize.js`.

DoD: `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. `apps/web/package.json` is `0.23.0`. The diff does not contain `.github/workflows/`.

### Build notes (Phase 2)

Page prepaid finance charges use `pictureValues.lenderCreditCents` because closing lines omit lender credit. `loanAprSummary` and `prepaidFinanceChargeCentsForApr` live in `loan.ts` for unit tests. Version `0.23.0` / point version `0.23` from `apps/web/package.json` only.
