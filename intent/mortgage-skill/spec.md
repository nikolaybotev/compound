# spec.md — Mortgage skill

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-02) |
| Status | Draft 2 |
| Stage | 2 · Design |

## 1. Summary

`compound_interest_monthly.js` becomes a fixed-rate amortization calculator with required loan arguments and an optional extra-principal CSV. It reports how much interest that CSV saves compared with the same loan and no extras. A skill asks for anything the question left out, writes the CSV, runs the script, and answers from its JSON.

## 2. Goals and non-goals

**Goals**

- G1. Answer an extra-principal question for one fixed, fully amortizing loan, including the example: $570,000, 7%, 30 years, $100 extra principal in each of the first 12 payments.
- G2. Take principal, annual note rate, and term in years as arguments.
- G3. Take extra principal as a CSV: one row per payment month, columns `month` and `extra`.
- G4. Ask the user for a missing principal, rate, term, or extra-payment plan before answering.
- G5. Report interest saved, both interest totals, the scheduled payment, and how many months earlier the loan ends.

**Non-goals**

- Adjustable-rate, interest-only, or balloon loans.
- Recasting (lowering the required payment and keeping the original term).
- Taxes, insurance, HOA, PMI, points, or fees.
- A calendar date, a payoff date, or a start month. Months are payment numbers.
- Biweekly payments.
- Investing the extra money instead of paying principal.
- A second shorthand on the command line for "every month" or "the first year". The skill expands that phrase into CSV rows.

**Release phasing.** G1–G5 are the first release. Untagged requirements below belong to that release.

## 3. Principles

- P1. The skill runs the script and reads its JSON. It does not amortize the loan itself.
- P2. The rate is the note rate. The monthly rate is that percent divided by 12, the convention already in the script and on the Bankrate page it cites.
- P3. An extra payment is applied after that month's interest is computed, then subtracted from principal. It does not reduce that month's interest.
- P4. The scheduled principal-and-interest payment stays constant. Extra principal shortens the loan.
- P5. The schedule stops when the principal reaches zero. Later contractual months are not charged.
- P6. The schedule uses the exact payment and the exact monthly interest. Reported amounts are rounded half up to the cent once, at output. Do not round with `Math.round(dollars * 100) / 100`; `Math.round(1.005 * 100)` is 100.
- P7. A missing required fact is a question, not a default. The constants in the file today ($855,000, 6.99%, 30 years) are not defaults.

## 4. Users and scenarios

- The owner asks the example question in chat. The skill has principal, rate, term, and the extra plan, so it writes twelve CSV rows and reports the fixture in AC3.
- The owner asks "what if I pay extra on my mortgage?" The skill asks for the principal (or price and down payment), the note rate, the term in years, and the extra-principal plan. "No extras" is an answer. It does not run the script until those are known.
- The owner gives a purchase price and a down payment. The principal is price minus down payment.
- The owner asks for the month-by-month schedule. The skill shows the script's schedule. Otherwise it answers with the summary.
- The owner compares two extra plans. The skill runs the script once per plan.

## 5. Functional requirements

1. The command is:

   ```bash
   node compound_interest_monthly.js \
     --amount 570000 --rate 7 --years 30 \
     [--extra extras.csv] [--json] [--schedule]
   ```

   `--amount`, `--rate`, and `--years` are required. `--amount` is dollars of principal, greater than zero. `--rate` is the annual note rate in percent, greater than zero, with at most three decimal places (`7`, `6.99`, `6.125`). `--years` is a positive integer. A missing or invalid required argument exits non-zero and prints the reason on stderr. It does not run the $855,000 scenario.

2. With no `--extra`, the loan is the scheduled payment only.

3. `--extra` is a UTF-8 CSV. The header row is exactly `month,extra`. Each data row is one extra principal payment. `month` is an integer from 1 through `years * 12`. `extra` is a positive dollar amount. Rows for the same month are summed. A file with only the header is no extras. A month outside that range, a non-numeric amount, a negative amount, or a missing column exits non-zero.

4. Month 1 is the first payment. "The first year" is months 1 through 12. The skill writes one CSV row per extra payment, including twelve rows of `100` for the example question.

5. Monthly payment is the fixed amount that pays the loan off after `n = years * 12` months of the interest rule in requirement 6, with no extra principal:

   `principal * (r * (1 + r) ^ n) / ((1 + r) ^ n - 1)`

   where `r` is the note rate times `30/360`. That is the formula already in `compound_interest_monthly.js` and on the Bankrate page it cites. The walk uses this exact payment. The reported payment is that amount rounded half up to the cent.

6. Each month, while principal remains and the month is within `n`:
   - Interest is the unpaid principal times `r`. This is one month of interest under a 360-day year: 30 days out of 360, not the actual number of calendar days in the month.
   - The scheduled principal portion is the exact monthly payment minus that interest. The payment is applied to interest before principal.
   - That month's extra principal, if any, is added after the interest step.
   - If the scheduled principal plus extra is greater than or equal to the remaining principal, or this is month `n`, the payment finishes the loan: interest plus remaining principal. Extra dollars beyond the remaining principal are unapplied. The schedule stops.
   - Otherwise the remaining principal decreases by the scheduled principal plus the extra. Interest and balance are not rounded inside the loop.

7. Interest saved is the no-extra interest total minus the with-extra interest total. Months saved is the no-extra payoff month minus the with-extra payoff month. Unapplied extra is reported and is not part of interest saved.

8. `--json` writes one JSON object to stdout and no other stdout. Fields are integer cents except the rate, the year count, and the month counts:

   | Field | Meaning |
   |---|---|
   | `amount_cents` | Principal |
   | `rate_percent` | Note rate as given |
   | `years` | Term |
   | `monthly_payment_cents` | Scheduled payment |
   | `payoff_month` | Last month with a payment |
   | `interest_cents` | Total interest |
   | `extra_applied_cents` | Extra principal actually applied |
   | `extra_unapplied_cents` | Extra rows that fell after payoff, or the unused part of a payoff month |
   | `baseline.payoff_month` | Payoff month with no extras |
   | `baseline.interest_cents` | Interest with no extras |
   | `interest_saved_cents` | Baseline interest minus this run's interest |
   | `months_saved` | Baseline payoff month minus this payoff month |

   With no extras, the baseline matches the run and both saved fields are 0.

9. Without `--json`, stdout is a short summary: monthly payment, payoff month, total interest, extra applied, extra unapplied, interest saved, and months saved. `--schedule` adds a line per payment with the month number, interest, scheduled principal, extra principal, and remaining principal. `--json` does not print that schedule.

10. The skill file is `.agents/skills/mortgage-loan-calculator/SKILL.md`.
    - Its description says to use it for mortgage payments, amortization, extra principal, and interest saved, including when the user does not call it a skill.
    - It resolves `compound_interest_monthly.js` relative to the skill directory (`../../compound_interest_monthly.js`) and runs that file.
    - It asks, and waits, when the principal, the note rate, the term, or the extra plan is missing. It may derive principal as purchase price minus down payment when both are given.
    - It treats a stated percent as the note rate. It does not invent taxes, insurance, or an $855,000 loan.
    - It answers G5 from the JSON fields.
    - If the user describes an adjustable, interest-only, or recast loan, it says this calculator only covers a fixed payment that shortens the term, and it does not produce a schedule.

11. After the skill file is in the repo, the workspace link is:

    `../../github.com/nikolaybotev/compound/.agents/skills/mortgage-loan-calculator`

    from `/Users/nikolay/git/.agents/skills/mortgage-loan-calculator`. That matches the existing `gold-value-normalizer` link. The link is local workspace setup; it is not a file in the git tree.

## 6. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | `node --test` exits 0. A $200,000 loan at 6% for 30 years has monthly payment 119910 cents ($1,199.10). |
| AC2 | A $570,000 loan at 7% for 30 years, no extras: reported payment 379222 cents ($3,792.22), interest 79520072 cents ($795,200.72), payoff month 360. Month 1 interest is 332500 cents ($3,325.00) even when month 1 also has an extra payment. |
| AC3 | The same loan with $100 extra in months 1–12: interest 78706302 cents ($787,063.02), interest saved 813770 cents ($8,137.70), payoff month 358, months saved 2, extra applied 120000 cents, extra unapplied 0. |
| AC4 | The AC3 run finishes at a zero balance. Payoff month is at most 360. |
| AC5 | Invoking the script with no arguments exits non-zero and does not print the $855,000 schedule. `--amount 855000 --rate 6.99 --years 30 --json` reports monthly payment 568260 cents ($5,682.60). |
| AC6 | A CSV month outside 1…`years * 12` exits non-zero. Two rows for the same valid month are summed. |
| AC7 | The skill file states the ask-before-answering rule, the CSV columns, the relative script path, and that the answer is read from the JSON. The workspace symlink resolves to that file. |

## 7. Design decisions

**D1 — Arguments for the loan, CSV for extra principal.** The prompt asked to stop editing the script, and named a CSV of month and extra amount as the flexible shape. A repeat flag such as "first year" stays in the skill, which writes rows. Checked 2026-10-02: the only extra-payment support in the script is a commented $45 on month 1 of year 1.

**D2 — Interest saved is a second schedule that stops at payoff.** The current loop always runs `term * 12` months. Replaying the example on that loop, $100 extra in months 1–12, leaves a balance near −$9,380 and an interest difference near $8,180, because months after payoff keep accruing. The stopped schedule saves $8,137.70. A savings answer uses the stopped schedule.

**D3 — The payment is the inverse of monthly 30/360 interest.** Fannie Mae servicing guide F-1-09 defines a full month of interest on a fixed-rate first mortgage as 30 days' interest on the unpaid balance using a 360-day year. That is unpaid principal times the note rate times `30/360`, once per month. It is not actual days in the calendar month. The fixed payment which reduces the balance to zero after `n` such months is the formula in the script. Checked 2026-10-02: for $570,000 at 7% and 360 months, that payment is $3,792.224222…, the balance after 360 payments is about a hundred-millionth of a dollar, and total interest is $795,200.72. Bankrate's schedule shows that interest total; its summary card rounds it to $795,201. Rounding the payment to $3,792.22 before the walk leaves about $5.15 of principal and about $795,204.35 of interest, so the schedule keeps the exact payment and rounds only the reported figures. The $1,199.10 payment on $200,000 at 6% for 30 years is that same formula rounded for display (unrounded 1199.10105…). Month 1 interest on the $570,000 / 7% loan is $3,325.00.

**D4 — Extra principal does not reduce the current month's interest.** That is the commented block in the script: accrue interest, apply the scheduled principal, then apply the extra. It is also the usual US mortgage posting order.

**D5 — No silent defaults.** A forgotten flag must not answer the gist scenario. That scenario remains runnable as `--amount 855000 --rate 6.99 --years 30`.

**D6 — JSON is the skill's contract.** The human schedule is for a person who asked for it. Locale-formatted log lines are a poor contract for a dollar answer.

**D7 — The skill lives in this repo and is linked into the workspace.** Product skills live in `.agents/skills/<name>/`. The workspace already links `gold-value-normalizer` the same way, so a mortgage question asked from `/Users/nikolay/git` can find it.

**D8 — Fixed payment, shorter term.** The example pays $100 on top of a 30-year fixed loan. The required payment does not change. Recast, ARM, and escrow are out of the first release.

**D9 — "First year" is twelve payment months.** No origination date is in the prompt. Month numbers start at 1.

**D10 — Duplicate months sum.** A file generated from two plans can name month 6 twice. The applied extra is the sum.

**D11 — Rate precision stops at three decimal places.** Eighths of a percent (6.125) fit. The text of `--rate` is parsed as a decimal so 6.99 stays exact. More than three decimal places is an error.

**D12 — CI uses Node.js 24.** Checked 2026-10-02 on the [Node.js Release schedule](https://github.com/nodejs/Release): 24.x is Active LTS, and 26.x is Current until 2026-10-28. The fixture arithmetic was run locally on Node v26.8.2. `node --test` is the test runner. The repo has no npm dependencies and gains none.

## 8. Open questions

None.
