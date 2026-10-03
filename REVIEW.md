# Review instructions

## Passes

Run three passes and tag each finding with its pass:

- **Bugs:** a payment, total interest, or interest-saved figure that disagrees with the cent fixtures in `intent/mortgage-skill/spec.md`; a schedule that keeps going after the principal is zero; an extra amount that does not reduce principal; a skill that supplies a loan amount, rate, term, or extra plan the user did not give.
- **Security:** secrets or personal loan files committed to the repo; unexpected network or dependencies; reading or writing paths other than the script, the `--extra` file the user passed, and the skill's own temporary CSV.
- **Compliance:** the change matches `intent/mortgage-skill/spec.md` and `plan.md`, and the conventions in `AGENTS.md`. A departure from the plan that is not written back into `plan.md` in the same change is a compliance finding.

## What Important means here

Reserve Important for findings that report the wrong interest or the wrong interest saved, keep charging after payoff, apply an extra payment to something other than principal, invent loan terms, or ship a change the spec forbids. Style and naming are nits.

## Cap the nits

Report at most five nits per review; summarize the rest as a count.

## Do not report

Formatting the CI already enforces, generated files the repo ignores, and wording inside the verbatim prompt block of any `intent.md`.
