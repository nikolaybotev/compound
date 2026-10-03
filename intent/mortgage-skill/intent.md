# intent.md — Mortgage skill

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-02 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |

## Problem

`compound_interest_monthly.js` amortizes one fixed loan and can show a month-by-month split of interest and principal. The loan amount, rate, and term are constants in the file. An extra principal payment exists only as a comment, and only for the first month. Answering "how much interest do I save if I pay extra?" means editing the script, and the loop still runs the full term after the balance would have hit zero.

## Proposed outcome

A person can ask, in ordinary language, how much interest a fixed mortgage saves under an extra-principal plan. Missing loan facts are asked for before any number is given. The calculator takes the loan terms as arguments and the extra principal as a CSV of month and amount, then reports the interest saved against the same loan with no extras.

## Affected users and systems

- **Users:** The owner, asking mortgage questions in this workspace. Anyone who runs the script from the repo.
- **Systems:** `compound_interest_monthly.js`. A skill at `.agents/skills/mortgage-loan-calculator/`, linked from the workspace `.agents/skills/` the same way `gold-value-normalizer` is linked. No network services.

## Constraints and principles

- The skill is a front end for this script. The interest figure comes from running the script.
- Extra amounts are principal paid on top of the scheduled principal-and-interest payment.
- The script must not need a hand edit for each new loan or extra-payment plan.
- A CSV with one row per extra payment is the flexible input for those payments.
- Ask for a missing loan amount, rate, term, or extra-payment plan. Do not fill them in.

## Open questions (carried into spec.md)

None. The design choices made while drafting are D1–D12 in [spec.md](spec.md).

## Original prompt (verbatim)

> Look at @github.com/nikolaybotev/compound/compound_interest_monthly.js .
>
> This is for mortgage interest payments amortization and additional payment savings calculations.
>
> Write a skill front-end for the script - create a skill that can be used to answer questions like "how much in interest will I save if I pay $100 on top of my 30-year fixed 7% $570K mortgage loan every month for the first year" The skill should ask the user for missing details.
>
> I am thinking it would be best to enhance the script to accept input arguments (rather than having to hack edit the script each time) - most flexible might be a .csv file with one row per extra payment with columns for month number and extra payment amount (towards the principal).
>
> Let's build this using /ai-native-sdlc
