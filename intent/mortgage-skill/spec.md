# spec.md — Mortgage skill

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-02) |
| Status | Draft 6 |
| Stage | 2 · Design |

## 1. Summary

`compound_interest_monthly.js` becomes a fixed-rate amortization calculator with required loan arguments and an optional extra-principal CSV. It reports how much interest that CSV saves compared with the same loan and no extras, and it prints a month-by-month schedule. A skill asks for anything the question left out, writes the CSV, runs the script, and answers from that output. The sample interest-saved question is one question the schedule makes answerable, not the only one.

## 2. Goals and non-goals

**Goals**

- G1. Answer an extra-principal question for one fixed, fully amortizing loan, including the example: $570,000, 7%, 30 years, $100 extra principal in each of the first 12 payments.
- G2. Take principal, annual note rate, and term in years as arguments.
- G3. Take extra principal as a CSV: one row per payment month, columns `month` and `extra`.
- G4. Ask the user for a missing principal, rate, term, or extra-payment plan before answering.
- G5. Report interest saved, both interest totals, the scheduled payment, and how many months earlier the loan ends.
- G6. Answer questions about a single month, or about how savings accumulate, from the schedule: interest that month, scheduled principal, remaining principal, remaining interest, extra principal, and cumulative interest saved through that month.

**Non-goals**

- Adjustable-rate, interest-only, or balloon loans.
- Recasting (lowering the required payment and keeping the original term).
- Taxes, insurance, HOA, PMI, points, or fees.
- A calendar date, a payoff date, or a start month. Months are payment numbers.
- Biweekly payments.
- Investing the extra money instead of paying principal.
- A second shorthand on the command line for "every month" or "the first year". The skill expands that phrase into CSV rows.

**Release phasing.** G1–G6 are the first release. Untagged requirements below belong to that release.

## 3. Principles

- P1. The skill runs the script with `--json` and reads that object. It adds `--schedule` only when the question needs a month. The skill does not amortize the loan itself.
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
- The owner asks what the balance, the interest, the remaining interest, or the interest saved so far is in a given month. The skill reads that row of the schedule. The sample question does not need the whole table; a month question does.
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
   | `schedule` | Present only when `--schedule` is also passed. One object per month, from 1 through the baseline payoff month |

   Without `--schedule`, the object has the summary fields and no `schedule` key. With `--json --schedule`, each `schedule` object uses the same meanings as the CSV in requirement 9, with money in integer cents: `month`, `interest_cents`, `principal_cents`, `remaining_principal_cents`, `remaining_interest_cents`, `extra_cents`, `interest_saved_cents`. The last object's `interest_saved_cents` equals the top-level `interest_saved_cents`. With no extras, the baseline matches the run, both saved fields are 0, and every schedule row has `extra_cents` and `interest_saved_cents` at 0. `--json` still prints one JSON object and nothing else, whether or not `--schedule` is set.

9. Without `--json` or `--schedule`, stdout is a short summary: monthly payment, payoff month, total interest, extra applied, extra unapplied, interest saved, and months saved. `--schedule` without `--json` prints a CSV to stdout and nothing else, for a person who wants a sheet. The rows are the same months as `schedule` in the JSON. The header is:

   `month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved`

   | Column | Meaning |
   |---|---|
   | `month` | Payment number, starting at 1 |
   | `interest` | Interest charged this month on this schedule. Zero after this loan is paid off |
   | `principal` | Scheduled principal this month, not including the extra. Zero after payoff |
   | `remaining_principal` | Balance after this month's scheduled principal and extra |
   | `remaining_interest` | Interest still to be charged on this schedule after this month |
   | `extra` | Extra principal applied this month |
   | `interest_saved` | Interest the no-extra schedule has charged through this month, minus interest this schedule has charged through this month |

   `interest_saved` is cumulative. It is not the savings caused by that month's extra payment alone. An extra paid this month does not reduce this month's interest, so the column stays 0 in month 1. Most of the lifetime savings appears in later months, and the rest appears after this loan is already paid off, while the no-extra schedule is still charging interest. Those later rows stay in the CSV with interest, principal, extra, remaining principal, and remaining interest all zero, so the last row's `interest_saved` equals the summary's interest saved. With no extras, `interest_saved` is 0 on every row. Amounts are the exact walk, rounded half up to the cent for the CSV.

10. The skill file is `.agents/skills/mortgage-loan-calculator/SKILL.md`.
    - Its description says to use it for mortgage payments, amortization, extra principal, and interest saved, including when the user does not call it a skill.
    - It resolves `compound_interest_monthly.js` relative to the skill directory (`../../compound_interest_monthly.js`) and runs that file.
    - It asks, and waits, when the principal, the note rate, the term, or the extra plan is missing. It may derive principal as purchase price minus down payment when both are given.
    - It treats a stated percent as the note rate. It does not invent taxes, insurance, or an $855,000 loan.
    - It answers G5 from a `--json` run with no `--schedule`. It answers G6 from a `--json --schedule` run, reading `schedule`. It does not invent a month's interest, balance, or savings, and it does not add `--schedule` for a question the summary already answers.
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
| AC7 | The skill file states the ask-before-answering rule, the input CSV columns, the relative script path, that `--json` alone is the summary, and that a month-level question adds `--schedule` and reads `schedule`. The workspace symlink resolves to that file. |
| AC8 | For the AC3 loan, `--json` alone has no `schedule` key. `--json --schedule` has 360 objects. Month 1 has `extra_cents` 10000 and `interest_saved_cents` 0. Month 12 has `interest_saved_cents` 3926. Month 360 has `interest_saved_cents` 813770, and interest, principal, extra, remaining principal, and remaining interest all 0. The same figures appear in the `--schedule` CSV as 100.00, 0.00, 39.26, and 8137.70. |

## 7. Design decisions

**D1 — Arguments for the loan, CSV for extra principal.** The prompt asked to stop editing the script, and named a CSV of month and extra amount as the flexible shape. A repeat flag such as "first year" stays in the skill, which writes rows. Checked 2026-10-02: the only extra-payment support in the script is a commented $45 on month 1 of year 1.

**D2 — Interest saved is a second schedule that stops at payoff.** The current loop always runs `term * 12` months. Replaying the example on that loop, $100 extra in months 1–12, leaves a balance near −$9,380 and an interest difference near $8,180, because months after payoff keep accruing. The stopped schedule saves $8,137.70. A savings answer uses the stopped schedule.

**D3 — Match Bankrate, and say so.** The schedule keeps the exact payment and the exact monthly interest, and rounds only when it reports. Results are for comparison with Bankrate's amortization schedule, not with a servicer's ledger. Checked 2026-10-02: for $570,000 at 7% and 360 months, the payment is $3,792.224222…, the balance after 360 payments is about a hundred-millionth of a dollar, and total interest is $795,200.72. Bankrate's schedule shows that interest total; its summary card rounds it to $795,201. A walk that rounds the payment to $3,792.22 and each month's interest to the cent, which is closer to how a lender posts a bill, totals about $795,203.90. The README carries that difference as a footnote. The $1,199.10 payment on $200,000 at 6% for 30 years is the same formula rounded for display (unrounded 1199.10105…). Month 1 interest on the $570,000 / 7% loan is $3,325.00.

The 2022 gist and the first commit in this repo wrapped the payment in `Math.ceil`, which rounds up to the next whole dollar, and they accrued a month of interest before applying it. Commit `e67ec85` (`Fix one-off error and simplify`, 2025-06-28) removed `Math.ceil` and charges interest in the same month. That is the behavior to keep. The gist has no other revision, and this repo has no commit that rounds each month to the cent.

**D4 — Extra principal does not reduce the current month's interest.** That is the commented block in the script: accrue interest, apply the scheduled principal, then apply the extra. It is also the usual US mortgage posting order.

**D5 — No silent defaults.** A forgotten flag must not answer the gist scenario. That scenario remains runnable as `--amount 855000 --rate 6.99 --years 30`.

**D6 — Summary is the default.** `--json` alone returns the lifetime totals and omits `schedule`. `--json --schedule` adds the month rows to that same object. `--schedule` alone prints the CSV. The sample savings question does not need the rows, so the skill leaves the flag off. A question about a month adds it. A default that always included 360 rows would make the common answer carry a table it does not use.

**D7 — The skill lives in this repo and is linked into the workspace.** Product skills live in `.agents/skills/<name>/`. The workspace already links `gold-value-normalizer` the same way, so a mortgage question asked from `/Users/nikolay/git` can find it.

**D8 — Fixed payment, shorter term.** The example pays $100 on top of a 30-year fixed loan. The required payment does not change. Recast, ARM, and escrow are out of the first release.

**D9 — "First year" is twelve payment months.** No origination date is in the prompt. Month numbers start at 1.

**D10 — Duplicate months sum.** A file generated from two plans can name month 6 twice. The applied extra is the sum.

**D11 — Rate precision stops at three decimal places.** Eighths of a percent (6.125) fit. The text of `--rate` is parsed as a decimal so 6.99 stays exact. More than three decimal places is an error.

**D14 — The schedule exists so the skill can answer more than the sample question.** The original prompt asks for a skill that answers questions like the $100-for-the-first-year example. Those columns are the `schedule` array inside the JSON the skill reads, so one run answers both kinds of question: interest in a month, principal in a month, remaining balance, interest still ahead, extra applied, and interest saved through that month.

**D13 — The schedule's interest-saved column is cumulative, and the table runs through the no-extra payoff.** Lifetime interest saved is the difference between two finished schedules, so a single month cannot be assigned its own savings without a convention. The column is interest the no-extra loan has charged through that month, minus interest this loan has charged through that month. Checked 2026-10-02 on the $570,000 / 7% / 30-year loan with $100 extra in months 1–12: month 1 saves $0.00, because the extra is applied after that month's interest; month 12 has saved $39.26 of the eventual $8,137.70; month 358, when this loan ends, has saved $8,071.85; months 359 and 360, with this loan already at zero, bring the column to $8,137.70. The CSV keeps those last rows so the final figure is on the sheet.

**D12 — CI uses Node.js 24.** Checked 2026-10-02 on the [Node.js Release schedule](https://github.com/nodejs/Release): 24.x is Active LTS, and 26.x is Current until 2026-10-28. The fixture arithmetic was run locally on Node v26.8.2. `node --test` is the test runner. The repo has no npm dependencies and gains none.

## 8. Open questions

None.
