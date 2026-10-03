# plan.md — Mortgage skill

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 3 |
| Status | Draft 3 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. Rounding, the CSV, and the end of the no-argument gist run are decided in the spec (D3, D1, D5).

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `node --test` payment fixture $200,000 / 6% / 30 years | 0 |
| AC2 | `node --test` $570,000 / 7% / 30 years, month-1 interest | 0 |
| AC3 | `node --test` with `fixtures/first-year-100.csv` | 1 |
| AC4 | `node --test` payoff balance and month cap on that fixture | 1 |
| AC5 | `node --test` missing args, and the 855000 / 6.99 payment | 0 |
| AC6 | `node --test` bad month and duplicate months | 1 |
| AC7 | Skill file contains the ask rule, CSV header, relative script path, and JSON fields. `test -f` the workspace symlink | 2 |

Suggested build chunk: Phases 0, 1, and 2, in order, each as its own pull request. Start that chunk only after this plan is approved and the fresh-context reviews in the cycle have been applied.

## Phase 0 — Loan arguments and 30/360 schedule

Files: `compound_interest_monthly.js`, `compound_interest_monthly.test.js`, `.github/workflows/test.yml`, `README.md`, `AGENTS.md`

1. Replace the constants with `--amount`, `--rate`, and `--years` per spec requirement 1. Exit non-zero when one is missing or invalid. Remove the path that runs $855,000 with no arguments.
2. Compute the schedule from the exact payment and exact 30/360 monthly interest, and stop at payoff, per requirements 5 and 6. Round to the cent only when reporting. There are no extra payments in this phase; the extra step is zero.
3. Implement `--json` and the human summary. `--schedule` prints the payment lines. JSON field names match requirement 8, with saved fields at 0 and the baseline equal to the run.
4. Add `node --test` cases for AC1, AC2 (no-extra parts), and AC5.
5. Add a GitHub Actions workflow that runs `node --test` on Node.js 24 for pull requests and pushes.
6. Update `README.md` and `AGENTS.md` so the documented command is the new one, including the explicit 855000 / 6.99 / 30 example.

DoD: `node --test` exits 0, and `node compound_interest_monthly.js` with no arguments exits non-zero.

## Phase 1 — Extra principal CSV and interest saved

Files: `compound_interest_monthly.js`, `compound_interest_monthly.test.js`, `fixtures/first-year-100.csv`, `README.md`, `AGENTS.md`

1. Parse `--extra` per requirement 3. Sum duplicate months. Reject a month outside `1…years*12`.
2. Apply extra principal after that month's interest (D4). Track applied and unapplied cents. Stop at payoff (D2).
3. Fill `interest_saved_cents`, `months_saved`, and the baseline from a no-extra schedule of the same loan.
4. Add `fixtures/first-year-100.csv`: header `month,extra`, then months 1–12 each with `100`.
5. Add tests for AC3, AC4, and AC6.
6. Document the CSV and the example command in `README.md` and `AGENTS.md`.

DoD: `node --test` exits 0, and

```bash
node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 \
  --extra fixtures/first-year-100.csv --json
```

prints `interest_saved_cents` 813770 and `months_saved` 2.

## Phase 2 — Skill front end

Files: `.agents/skills/mortgage-loan-calculator/SKILL.md`, `AGENTS.md`, `README.md`

1. Write the skill to satisfy requirement 10 and AC7. The description must tell an agent to use it for mortgage payment, amortization, extra principal, and interest-saved questions.
2. The body tells the agent to ask for missing principal, rate, term, and extra plan; to expand "the first year" into months 1–12; to write `month,extra`; to run the script with `--json`; and to report G5 from those fields only.
3. Create the workspace symlink named in requirement 11. Do not commit that symlink into this repo.
4. Point `README.md` and `AGENTS.md` at the skill path.

DoD: `node --test` still exits 0. The skill file contains the ask rule, the header `month,extra`, the relative path `../../compound_interest_monthly.js`, and the field `interest_saved_cents`. The workspace symlink resolves to that file.
