# plan.md — Extra savings column

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 2 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. GitHub Pages already deploys this repo on a push to `main`.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Unit test: 70694, 65693, 18489, and the first-year cells 69761, 64818, 0. The twelve cells do not sum to 813770 | 0 |
| AC2 | Playwright: only month 1 is $100, cell and summary are $706.94, month 2 is $0.00, the 2026 year cell is empty | 0 |
| AC3 | Playwright: $100 in months 1–12 shows $697.61, $648.18, $0.00, and summary $8,137.70 | 0 |
| AC4 | Playwright: Apply $100 monthly shows $585.67 on month 1, summary $76,366.09, and $0.00 on the payoff row | 0 |
| AC5 | `node --test` exits 0. `--json --schedule` keys are unchanged. The web CI job runs AC1–AC4 and exits 0 | 0 |
| AC6 | After the merge, the published page shows $706.94 for month 1's $100 with start month October 2026 | 0 |

One phase. One pull request.

## Phase 0 — Saved by extra

Files: `apps/web/**`, `AGENTS.md`, `REVIEW.md`, `intent/extra-savings-column/plan.md` if a departure is recorded

1. Add a function next to `loanReport` that, for one month, returns requirement 3's cent difference. Months with no requested extra return 0 without a second `buildReport`. The function does not change `amortize.js` or the CLI.
2. Insert Saved by extra immediately after Extra payment, on the month row and as an empty cell on the year row.
3. Recompute the column from the committed extra map whenever the loan or the map changes.
4. Add the AC1 unit test and the AC2–AC4 Playwright checks. Keep `node --test` green and assert the example loan's `--json --schedule` object does not grow a key (AC5).
5. Document the column in `AGENTS.md`: it is the marginal lifetime savings of that month's requested extra, and it is not `interest_saved_cents`.

DoD: `node --test` exits 0. The web unit tests and Playwright exit 0 and show $706.94, $697.61, $648.18, $585.67, and $0.00 on the payoff row of the $100-every-month loan. The 2026 year cell is empty. After the squash merge to `main`, the deploy run is green, and https://nikolaybotev.github.io/compound/ shows $706.94 in Saved by extra for month 1 at $100 with the start month set to October 2026.

### Build notes (Phase 0)

None yet.
