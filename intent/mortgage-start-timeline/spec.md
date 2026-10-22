# spec.md — Mortgage start timeline

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-22) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

The page keeps accrual-month schedule rows and starts showing the payoff date as the day the last payment is due, with two footnotes. ARM terms name the day the new payment is first due and list the adjustment clocks. A Moving in disclosure explains funding, prepaid interest, the month with no payment, the first due date, grace, Closing Disclosure timing, and rent versus the mortgage. A Tax table section, separate from the schedule, shows interest paid in each calendar year and the other yearly items in requirement 8. `amortize.js` does not change. The fixed-rate command-line output does not change.

This docs pull request leaves the point version at 0.16. The page pull requests set 0.17 (dates and footnotes), 0.18 (ARM timing), 0.19 (Moving in), and 0.20 (tax table and PMI drop-off).

This folder builds on [intent/amortization-app/](../amortization-app/spec.md), [intent/ui-followups/](../ui-followups/spec.md), [intent/arm-loan/](../arm-loan/spec.md), [intent/arm-adjustment-stats/](../arm-adjustment-stats/spec.md), and [intent/clean-closing-costs/](../clean-closing-costs/spec.md). Where this spec changes the payoff sentence, D12 names it and this spec wins. The schedule columns, the ARM walk, the closing-cost form, and the 6/3/2 impound counts stay as those specs left them.

The worked example is [case-study.md](case-study.md). Its figures are not defaults.

## 2. Goals and non-goals

**Goals**

- G1. The payoff date is the due date of the last payment, and two footnotes say that payments are made in arrears.
- G2. The First adjustment line and the Highest payment line say when the new payment is first due, and the ARM terms list the change date, the index read, the notices, the first new payment, and later changes.
- G3. A Moving in disclosure reads the funding date from the start month and the closing day, and states prepaid interest, the no-payment month, the first due date, grace, Closing Disclosure timing, and the rent-versus-mortgage shift.
- G4. A Tax table section shows interest paid in each calendar year, points, mortgage insurance and its drop-off, the SALT cap, homeowners insurance as not deductible, and a comparison with the standard deduction.
- G5. The mortgage skill, the origination-fees skill, the ARM concepts skill, and the README say the same timing rules, without a new command-line flag and without a new skill.

**Non-goals**

- A change to `amortize.js`, `amortize.d.ts`, `compound_interest_monthly.js` output, `origination_fees.js`, or any fixed-rate JSON, CSV, or summary byte.
- A due-date column, a per-row note, a mortgage-insurance badge, or a tax figure inside the schedule. The Date header stays Date. Year-row interest stays accrued interest.
- Renaming Start month, replacing the month picker, or adding a second funding-date widget. Interest credit does not relabel rows.
- The research’s escrow calendar: no RESPA aggregate analysis, no county installment table, no supplemental-tax estimate, no change to the 6, 3, and 2 impound defaults.
- A new visual system: no hourly-style strip, sparkline, stacked lanes, or rent-versus-mortgage graphic.
- A new skill. State income-tax conformity. Grandfathered acquisition debt from before December 16, 2017. Refinance points spread over the term. Financing upfront MIP.
- Naming a credit union, or any lender, in new page copy or new tests.
- Treating [case-study.md](case-study.md) as a fresh-visit loan or as a stored default.
- A point-version bump on this docs pull request. A scenario document version 3.

**Release phasing.** G1 ships as page 0.17, G2 as 0.18, G3 as 0.19, and G4 as 0.20. G5’s sentences land in the pull request for the goal they describe. The escrow calendar is not a later phase of this intent. Untagged requirements belong to the phase the plan names.

## 3. Principles

- P1. One walk. Principal, interest, balances, and ARM payments come from `buildReport`. A due date is `paymentDate(startMonth, paymentNumber + 1)` on the page. The page does not write a due date back onto a schedule row.
- P2. The schedule is an amortization schedule. Payment calendars live in the footnotes, the payoff line, Moving in, and the ARM timeline. Tax calendars live in the Tax table.
- P3. A figure the research marked unverified is shown with that label, or it is omitted. It is not shown as a settled rule.
- P4. Illustrative case numbers never become `defaultDraft`, the picture defaults, the ARM defaults, or the PMI ladder.
- P5. Money on the page is integer cents, rounded once, half up, by the picture’s rule: divide, and if `remainder * 2 >= divisor`, add one. No `Math.round(dollars * 100)`.

## 4. Users and scenarios

- The owner opens the fresh Conventional loan with the clock at 2026-10-15. The start trigger still reads October 2026. Row 1 is still Nov 2026. The payoff region reads `November 1, 2056 (30 years)` and the payoff footnote. The schedule footnote is above the table. The Date header is still Date. No Alex loan appears.
- The owner sets the start month to November 2026. Row 1 is Dec 2026. The payoff region reads `December 1, 2056 (30 years)`.
- The owner switches to ARM on the sheet loan (5.875%, defaults 7 / 12 / 2.5 / 5 / 2 / 5 / 2.5 / 2.5, start October 2026). The first-adjustment line still names November 2033 (payment 85) and adds `new payment first due December 1, 2033`. Highest payment still names the accrual month and adds `first due December 1, 2033`. The timeline lists that change, a 45-day index read, an initial notice of 210 to 240 days under 12 CFR 1026.20(d), a payment-change notice of 60 to 120 days under 12 CFR 1026.20(c)(2), and later changes every 12 months.
- The owner opens Moving in on the fresh loan. Funding is the 1st of the start month. Prepaid interest uses the closing-cost basis and day count. The first payment is the 1st of the second month after the start month. Grace shows 15 days and 5% until edited. Signing date is empty, so the Closing Disclosure line is the rule in words.
- The owner opens the Tax table and enters nothing. Interest paid in the funding year is the prepaid interest. The next year’s interest paid is the schedule rows whose due dates fall in that year. Mortgage insurance uses the scenario’s PMI amount and stops at automatic termination. Homeowners insurance is labeled not deductible. Empty AGI does not invent an income.

## 5. Functional requirements

1. **Due date.** Add `dueDate(startMonth, paymentNumber)` in `loan.ts`. It returns `paymentDate(startMonth, paymentNumber + 1)`. Payment 1 of start `2026-11` accrues in December 2026 and is due January 2027. Payment 360 of that start accrues in November 2056 and is due December 2056. The schedule, the chart, `groupByYear`, and `buildPrefillMap` keep using `paymentDate`. They do not switch to `dueDate`.

2. **Payoff line.** In `app.tsx`, the payoff value is the due date of `report.payoff_month`, formatted `{Month} 1, {year} ({yearsAndMonths(payoff_month)})`. Start October 2026 and payoff month 360 read `November 1, 2056 (30 years)`. Start November 2026 and payoff month 360 read `December 1, 2056 (30 years)`. The parenthetical stays `yearsAndMonths(report.payoff_month)`. It does not become 30 years 1 month. The region’s accessible name stays `Payoff date`. Inside that region, under the date, one footnote reads: `This is the month the last payment is due. Payments are made in arrears: that payment is due on the 1st and covers the previous month.`

3. **Schedule footnote.** Above the schedule table, under the Schedule heading, one footnote reads: `Payments are made in arrears: each month's row is paid on the 1st of the following month, including any extra principal.` The column header stays `Date`. Row text stays `shortDate` of the accrual month (`Dec 2026`). Extra payment stays that row’s requested amount. No other footnote is added.

4. **ARM due notes.** When the product is ARM, the First adjustment line keeps its current sentence and appends ` · new payment first due {Month} 1, {year}`, using `dueDate` of `first_adjustment.month`, or of `fixedMonths + 1` when the report has no `first_adjustment`. On the sheet loan with start October 2026 that date is December 1, 2033, so a line that now ends `(payment 85)` or with the dollar range also ends `new payment first due December 1, 2033`. Highest payment keeps `{amount} from {accrual month}` and appends ` · first due {Month} 1, {year}` from `dueDate` of `max_payment_month`. Highest rate stays `{percent}% from {accrual month}` with no due date. No schedule row gains a note.

5. **ARM timeline.** Inside the ARM terms disclosure, after the monthly-extra line (and after the fallback first-adjustment line when that is the one shown), a list of five lines:
   - `Change date {Month} 1, {year}.` The date is the 1st of the accrual month of the first adjustment payment. `That month's schedule row is the first month at the new rate.`
   - `Index read {Month} {day}, {year}, 45 days before the change date.` The day is the UTC calendar day 45 days before the change date. The line ends `The usual agency-note lookback. The note can set a different count.` There is no lookback field.
   - `Initial notice {from} – {through}, 210 to 240 days before the first new payment.` The one-time initial notice under 12 CFR 1026.20(d) is 210 to 240 days before the first payment at the adjusted level. The through date is 210 UTC days before the first due date. The from date is 240 UTC days before it.
   - `Later notice {from} – {through}, 60 to 120 days before that payment.` Under 12 CFR 1026.20(c)(2), the payment-change notice must be given at least 60 and no more than 120 days before the first payment at the adjusted level. That is the window for Compound’s 7/6, 5/6, 7/1, and the other 6-month and 12-month ARMs. The through date is 60 UTC days before the first due date. The from date is 120 UTC days before it. The 25-to-120-day window applies only to ARMs with uniformly scheduled adjustments every 60 days or more often, and to certain pre-2015 loans. A 1-month interval, which the page can label `7/1mo`, is the every-60-days-or-more-often case, so 25 to 120 applies only there: the line then reads `Later notice {from} – {through}, 25 to 120 days before that payment`, the through date is 25 UTC days before the first due date, and the from date is 120 UTC days before it. Every longer interval keeps 60 to 120. A second sentence: `A notice of the actual rate cannot be sent before the index is read. That limit is an inference, not a separate rule.`
   - `After that, the rate can change every {N} months, on the 1st of the accrual month, and the new payment is first due on the 1st of the next month.` `{N}` is the adjustment interval. The line does not hard-code June and December.

   Dates use the page’s month names. The list is text. It is not a chart. New tests and new copy do not contain `credit union`.

6. **Moving in.** A disclosure titled `Moving in`, placed after Closing Costs and before the schedule. It does not move ARM terms, Taxes and Insurance, Extra Payments, the summary, or the chart. It reads the existing start month and `#picture-closing-day`. It does not add a date picker.
   - `Funding date {Weekday, Month D, YYYY}. Interest starts this day.` The weekday is the UTC weekday of that calendar date. The closing day is the clamped day the picture already uses.
   - `Prepaid interest {days} days, {money}, {360 or 365}-day basis. These days are paid at closing, not on the schedule.` Days and money are `closingInterestDays` and `prepaidInterestCents` for the scenario’s basis. The 360 and 365 rounding stays as it is.
   - `No mortgage payment is due in {Month Year}. Payments are made in arrears: the {first due date} payment covers {row 1 month}.` The no-payment month is the calendar month after the funding month. The first due date is the 1st of the month after that, which is `dueDate(start, 1)`.
   - `First payment due {Month 1, Year}.` The amount shown is the picture’s principal and interest, labeled as principal and interest. When the picture’s tax, insurance, or PMI is non-zero, the line says those are on top of that amount. It does not drop them after a later PMI date; that belongs to requirement 8.
   - Grace fields, stored on the picture: `graceDays` default `15`, `lateChargePercent` default `5`. A missing key loads the default. A live edit that is not an integer 0 through 31 for days, or not a percent 0 through 100 with at most two decimal places for the charge, keeps the last valid value. The line reads `Due on the 1st. A late charge of {percent}% of principal and interest ({money} on the initial payment) applies if the payment is not received by the end of day {days} after the due date. Credit reporting is a separate 30-day rule.` The money is that percent of the initial principal and interest, half up to the cent. These fields do not change the payment or the late-charge base. The line does not apply a state cap and does not name a lender.
   - Signing date, stored as `signingDate`, default `""`. The control is `<input type="date">`. It is not the start-month button and not `<input type="month">`. Empty shows: `The Closing Disclosure has to be received at least three business days before you sign. Sundays and federal legal public holidays are not business days for this count. A mailed disclosure is presumed received three business days after it is mailed.` A filled `YYYY-MM-DD` shows: `For a signing on {date}, the Closing Disclosure has to be received by {deadline}.` The deadline is found by walking backward from the day before the signing date and counting three business days. A business day is not a Sunday and not a legal public holiday in 5 U.S.C. 6103(a), including the observed Friday when the holiday is a Saturday and the observed Monday when it is a Sunday. The holiday set is New Year’s Day, Birthday of Martin Luther King, Jr., Washington’s Birthday, Memorial Day, Juneteenth National Independence Day, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving Day, and Christmas Day. A unit test pins a signing date of 2026-11-12 to a deadline of 2026-11-07. The field is not pre-filled with that date.
   - Last rent, stored as `lastRent`, default `""`. The control is `<input type="date">`. Empty shows nothing extra. A filled date shows `Last rent {date}. Rent is paid in advance; the mortgage is paid in arrears.` When that date falls in the funding month and on or before the last prepaid day, add `Those days are covered by both the rent and the prepaid interest.`
   - One sentence, not a computed statement date: `The note makes the first payment due even if a statement has not arrived.`
   - One sentence, not a schedule mode: `Some lenders credit the first days of a month and set the first payment one month earlier. This page uses the standard rule.`

   The first time the disclosure is opened it stores `open: true` only after the owner opens it. A missing flag loads closed. Stored scenarios stay numerically the same loan. New keys sit in the version-2 picture object. A missing key loads the default. The document version stays 2.

7. **Interest paid.** For each calendar year from the funding year through the year of the payoff due date, interest paid is the sum of `interest_cents` on schedule rows whose due date falls in that year, plus prepaid-interest cents when the funding date falls in that year. Prepaid interest on this page always falls in the funding month, so it is entirely in the funding year. The schedule year-group interest sum is unchanged and is not this figure. On the case-study fixed loan the function returns 145469 cents for 2026, 3475200 cents for 2027, and 3438574 cents for 2028. Those cents are a unit fixture. They are not a default loan. The Tax table’s first column is this figure. The section heading also shows the funding year’s line: `Interest paid in {year}: {money}.`

8. **Tax table.** A disclosure titled `Tax table`, after the schedule. It is not inside the schedule table and not a schedule column. A note at the top reads: `This is not tax advice. It applies the figures named here to this loan. It does not prepare a return.` State returns are one sentence: `State returns are not shown.` Another sentence: `An overall limit on itemized deductions begins in 2026. Who it affects is not verified here, and this table does not apply it.` Another: `Homeowners insurance, principal, and the escrow cushion are not deductible.` The insurance amount may be shown next to that sentence. It is not added into a total.

   One row per calendar year in requirement 7’s range. Columns:

   | Column | Rule |
   |---|---|
   | Tax year | The calendar year |
   | Mortgage interest paid | Requirement 7, times the acquisition-debt fraction below |
   | Points | The picture’s points cents in the funding year only, times the same fraction, and 0 in later years. A note on the column: `This treats points as paid on a purchase. Refinance points are spread over the loan term, which this table does not do.` |
   | MI paid | The picture’s monthly PMI cents times the count of payments whose due date is in that year and whose payment number is less than or equal to the automatic-termination payment in requirement 9. A note: `Which payment is the last one that includes mortgage insurance is servicer practice and is not verified. This column includes the automatic-termination payment.` |
   | MI deductible | MI paid times the phaseout factor below, with the unverified label |
   | Property tax | The funding year uses the picture’s proration cents when that cents value is positive, and 0 when it is negative or zero. Every later year uses twelve times the picture’s monthly property-tax cents. A note: `This is not the escrow disbursement calendar. Supplemental bills are not estimated.` |
   | Other SALT | The stored dollar field, the same amount every year. Default empty, read as 0 |
   | SALT allowed | The cap rule below |
   | Housing items | Interest plus points plus MI deductible plus SALT allowed |
   | Standard deduction | The 2026 amount for the filing status when the year is 2026. Later years show that same 2026 amount and the label `2026 figure; later years are not published here`, unless the override field is a valid dollar amount, in which case later years use the override |
   | Comparison | `Housing items are above the standard deduction` or `Housing items are below the standard deduction` or `Housing items equal the standard deduction`. Optional other itemized dollars, default 0, are added to housing items for this comparison only. The words do not say the owner should itemize |

   Inputs, stored on the version-2 picture, missing keys loading as the default, invalid live edits keeping the last valid dollar amount: `filingStatus` (`single`, `joint`, `separate`, `head`; default `single`), `agi` (dollars, default empty), `magi` (dollars, default empty, and empty means use AGI), `otherSalt`, `otherItemized`, `standardOverride`, `appraisal` (dollars, default empty, and empty means original value is the purchase price). The disclosure loads closed.

   Acquisition-debt fraction: `min(loanCents, capCents) / loanCents`, with the division done in cents by half-up on the interest and on the points separately. `capCents` is 75,000,000 for every status except `separate`, which is 37,500,000. A loan at or under the cap uses the whole interest. The page does not model debt from before December 16, 2017.

   MI phaseout, labeled unverified on the section: `Unverified. The 2026 Publication 936 is an IRS draft. The reduction is shown as 10 percentage points per $1,000 of AGI, or part of $1,000, over $100,000 ($50,000 if married filing separately), and none above $109,000 ($54,500 if married filing separately).` The factor the table multiplies is that formula: 100% at or under the threshold, minus 10 percentage points for each $1,000 or part of $1,000 over it, and 0% above the elimination amount. Empty AGI does not apply a phaseout; the cell shows the MI paid amount and `Enter AGI to apply the phaseout.` Box 5 reporting is not described as settled.

   SALT cap. For 2026 the cap is $40,400, or $20,200 when the status is `separate`, and the phase-down threshold is $505,000, or $252,500 when `separate`. The allowed amount is that cap minus 30% of MAGI over the threshold, and not below $10,000, or $5,000 when `separate`. Empty AGI skips the phase-down and the cell notes that. For 2027, 2028, and 2029 the cap and the threshold are the prior year’s dollars times 1.01, half up to the dollar. The section says: `The 2026 cap is $40,400 ($20,200 if married filing separately). Later caps through 2029 are this page's 1% steps, rounded half up to the dollar, not a figure copied from a published table. The cap shown for 2030 and after is $10,000 ($5,000 if married filing separately).` From 2030 on, the cap is that floor and there is no phase-down.

   Checked 2026-10-22 against IRS Rev. Proc. 2025-32 section 4.14 and IRS newsroom IR-2025-103: the 2026 standard deduction is $16,100 for single and for married filing separately, $32,200 for married filing jointly, and $24,150 for head of household. Those four amounts are the 2026 column. The SALT dollars were not re-read from the Code in this pass. They follow the research’s 2026-10-21 citations, and the 2027–2029 dollars are arithmetic.

9. **PMI drop-off.** Original value is the appraisal cents when that field parses, otherwise the purchase-price cents. The 80% threshold is 80% of that value and the 78% threshold is 78%, each half up to the cent. Search `remaining_principal_cents` on `buildReport` results the page already knows how to make.
   - Scheduled 80% request: the first row of a no-extra report at or under the 80% threshold. The date is that payment’s due date.
   - With extra principal: the same search on the applied-extra report. When the due date is earlier, the section shows both. When extras do not reach the threshold, it shows the scheduled date only.
   - Automatic 78%: the first row of the no-extra report at or under the 78% threshold. Extras do not move it. An ARM uses the same `arm` argument as the schedule, including the current index, because the schedule then in effect is the one the page is showing. The date is that payment’s due date.
   - Midpoint: the due date of payment `termMonths / 2` when the term is even, and of payment `ceil(termMonths / 2)` when it is odd. For 360 payments that is payment 180. The line reads `Midpoint backstop (this page's reading): {date}.` See the open question. The formula does not move with extras or with the rate.
   - Automatic termination is the earlier of the 78% due date and the midpoint due date. If the balance never reaches 78%, termination is the midpoint. The 80% dates are informational. The MI column does not assume a request was granted.

   The section shows the three dates in words. It does not badge a schedule row. On the case-study fixed loan, price $525,000, no extras, and start November 2026, the scheduled 80% payment is 130 due October 1, 2037, the 78% payment is 142 due October 1, 2038, and the midpoint line is December 1, 2041. That loan is a unit fixture only.

10. **Skills and README.** No new flag and no new JSON key.
    - `.agents/skills/mortgage-loan-calculator/SKILL.md` keeps `Month 1 is the first payment` for the recast and the extra-plan numbering. It adds that the start month is the funding month, payment 1 accrues in the next calendar month and is due on the 1st of the month after that, and the payoff a borrower means is the due date of the last payment. If the user gives a first-payment due date and no funding month, the funding month is two months earlier under that rule. If the user says the lender applied an interest credit, the skill asks before shifting the funding month, and it says the page does not model a credit. It replaces the sentence that the loan start could be either the closing month or the first payment month. A calendar-year interest question uses requirement 7’s shift, says it is not tax advice, and does not compute SALT, the standard deduction, PMI deductibility, or an AGI. The skill still does not invent taxes.
    - `.agents/skills/mortgage-origination-fees/SKILL.md` keeps the formula. It adds that the figure assumes a first payment one full month after the loan is made and excludes odd-days interest, and that the page’s standard rule is a first payment on the 1st of the second month after the funding month, with those days in closing costs instead.
    - `.agents/skills/arm-loan-concepts/SKILL.md` states, as procedure and without a user’s calendar date, that the new rate accrues on the change date and the new payment is first due on the first monthly payment date after the change date, and that both notices are counted back from that payment date: the one-time initial notice under 12 CFR 1026.20(d) is 210 to 240 days before it, and the payment-change notice under 12 CFR 1026.20(c)(2) is 60 to 120 days before it for a 6-month or 12-month adjustment, including 7/6, 5/6, and 7/1. The 25-to-120-day window applies only when adjustments are uniformly scheduled every 60 days or more often, and to certain pre-2015 loans. It still does not compute a payment, a rate, an index, or a calendar date for the user’s loan. A question that gives a funding month and asks for the date is `mortgage-loan-calculator`. The 45-day lookback stays the invented example’s value, not a term the skill applies to a note the user did not describe. The example table stays one invented example.
    - `README.md` `--start` row gains one sentence: payment 1 is the next calendar month, the first month interest accrues, and that payment is due on the 1st of the following month. The command’s output is unchanged.

11. **Docs and version.** Each page phase updates `AGENTS.md` and `REVIEW.md` for the behavior it ships. `AGENTS.md` records the point version that phase sets (`0.17.0` and `PAGES_POINT_VERSION` `0.17`, then `0.18`, `0.19`, and `0.20`) and leaves the 0.16 sentence on the clean-closing-costs bullet. It says the payoff date is the due date `{Month} 1, {year}` plus `yearsAndMonths(payoff_month)`, the two footnotes, that the schedule rows stay accrual months, and, in the phase that ships them, the ARM due note, the Moving in disclosure, and the Tax table. Things agents get wrong: do not put the due date on the schedule row; do not make the payoff duration `payoff_month + 1`; do not put a tax figure in the year row; do not badge PMI on a row; do not change `amortize.js` for these dates; do not load the case-study loan as a default; do not name a credit union in the new copy or the new tests. `REVIEW.md` gains a bug line for a payoff date that is still the accrual month, and a compliance line for this folder.

## 6. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | Unit: `dueDate("2026-11", 360)` is December 2056, and the payoff formatter yields `December 1, 2056`. `dueDate("2026-10", 360)` yields the November 2056 date formatted `November 1, 2056`. `paymentDate("2026-11", 1)` is still December 2026. |
| AC2 | Playwright, clock 2026-10-15, fresh loan: payoff region contains `November 1, 2056 (30 years)` and the payoff footnote sentence. The schedule footnote sentence is visible. The Date header is present. Row 1 is Nov 2026. Start November 2026: row 1 is Dec 2026 and the payoff region contains `December 1, 2056 (30 years)`. |
| AC3 | Playwright: the existing extra-payment payoff assertions move one month later and gain the day, and the parenthetical is unchanged. Monthly $100 on the example loan is `July 1, 2054 (27 years 8 months)`. Yearly $1,000 in January is `November 1, 2054 (28 years)`. |
| AC4 | Playwright, sheet ARM, start October 2026: the first-adjustment line contains `November 2033 (payment 85)` and `new payment first due December 1, 2033`. Highest payment contains `from November 2033` and `first due December 1, 2033`. Highest rate has no `first due`. The five timeline lines are visible, including `45 days before the change date`, `210 to 240`, `60 to 120`, and `every 12 months`. An interval of 1 month shows `25 to 120` on the later-notice line and still shows `210 to 240` on the initial-notice line. No new test file contains `credit union`. |
| AC5 | Playwright: Moving in shows a funding date on the 1st of the start month, a prepaid-interest line, a no-payment month, a first-payment due date on the 1st of the second month, grace `15` and `5`, and the Closing Disclosure rule while the signing date is empty. Filling signing date `2026-11-12` shows received by November 7, 2026. The schedule’s first row does not move. |
| AC6 | Unit: the case-study interest-paid cents for 2026, 2027, and 2028; PMI payments 130, 142, and 180 on that fixture; a loan over $750,000 prorates interest; empty AGI does not phase out MI; homeowners insurance is absent from the housing total. The fresh-visit draft is unchanged. |
| AC7 | Playwright: the Tax table is not inside the schedule, shows `Interest paid in` the funding year, shows `not deductible` for homeowners insurance, shows the unverified Publication 936 sentence, and shows `This is not tax advice.` |
| AC8 | `node --test` still passes, including the fixed-rate output hashes and the updated skill phrases. `compound_interest_monthly.js --json` for a fixed-rate run is unchanged. |
| AC9 | After Phase 1, `apps/web/package.json` is `0.17.0` and `PAGES_POINT_VERSION` is `0.17`. After Phase 2, `0.18`. After Phase 3, `0.19`. After Phase 4, `0.20`. This docs pull request leaves both at `0.16`. The scenario document version stays 2. |

## 7. Design decisions

**D1 — The schedule does not move.** Rows stay on `paymentDate`. Extras stay on those rows. The Date header stays. The research’s per-row “new payment first due” note, its MI badges, and its tax figure on the year header are not shipped. The year-row interest sum stays accrued interest, so it will not equal interest paid. Checked 2026-10-22: `paymentDate` is `apps/web/src/loan.ts` and the payoff line is `paymentDate(loan.startMonth, report.payoff_month)` in `app.tsx`.

**D2 — Payoff is the due date, on the 1st.** `dueDate` is one month after the accrual month. The owner’s example is December 1, 2056, not “Dec 2056” without a day. The duration parenthetical stays the payment count from `intent/ui-followups/`.

**D3 — Footnote copy.** The research’s options were generalized so the page does not hard-code November 2056, and so the schedule sentence mentions extra principal. The locked sentences are requirements 2 and 3. Two footnotes, nowhere else.

**D4 — ARM notes sit on the stats, and the timeline is a list.** Highest rate stays an accrual month because the rate starts then. The 45-day lookback is displayed as the usual agency-note blank, not stored as the loan’s term and not sent to `buildReport`. Notice windows are UTC day counts back from the first new due date. The one-time initial notice is 12 CFR 1026.20(d), 210 to 240 days before the first payment at the adjusted level. The payment-change notice is 12 CFR 1026.20(c)(2), at least 60 and no more than 120 days before that payment, including for 7/6, 5/6, 7/1, and the other 6-month and 12-month ARMs. The 25-to-120-day window applies only to ARMs with uniformly scheduled adjustments every 60 days or more often, and to certain pre-2015 loans; on this page that is only a 1-month interval, labeled `7/1mo`. The October 17–November 2 overlap is labeled inference.

**D5 — No interest-credit schedule.** A credit would make row 1 the funding month and would move every extra, chart label, and ARM date. The page states the exception in one sentence. The skill asks. Negative prepaid interest is not computed.

**D6 — Funding date is the controls that already exist.** Start month plus closing day. Moving in is a disclosure after Closing Costs so it does not disturb ARM placement or the summary and chart order.

**D7 — Grace blanks are informational.** Default 15 days and 5% of principal and interest match the usual agency-note blanks. They are editable. They are not Alex’s $165.91 stored as a default, and they do not encode a state cap. Charter exemptions stay unverified and unnamed.

**D8 — Closing Disclosure math is the three-business-day count.** Empty signing date prints the rule. The mailbox rule is a sentence, not a second date. The 2026-11-12 → 2026-11-07 pair is the research’s count, pinned as a test, not a default.

**D9 — Tax stays off the schedule.** Interest paid uses the due-date shift plus prepaid interest. The case-study cents that match the walk are the fixture. The research’s $34,722.45, $34,354.07, and $34,385.76 are not.

**D10 — Unverified items stay labeled.** Publication 936’s phaseout and box 5, the §70111 limit, 2027+ standard deductions, the last MI bill, the note’s actual change date, and state conformity. The phaseout and the 1% SALT steps are deterministic so the table can be tested, and the copy says they are not settled published figures. Standard deduction amounts for 2026 were checked against Rev. Proc. 2025-32 on 2026-10-22.

**D11 — PMI dates are HPA dates in the Tax table.** 80% can move earlier with extra principal. 78% does not. Automatic termination does not assume the 80% request was granted. Original value is the price unless an appraisal is entered. Fannie Mae’s current-value cancellation is not a computed date.

**D12 — What this supersedes.** Only the payoff date text: `intent/amortization-app/` requirement 8’s “The payoff date is that last month,” and `intent/ui-followups/` requirement 4’s examples of `October 2056 (30 years)` and the clause that the count is the number of months from the start month to the displayed payoff month. The count is still `payoff_month`. The displayed month is the due month. Schedule row dates in those specs stay. `intent/clean-closing-costs/`’s refusal of an automatic tax-proration calendar stays. `intent/arm-loan/`’s first-adjustment sentence gains the due clause and otherwise stays.

**D13 — The walk stays in `amortize.js`.** Every phase can be done with `paymentDate`, `buildReport`, and the picture’s prepaid-interest functions. No command-line flag. Fixed-rate output stays byte for byte.

**D14 — Versions.** This pull request stays at 0.16. Page pull requests set 0.17, 0.18, 0.19, and 0.20 in that order. Storage stays version 2.

**D15 — No new skill.** The three existing skills carry the explainer sentences. A closing-timeline skill can be a later intent.

## 8. Open questions

1. **Midpoint day.** Requirement 9 uses the due date of the halfway payment (December 1, 2041 on a 360-payment loan with a November 2026 start). A reading that starts fifteen years at the first due date, then takes the following month, lands later. Phase 4 uses requirement 9 unless the owner replaces that sentence before the phase starts. Phases 1 through 3 do not depend on it.
