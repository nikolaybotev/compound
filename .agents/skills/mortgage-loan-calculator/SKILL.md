---
name: mortgage-loan-calculator
description: >-
  Answers fixed-mortgage questions about the monthly payment, amortization,
  extra principal, interest saved, and a month-level balance, interest, or
  savings-so-far figure. Use for those questions even when the user does not call it a skill.
  Asks for a missing principal, note rate, term, or
  extra-principal plan before giving a number. Runs the repo calculator and
  does not cover adjustable, interest-only, or recast loans.
---

# Mortgage loan calculator

This skill is the front end for `compound_interest_monthly.js`. The interest figure comes from running that script. Do not recompute the amortization.

## Ask before answering

Ask, and wait, when any of these is missing:

- the principal
- the note rate
- the term in years
- the extra-principal plan

A plan with no amount, or no period, is incomplete. Ask. "no extras" is an answer: run the script without `--extra`.

You may derive principal as purchase price minus down payment when both are given. A stated percent is the note rate. Do not invent taxes, insurance, or an $855,000 loan. Do not supply a principal, rate, term, or extra plan the user did not give.

## How to read a plan

Month 1 is the first payment. Treat the first year as months 1 through 12. Treat every month, when no end is named, as months 1 through `years * 12`.

Write one CSV row per extra payment. The header is `month,extra`. The example question ($570,000, 7%, 30 years, $100 extra in each of the first 12 payments) is complete: write twelve rows of `100` and do not ask for more facts. Write the file in a temporary directory. Do not commit it.

## Loans this calculator will not run

If the user describes an adjustable, interest-only, or recast loan, say this calculator only covers a fixed payment that shortens the term when extra principal is applied. Do not produce a schedule.

## Run the script

The script is `scripts/compound_interest_monthly.js` in this skill's directory (the folder that contains this file). Resolve the real directory of this `SKILL.md` first (follow symlinks), then run that file. Do not read or write any other path except the temporary `month,extra` CSV.

```bash
node scripts/compound_interest_monthly.js \
  --amount PRINCIPAL --rate NOTE_RATE --years TERM \
  [--extra extras.csv] --json [--schedule]
```

`--amount`, `--rate`, and `--years` are required. `--rate` is the note rate in percent, with at most three decimal places.

Answer a summary question (G5) from `--json` alone. Do not add `--schedule` when the summary already answers the question. G5 is interest saved, both interest totals, the scheduled payment, and months saved. Read `interest_saved_cents`, `interest_cents`, `baseline.interest_cents`, `monthly_payment_cents`, and `months_saved`. Money fields are integer cents.

Answer a month or savings-so-far question (G6) from `--json --schedule`, and read `schedule`. That includes interest that month, scheduled principal, remaining principal, remaining interest, extra principal, and cumulative interest saved through that month. Do not invent a month's interest, balance, or savings.

Two extra plans are two runs. Compare the two JSON objects. Do not amortize either plan yourself.
