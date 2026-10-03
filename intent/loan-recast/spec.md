# spec.md — Loan recast

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-02) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

`compound_interest_monthly.js` accepts the term as a positive number of months, as well as a positive number of years. The mortgage skill answers a fixed-rate servicer recast by reading the remaining principal from the first run and running the calculator again for the payments left until the original maturity. The recast payment is that second run's scheduled payment.

This folder builds on [intent/mortgage-skill/](../mortgage-skill/intent.md). That spec's refusal of recast, and its year-only term, stay the record of the first release. For a recast question, and for a term given in months, this spec wins.

## 2. Goals and non-goals

**Goals**

- G1. Accept a term as a positive integer count of months, including a count that is not a multiple of 12.
- G2. Keep `--years` as a positive integer whose payment count is that integer times 12.
- G3. Answer a fixed-rate recast: same note rate, unpaid principal after the recast month, level payment over the payments left until the original maturity.
- G4. Define a servicer recast in the skill so an agent that does not already know the term can follow it.
- G5. Keep the recast payment, the recast interest, and the pre-recast balance as figures the script prints. The skill does not amortize either run itself.

**Non-goals**

- Adjustable-rate and interest-only loans, including a recast of either.
- A refinance, a rate change, a new maturity date, or odd-days interest.
- Taxes, insurance, escrow, a recast fee, eligibility, or a minimum curtailment. Those stay servicer policy and are not calculated.
- A calendar date as a script argument. The skill maps a calendar onto payment numbers and asks when it cannot.
- Rewriting `intent/mortgage-skill/` so that it means this change.
- Rounding the walk to the cent so that it matches a servicer ledger.

**Release phasing.** G1–G5 are this release. Untagged requirements below belong to it.

## 3. Principles

- P1. The skill runs the script and reads the JSON. It does not type a payment formula.
- P2. One recast is two runs. The first is the loan the person already has, including extra principal through the recast month. The second is a new loan with no extras: the remaining principal, the same note rate, and the remaining month count.
- P3. The monthly rate stays the note rate divided by 12. The walk stays exact. Reported amounts are still rounded half up to the cent once, at output.
- P4. A missing principal, note rate, term, extra plan, or recast month is a question. The skill does not invent one.
- P5. `--years` and `--months` are two ways to say the payment count. Passing both is an error. Passing neither is an error.

## 4. Users and scenarios

- The owner asks for the payment on a loan whose term is 13 months. The skill passes `--months 13`.
- The owner asks the sample recast. $570,000 at 7.375% for 30 years, $2,400 extra every month, and $20,000 extra in March, with November 2026 as payment month 1 so the first March extra is month 5. After exactly two years the skill reads month 24 and runs the remaining 336 months. The second run's payment is $3,195.68.
- The owner asks for a recast after a month that leaves a remainder other than a whole number of years. The second run uses `--months` for that remainder.
- The owner names a recast and does not say in which month. The skill asks.
- The owner asks what interest the recast loan will cost if they pay only the new payment. The skill reads the second run's interest total. It does not read the first schedule's remaining interest.
- The owner describes an adjustable or interest-only loan. The skill says this calculator only covers a fixed payment, and it does not produce a schedule.

## 5. Functional requirements

1. The command accepts either `--years` or `--months`:

   ```bash
   node compound_interest_monthly.js \
     --amount 570000 --rate 7.375 \
     (--years 30 | --months 336) \
     [--extra extras.csv] [--json] [--schedule]
   ```

   `--amount` and `--rate` stay as in the mortgage-skill spec. Exactly one of `--years` and `--months` is required. `--years` remains a positive integer. `--months` is a positive integer. `30.0`, `0`, a negative, and a non-integer are invalid for either flag. Both flags, or neither, exits non-zero and the reason on stderr names the term flags. A missing amount or rate still exits non-zero, still says a required argument is missing, and still does not run the $855,000 loan. The payment count `n` is `years * 12` when `--years` is set, and the given integer when `--months` is set.

2. `--json` always includes `months`, the payment count `n`. It includes `years` only when `--years` was passed, as that integer. A `--months` run has no `years` key. Every other JSON field keeps the mortgage-skill meanings, with payoff and extra bounds measured in `n` rather than `years * 12`. The human summary text is unchanged.

3. `--extra` months run from 1 through `n`. A month outside that range exits non-zero. Duplicate months still sum.

4. The scheduled payment uses the existing formula with this `n`. A `--months 180` loan is the same walk as `--years 15` for the same principal and rate.

5. A servicer recast, for this skill, is the following and nothing else. Checked 2026-10-02 against [Fannie Mae's recast loan overview](https://singlefamily.fanniemae.com/job-aid/loan-delivery/topic/loan_delivery_job_aids_recast_loan_overview.htm): after a principal curtailment, the monthly payment is the re-amortization of the new outstanding balance over the remaining term, and the only change to the note terms is that lower payment. [Servicing Guide C-1.2-01](https://guide-servicing.fanniemae.com/svc/c-1.2-01/processing-additional-principal-payments) (2024-11-13) treats that re-amortization as a request to reduce the contractual payment after a substantial curtailment, and it is not a modification. In this calculator that means:
   - The note rate is unchanged.
   - The maturity is unchanged. The new term is the original payment count minus the recast month.
   - The new principal is the unpaid principal after the recast month's scheduled principal and that month's extra principal.
   - The new payment is the level principal-and-interest payment that amortizes that principal over that remaining count.
   - Taxes, insurance, escrow, a one-time recast fee, and whether the servicer allows the recast are not part of the figure.

6. The skill performs a recast as two runs, and it always passes the remainder with `--months`, including when the remainder is a multiple of 12.
   - Ask, and wait, when the principal, the note rate, the original term, the extra plan, or the recast month is missing. "No extras" is an answer.
   - "After N years" is payment month `N * 12`. Month 1 is the first payment. A stated start month and a stated recast month become a payment number the same way an extra-payment month does. November 2026 as the first payment makes March 2027 month 5. If the start payment month is missing and the recast is named as a calendar month, ask.
   - A lump sum paid with the recast is an extra row on the recast month in the first run.
   - The first run is `--json --schedule` for the original loan and its extra CSV.
   - Let `M` be the recast month and `n` the original payment count. If `M` is not an integer from 1 through `n - 1`, say there is no positive remaining term to re-amortize and do not run a second loan. If month `M` has `remaining_principal_cents` of 0, the loan is already paid off; do not run a second loan.
   - The second principal is that row's `remaining_principal_cents`, written as dollars with exactly two decimal places. The second run is `--amount` that string, the same `--rate`, `--months` set to `n - M`, no `--extra`, and `--json` with no `--schedule`.
   - The second run's `amount_cents` must equal that `remaining_principal_cents`. If it does not, the dollar string was wrong; correct it and run again. Do not invent the payment.
   - The recast payment is the second run's `monthly_payment_cents`. The interest that loan costs, if only the new payment is made, is the second run's `interest_cents`.
   - Do not answer with the first run's `monthly_payment_cents`, `remaining_interest_cents`, `interest_saved_cents`, or `months_saved`. The first schedule's remaining interest is the interest still due if the loan is not recast.
   - Interest already charged through the recast month is the sum of `interest_cents` on schedule rows 1 through `M`. Lifetime interest with the recast is that sum plus the second run's `interest_cents`. Those are additions of printed cents, used only when the question asks for them.
   - If, and only if, the owner also asks about extra principal after the recast, run the recast loan again with a new CSV whose month 1 is the first payment after the recast. The new required payment itself is the second run, with no extras.

7. The skill file states the definition in requirement 5, the procedure in requirement 6, and the ask-before-answering rule. Its description tells an agent to use it for a fixed-rate recast even when the user does not call it a skill. An adjustable-rate or interest-only loan is still refused, with no schedule. The script path, the summary rules, and the month-level rules from the mortgage skill stay. The reported recast payment can differ by a cent from a servicer that rounds the contractual payment before amortizing. The skill does not adjust the script's figure.

8. The sample, checked 2026-10-02 with the current script. Original loan `$570,000`, `7.375%`, `--years 30`, `$2,400` in months 1 through 360, and `$20,000` in months 5, 17, 29, and so on through the term. Month 24 `remaining_principal_cents` is 45361449. The second run `--amount 453614.49 --rate 7.375 --months 336` reports `amount_cents` 45361449, `monthly_payment_cents` 319568, `payoff_month` 336, and `interest_cents` 62013361. The same principal and rate for 335 months reports `monthly_payment_cents` 319855, so the 28-year payment is not the payment for one month less.

## 6. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | `--amount 200000 --rate 6 --years 15 --json` and the same loan with `--months 180` both report `monthly_payment_cents` 168771, `payoff_month` 180, and `interest_cents` 10378846. The years run has `years` 15 and `months` 180. The months run has `months` 180 and no `years` key. |
| AC2 | `--amount 200000 --rate 6 --months 13 --json` reports `monthly_payment_cents` 1592845, `payoff_month` 13, `interest_cents` 706982, `months` 13, and no `years` key. |
| AC3 | No arguments still exits non-zero, stderr matches a missing required argument, and neither stream contains the $855,000 loan. `--years` together with `--months` exits non-zero and names the term flags. Amount and rate with neither term flag does the same. `--months 0`, `--months 13.0`, and `--years 30.0` each exit non-zero. |
| AC4 | On a 13-month loan, an extra CSV month of 14 exits non-zero. Month 13 is accepted. |
| AC5 | The sample in requirement 8: month 24 remaining principal 45361449 cents, and `--amount 453614.49 --rate 7.375 --months 336 --json` reports payment 319568 cents, interest 62013361 cents, payoff month 336, and `amount_cents` 45361449. `--months 335` on that principal and rate reports payment 319855 cents. |
| AC6 | The skill description covers a fixed-rate recast. The body defines the recast as requirement 5, gives the two-run procedure, uses `--months` for the remainder, checks `amount_cents`, refuses a zero balance and a non-positive remainder, refuses adjustable and interest-only loans, and warns that a servicer's rounded payment can differ by a cent. The workspace symlink still resolves to that file. |

## 7. Design decisions

**D1 — Add `--months`; do not loosen `--years`.** The prompt asked for a term in months, and `--years 30.0` is already an error. A fractional year would be a second encoding of the same count. Exactly one flag is required so a command cannot carry two terms. Checked 2026-10-02: the script rejects `--years 30.0`, and `parseYears` accepts only `^[1-9]\d*$`.

**D2 — `months` is always in the JSON; `years` only when `--years` was the input.** A 13-month loan has no year count to report. Existing `--years` answers gain `months` and keep `years`. Checked 2026-10-02: `--years 15` on $200,000 at 6% returns payment 168771 cents, interest 10378846 cents, and payoff month 180, which is the 180-month walk.

**D3 — A recast is a second run, not a new walk in the script.** The prompt's sample was answered that way with `--years 28`, and the prompt then asked for months so the same move works when the remainder is not a whole number of years. The skill always uses `--months` for the remainder so the agent has one procedure. Checked 2026-10-02: `$453,614.49` at 7.375% for 28 years returns payment 319568 cents and interest 62013361 cents. The same formula for 336 months matches those cents. For 335 months the payment is 319855 cents and the interest is 61790132 cents.

**D4 — The recast principal is the balance after the recast month.** That is `remaining_principal` on that schedule row: scheduled principal and extra already applied. "After N years" is month `N * 12`. The sample's month 24 balance is 45361449 cents. A lump sum that arrives with the recast belongs in that month's extra, because the balance has to be the balance after the curtailment is posted.

**D5 — The first schedule's remaining interest is not the recast interest.** Remaining interest assumes the loan continues on the current payment. The recast replaces that payment. The second run's `interest_cents` is the interest from the recast forward.

**D6 — Say the cent gap; do not close it.** The mortgage-skill decision to match Bankrate's exact walk still stands. A servicer that rounds the contractual payment before posting can differ by about a cent. The skill tells the agent to report the script's cents unchanged.

**D7 — Fees, escrow, and eligibility are outside the answer.** Fannie Mae's job aid describes a lower payment from re-amortizing the new balance over the remaining term, and says the only note-term change is that payment. The servicing guide adds the Form 181 paperwork and says the re-amortization is not a modification. Neither source is a fee schedule or an escrow rule. The skill does not invent a fee or a tax payment.

**D8 — Adjustable and interest-only stay refused.** Fannie Mae's step-rate recast recalculates later steps at later rates. This walk has one rate. An interest-only period has no principal amortization to recompute. The skill produces no schedule for those loans.

## 8. Open questions

None.
