# plan.md — Extra savings column

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 3 |
| Status | Draft 3 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. GitHub Pages already deploys this repo on a push to `main`.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Unit test: 70694, 65693, 18489, and the first-year cells 69761, 64818, 0. The twelve cells do not sum to 813770 | 0 |
| AC2 | Playwright: header is Saved by extra, between Extra payment and Principal balance, and the cell is not an input. Only month 1 is $100, cell and summary are $706.94, month 2 is $0.00, the 2026 year cell is empty | 0 |
| AC3 | Playwright: $100 in months 1–12 shows $697.61, $648.18, $0.00, and summary $8,137.70 | 0 |
| AC4 | Playwright: Apply $100 monthly shows $585.67 on month 1, summary $76,366.09, and $0.00 on the payoff row | 0 |
| AC5 | `node --test` exits 0. `--json --schedule` keys are unchanged. The `--schedule` CSV header is unchanged. The web CI job runs AC1–AC4 and AC7 and exits 0 | 0 |
| AC7 | Playwright: typing 100 into month 1 without committing leaves Saved by extra at $0.00. Committing shows $706.94 | 0 |
| AC6 | After the merge, the published page shows $706.94 for month 1's $100 with start month October 2026 | 0 |

One phase. One pull request.

## Phase 0 — Saved by extra

Files: `apps/web/**`, `AGENTS.md`, `intent/extra-savings-column/plan.md` if a departure is recorded

1. Add a function next to `loanReport` that, for one month, returns requirement 3's cent difference. Months with no requested extra return 0 without a second `buildReport`. The function does not change `amortize.js` or the CLI. No checked loan produces a negative cell. If one ever does, `formatGroupedCents` already prints the minus, and the column uses that formatter.
2. Insert the header Saved by extra immediately after Extra payment and immediately before Principal balance. The month cell is text. The year cell is empty.
3. Recompute the column only from the committed extra map. A keystroke in an extra cell does not change it. Commit and Apply do.
4. Add the AC1 unit test and the AC2–AC4 and AC7 Playwright checks. Keep `node --test` green. Assert the example loan's `--json --schedule` object does not grow a key and that the `--schedule` CSV header is unchanged (AC5).
5. Document the column in `AGENTS.md`: it is the marginal lifetime savings of that month's requested extra, and it is not `interest_saved_cents`.

DoD: `node --test` exits 0. The web unit tests and Playwright exit 0 and show $706.94, $697.61, $648.18, $585.67, and $0.00 on the payoff row of the $100-every-month loan. Typing `100` without committing leaves the cell at $0.00. The header is Saved by extra and the cell is not an input. The 2026 year cell is empty. Pull-request CI does not fetch the production URL. The phase is not done until, after the squash merge to `main`, the deploy run is green and https://nikolaybotev.github.io/compound/ shows $706.94 in Saved by extra for month 1 at $100 with the start month set to October 2026.

### Build notes (Phase 0)

None yet.
