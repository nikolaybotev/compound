# intent.md — Loan recast

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-02 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/mortgage-skill/](../mortgage-skill/intent.md) |

## Problem

The calculator and its skill answer a fixed loan whose extra principal shortens the term. They refuse a recast. The term flag accepts whole years only, so a remaining term that is not a multiple of 12 months cannot be run as its own loan. A recast after a month that is not a year boundary therefore has no faithful command.

## Proposed outcome

A person can ask what the required monthly payment becomes after a servicer recast of a fixed-rate loan. The skill knows what that recast is, reads the remaining principal from the schedule, and runs the calculator again for the payments left until the original maturity. The calculator accepts that remainder as a count of months.

## Affected users and systems

- **Users:** The owner, asking mortgage questions in this workspace. Anyone who runs the script from the repo.
- **Systems:** `compound_interest_monthly.js`. The skill at `.agents/skills/mortgage-loan-calculator/`. No network services.

## Constraints and principles

- The skill stays a front end. The recast payment comes from running the script, not from a formula typed in the chat.
- A recast keeps the note rate and the original maturity. It does not shorten the term the way an extra principal payment does.
- `--years` keeps its current meaning. A month count is an additional way to give the term.
- The older mortgage-skill spec is the record of the first release. This folder is the change. Do not rewrite that spec so that it means this idea.

## Open questions (carried into spec.md)

None. The design choices made while drafting are D1–D8 in [spec.md](spec.md).

## Original prompt (verbatim)

> Let's update the skill to support recasting questions like this one. Update the script to accept a term in months not just whole years for full flexibility, and define what a servicer loan recast is in the skill for the future agent, in case the agent does not know, and anything else to make the skill as effective as possible. Let's build this using /ai-native-sdlc and since this is a simple project and we went through a successful sample question, I give you clearance to go through the review and build gates without me (unless something really funky comes out of nowhere which I expect is very low probability but of course you can stop and ask always). Please use Composer 2.5 for review and build subagents. Thanks!

## Source transcript (verbatim)

This session, before the prompt above.

> How many months before I pay back mortgage for 570K loan at 7.375% interest 30year fixed if I pay $2,400 additional every month, and $20,000 in march every year extr starting loan in November 2026, first march extra payment in 2027?

The loan is paid off in 94 months — 7 years and 10 months — with the August 2034 payment. November 2026 is payment month 1, so the $20,000 March extras land in month 5 (March 2027) and every 12 months after that, on top of $2,400 extra every month. Scheduled payment $3,936.85. Payoff month 94. Months saved 266. Interest with these extras $180,137.64. Interest on the regular schedule $847,265.40. Interest saved $667,127.76.

> And if I lose my job in 2 years, and recast the loan at that time, what will the monthly payment become? Standard recasting keeps the loan interest rate right? And just spreads out the payment evenly over the remainder of the original 30-year term based on current remaining principal right?

A standard recast keeps the 7.375% rate and the original maturity date. The servicer re-amortizes whatever principal is left into a new level payment over the months still left on the 30-year term. After two years, that is 28 years. This calculator only covers a fixed payment that shortens the term when extra principal is applied. It does not produce a recast payment.

> Yes! We probably can update the skill and the script to accommodate this type of recasting question. Before we touch the skill or script though, do you think we can use the existing script and query it for the summary response with just monthly payment for a new loan at the given interest, remaining principal amount, and loan term duration equal to the remaining months until the original maturity date? Or does the script not accept the loan term in months but only full years?

The script accepts the term only as a positive whole number of years. `--years 28` is valid. `--years 30.0` and any month count are rejected, and the amortization length is that integer times 12. A recast after exactly 24 payments leaves 336 months, which is 28 years, so this case can be a second run: the remaining principal as `--amount`, the same `--rate`, and `--years 28`, with no extras. `monthly_payment_cents` from that summary is the recast payment. A remainder that is not a multiple of 12 months cannot be passed in.

> Also is my thinking correct? Would running a recast as a new loan match the results of what a servicer would produce when recasting a loan?

Yes. A standard recast is that calculation: the same note rate, the unpaid principal after the extra principal is posted, and a level payment over the payments left until the original maturity date. This script uses that formula, with the monthly rate equal to the note rate divided by 12, and reports the payment rounded half up to the cent. At the two-year mark the remainder is exactly 28 years, so a second run with that remaining principal, 7.375%, and `--years 28` is the recast principal-and-interest payment. That figure is principal and interest only. Taxes and insurance stay as they are, and a recast fee is charged once rather than added to the payment. A servicer can still differ by a cent when it rounds the contractual payment before amortizing, or rounds that payment up. The balance has to be the unpaid principal on the recast date, after that month's extra principal is posted.

> Okay could you answer my question now using the current script since the scenario is a recast after exactly 2 years?

The recast payment is $3,195.68 a month. That is the balance after the October 2028 payment, month 24, re-amortized at 7.375% over the 336 months left until the original maturity date. The remaining principal at that point is $453,614.49. The scheduled payment before the recast is $3,936.85.
