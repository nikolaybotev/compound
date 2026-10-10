---
name: mortgage-loan-calculator
description: >-
  Answers mortgage questions about the monthly payment, amortization, extra
  principal, interest saved, a fixed-rate servicer recast, and a month-level
  balance, interest, or savings-so-far figure. Also answers a fixed-then-adjusting
  adjustable-rate (ARM) loan's worst-case payment and interest, a given index
  path, and the same extra-principal and month-level questions on that ARM. Use
  for those questions even when the user does not call it a skill. Asks for a
  missing principal, note rate, term, extra-principal plan, recast month, or ARM
  term before giving a number. Runs the repo calculator and does not cover
  interest-only, payment-option, or negative-amortization loans.
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
- for an adjustable-rate (ARM) loan: the fixed period, the adjustment interval, the margin, the initial, periodic, and lifetime caps, and the lifetime floor

The first-adjustment floor is optional for an ARM. When the user does not give it, the skill omits `--initial-floor`, so the calculator uses the lifetime floor, and says so. The index name and the lookback period are not required. When the user gives them, the skill may repeat which published figure the note reads (for Ed's terms, the most recent weekly 1-year CMT available 45 days before the change date) and does not fetch a value.

A plan with no amount, or no period, is incomplete. Ask. "no extras" is an answer: run the script without `--extra`.

You may derive principal as purchase price minus down payment when both are given. A stated percent is the note rate. Do not invent taxes, insurance, escrow, a recast fee, or an $855,000 loan. Do not supply a principal, rate, term, extra plan, or recast month the user did not give.

## How to read a plan

Month 1 is the first payment. Treat the first year as months 1 through 12. Treat every month, when no end is named, as months 1 through the payment count `n`: the `--months` value when the term was given in months, or `years * 12` when the term was given with `--years`. On a recast, the first run's JSON `months` is `n` for expanding "every month" on that run. Do not expand an extra plan with `years * 12` when the user gave the term in months.

Write one CSV row per extra payment. The header is `month,extra`. The example question ($570,000, 7%, 30 years, $100 extra in each of the first 12 payments) is complete: write twelve rows of `100` and do not ask for more facts. Write the file in a temporary directory. Do not commit it.

## Adjustable-rate (ARM) loans

This section covers a fully amortizing loan with a fixed period followed by regular resets, each bounded by an initial, a periodic, and a lifetime cap and a floor. The note rate the user gives is the initial rate: pass it as `--rate`. The term is the user's term. Pass the ARM terms as `--fixed-years` or `--fixed-months` (exactly one), `--adjust-months`, `--margin`, `--caps INITIAL/PERIODIC/LIFETIME` (the order the rate sheet prints, for example `5/2/5`), and `--floor`. Do not supply a fixed period, interval, margin, cap, floor, or index value the user did not give.

With no index path from the user, the run is the worst case the note allows, and the answer says so in one sentence: every reset takes the maximum the caps and the lifetime ceiling permit. Do not apply a periodic cap at the first reset; the calculator uses the initial cap there, so 5/2/5 from 5.875% reaches 10.875% at the first reset.

An index path is a `month,index` CSV passed with `--index`. It has one row for each adjustment month the user named, and only at adjustment months. Write the index as a percent with at most three decimals (`4.42`). Do not write the rate; the calculator adds the margin and applies the caps and floors.

- "The first adjustment" is month `F + 1`, where `F` is the fixed period in months (`years * 12` for a period in years). A 7-year fixed period has its first adjustment at month 85.
- "Year k" of the loan is payment `(k - 1) * 12 + 1`. On a 7/1, "year 8" is month 85, the first adjustment. On a 10/1, "year 8" is month 85, which is inside the fixed period, and the first adjustment is month 121.
- A calendar month maps to a payment number through the same first-payment formula the recast section uses: `(year2 - year1) * 12 + (month2 - month1) + 1`. Ask for the first payment month when the user names a calendar month without it.
- If the payment number that results is not an adjustment month (`F + 1 + k * A` for `k` of 0 or more, up to the term), ask the user which adjustment they mean. Do not slide it to `F + 1`.
- "Every adjustment" is one row for each adjustment month through the term `n` (the `--months` value, or `years * 12`). A flat index of 4.00 on a 7/1 over 30 years is 23 rows, months 85, 97, and on to 349, each with `4`.
- If the user gives the rate they expect at an adjustment instead of the index, write `rate - margin` as the index and say you did. That subtraction of two printed percents is the only arithmetic this skill does. If the rate is below the margin, the difference is negative and the calculator rejects it: ask for the index instead and do not write a negative row.

Never pass `--round-eighth` unless the user says the note rounds to an eighth. Do not pass `--initial-floor` unless the user gave a first-adjustment floor.

Answer a summary question from `--json` alone. Read `monthly_payment_cents` (the initial payment), `arm.max_rate_percent`, `arm.max_payment_cents`, `arm.max_payment_month`, `arm.adjustments` (each reset's `month`, `index_percent`, `fully_indexed_percent`, `rate_percent`, and `payment_cents`), `interest_cents`, and `interest_saved_cents`. A fully indexed rate above the lifetime ceiling is reported at the ceiling; `fully_indexed_percent` shows what the index asked for. Answer a month question from `--json --schedule` and read `rate_percent`, `payment_cents`, and the existing row fields.

Extra principal works on an ARM through the same `month,extra` CSV. Each reset re-amortizes the actual unpaid balance over the payments left, so extra principal lowers the next reset payment and may shorten the term by little or nothing. Report `interest_saved_cents` and `months_saved` as the calculator gives them.

A recast question on an ARM is declined in one sentence: the two-run recast procedure is for a fixed rate, and an ARM already re-amortizes at each reset.

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

If the user describes an interest-only, payment-option, or negative-amortization loan, say this calculator covers a fully amortizing fixed-rate loan and a fixed-then-adjusting ARM with regular resets, and it does not produce a schedule for those loans.

## Run the script

The script is `scripts/compound_interest_monthly.js` in this skill's directory (the folder that contains this file). Resolve the real directory of this `SKILL.md` first (follow symlinks), then run that file. Do not read or write any other path except the temporary `month,extra` and `month,index` CSVs.

```bash
node scripts/compound_interest_monthly.js \
  --amount PRINCIPAL --rate NOTE_RATE \
  (--years TERM_YEARS | --months TERM_MONTHS) \
  [--extra extras.csv] --json [--schedule]
```

For an ARM, add the ARM flags in brackets to the same command. `--index` is the `month,index` CSV; pass it only when the user gave an index path.

```bash
node scripts/compound_interest_monthly.js \
  --amount PRINCIPAL --rate INITIAL_RATE \
  (--years TERM_YEARS | --months TERM_MONTHS) \
  [--fixed-years FIXED_YEARS | --fixed-months FIXED_MONTHS] [--adjust-months INTERVAL] \
  [--margin MARGIN] [--caps INITIAL/PERIODIC/LIFETIME] [--floor LIFETIME_FLOOR] \
  [--index index.csv] [--extra extras.csv] --json [--schedule]
```

Exactly one of `--years` or `--months` is required. `--rate` is the note rate in percent, with at most three decimal places. In ARM mode `--rate` is the initial rate.

Answer a summary question (G5) from `--json` alone. Do not add `--schedule` when the summary already answers the question. G5 is interest saved, both interest totals, the scheduled payment, and months saved. Read `interest_saved_cents`, `interest_cents`, `baseline.interest_cents`, `monthly_payment_cents`, and `months_saved`. Money fields are integer cents.

Answer a month or savings-so-far question (G6) from `--json --schedule`, and read `schedule`. That includes interest that month, scheduled principal, remaining principal, remaining interest, extra principal, and cumulative interest saved through that month. Do not invent a month's interest, balance, or savings.

Two extra plans are two runs. Compare the two JSON objects. Do not amortize either plan yourself.
