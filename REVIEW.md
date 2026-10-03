# Review instructions

## Passes

Run three passes and tag each finding with its pass:

- **Bugs:** a payment, total interest, or interest-saved figure that disagrees with the fixtures in `intent/mortgage-skill/spec.md` or `intent/loan-recast/spec.md`; a schedule that keeps going after the principal is zero; an extra amount that does not reduce principal; a skill that supplies a loan amount, rate, term, or extra plan the user did not give; a recast payment that is not the second run's `monthly_payment_cents`; recast interest taken from the first run's remaining interest instead of the second run's `interest_cents`; an invented recast fee, tax, or escrow payment. On the amortization page, a payment, balance, payoff month, or interest-saved figure that disagrees with `buildReport` for the same loan; a second walk in the page; a start month treated as payment 1; Apply adding to the extra column instead of replacing it. On Saved by extra, a cell that shows the cumulative `interest_saved_cents` for that month, or a year row that sums the column.
- **Security:** secrets or personal loan files committed to the repo; unexpected network or dependencies; reading or writing paths other than the script, the `--extra` file the user passed, and the skill's own temporary CSV. On the amortization page, a request to any host other than the page's own files, a font loaded from a network, or an install step on the calculator's `node --test` job.
- **Compliance:** the change matches the spec and plan for the intent it implements (`intent/mortgage-skill/`, `intent/loan-recast/`, `intent/amortization-app/`, or `intent/extra-savings-column/`), and the conventions in `AGENTS.md`. A departure from the plan that is not written back into `plan.md` in the same change is a compliance finding.

## What Important means here

Reserve Important for findings that report the wrong interest or the wrong interest saved, keep charging after payoff, apply an extra payment to something other than principal, invent loan terms, report the wrong recast payment, or ship a change the spec forbids. On the amortization page, the same bar covers a figure that disagrees with `buildReport`, a chart band that does not tie out to the loan amount or the total interest, and a prefill that changes the schedule before Apply. Style and naming are nits.

## Cap the nits

Report at most five nits per review; summarize the rest as a count.

## Do not report

Formatting the CI already enforces, generated files the repo ignores, and wording inside the verbatim prompt block of any `intent.md`.
