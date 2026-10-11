# intent.md — UI facelift

| | |
|---|---|
| Captured | 2026-10-11 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/loan-scenarios/](../loan-scenarios/intent.md), [intent/amortization-app/](../amortization-app/intent.md), [intent/complete-loan-picture/](../complete-loan-picture/intent.md) |

## Problem

The amortization page works, and the way it is arranged gets in the way of reading a loan. The title sits under the scenario control. The heading mixes the loan, the payment, and the prevailing bar. Taxes, insurance, and closing costs share one block with purchase-price echoes and an FHA line this Conventional page does not use. The summary's monthly payment is principal and interest, while the heading already moved on to the prevailing total. Extra principal, interest saved, and months saved disappear when there is no extra. The chart popup does not lead with the payment number, and the extra-payments form fields do not show that they differ from the last Apply.

## Proposed outcome

The same page, rearranged and relabeled, in one release after this design is accepted. The title is Compound, with a lighter tagline, above a scenario dropdown that can show the selected loan. The heading is the loan itself: price, down payment, note rate, term, product, FICO, and start month. Taxes and Insurance sit under that line. Extra Payments sit under that. The summary and the chart follow Extra Payments. The summary's monthly payment is the prevailing total in cents, with the prevailing bar on that line. Closing Costs are their own section under the chart, with editable prepaid counts and a 360/365 choice on the prepaid-interest line. Conventional PMI follows a FICO ladder. FHA, condominiums, attached homes, and duplexes stay out.

## Affected users and systems

- **Users:** The owner, on the amortization page, in Safari and Chromium, on a desktop and on a phone.
- **Systems:** `apps/web` only: the page sources, `apps/web/src/styles.css`, the unit tests in `apps/web/unit/`, and the Playwright specs in `apps/web/e2e/`. `AGENTS.md` and `REVIEW.md` are updated when the page ships, not in the design pull request. `amortize.js` does not change. The calculator CLI, `origination_fees.js`, the skills, and the test workflow do not change. The point version stays 0.7 on the design pull request. The page release sets it to 0.8.

## Constraints and principles

- The queue under Original prompt is the source of truth for what the page should do. Item 32 stays as written: Taxes and Insurance sit directly under the scenario line, and the summary and the chart follow Extra Payments.
- This folder builds on `intent/loan-scenarios/`, `intent/amortization-app/`, and `intent/complete-loan-picture/`. Where this spec changes a sentence of those, or of `intent/ui-followups/` or `intent/arm-loan/`, the spec names it and this spec wins. The rest of those specs stand.
- `amortize.js` does not change. The page still calls `buildReport`. Picture arithmetic stays in `apps/web`.
- The 780+ PMI ladder stays the queued ladder. The four lower bands use cited rates. A percent with no source stays out.
- Prepaid interest defaults to 15 days and a 360-day year. Closing Costs also offers 365, on the same line as the day count. The choice stays. A small cash-to-close gap is not a reason to drop it.
- Do not name a credit union, a borrower, an address, or a loan number in these three files.
- Design decisions are numbered. The design pull request does not implement the page and does not start a build.
- The app stays version 0.7 on this design pull request (`apps/web/package.json` `0.7.0`, `PAGES_POINT_VERSION` `0.7`). The plan records 0.8 for the pull request that ships the page.

## Open questions (carried into spec.md)

None. The day-count basis and the lower FICO ladders are decided in [spec.md](spec.md). A later pass may move the 360/365 control if its line is cramped. That pass is not this release, and it is not a reason to leave the control off the line.

## Original prompt (verbatim)

# UI adjustments

Queued. Build starts when the build is requested.

The three-color graphic is the prevailing bar.

## Page header

Screenshot is the target order only. The title in the picture is still Amortization.

![Header order](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/01-header-order.png)

1. The page title sits above the scenario dropdown.
2. The title is Compound, with “A mortgage amortization calculator” in lighter type on the same line, wrapping onto the next line under the title when the width is narrow. Trial name; Amortization can come back.
3. The scenario dropdown stretches across the row so the selected scenario can show in full when there is room.
4. A down arrow sits inside the right end of the dropdown.
5. Export and Import move into a three-dot menu at the right end of that same line.

## Scenario menu

![Open scenario menu](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/02-scenario-menu.png)

![Remove dialog](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/03-remove-dialog.png)

6. The selected row in the open menu uses a contrasting background, in the same spirit as the month selector, and every row uses the same font weight.
7. The trash control stays off the selected scenario. On the other rows it appears only while the pointer is over that row. Keyboard access for that control is out of scope for now.
8. The remove dialog keeps the question on its own line, then a blank line, then the scenario label (`$4,853 - …`).
9. Each open-menu row starts with its list number, as in `1: $5,472 - …`. The closed dropdown stays unnumbered.

## Loan heading

![Loan heading](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/04-heading-line.png)

10. Text on the loan heading line is one size, including the editable fields.
11. The term moves onto that line as “30-year fixed”, and the note rate stays. The Term row below goes away. Confirmed. The payment amount leaves this line in item 28.
12. Start month moves to the end of that line, as `starting October 2026`. The Start month row goes away.
13. The prevailing bar leaves this heading. It moves beside the summary Monthly payment (item 16).
14. The PI, TI, and PE legend under the heading goes away. The small bar inside the scenario dropdown stays. Confirmed.

## Summary

![Summary with no extra](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/05-summary-no-extra.png)

![Summary with extra principal](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/06-summary-with-extra.png)

15. Monthly payment in the summary shows the prevailing total, PI + TI + PE, in cents. On these two shots that is $4,853.10 with no extra and $5,853.10 with the $1,000 prevailing extra. The label stays “Monthly payment”.
16. The prevailing bar sits on that same line and fills the remaining width. Smaller labels above the segments read like `$3,936.85 PI`, `$916.25 TI`, and `$1,000.00 PE`. The PE segment and its label are omitted when the prevailing extra is $0. Confirmed.
17. Extra principal paid, Interest saved, and Months saved always show. With no extra they read `$0.00`, `$0.00`, and `0`.
18. Months saved leads with the month count: `158 (13 years 2 months)`. The parenthetical is omitted when the count is under 12. A whole number of years drops the months part: `24 (2 years)`.

## Chart popup

![Chart popup](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/07-chart-popup.png)

19. The popup heading leads with the payment month number: `87: Jan 2034`.
20. The bank robber faces and runs to the right, the same direction as the piggy bank.

## Extra payments form

![Make extra payments](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/08-extra-form.png)

21. The monthly amount, yearly amount, and month-of-year fields take a dirty color while their value differs from the last Apply, and return to the normal color on Apply or when the value is put back. This is the earlier follow-up for these fields. It is not showing in Safari.

## Taxes and insurance

![Monthly payment and closing costs](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/09-payment-picture.png)

22. “Monthly payment and closing costs” becomes a Taxes and Insurance section. Closing Costs is a separate section; its rows are items 34–40. The Conventional label leaves with the old block.
23. Purchase price, down payment, base loan amount, upfront MIP, total loan amount financed, and principal and interest leave this block. Property tax, home insurance, and Conventional PMI stay, including the Nashua and Brentwood tax note.
24. FHA MIP leaves. FHA support can come later.
25. Total monthly payment, Prevailing principal and interest, Prevailing extra, and Prevailing monthly total leave. The prevailing bar above carries that breakdown.
26. Conventional PMI percent is editable. Changing the FICO band or the down payment refills it from the ladder.
27. FICO is an editable score on the scenario line, immediately before `starting October 2026`, with a dropdown of a handful of ranges. Choosing a range types that range’s lower score into the field. The ranges are 780+, 740–779, 700–739, 660–699, and 620–659, so the typed values are 780, 740, 700, 660, and 620. The field defaults to 780, so today’s loans keep their current PMI. A typed score is allowed too.
28. The payment amount leaves the scenario line. That line reads `600K | 5% down | 7.375% 30-year fixed | 780 FICO | starting October 2026`. The summary below keeps Monthly payment.
29. A score of 780 or higher keeps today’s ladder: 20% down → 0%, 10% down → 0.20%, 5% down → 0.35%, under 5% down → 0.45%. The other four ranges use cited figures the spec looks up. A percent with no source stays out.

![Tax and insurance rates](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/10-tax-insurance-rates.png)

30. A % sits immediately to the right of the editable property-tax and home-insurance rates.
31. The Conventional PMI percent is right-aligned in that same column, in line with the rate fields above it.
32. Taxes and Insurance sits directly under the scenario line. The summary and the chart follow Extra Payments.
33. Make extra payments moves to directly under Taxes and Insurance and is renamed Extra Payments.

## Closing costs

![Closing costs](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-adjustments/11-closing-costs.png)

34. Closing Costs sits under the amortization chart and directly above the schedule.
35. Units sit beside the editable inputs: origination fee %, processing fee $, appraisal $, title and escrow %, recording and taxes $. Title and escrow is a percent of the purchase price: 0.75% of $600,000 is $4,500. Origination is a percent of the loan amount: 1% of the $480,000 loan is $4,800.
36. Prepaid home insurance takes an editable month count, default 12. Twelve months of the $175 insurance payment is $2,100.
37. Prepaid interest takes an editable day count, default 15, and a 360/365 dropdown on that same line. The default basis is 360. A 365-day check: $570,000 at 7.5% is $117.12 per day and $1,756.80 for 15 days. A 360-day per diem would be $118.75.
38. Prepaid property taxes take an editable month count. The pictured $2,300 is 4 months of the $575 tax, so the default is 4 months.
39. Escrow cushion is an editable dollar amount, default $1,500.
40. Total closing costs is the sum of those rows ($19,175 in the picture). Total cash to close is the down payment plus that sum: $120,000 + $19,175 = $139,175 on the 20% down loan.

## Later

FHA loans, condominiums, attached homes, and duplexes stay out of this batch.


## Decisions given with the request (verbatim)

These messages decide the day-count basis and the PMI bands below 780. They keep the 360/365 dropdown on the prepaid-interest line. The queue pasted above already states the resulting items 29 and 37.

> Two open questions are now decided.
>
> Prepaid interest defaults to 15 days. The day count stays editable in Closing Costs. Do not invent the 365-versus-360 per-diem basis. Leave that basis open unless a cited source settles it, and record the citation.
>
> PMI percents below 780 are no longer left blank. Research online and use reasonable, cited figures for the four ranges already in the queue: 740–779, 700–739, 660–699, and 620–659. Keep the 780+ ladder exactly as queued: 20% down → 0%, 10% down → 0.20%, 5% down → 0.35%, under 5% down → 0.45%. Name the source next to the table. Do not invent a percent you cannot cite.

> Prepaid interest day-count is decided. Do not leave it open.
>
> The Numbers sheet uses a 360-day year. A conventional itemization for $570,000 at 7.5% shows 15 days at $117.12 = $1,756.80. That is a 365-day per diem rounded to the cent, then multiplied by the days. A 360-day per diem would be $118.75 and $1,781.25, which is not the sheet. Do not name the credit union, the borrower, the address, or the loan number anywhere in the public intent, spec, or plan.
>
> Closing Costs offers both bases. Default is 360, matching the Numbers sheet and the rest of this calculator. The 360/365 choice is a dropdown on the same line as the editable day count. If that line is cramped, a later pass can move it. The default day count stays 15.

> Keep the 360/365 dropdown. The cash-to-close gap is small, and the choice stays on the prepaid-interest line. Do not drop it as unimportant.
