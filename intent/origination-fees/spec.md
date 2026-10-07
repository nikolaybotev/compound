# spec.md — Origination fees

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-06) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

`origination_fees.js` reports the prepaid finance charge implied by a fixed mortgage's note rate and APR. A skill asks for a missing note rate, APR, or loan size, then answers from that script. The loan size may be a note amount, or a purchase price with a down payment in dollars or a percent.

## 2. Goals and non-goals

**Goals**

- G1. For a fixed fully amortizing loan, report the monthly principal-and-interest payment, the amount financed, the prepaid finance charge, and that charge as points.
- G2. Take the note amount, or a purchase price and a down payment, the note rate, the APR, and the term.
- G3. Ask for a missing note rate, APR, or loan size before answering. A missing term is 30 years, and the answer says so.
- G4. Treat a negative charge as a lender credit.

**Non-goals**

- An itemized Loan Estimate or Closing Disclosure.
- Title, taxes, escrow, recording, or other costs that are not part of the APR.
- Splitting monthly mortgage insurance or odd-days interest out of the APR.
- Adjustable-rate, interest-only, or balloon loans.
- Solving for the note amount from a payment. The $3,888 example is a check on a stated amount of $599,446.72, not a second mode.
- Amortization, extra principal, or a recast. Those stay on `compound_interest_monthly.js`.

## 3. Principles

- P1. The skill runs the script with `--json` and reads that object. It does not discount the payments itself.
- P2. The monthly payment is the note-rate payment already used by `amortize.js`: principal times `(r * (1 + r) ^ n) / ((1 + r) ^ n - 1)`, where `r` is `(rate_percent / 100) / 12`.
- P3. The amount financed is that payment times `(1 - (1 + i) ^ -n) / i`, where `i` is `(apr_percent / 100) / 12`. The finance charge is the note amount minus the amount financed.
- P4. Reported amounts are rounded half up to the cent once, at output, with `dollarsToCents` from `amortize.js`. The reported note amount equals the reported amount financed plus the reported finance charge.
- P5. A missing note rate, APR, or loan size is a question, not a default. There is no built-in loan.

## 4. Users and scenarios

- The owner asks what fees a $600,000 loan at 6.75% with a 7.21% APR implies. The skill has the rate, the APR, and the loan amount, assumes 30 years because no term was given, and reports the fixture in AC1.
- The owner gives a purchase price and a down payment in dollars or a percent, and no loan amount. The skill passes those flags and reports `amount_cents` from the script.
- The owner gives an APR below the note rate. The skill reports a lender credit.
- The owner asks only for a payment or for interest saved. That question stays on the amortization skill.

## 5. Functional requirements

1. The command is:

   ```bash
   node origination_fees.js \
     (--amount 600000 | --price 750000 (--down 150000 | --down-percent 20)) \
     --rate 6.75 --apr 7.21 \
     (--years 30 | --months 360) \
     [--json]
   ```

   A note amount is `--amount`, a number of dollars greater than zero. A purchase price is `--price`, the same. Exactly one of those two forms is accepted. `--amount` cannot be combined with `--price`, `--down`, or `--down-percent`. `--price` requires exactly one of `--down` or `--down-percent`. `--down` is dollars, zero or greater, and must be less than the price after both are rounded to cents. `--down-percent` is at least 0 and less than 100, with at most three decimal places. Zero percent down is the full price.

2. `--rate` is the annual note rate in percent, greater than zero, with at most three decimal places. `--apr` is the APR in the same form. A missing or invalid required argument exits non-zero and prints the reason on stderr. No arguments names `--amount` or `--price`, `--rate`, `--apr`, `--years`, and `--months`, and does not run a built-in loan.

3. Exactly one of `--years` or `--months` is required. Each is a positive integer matching `^[1-9]\d*$`. `--years` sets the payment count to that integer times 12. `--months` is the payment count. Both or neither fails, and the error says exactly one of `--years` or `--months` is required.

4. The loan amount used in the formula is integer cents. `--amount` and `--price` and `--down` become cents with `dollarsToCents`. A percent down payment converts the percent text to thousandths of a percent (20 is 20000, 3.5 is 3500) and takes the loan cents as `price_cents * (100000 - thousandths) / 100000`, rounded half up. The formula then uses those cents divided by 100.

5. The monthly payment and the amount financed are the formulas in P2 and P3, on the unrounded payment. `finance_charge_cents` is `amount_cents - amount_financed_cents`. `points_thousandths` is that charge divided by `amount_cents`, times 100, in thousandths of a percentage point, half up. 2725720 cents on 60000000 cents is 4543, which is 4.543%. A negative charge produces negative points.

6. `--json` writes one JSON object to stdout and no other stdout. Money fields are integer cents. `rate_percent`, `apr_percent`, and `down_percent` are the parsed percents. `years` appears only when `--years` was passed. `price_cents` appears only when `--price` was passed. `down_payment_cents` appears only for `--down`. `down_percent` appears only for `--down-percent`. Fields:

   | Field | Meaning |
   |---|---|
   | `amount_cents` | Note amount |
   | `price_cents` | Purchase price, when given |
   | `down_payment_cents` | Dollar down payment, when given |
   | `down_percent` | Percent down payment, when given |
   | `rate_percent` | Note rate |
   | `apr_percent` | APR |
   | `months` | Payment count |
   | `years` | Term in years, only when `--years` was passed |
   | `monthly_payment_cents` | Note-rate principal and interest |
   | `amount_financed_cents` | Present value of that payment at the APR |
   | `finance_charge_cents` | Note amount minus amount financed. Negative means a lender credit |
   | `points_thousandths` | Finance charge as thousandths of a percent of the note amount |

7. With no `--json`, stdout is a short summary: loan amount, purchase price and down payment when given, note rate, APR, months, years when given, monthly payment, amount financed, the prepaid finance charge or the lender credit, and points. Money uses US grouping and two decimal places. A negative charge is labeled `Lender credit` and printed as a positive dollar amount. Points keep their sign, with three decimal places.

8. The skill at `.agents/skills/mortgage-origination-fees/SKILL.md` runs `scripts/origination_fees.js`, a symlink to this script. It asks for a missing note rate, APR, or loan size. It treats "net rate" as the note rate. It passes `--years 30` when the term is omitted and says that it did. It answers from `--json` and does not recompute the charge. Its description says when to use it. It does not tell other skills to redirect here, and the amortization skill's description does not mention it.

## 6. Acceptance criteria

- AC1. $600,000 at 6.75% note and 7.21% APR for 30 years: payment 389159 cents, amount financed 57274280 cents, finance charge 2725720 cents, points 4543. The human summary prints $3,891.59, $572,742.80, $27,257.20, and 4.543%. `--months 360` reports the same money and omits `years`.
- AC2. $599,446.72 at the same rates for 30 years: payment 388800 cents, amount financed 57221466 cents, finance charge 2723206 cents, points 4543.
- AC3. The same $600,000 loan for 15 years: payment 530946 cents, amount financed 58306620 cents, finance charge 1693380 cents.
- AC4. Equal rates, 6.75% and 6.75%, on $600,000 for 30 years: finance charge 0, points 0, amount financed 60000000 cents, payment 389159 cents. APR 6.5% on that loan: amount financed 61569142 cents, finance charge -1569142 cents, points -2615, and the summary says `Lender credit: 15,691.42`.
- AC5. Price $750,000 with $150,000 down, and the same price with 20% down, both produce amount 60000000 cents and finance charge 2725720 cents. Price $500,000 with 3.5% down produces amount 48250000 cents. Price $333,333.33 with 3.5% down produces price 33333333 cents and amount 32166666 cents. Price $600,000 with 0% down produces amount 60000000 cents.
- AC6. $570,000 at 7% note and 7.125% APR for 30 years has payment 379222 cents, the same payment as the amortization script, amount financed 56287961 cents, and finance charge 712039 cents.
- AC7. No arguments exits non-zero, names `--amount` or `--price`, `--rate`, `--apr`, `--years`, and `--months`, and does not print a $600,000 or $855,000 loan. Missing APR, both term flags, neither term flag, `--amount` combined with `--price`, both down flags, a down payment without a price, a price without a down payment, a down payment equal to the price, a 100% down payment, APR 0, APR with four decimal places, an unknown flag, and a duplicate flag each exit non-zero.
- AC8. The skill text tells the agent to run the script, to ask for a missing note rate, APR, or loan size, to pass `--years 30` only when the term was omitted and to say so, to treat a negative charge as a lender credit, and to report the AC1 cents rather than $3,891.53 or $27,257.34. `scripts/origination_fees.js` is a symlink to the repo-root script. The workspace link is the same kind of uncommitted link the amortization skill uses.

## 7. Design decisions

**D1 — A separate script and skill.** The charge is not an amortization walk. `compound_interest_monthly.js` keeps payment, extra principal, and recast. Fee questions go to `origination_fees.js` and `.agents/skills/mortgage-origination-fees/`. Each skill description says only when to use that skill. The amortization skill does not list this one as a place to go instead.

**D2 — Same payment, round once.** The payment formula is the one in `amortize.js`. The amount financed discounts that exact payment at the APR monthly rate. Cents use `dollarsToCents`. The three reported amounts add up. Checked 2026-10-06: equal note rate and APR round to a zero charge for the principals, rates, and terms in the unit test's sweep, and the $570,000 / 7% payment is 379222 cents, matching the amortization fixture.

**D3 — The $27,257.34 figure rounded too early.** On $600,000 at 6.75% the exact payment is $3,891.588…, which is 389159 cents ($3,891.59), not $3,891.53. Discounting the exact payment at 7.21% and rounding once gives 2725720 cents ($27,257.20), not $27,257.34. The $27,257.34 path used a payment already rounded to $3,891.53 and a monthly APR truncated to 0.006008. The $599,446.72 loan that produces a $3,888.00 payment does match the other writeup after cent rounding: finance charge 2723206 cents ($27,232.06). The skill reports the script's cents.

**D4 — The script requires a term. The skill supplies 30 years only when the user omits one.** The script has no default term, matching the amortization CLI. Quotes in the prompt were 30-year loans and did not list the term as an input, so the skill passes `--years 30` when the term is absent and says that it did. A stated term is never replaced.

**D5 — Price and down payment are script flags.** The skill does not subtract them itself. Dollar amounts become cents first. A percent down payment is integer thousandths of a percent, then a half-up quotient, so 3.5% of $333,333.33 is 32166666 cents and not a binary-float remainder.

**D6 — A negative charge is a lender credit.** APR below the note rate is a valid quote. The JSON charge and the points stay negative. The human summary labels the absolute dollars `Lender credit`.

**D7 — One number, with a stated limit.** This is the prepaid finance charge that reconciles the note-rate payment with the disclosed APR for a fixed fully amortizing loan, level payments, and a first payment one month out. Monthly mortgage insurance and odd-days interest, when they are inside the disclosed APR, stay inside this number. Costs excluded from the APR are not in it. The skill says that when it answers. It does not call the charge hidden.

**D8 — Rates use the note-rate rule already in the repo.** Greater than zero, at most three decimal places. A fourth decimal place fails rather than being rounded.

**D9 — Points are thousandths of a percent of the note amount.** `points_thousandths` 4543 means 4.543%. The quotient is half up on the cent amounts, so the printed points match the printed dollars.

## 8. Open questions

None.
