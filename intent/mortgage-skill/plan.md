# plan.md — Mortgage skill

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 7 |
| Status | Draft 7 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. Rounding, the CSV, and the end of the no-argument gist run are decided in the spec (D3, D1, D5).

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Payment 119910 cents on $200,000 / 6% / 30 years | 0 |
| AC2 | No extras: payment 379222, interest 79520072, payoff month 360, month-1 interest 332500. With an extra in month 1, month-1 interest is still 332500 | 0, and the extra clause in 1 |
| AC3 | Interest 78706302, interest saved 813770, payoff month 358, extra applied 120000, extra unapplied 0 | 1 |
| AC4 | Balance 0 after payoff, and payoff month at most 360 | 1 |
| AC5 | No arguments: non-zero exit, stderr says what is missing, stdout and stderr do not contain the $855,000 gist run. `--json` payment 568260 cents | 0 |
| AC6 | A month outside `1…years*12` exits non-zero. Two rows for one valid month are summed | 1 |
| AC7 | The skill states the ask rule, the input header `month,extra`, the relative script path, that `--json` alone is the summary, and that a month or savings-so-far question adds `--schedule` and reads `schedule`. The workspace symlink's target is that skill file | 2 |
| AC8 | `--json` alone has no `schedule` key. `--json --schedule` has 360 objects: month 1 extra 10000 and interest saved 0 and interest 332500; month 12 interest saved 3926; month 358 interest 1183, principal 202715, extra 0, remaining principal 0; month 360 interest saved 813770 and the other money fields 0. The CSV shows 100.00, 0.00, 39.26, 11.83, 2027.15, and 8137.70 | 1 |

Suggested build chunk: Phases 0, 1, and 2, in order, each as its own pull request. The spec review and the plan review are applied.

## Phase 0 — Loan arguments and 30/360 schedule

Files: `compound_interest_monthly.js`, `compound_interest_monthly.test.js`, `.github/workflows/test.yml`, `README.md`, `AGENTS.md`

1. Replace the constants with `--amount`, `--rate`, and `--years` per spec requirement 1. Exit non-zero when one is missing or invalid. Remove the path that runs $855,000 with no arguments.
2. Compute the schedule from the exact payment and exact 30/360 monthly interest, per requirements 5 and 6. Charging stops at payoff. Round half up to the cent once, at output (P6). Do not round with `Math.round(dollars * 100) / 100`. There are no extra payments in this phase; the extra step is zero.
3. Implement `--json` and the human summary. `--json` alone omits `schedule`. `--json --schedule` includes it per requirement 8, with `extra_cents` and `interest_saved_cents` at 0 in this phase. `--schedule` alone prints the same rows as CSV. JSON field names match requirement 8, with saved fields at 0 and the baseline equal to the run.
4. Add `node --test` cases for AC1, the no-extra part of AC2, and AC5, asserting the cent amounts in the coverage table.
5. Add a GitHub Actions workflow that runs `node --test` on Node.js 24 for pull requests and pushes.
6. Update `README.md` and `AGENTS.md` so the documented command is the new one, including the explicit 855000 / 6.99 / 30 example. Keep the README footnote that this walk matches Bankrate's schedule ($795,200.72 on $570,000 at 7% for 30 years), not the summary card ($795,201) and not a cent-rounded lender posting (about $795,203.90).

DoD: `node --test` exits 0 and covers the cent amounts in AC1, the no-extra part of AC2, and AC5. `node compound_interest_monthly.js` with no arguments exits non-zero, stderr says an argument is missing, and neither stream contains `855000` or `855,000`. `.github/workflows/test.yml` runs `node --test` on Node.js 24.

## Phase 1 — Extra principal CSV and interest saved

Files: `compound_interest_monthly.js`, `compound_interest_monthly.test.js`, `fixtures/first-year-100.csv`, `README.md`, `AGENTS.md`

1. Parse `--extra` per requirement 3. Sum duplicate months. Reject a month outside `1…years*12`.
2. Apply extra principal after that month's interest (D4). Track applied and unapplied cents. Charging stops at payoff (D2, P5). The JSON `schedule` and the `--schedule` CSV still include the later months through the no-extra payoff, with interest, principal, extra, remaining principal, and remaining interest at zero.
3. Fill `interest_saved_cents`, `months_saved`, and the baseline from a no-extra schedule of the same loan.
4. Add `fixtures/first-year-100.csv`: header `month,extra`, then months 1–12 each with `100`.
5. Add tests for AC3, AC4, AC6, and AC8, including month-1 `interest_cents` 332500 when month 1 has an extra. `--json` alone has no `schedule` key. `--json --schedule` includes `schedule` through the baseline payoff month. `--schedule` alone prints those same rows as CSV. A month outside `1…years*12` exits non-zero. Two rows for one valid month are summed.
6. Document the CSV and the example command in `README.md` and `AGENTS.md`.

DoD: `node --test` exits 0, and

```bash
node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 \
  --extra fixtures/first-year-100.csv --json
```

prints `interest_saved_cents` 813770, `interest_cents` 78706302, `payoff_month` 358, `extra_applied_cents` 120000, `extra_unapplied_cents` 0, `months_saved` 2, and no `schedule` key. The same command with `--schedule` added has 360 `schedule` objects: month 1 `interest_cents` 332500, `extra_cents` 10000, `interest_saved_cents` 0; month 12 `interest_saved_cents` 3926; month 358 `interest_cents` 1183, `principal_cents` 202715, `extra_cents` 0, `remaining_principal_cents` 0; month 360 `interest_saved_cents` 813770 and interest, principal, extra, remaining principal, and remaining interest all 0. `--schedule` alone prints those amounts as 100.00, 0.00, 39.26, 11.83, 2027.15, and 8137.70. A CSV month outside the term exits non-zero, and two rows for one month are summed.

## Phase 2 — Skill front end

Files: `.agents/skills/mortgage-loan-calculator/SKILL.md`, `AGENTS.md`, `README.md`

1. Write the skill to satisfy requirement 10 and AC7. The description must tell an agent to use it for mortgage payment, amortization, extra principal, interest-saved, and month-level balance questions, including when the user does not call it a skill.
2. The body tells the agent to ask when the principal, the note rate, the term, or the extra plan is missing, including a plan with no amount or no period. "No extras" is an answer and the script runs without `--extra`. "The first year" is months 1–12. "Every month," with no end named, is months 1 through `years * 12`. It may derive principal as purchase price minus down payment. A stated percent is the note rate. It does not invent taxes, insurance, or an $855,000 loan. An adjustable, interest-only, or recast loan is refused and produces no schedule. It writes `month,extra` and runs `--json` for G5: interest saved, both interest totals, the scheduled payment, and months saved. For a month or savings-so-far question (G6), it runs `--json --schedule` and reads `schedule`. Two plans are two runs. It does not recompute the amortization.
3. Create the workspace symlink named in requirement 11. Do not commit that symlink into this repo.
4. Point `README.md` and `AGENTS.md` at the skill path.

DoD: `node --test` still exits 0. The skill file contains the ask rule, including a missing amount or period and "no extras"; the header `month,extra`; "the first year" and "every month"; price minus down payment; the note rate; the refusal for adjustable, interest-only, and recast loans; the relative path `../../compound_interest_monthly.js`; `interest_saved_cents`; `--json` alone for G5; and `--json --schedule` for a month or savings-so-far question. The workspace symlink's target is that file.
