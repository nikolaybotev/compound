# plan.md — Loan recast

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 3 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The month flag, the two-run recast, and the cent-rounding gap are decided in the spec (D1, D3, D6).

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `node --test` exits 0. $200,000 at 6% for 15 years and for 180 months: payment 168771, interest 10378846, payoff 180. Years JSON has `years` 15 and `months` 180. Months JSON has `months` 180 and no `years` key. README documents `--months` and JSON `months` | 0 |
| AC2 | $200,000 at 6% for 13 months: payment 1592845, interest 706982, payoff 13, `months` 13, no `years` key | 0 |
| AC3 | No arguments still fail without the gist loan, and stderr names `--amount`, `--rate`, `--years`, and `--months`. Both term flags, neither term flag, `--months 0`, `--months 01`, `--months 13.0`, and `--years 30.0` fail. The both-and-neither errors say exactly one of `--years` or `--months` is required | 0 |
| AC4 | Extra month 14 on a 13-month loan fails. Month 13 is accepted | 0 |
| AC5 | One test covers the sample first run and the second run. Month-24 balance 45361449 cents. `$453,614.49` at 7.375% for 336 months: payment 319568, interest 62013361, payoff 336, `amount_cents` 45361449. The 335-month payment is 319855 | 0 |
| AC6 | Skill text: recast definition, two runs, `n` from JSON `months`, `--months` remainder, `amount_cents` check, distinct zero-balance and empty-remainder replies, term in years or months, both flags in the run example, adjustable and interest-only refusal, cent warning. Symlink target is that file | 1 |

Suggested build chunk: Phases 0 and 1, in order, each as its own pull request.

`intent/mortgage-skill/` is not edited. Where it refuses a recast or allows only `--years`, this spec wins.

## Phase 0 — Term in months

Files: `compound_interest_monthly.js`, `compound_interest_monthly.test.js`, `README.md`, `AGENTS.md`

1. Accept `--months` as the same positive-integer text as `--years` (`^[1-9]\d*$`) per requirement 1. `n` is `years * 12` or that integer. Reject both term flags, neither, `0`, `01`, and `13.0`. Stderr for both and for neither says that exactly one of `--years` or `--months` is required and names both flags. No arguments names `--amount`, `--rate`, `--years`, and `--months`, and stays free of the $855,000 loan. Keep the rejection of `--years 30.0`.
2. Include `months` on every JSON object. Include `years` only when `--years` was passed. Leave the human summary text as it is. Extra-principal months are valid from 1 through `n`. Duplicate months still sum.
3. Add tests for AC1, AC2, AC3, AC4, and AC5, asserting the cent amounts in the coverage table. The AC5 first run may build its extra CSV in a temporary file: `$2,400` in months 1 through 360, and `$20,000` in months 5, 17, 29, and every 12 months after that through 360.
4. Document `--months`, the JSON `months` field, and the either-or term rule in `README.md` and `AGENTS.md`. Point `AGENTS.md` at `intent/loan-recast/` for this change. Keep the Bankrate footnote.

DoD: `node --test` exits 0 and covers the cent amounts in AC1–AC5. `node compound_interest_monthly.js --amount 200000 --rate 6 --months 180 --json` reports `monthly_payment_cents` 168771 and no `years` key. `node compound_interest_monthly.js --amount 200000 --rate 6 --years 15 --months 180` exits non-zero. `README.md` and `AGENTS.md` document `--months`, the either-or rule, and the JSON `months` field.

## Phase 1 — Recast in the skill

Files: `.agents/skills/mortgage-loan-calculator/SKILL.md`, `README.md`, `AGENTS.md`, `REVIEW.md`

1. Rewrite the skill so it satisfies requirements 5–7 and AC6. The description must tell an agent to use it for a fixed-rate recast, including when the user does not call it a skill, and to keep using it for the payment, amortization, extra-principal, and month-level questions it already covers. Keep the current summary rules and month-level rules. Add the recast procedure beside them.
2. The body defines a servicer recast in the words of requirement 5, then gives the two-run procedure in requirement 6, including every branch below. It asks for the term in years or months. "No extras" is an answer. Its run example shows `--years` and `--months` as alternatives. It resolves the real directory of `SKILL.md` and runs `scripts/compound_interest_monthly.js`. "Every month" runs through payment count `n`, not `years * 12` when the term was given in months. It asks when the recast month, the principal, the note rate, the term, or the extra plan is missing. It maps "after N years" to month `N * 12`, "after N months" and "at month M" to that payment number, and a calendar pair with the formula in requirement 6. It asks when the first payment month is missing, and when the start could be either the closing month or the first payment month. A lump sum paid with the recast is an extra row on the recast month in the first run. The first run is `--json --schedule`. The second run's month count is the first run's JSON `months` minus `M`, passed with `--months` even when that count divides by 12, with no `--extra` and no `--schedule`. It checks `amount_cents`. It does not run a second loan when `M` is outside 1 through `n - 1`, or when the balance is already zero, and it says which of those two happened. The recast payment is the second run's `monthly_payment_cents`. The recast interest is the second run's `interest_cents`. It does not answer with the first run's `monthly_payment_cents`, `remaining_interest_cents`, `interest_saved_cents`, or `months_saved`. Lifetime interest, only when asked, is the sum of schedule `interest_cents` through month `M` plus the second run's `interest_cents`. Extra principal after the recast, only when asked, is a third run whose month 1 is the first payment after the recast. The required recast payment stays the second run. It does not invent a fee, a tax, or an insurance payment. It states that a servicer's cent-rounded payment can differ by a cent and that the script's figure stands. Adjustable-rate and interest-only loans are refused with no schedule.
3. Update `REVIEW.md` so the Bugs pass includes a recast payment that is not the second run's `monthly_payment_cents`, a recast interest taken from the pre-recast remaining interest, and an invented fee or escrow. The compliance pass includes `intent/loan-recast/`. Important includes a wrong recast payment.
4. Point `README.md` and `AGENTS.md` at the recast procedure. Record in `AGENTS.md` that `intent/mortgage-skill/` refuses recast and that this folder wins for a recast question and for a term in months.

DoD: `node --test` still exits 0. The skill file contains the recast definition, the first run as `--json --schedule`, the second run as `--months` with no `--extra` and no `--schedule`, `remaining_principal_cents`, the `amount_cents` check, `monthly_payment_cents`, `interest_cents` from the second run, the distinct out-of-range and zero-balance refusals, the calendar ask, the lump sum on the recast month, lifetime interest only when asked, a third run only when extras continue after the recast, the adjustable and interest-only refusal, and the cent warning. The existing summary and month-level instructions are still there. The workspace symlink's target is that file.

### Recorded choice

The skill keeps resolving the real directory of `SKILL.md` and running `scripts/compound_interest_monthly.js`. That symlink and the recorded path discrepancy in `intent/mortgage-skill/plan.md` stay as they are.
