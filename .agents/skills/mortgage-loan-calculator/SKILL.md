---
name: mortgage-loan-calculator
description: >-
  Answers fixed-mortgage questions about the monthly payment, amortization,
  extra principal, interest saved, a fixed-rate servicer recast, and a
  month-level balance, interest, or savings-so-far figure. Use for those
  questions even when the user does not call it a skill. Asks for a missing
  principal, note rate, term, extra-principal plan, or recast month before
  giving a number. Runs the repo calculator and does not cover adjustable or
  interest-only loans.
---

# Mortgage loan calculator

This skill is the front end for `compound_interest_monthly.js`. The interest figure comes from running that script. Do not recompute the amortization.

## Ask before answering

Ask, and wait, when any of these is missing:

- the principal
- the note rate
- the term in years or months
- the extra-principal plan (for the first run of a recast, or any non-recast question that needs extras)
- the recast month (for a recast question)

A plan with no amount, or no period, is incomplete. Ask. "no extras" is an answer: run the script without `--extra`.

You may derive principal as purchase price minus down payment when both are given. A stated percent is the note rate. Do not invent taxes, insurance, escrow, a recast fee, or an $855,000 loan. Do not supply a principal, rate, term, extra plan, or recast month the user did not give.

## How to read a plan

Month 1 is the first payment. Treat the first year as months 1 through 12. Treat every month, when no end is named, as months 1 through the payment count `n`: the `--months` value when the term was given in months, or `years * 12` when the term was given with `--years`. On a recast, the first run's JSON `months` is `n` for expanding "every month" on that run. Do not expand an extra plan with `years * 12` when the user gave the term in months.

Write one CSV row per extra payment. The header is `month,extra`. The example question ($570,000, 7%, 30 years, $100 extra in each of the first 12 payments) is complete: write twelve rows of `100` and do not ask for more facts. Write the file in a temporary directory. Do not commit it.

## Servicer recast (fixed rate only)

A servicer recast here means: after a principal curtailment, the monthly payment is the re-amortization of the new outstanding balance over the remaining term of the original loan. The note rate is unchanged. The maturity is unchanged—the new term is the original payment count minus the recast month. The new principal is the unpaid principal after the recast month's scheduled principal and that month's extra principal. The new payment is the level principal-and-interest payment that amortizes that principal over that remaining count. Taxes, insurance, escrow, a one-time recast fee, and whether the servicer allows the recast are not part of the figure.

A servicer may round the contractual payment to the cent before posting; the script's payment can differ by about a cent. Report the script's integer cents unchanged.

## Recast procedure (two runs)

Perform a recast as two script runs. Do not answer with the first run's `monthly_payment_cents`, `remaining_interest_cents`, `interest_saved_cents`, or `months_saved`. The first schedule's remaining interest is what is still due if the loan is not recast.

Map the recast timing:

- "After N years" → payment month `N * 12`
- "After N months" → payment month `N`
- "At month M" → payment month `M`

A calendar recast needs the first payment month. Payment number is `(year2 - year1) * 12 + (month2 - month1) + 1`, with months numbered January = 1. If the first payment month is missing and the recast is named as a calendar month, ask. If the loan start could be either the closing month or the first payment month and the user did not say which, ask.

A lump sum paid with the recast is an extra row on the recast month in the first run's CSV (duplicate months sum).

**First run:** original loan with `--json --schedule`, the user's extra CSV if any, and exactly one of `--years` or `--months` for the original term.

Let `M` be the recast month. Let `n` be the first run's JSON `months` (do not multiply years again). The second run's term is `n - M`, passed with `--months` even when that count is a multiple of 12.

If `M` is not an integer from 1 through `n - 1`, tell the user there is no positive remaining term to re-amortize and do not run a second loan. If month `M` has `remaining_principal_cents` of 0 on the schedule, tell the user the loan is already paid off and do not run a second loan. Keep those two cases distinct in wording.

**Second run:** `--amount` is that row's `remaining_principal_cents` written as dollars with exactly two decimal places, the same `--rate`, `--months` set to `n - M`, no `--extra`, and `--json` with no `--schedule`. The second run's `amount_cents` must equal that `remaining_principal_cents`; if it does not, fix the dollar string and run again. Do not invent the payment.

The recast payment is the second run's `monthly_payment_cents`. The interest that loan costs if only the new payment is made is the second run's `interest_cents`.

Lifetime interest with the recast, only when the question asks for it, is the sum of `interest_cents` on schedule rows 1 through `M` plus the second run's `interest_cents` (add printed cents; do not re-amortize).

If, and only if, the owner also asks about extra principal after the recast, run the recast loan again with a new CSV whose month 1 is the first payment after the recast. The required recast payment itself stays the second run, with no extras.

## Loans this calculator will not run

If the user describes an adjustable-rate or interest-only loan, say this calculator only covers a fixed payment that shortens the term when extra principal is applied, and it does not produce a schedule for those loans.

## Run the script

The script is `scripts/compound_interest_monthly.js` in this skill's directory (the folder that contains this file). Resolve the real directory of this `SKILL.md` first (follow symlinks), then run that file. Do not read or write any other path except the temporary `month,extra` CSV.

```bash
node scripts/compound_interest_monthly.js \
  --amount PRINCIPAL --rate NOTE_RATE \
  (--years TERM_YEARS | --months TERM_MONTHS) \
  [--extra extras.csv] --json [--schedule]
```

Exactly one of `--years` or `--months` is required. `--rate` is the note rate in percent, with at most three decimal places.

Answer a summary question (G5) from `--json` alone. Do not add `--schedule` when the summary already answers the question. G5 is interest saved, both interest totals, the scheduled payment, and months saved. Read `interest_saved_cents`, `interest_cents`, `baseline.interest_cents`, `monthly_payment_cents`, and `months_saved`. Money fields are integer cents.

Answer a month or savings-so-far question (G6) from `--json --schedule`, and read `schedule`. That includes interest that month, scheduled principal, remaining principal, remaining interest, extra principal, and cumulative interest saved through that month. Do not invent a month's interest, balance, or savings.

Two extra plans are two runs. Compare the two JSON objects. Do not amortize either plan yourself.
