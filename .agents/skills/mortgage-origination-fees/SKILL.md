---
name: mortgage-origination-fees
description: >-
  Calculates the prepaid finance charge, discount points, origination fee, or
  lender credit implied by a fixed mortgage's note rate (also called the net
  rate) and its APR. Use whenever the user gives a note rate or net rate and
  an APR and asks about fees, points, discount points, an origination charge,
  a lender credit, or the gap between the rate and the APR, even if they do
  not say "skill" or name this formula. Accepts a loan amount, or a purchase
  price with a down payment in dollars or percent. Runs the repo calculator.
  Does not cover adjustable or interest-only loans, and does not itemize
  title, tax, or escrow costs that sit outside the APR.
---

# Mortgage origination fees

This skill is the front end for `origination_fees.js`. The finance charge comes from running that script. Do not discount the payments yourself, and do not round the monthly payment before discounting it. That early rounding is why a hand calculation of $600,000 at 6.75% with a 7.21% APR for 30 years prints $27,257.34. The script's charge for that loan is 2725720 cents ($27,257.20).

## What the number is

The note rate sets the level principal-and-interest payment on the full note amount. The APR is the rate that makes the present value of those payments equal the amount financed. The prepaid finance charge is the note amount minus that amount financed. Discount points and origination fees are the usual contents of that charge. A negative charge is a lender credit: the APR is below the note rate, so the amount financed is larger than the note amount.

The figure assumes a fixed, fully amortizing loan, equal monthly payments, and a first payment one full month after the loan is made. It does not add a separate monthly mortgage-insurance premium or odd-days interest. If the user says the disclosed APR includes either of those, say so: they are inside this one number and are not split out. Title, taxes, escrow, and other costs that are not part of the APR are not in the number.

## Ask before answering

Ask, and wait, when any of these is missing:

- the note rate (a "net rate" in the question is this rate, the rate the payment is calculated from)
- the APR
- the loan amount, or a purchase price together with a down payment in dollars or a percent

A purchase price without a down payment is incomplete. A down payment without a purchase price is incomplete. Pass a rate as `6.75`, not `6.75%`.

A stated loan amount is the note amount. Pass `--amount` and do not also pass `--price`. If no loan amount is stated, pass `--price` with `--down` or `--down-percent` and read `amount_cents` from the script. Do not invent a loan amount, a note rate, or an APR. Do not supply the $600,000 example. Do not invent taxes, insurance, or escrow.

If the term is missing, pass `--years 30` and say that the figure uses 30 years because no term was given. A stated term wins: "15-year" is `--years 15`, and a term given in months is `--months` with that count. Do not pass both.

## Run the script

The script is `scripts/origination_fees.js` in this skill's directory (the folder that contains this file). Resolve the real directory of this `SKILL.md` first (follow symlinks), then run that file.

```bash
node scripts/origination_fees.js \
  (--amount LOAN | --price PRICE (--down DOLLARS | --down-percent PERCENT)) \
  --rate NOTE_RATE --apr APR \
  (--years TERM_YEARS | --months TERM_MONTHS) \
  --json
```

`--rate` and `--apr` are percents greater than zero, with at most three decimal places. Exactly one of `--years` or `--months` is required. `--down-percent` is at least 0 and less than 100, with at most three decimal places. Zero percent down is the full price. A down payment that does not leave a positive loan fails.

Answer from `--json`. Money fields are integer cents. `points_thousandths` is the finance charge as a percent of the loan amount, in thousandths of a percentage point: 4543 is 4.543%, and -2615 is -2.615%. Format cents as dollars with two decimal places. Do not recompute the charge, the payment, or the points.

`amount_cents` is the note amount. When the user gave a price and a down payment, also read `price_cents` and either `down_payment_cents` or `down_percent`, and state the loan amount the script used. `monthly_payment_cents` is principal and interest only. `amount_financed_cents` is the present value at the APR. `finance_charge_cents` is the prepaid finance charge. The note amount is the amount financed plus that charge.

A negative `finance_charge_cents` is a lender credit of that many cents. Say that, and keep the sign on the points.

If the script exits non-zero, tell the user the reason on stderr. Do not replace it with a hand-calculated fee.

## Loans this calculator will not run

If the user describes an adjustable-rate or interest-only loan, say this calculator only covers a fixed fully amortizing payment, and it does not produce a finance charge for those loans.

## Fixture

$600,000, note rate 6.75%, APR 7.21%, 30 years: `monthly_payment_cents` 389159, `amount_financed_cents` 57274280, `finance_charge_cents` 2725720, `points_thousandths` 4543. Report those cents. Do not substitute $3,891.53 or $27,257.34.
