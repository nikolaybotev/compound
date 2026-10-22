# intent.md — Mortgage start timeline

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-22 |
| Status | Scope approved |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Case | [case-study.md](case-study.md) — fictional buyer Alex. Every figure there is an illustration, not a default. |
| Builds on | [intent/amortization-app/](../amortization-app/intent.md), [intent/ui-followups/](../ui-followups/intent.md), [intent/arm-loan/](../arm-loan/intent.md), [intent/arm-adjustment-stats/](../arm-adjustment-stats/intent.md), [intent/clean-closing-costs/](../clean-closing-costs/intent.md) |

## Problem

The schedule already labels each row by the month interest accrues. A November 2026 start shows row 1 as December 2026, and that row is paid on January 1. The payoff line does not say that. It shows the last accrual month (November 2056 for that start), which is the month before the last payment is due.

The ARM stats name the accrual month of a new rate and not the day the new payment is first due. Nothing on the page walks a first-time buyer from funding through the no-payment month, the first due date, and the grace period. Nothing separates interest paid in a calendar year from interest accrued on the schedule, and the schedule must not become that tax table.

## Proposed outcome

The schedule stays a strict amortization schedule. The payoff date becomes the day the last payment is due, with one footnote there and one footnote above the schedule. ARM terms say when the new payment is first due and list the adjustment clocks in words. A separate Tax table, not the schedule, shows a calendar year’s deductible items, including when mortgage insurance drops off. A short Moving in section names the funding date the page already collects, the prepaid interest, the month with no payment, the first due date, the grace period, Closing Disclosure timing, and the renter-to-owner shift. The skills explain the same facts and still do not invent a loan.

## Affected users and systems

- **Users:** The owner, reading a loan on the page, and asking the mortgage skill or the ARM concepts skill when a payment is due.
- **Systems:** The page’s payoff line, schedule caption, ARM terms, a new Moving in disclosure, a new Tax table section, the two mortgage skills, the ARM concepts skill, and the README `--start` sentence. Not `amortize.js`. Not the calculator’s fixed-rate output.

## Constraints and principles

The six decisions in the original prompt win wherever the research is broader.

- Rows stay labeled by the accrual month. Extra principal stays on that row. No per-row due date, rate note, or mortgage-insurance badge. The Date header stays Date.
- The payoff date is the month the last payment is due, on the 1st. For a November 2026 start and a 360th payment that accrues in November 2056, the line is December 1, 2056. The parenthetical duration stays the payment count.
- Two footnotes only, in the wording the spec locks. No Weather strip, sparkline, rent graphic, or other layout pass.
- ARM gets a “new payment first due” note on the First adjustment line and on Highest payment, plus one readable timeline. The page and the tests do not name a credit union.
- Tax is a calendar-year interest figure and a separate Tax table: PMI drop-off, 2026 mortgage-insurance deductibility with its phaseout, no deduction for homeowners insurance, the SALT cap, and a comparison with the standard deduction. Every unverified item in the research’s §6 is labeled unverified.
- Moving in uses the funding month and closing day the page already stores. It explains prepaid interest, the no-payment month, the first payment, grace, Closing Disclosure timing, and rent versus the mortgage.
- Alex’s numbers are not defaults. The fresh visit stays the Conventional loan.
- `amortize.js` stays the walk it is. The fixed-rate JSON, CSV, and summary stay byte for byte.
- This pull request is the docs only. It does not bump the point version. The page pull requests set 0.17, then 0.18, then 0.19, then 0.20. The scenario document stays version 2.
- The research’s escrow calendar, replacing the 6/3/2 impound counts and adding a county tax calendar, is not this intent. [intent/clean-closing-costs/](../clean-closing-costs/spec.md) still has no automatic tax-proration calendar.

## Open questions (carried into spec.md)

1. The midpoint date for mortgage-insurance termination has two plausible readings a month or two apart. The spec picks one formula so Phase 4 can be tested, and leaves the choice open until Phase 4.

## Original prompt (verbatim)

```
Open a new intent folder `intent/mortgage-start-timeline/`. Do not implement the page. Do not merge. Do not bump the point version.

The research doc is the source. Read it all:

`/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/internal/mortgage-start-timeline/research.md`

Also read `AGENTS.md` and the current payoff-date and schedule code (`apps/web/src/app.tsx` around the payoff date, the schedule, and the ARM stats).

Write:

- `intent/mortgage-start-timeline/intent.md`
- `intent/mortgage-start-timeline/spec.md`
- `intent/mortgage-start-timeline/plan.md`
- `intent/mortgage-start-timeline/case-study.md` (the fictional first-time buyer, Alex, from the research doc)

Paste the research doc’s relevant source under an Original prompt or source note in `intent.md`, and point at `case-study.md`. All numbers in the doc are illustrative example data for that fictional case. Do not treat them as product defaults.

The owner approved this scope. These decisions win if the research doc is broader:

1. The amortization schedule stays a strict amortization schedule. Rows stay labeled by the month in which principal and interest accrue (a Nov 2026 start shows row 1 as Dec 2026). Extra payments stay on that same row. Do not add per-row labels. Do not turn the schedule into a payment, accounting, or tax table.
2. The payoff date shows the month the last payment is due (Dec 1, 2056 rather than Nov 2056 for that example). The current payoff line is in `app.tsx` around line 370.
3. Two small footnotes only: one next to the payoff date and one above the schedule. Payments are made in arrears: each month’s row is paid on the 1st of the following month. Polish the wording in doc §5. Broader UI layout is out of scope. Keep the UI changes minimal.
4. ARM: a “new payment first due” note next to the First adjustment and max-payment stats, plus a clear adjustment timeline (change date, index read, notices, first new payment, subsequent changes). Doc §2.14. Make the timing readable. Do not name a credit union on the page or in tests.
5. Tax: a tax-year “interest paid in calendar year” figure, and a separate Tax table section (not the amortization schedule) with yearly deductible items. Include PMI drop-off (80% request, 78% automatic, midpoint) and 2026+ PMI deductibility with its AGI phaseout. Homeowners insurance is not deductible. Include the SALT cap and standard-deduction comparison (doc §2.15–2.16). Flag every unverified item in doc §6 as unverified. Do not present those as settled rules.
6. The moving-in / mortgage start-up timeline (funding-date input, prepaid interest, the no-payment month, first payment date, grace period, CD timing, renter-to-owner framing) and the explainer docs for the skill front-end.

Phasing in doc §5 is a suggestion: Phase 1 dates and footnotes; Phase 2 ARM timeline; Phase 3 tax figure, tax table, and PMI drop-off; Phase 4 escrow calendar; Phase 5 renter-to-owner narrative. Plan and split the later pull requests as you judge best. This pull request is docs only. Say which page pull request sets which point version, starting after the current 0.16. Do not change `amortize.js` unless a phase truly cannot be done on the page; if you keep the walk unchanged, say so.

Open one pull request. The usual checks run. Reply with the pull request URL and any scope question you had to leave open.
```

## Source note

The research was prepared 2026-10-21 and revised the same day with schedule, footnote, ARM, and tax decisions. It is not in the repo. The fictional case is committed as [case-study.md](case-study.md). Three cent figures in the research draft (accrued 2027, accrued 2028, paid 2028) do not match `buildReport`; the case study uses the walk.

The decision text, the footnote options, the suggested phases, and the unverified list are pasted below. Section 2 of the research is the mechanics the spec cites. It is not copied a second time. Where the paste is broader than the constraints above, the constraints win. That includes per-row labels, a Date-header rename, a new visual layout, CLI JSON keys, an interest-credit mode that relabels the schedule, and the escrow calendar.

```
# How a US mortgage starts: funding → first payment → ARM changes → taxes

What this is: an analysis and intent proposal for Compound, prepared 2026-10-21. Revision 2 adds the product owner's final decisions on schedule labeling, footnotes, ARM timing and taxes.
Case: an imaginary first-time buyer, "Alex" (see the research §1). Every name, address, lender, date and dollar figure in the case study is invented for illustration. Legal and regulatory facts are real and sourced.
Status at the time of the research: draft for the product owner's review.

Conventions: "Verified" means checked against the cited primary source on 2026-10-21. "Inference" marks the author's reasoning or arithmetic, not a quoted rule. Nothing there is tax or legal advice.

## 0. TL;DR

- Mortgage interest is paid in arrears; rent is paid in advance. The payment due on the 1st covers interest for the month that just ended. Alex's loan funds Nov 16, 2026, and the first payment is due Jan 1, 2027. That payment pays December 2026 interest.
- The days left in the funding month are prepaid at closing. Alex prepays 11/16–11/30 (15 days) in cash to close. Together, prepaid November and the Jan 1 payment for December leave no loan day unpaid. The "free month" of December is really November prepaid at closing plus December paid on Jan 1.
- First payment rule. First payment = the 1st of the second month after funding. Funding on the 1st, or a lender "interest credit" in the first days of a month, can pull it one month earlier.
- Late fees. The payment is due on the 1st. On the standard Fannie/Freddie note it becomes late-chargeable only if not received by the end of the 15th. It is credit-reported only at 30+ days past due.
- Decision 1: the schedule stays labeled by accrual month. Row 1 of a loan funded in November 2026 is "Dec 2026," the month that row's interest and principal accrue. The amortization schedule stays a strict amortization schedule, not a payment, accounting or tax table. Compound already labels rows this way, so no relabeling is needed.
- Decision 2: the payoff date shows the month the last payment is due. For Alex that's Dec 2056, even though the last schedule row is "Nov 2056."
- Decision 3: two footnotes, no per-row labels. One goes next to the payoff date and one above the schedule, both explaining "paid in arrears." Extra payments stay on the same accrual-month row as that month's P&I. Broader layout and design are deferred to a later design iteration outside the intent workflow.
- Decision 4: ARM rows say when the new payment is first due. On a 7/6 ARM with first payment Jan 1, 2027, the first Change Date is typically Dec 1, 2033, so December 2033 interest accrues at the new rate. The first new payment is due Jan 1, 2034. The index is read from ~Oct 17, 2033 (45 days before the Change Date). The 210–240-day initial notice arrives May 6 – Jun 5, 2033. The actual-rate notice arrives effectively Oct 17 – Nov 2, 2033. After that, the rate changes Jun 1 and Dec 1 each year, and payments change Jul 1 and Jan 1. Under accrual labels, the rate change and the payment change land on the same row.
- Decision 5: taxes get a tax-year interest figure plus a separate Tax table. Form 1098 counts interest paid in the calendar year. A November 2026 funding puts only the prepaid closing interest on the 2026 1098; December 2026 interest is paid Jan 1, 2027. The research's verified-2026 list: $750k acquisition-debt cap, made permanent by the 2025 OBBBA; mortgage insurance deductible again from 2026, phased out between $100k and $109k AGI; SALT cap $40,400 for 2026, phasing down above $505k MAGI and reverting to $10k in 2030; 2026 standard deduction $16,100 single, $32,200 joint; homeowners insurance not deductible; points generally deductible in the year paid on a purchase.
- PMI drop-off. The borrower may request cancellation at 80% of original value. It terminates automatically at 78% scheduled, or at the midpoint at the latest. The Tax table should stop the MI column at the termination payment.
- Recommendation: one intent, mortgage-start-timeline, in phases. Phase 1 dates, footnotes, and the payoff fix. Phase 2 the ARM timeline. Phase 3 the tax-year figure and the Tax table, including PMI drop-off. Phase 4 the escrow calendar (or a follow-up intent). Phase 5 the renter-to-owner narrative.

## 5.2 Footnote copy the research offered (short; pick one of each)

Next to the payoff date, shown there as "Dec 2056*":
- Option A (research recommended): "* Paid in arrears: each payment covers the month before it's due. Your last payment, due Dec 1, 2056, covers November 2056."
- Option B: "* Month your final payment is due. It pays the last month of interest, November 2056."

Above the schedule table:
- Option A (research recommended): "* Each month shows the interest and principal that build up during that month and the balance after it's paid. Mortgages are paid in arrears: each month's payment is due on the 1st of the next month."
- Option B: "* Months are when interest accrues. Each month's payment, including any extra principal, is due on the 1st of the following month."

## 5. Suggested phases (the research; the plan may split them differently)

- Phase 1: Dates and footnotes. Rows stay accrual months. Payoff date is the last due month. Extras stay on accrual-month rows. Optional funding-date label. Derived first-due and maturity dates. Grace and late charge. CLI --funding and JSON dates. Skill sentence on arrears.
- Phase 2: ARM timeline. "New payment first due" on the first-adjustment stat and on each adjustment row. Lookback and notice windows. Max payment "first due". A timeline strip. Initial period from the note.
- Phase 3: Tax-year interest figure on each schedule year group. Tax table as its own section. PMI termination dates and schedule badges. "Not tax advice". State taxes out of scope.
- Phase 4: Escrow calendar, possibly its own intent. RESPA aggregate analysis replaces the fixed 6/3/2 counts. California tax installments, insurance renewal, monthly MI, aggregate adjustment, tax proration from close of escrow, supplemental-tax estimate.
- Phase 5: Renter to owner, front end only.

## 5.4 What the research said not to change

- Keep accrual-month row labels.
- Keep the 30/360 monthly walk, the 360/365 per-diem control and its rounding.
- Keep stored scenarios numerically stable.

## 6. Open items to verify (not assumed)

- Final 2026 Pub. 936 wording (the source used was the IRS draft), especially MI phaseout mechanics and 1098 box 5 reporting.
- OBBBA §70111's overall itemized-deduction limit: exact mechanics and who it affects. Not verified.
- 2027+ standard deduction amounts (not yet published).
- Whether a given credit-union lender is exempt from Cal. Civ. Code §2954.4 (charter) and from periodic statements (small-servicer status). The page and the tests still do not name a credit union; this line is the research's unverified item.
- The 7/6 ARM's actual first Change Date (the note's blank), caps, and floor, which vary by note.
- Which payment carries the last MI premium after termination (servicer practice).
- California state-tax conformity (out of scope).
```
