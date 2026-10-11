# spec.md — UI facelift

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-11) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

The amortization page is rearranged and relabeled. The title is Compound, above the scenario control. The heading is the loan: price, down payment, note rate, term, product, FICO, and start month. Taxes and Insurance sit under that line. Extra Payments sit under Taxes and Insurance. The summary and the chart follow Extra Payments. Closing Costs sit under the chart and above the schedule. The summary's Monthly payment is the prevailing total in cents, and the prevailing bar sits on that line. Conventional PMI follows a FICO ladder. Prepaid interest takes a day count, default 15, and a 360/365 dropdown on that same line, default 360.

This folder builds on [intent/loan-scenarios/](../loan-scenarios/spec.md), [intent/amortization-app/](../amortization-app/spec.md), and [intent/complete-loan-picture/](../complete-loan-picture/spec.md). Where this spec changes a sentence of those, or of [intent/ui-followups/](../ui-followups/spec.md) or [intent/arm-loan/](../arm-loan/spec.md), D22 names it and this spec wins. Everything else in them stands. The page still calls `buildReport`. `amortize.js` does not change.

This design pull request does not implement the page. The point version stays 0.7 here. The pull request that ships the page sets 0.8.

## 2. Goals and non-goals

**Goals**

- G1. Put the title above a scenario dropdown that can show the selected loan, and move Export and Import into a menu on that row.
- G2. Make the heading the loan facts in item 28, one size, and move the prevailing bar to the summary.
- G3. Show the prevailing total, in cents, as Monthly payment, with Extra principal paid, Interest saved, and Months saved always visible.
- G4. Split taxes and insurance from closing costs, drop the FHA lines, and add FICO and an editable PMI percent.
- G5. Give Closing Costs editable units, prepaid counts, and a 360/365 choice on the prepaid-interest line.

**Non-goals**

- Any change to `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, `amortize.d.ts`, the skills, or `node --test`.
- FHA loans, condominiums, attached homes, and duplexes. Upfront MIP and monthly FHA MIP leave this page.
- A second amortization formula. Principal and interest still come from `buildReport`.
- Keyboard or touch access to the scenario trash control. That stays out of scope.
- Restoring the title Amortization. Compound is the title for this release. Putting it back is a later change.
- Moving the 360/365 dropdown off the prepaid-interest line. A later pass may do that if the line is cramped. This release does not, and it does not drop the dropdown because the cash-to-close gap is small.
- Bumping `apps/web/package.json` or `PAGES_POINT_VERSION` in the design pull request. Both stay 0.7. The page release sets 0.8.
- A new npm dependency, a storage-version bump, or a change to the legacy key or the set key.

**Release phasing.** Every untagged requirement is this release. FHA and the other products named above are later, and so is moving the basis dropdown. The design pull request is not a build phase.

## 3. Principles

- P1. One walk. The page calls `buildReport`. Picture dollars are computed in `apps/web` and rounded once, half up to the cent, except the 365-day prepaid-interest path in requirement 13, which rounds the per diem first and then multiplies.
- P2. The queue's order is the page's order. Item 32 is not rearranged: Taxes and Insurance sit under the scenario line, and the summary and the chart follow Extra Payments.
- P3. A saved loan is kept. New fields are additive. A missing field uses the default that reproduces today's Conventional loan.
- P4. The 780+ PMI ladder is the ladder the page already uses. Lower bands use the cited table in requirement 8 and no other percents.
- P5. Both prepaid-interest bases ship. Default 360 matches the Numbers sheet and `prepaidInterestCents`. The 365 path matches the itemization method in D12. The dropdown is part of the row, not an optional extra.

## 4. Users and scenarios

The fresh loan is still the Conventional visit: purchase price $600,000, 5% down, 30 years, note rate 7.375%, FICO 780, start month equal to the visitor's current month. On a clock pinned to 2026-10-15 the start month is October 2026.

- The title reads Compound, with the tagline on the same line. The scenario control is under the title. The heading reads `600K | 5% down | 7.375% 30-year fixed | 780 FICO | starting October 2026`. There is no payment on that line and no bar under it.
- The summary's Monthly payment is `$4,853.10`. The bar on that line is labeled `$3,936.85 PI` and `$916.25 TI`. Extra principal paid, Interest saved, and Months saved read `$0.00`, `$0.00`, and `0`.
- Taxes and Insurance are directly under the heading. Extra Payments are directly under that. The summary and the chart follow. Closing Costs are under the chart and above the schedule. Both disclosures start closed.
- Changing the heading down payment from 5 to 20 refills PMI to 0%. Closing Costs on that loan, at the defaults, total `$19,175.00`, and cash to close is `$139,175.00`. Switching the basis dropdown to 365 changes prepaid interest and those totals. Switching it back to 360 restores them.
- Choosing the FICO range 740–779 writes 740 and refills PMI to 0.53% on the 5% down loan. A score of 780 or higher keeps 0.35% at 5% down.

## 5. Functional requirements

1. **Order.** Inside `<main>`, the blocks are the title, the scenario row, the heading line, then Taxes and Insurance, then Extra Payments, then the summary, then the chart, then Closing Costs, then the schedule. On a fixed loan nothing sits between the heading line and Taxes and Insurance except the loan field error, which stays directly under the heading. When the product is ARM, the ARM terms disclosure is that one extra block between the heading and Taxes and Insurance. The summary and the chart still follow Extra Payments. The save error stays under the scenario row.

2. **Title.** The `h1` text is `Compound`. A tagline on the same line reads `A mortgage amortization calculator`, in lighter type (the muted color, weight 400, smaller than the title). When the width is narrow the tagline wraps onto the next line under the title. The existing `h1::after` bar stays under the title block. The scenario control is not above the title.

3. **Scenario row.** The row is the title's next sibling. `#scenario` stretches to fill the row (`flex: 1`, `min-width: 0`). A down arrow is inside the button, at its right end, `aria-hidden`. The closed button's visible label and accessible name are the unnumbered scenario label from `intent/loan-scenarios/` requirement 8. The small prevailing bar stays inside the button, `aria-hidden`, 3rem by 0.5rem, with the same segments as today. Export and Import are not buttons on this row. A button at the row's right end opens a menu. Its accessible name is `Export and import`, with `aria-haspopup="menu"` and `aria-expanded`. The menu items are `Export` and `Import`, in that order. Export does what the Export button does today. Import activates the same hidden file input as today. Escape, a pointer down outside the menu and the button, and a successful choice close the menu. The file input's value is still cleared after each change.

4. **Open list.** The selected row uses a contrasting background in the same spirit as the month selector: background `var(--ink)`, text `var(--card)`, which is what `.month-picker-grid button[aria-pressed="true"]` uses. Every row uses the same font weight. The `font-weight: 700` rule on `.scenario-row-button[aria-current="true"]` goes away. Each open row's visible text and accessible name start with its 1-based index, a colon, and a space: `1: $4,853 - 600K | 5% down | 7.375% | 30 years | fixed`. `scenarioLabelText` stays unnumbered. The closed `#scenario` name does not gain the number. The trash button is absent on the selected row. On every other row it is shown only while the pointer is over that row. It is not shown for `:focus-within`, and the `(hover: none)` rule that shows it always goes away. It is not in the tab order. Keyboard access to it is out of scope, and so is removing a scenario on a device that cannot hover. The last scenario is the selected one, so it still has no trash button, and a remove of a one-scenario set still does nothing. The + row, the focus trap on the confirm dialog, and the rest of the list behavior from `intent/loan-scenarios/` stay.

5. **Remove dialog.** The question stays `Remove scenario {n}?` and is its own line. A blank line follows. The next line is that row's unnumbered scenario label. The accessible name stays `Remove scenario {n}?`. `Cancel` and `Remove` stay. Focus still starts on Cancel.

6. **Heading.** One line, one font size, including the editable fields. The computed font size of `#price`, `#down`, `#rate`, `#years`, `#fico`, `#fico-range`, `#product`, and `#start` equals the heading line's font size. The global input size of `1.05rem` does not win on this line. The line reads `{thousands}K | {down}% down | {rate}% {years}-year {structure }{fixed|ARM} | {fico} FICO | starting {long date}`. The word before the product is `-year` for every term, including 30 and 1, because item 11 says `30-year`. When the product is ARM the structure label stays where it is today, between the term and the product select (`5.875% 30-year 7/1 ARM`). The payment, the ` / month` text, `span.complete-payment`, and the heading prevailing bar leave this line. The `PI` `TI` `PE` legend under the heading goes away. The Term row and the Start month row go away. `#years` keeps its accessible name `Term`. `#start` stays the page-drawn month button, not `<input type="month">`, and keeps the accessible name `Start month`. The visible start text is the long date, with the static word `starting` before the button. `#product` still offers `fixed` and `ARM` and still keeps its native arrow.

7. **FICO.** An editable score sits on the heading immediately before `starting {long date}`. The number field's id is `fico` and its accessible name is `FICO`. A select `#fico-range`, accessible name `FICO range`, offers `780+`, `740–779`, `700–739`, `660–699`, and `620–659`. Choosing one writes `780`, `740`, `700`, `660`, or `620` into the field. The select shows the band that contains the current valid score. A score below 620 leaves the select on no band. The grammar is a whole number from 0 through 999. Empty or anything else is invalid, names FICO, and keeps the last valid score. The default is `780`. A missing or malformed stored score is `780`.

8. **PMI ladder.** The percent is annual, in integer thousandths, and the amount is that percent of the base loan divided by 12, the same `percentOfCents` the page already uses. Down-payment cuts stay the thousandths cuts the page already uses: `≥ 20000` → 20% down, `≥ 10000` → the 10% rung, `≥ 5000` → the 5% rung, otherwise under 5% down. At 20% down or more the rate is 0 for every score. Fannie Mae Selling Guide B7-1-01 requires mortgage insurance when the LTV is greater than 80%, so a 20% down payment is no insurance. A score of 780 or higher uses today's ladder and no other: 0%, 0.20%, 0.35%, 0.45%. The four lower bands, and a typed score below 620, use the table below. The source is Arch Mortgage Insurance Company's borrower-paid monthly non-refundable rate card, effective February 9, 2026, form MCUS-B0283B-0226, amortization term greater than 20 years, fixed, standard coverage (the first coverage row of each LTV band). Checked 2026-10-11 from that PDF. The page band uses the card column that contains the score the range types, which is the column's lower edge. A typed score anywhere in the band uses that same cell, so 770 uses the 740–759 column and not the card's 760+ column.

   | Page band | Card column | 10% rung, 90.00–85.01% LTV, 25% coverage | 5% rung, 95.00–90.01% LTV, 30% coverage | Under 5%, 97.00–95.01% LTV, 35% coverage |
   |---|---|---|---|---|
   | 780+ | queued ladder, not this card | 0.20% (200) | 0.35% (350) | 0.45% (450) |
   | 740–779 | 740–759 | 0.38% (380) | 0.53% (530) | 0.70% (700) |
   | 700–739 | 700–719 | 0.55% (550) | 0.78% (780) | 0.99% (990) |
   | 660–699 | 660–679 | 0.90% (900) | 1.28% (1280) | 1.54% (1540) |
   | 620–659 | 620–639 | 0.94% (940) | 1.42% (1420) | 1.86% (1860) |
   | below 620 | < 620 | 1.32% (1320) | 1.99% (1990) | 2.60% (2600) |

   There is no sixth range in the dropdown. A typed score below 620 uses the last row. The card's 760+ rates (0.28%, 0.38%, 0.58% at those three LTVs) are not the 780+ row. The card's non-fixed column and its term-of-20-years-or-less table are not used. One ladder serves fixed and ARM, and every term. The page's 10% rung is one rate, the 25% coverage cell, including at 15% down, where the card's 85%-and-below row is a different rate. That coarseness matches the four rungs the 780+ ladder already has. Rate text drops trailing zeros the way `0.20%` is already `0.2%`: 700 thousandths display as `0.7%`, 380 as `0.38%`, 0 as `0%`.

9. **PMI editing.** The Conventional PMI percent is an editable picture field, id `picture-pmi`, same percent grammar as property tax. Changing the FICO band, or changing the down payment to a new valid percent, refills the field from requirement 8 and replaces a hand edit. Typing a new score inside the same band does not refill. Choosing `780+` while the score is already 800 stays in the 780+ band, writes `780`, and does not refill. A hand-edited percent stays until the next band change or down-payment change. An invalid FICO or down-payment keystroke does not refill. Price and note rate do not refill. On load, a missing or malformed PMI percent is the ladder result for the loaded score and down payment, so a loan saved before this field existed, at the default score 780, keeps today's PMI. A stored valid percent is kept.

10. **Summary.** The Monthly payment region keeps that label and shows the prevailing monthly total in cents, `formatMoney` of the same cent total `intent/loan-scenarios/` already defines (modal principal and interest, plus tax, insurance, and PMI, plus the prevailing extra). On the fresh loan that is `$4,853.10`. After Apply of $1,000 in every month it is `$5,853.10`. The prevailing bar sits on that same line and fills the remaining width. Labels above the segments read `$3,936.85 PI`, `$916.25 TI`, and, when the prevailing extra is not zero, `$1,000.00 PE`. The letters use the segment colors. A zero-cent segment is omitted, and so is its label, so the fresh loan has no PE segment and no PE label. The bar's accessible name lists the parts that are shown. Extra principal paid, Interest saved, and Months saved always render. With no extra they are `$0.00`, `$0.00`, and `0`. Extra principal paid is still `extra_applied_cents`. Months saved is the bare count under 12, and from 12 up it is `{count} ({yearsAndMonths(count)})`. `yearsAndMonths` already drops a zero month part, so 24 is `24 (2 years)`, 12 is `12 (1 year)`, and 158 is `158 (13 years 2 months)`. The fixed-mode summary has no note. The ARM sentence under Monthly payment goes away, because that figure is no longer the initial payment. Highest rate and Highest payment stay. Loan amount, total interest, total cost, and payoff date stay.

11. **Chart.** The popup heading is `{payment number}: {short date}`, for example `87: Jan 2034`. The number is the payment month. The date is the `shortDate` the popup already uses. Payment 1 is still the month after the start month, so payment 87 on an October 2026 start is January 2034. The hooded figure faces and runs to the right, the same direction as the piggy bank. Mirror the current paths if they face the other way. Do not draw a new character, and do not flip the pig.

12. **Extra Payments form.** `#extra-monthly`, `#extra-yearly`, and `#extra-yearly-month` use the edited color while the field's value differs from the value at the last Apply, and return to the normal color on Apply or when the value is put back. The color is the schedule's `--edited` `#1d4ed8`, on the text and the bottom border, set on those three elements. The comparison is the field string for the two amounts and the month number for the select. Apply stores that snapshot. A missing snapshot loads as equal to the loaded prefill, so a reload is not dirty. A keystroke in a schedule cell still does not mark that cell, and these three fields do not wait for a blur to show the color.

13. **Taxes and Insurance.** The disclosure title is `Taxes and Insurance`. It uses the picture `open` flag. The Conventional label is gone. The rows that stay are property tax, including `Nashua: 1.683%; Brentwood: 1.32%.`, home insurance, and Conventional PMI. A `%` sits immediately to the right of the property-tax and home-insurance inputs. The PMI percent input is in that same column, right-aligned, with `%` immediately to its right. Purchase price, down payment, base loan amount, upfront MIP, total loan amount financed, principal and interest, FHA MIP, total monthly payment, and the three prevailing rows leave this block. Upfront MIP is not added to the financed principal. Financed cents equal the base loan. A stored upfront MIP percent is ignored and omitted from the next save. Monthly FHA MIP is not computed and not shown. Taxes and insurance in the prevailing total are tax plus home insurance plus PMI.

14. **Closing Costs.** The disclosure title is `Closing Costs`. It sits under the chart and directly above the schedule. Its open flag is `closingOpen`, closed when the flag is absent. The rows, in order, are lender origination, lender processing, conventional appraisal, title and escrow, recording and taxes, prepaid home insurance, prepaid interest, prepaid property taxes, escrow cushion, total closing costs, and total cash to close. Origination stays a percent of the base loan. Title and escrow stay a percent of the purchase price. Processing, appraisal, and recording stay dollar amounts. Their defaults stay 1%, $1,200, $500, 0.75%, and $800. A `%` or `$` sits immediately beside that input, as item 35 lists. Prepaid home insurance takes a month count, id `picture-insurance-months`, default `12`. The amount is the monthly insurance cents times that count. Prepaid property taxes take a month count, id `picture-tax-months`, default `4`. The amount is the monthly tax cents times that count. Escrow cushion is a dollar amount, id `picture-cushion`, default `1500`, not the old two-month formula. A missing cushion is $1,500 even when a saved tax rate would have made the old formula a different number. Month counts and the interest day count are whole numbers from 0 through 999. Empty is invalid and keeps the last valid value. Total closing costs are the sum of those rows' displayed cents. Total cash to close is the down payment plus that sum.

15. **Prepaid interest.** The row has an editable day count, id `picture-interest-days`, default `15`, and a select on that same line, id `picture-interest-basis`, accessible name `Interest day-count basis`, options `360` and `365`, default `360`. Both options ship. Do not omit the select, hide it, or collapse it away because the two totals are close. A later release may move it if the line is cramped. This release leaves it on the line. A missing basis is `360`. A missing day count is `15`.

    The 360 amount is one half-up to the cent of base cents × rate thousandths × days ÷ (100000 × 360). That is today's `prepaidInterestCents` with the constant 15 replaced by the day count. It is the Conventional Numbers sheet formula `B6 × note rate ÷ 360 × days`. Do not round a 360 per diem to the cent and then multiply. On the fresh loan that wrong step is $116.77 × 15 = $1,751.55, and the sheet amount is $1,751.56.

    The 365 amount rounds the per diem to the cent first, then multiplies by the days, with no second rounding. The per diem is one half-up to the cent of base cents × rate thousandths ÷ (100000 × 365). Checked 2026-10-11: $570,000 at 7.5% is 11712 cents a day, times 15 is 175680 cents, $117.12 and $1,756.80. The 360 amount on that same loan is 178125 cents, $1,781.25, from a per diem of $118.75. That 360 result is the Numbers-sheet method. It is not the itemization figure.

16. **What stays.** The schedule columns, Saved by extra, Apply replacing the extra column, the blue edited schedule cells, the start-month picker, the chart's pointer-following legend, the ARM rate math, the Index cell, and the scenario set. The scenario label still includes the whole-dollar prevailing total. The dropdown bar stays. `buildReport` stays the only walk. Fixed mode still passes no `arm`.

17. **Storage.** The legacy key stays version 1 and the set key stays version 2. `fico` is added to the loan draft. The picture gains `pmi`, `insuranceMonths`, `taxMonths`, `interestDays`, `interestBasis`, `cushion`, and `closingOpen`. Missing keys use the defaults in this spec. `prefill` gains the last-Apply snapshot for the three form fields. A missing snapshot equals the loaded prefill.

18. **Docs and version.** The design pull request does not edit `AGENTS.md`, `REVIEW.md`, `apps/web/package.json`, or `.github/workflows/`. By the end of the page release, `AGENTS.md` describes the title, the heading line in requirement 6, the order in requirement 1, the summary in requirement 10, the FICO ladder in requirement 8, and the prepaid-interest pair in requirement 15, and it says the point version is 0.8. Things agents get wrong gains: do not drop the 360/365 dropdown because the cash-to-close gap is small; do not round the 360 per diem before multiplying; do not single-round the 365 charge; do not replace the 780+ ladder with the card's 760+ column; do not put the summary or the chart above Extra Payments; do not finance upfront MIP. `REVIEW.md` Compliance names `intent/ui-facelift/`. The page release sets `apps/web/package.json` to `0.8.0` and `PAGES_POINT_VERSION` to `0.8` in `publish-gh-pages-production.yml`. That is the one workflow edit. Feature publishes are not tagged.

## 6. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | Unit (`pnpm --dir apps/web test`): the PMI thousandths in requirement 8, including 780+ at 5% down still 350 and at 10% down still 200, 740 at 5% down 530, and below 620 at 5% down 1990. At 20% down every band is 0. On the fresh loan, 740 produces PMI 25175 cents and 780 produces 16625. |
| AC2 | Unit: 360-day prepaid interest on the fresh loan at 15 days is 175156 cents. Rounding the per diem first is not used for 360. 365 days on $570,000 at 7.5% for 15 days is a per diem of 11712 cents and a charge of 175680 cents. The 360 charge on that loan is 178125 cents. On the $600,000, 20% down, 7.375%, 15-day loan, 360 prepaid interest is 147500 cents, closing costs are 1917500, and cash to close is 13917500. The 365 charge on that loan is 145485 cents. A day count of 0 is 0 on both bases. |
| AC3 | Playwright, clock 2026-10-15, fresh storage: the `h1` text includes `Compound` and `A mortgage amortization calculator`. `#scenario` is below the title and its name is the unnumbered `$4,853 - 600K \| 5% down \| 7.375% \| 30 years \| fixed`. The heading text is `600K \| 5% down \| 7.375% 30-year fixed \| 780 FICO \| starting October 2026`. There is no `span.complete-payment` and no `.prevailing-legend`. The heading controls share one computed font size. |
| AC4 | Playwright, that visit: Taxes and Insurance is the disclosure immediately under the heading, Extra Payments is immediately under it, and the summary and the chart follow Extra Payments. Closing Costs is immediately under the chart and immediately above the schedule. Both new disclosures are closed. The old title `Monthly payment and closing costs` and the word `Conventional` as a section label are absent. FHA MIP and Upfront MIP are absent. |
| AC5 | Playwright, that visit, summary: Monthly payment is `$4,853.10`. The bar on that line has labels `$3,936.85 PI` and `$916.25 TI` and no PE label. Extra principal paid, Interest saved, and Months saved are `$0.00`, `$0.00`, and `0`. |
| AC6 | Playwright: the open list's second row starts with `2: `, the selected row's computed background is the month selector's ink, and the row buttons share one font weight. The selected row has no trash button. Another row's trash button is not in the tab order and is shown only while the pointer is over that row. The remove dialog's question and the unnumbered label are on separate lines with a blank line between them. Export and Import are inside the menu, not buttons beside `#scenario`. |
| AC7 | Playwright: Apply of $1,000 in every month makes Monthly payment `$5,853.10` and shows a `$1,000.00 PE` label. Months saved on the $570,000 / 7% / $100-every-month loan reads `28 (2 years 4 months)`. A count of 0 reads `0`. |
| AC8 | Playwright: the chart popup heading for payment 87 on an October 2026 start is `87: Jan 2034`. The hooded figure's accessible name stays `Hooded figure`, and the graphic faces the same direction as the piggy bank. |
| AC9 | Playwright: typing in `#extra-monthly` sets its computed color to `rgb(29, 78, 216)` before Apply, Apply clears it, and restoring the last-applied string clears it without Apply. The same color applies to `#extra-yearly` and `#extra-yearly-month`. |
| AC10 | Playwright, fresh loan, 20% down, Closing Costs open: origination `$4,800.00`, title `$4,500.00`, prepaid insurance `$2,100.00`, prepaid interest `$1,475.00`, prepaid tax `$2,300.00`, cushion `$1,500.00`, total closing costs `$19,175.00`, cash to close `$139,175.00`. `#picture-interest-basis` is on the prepaid-interest row, its value is `360`, and the day count is `15`. Choosing `365` changes prepaid interest to `$1,454.85` and cash to close to `$139,154.85`. Choosing `360` restores `$1,475.00` and `$139,175.00`. |
| AC11 | Playwright: choosing `740–779` writes `740` into `#fico` and the PMI rate text is `0.53%`. A score of `800` shows `0.35%` at 5% down. Editing the PMI percent to `0.5` keeps `0.5` until the down payment changes, which refills from the ladder. |
| AC12 | `node --test` exits 0 with no change to any calculator test. `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `amortize.js` has no diff. The design pull request does not change `apps/web/package.json` or `PAGES_POINT_VERSION`. The page release's diff sets them to `0.8.0` and `0.8`. |
| AC13 | Docs: by the end of the page release, `AGENTS.md` contains the requirement 18 sentences and `REVIEW.md` names `intent/ui-facelift/`. |

`node --test` does not collect the page tests. AC1 and AC2 run only in `pnpm --dir apps/web test`.

## 7. Design decisions

**D1 — The title is above the scenario control.** `intent/loan-scenarios/` put the list first and the `h1` under it. Item 1 reverses that. The `h1` stays the page title. Compound is the trial name from item 2. Restoring Amortization is not this release.

**D2 — Export and Import move into one menu.** They leave the scenario row as two buttons and become the only two items in the menu at the row's end. The file contract does not change.

**D3 — The selected row matches the month selector, and the trash control is hover-only.** Checked 2026-10-11 in `styles.css`: the pressed month button is `background: var(--ink)` and `color: var(--card)`, and the selected scenario row is `font-weight: 700`. The weight rule goes away so every row matches. The trash button stays off the selected row. The focus-within and `(hover: none)` rules go away with the keyboard work, which item 7 leaves out of scope. A phone that cannot hover cannot remove a scenario in this release.

**D4 — The remove question stays, and the label moves to its own line.** The question is the current `Remove scenario {n}?`, not a new sentence. The screenshot's shorter wording is the layout reference. The blank line is the gap between the two blocks. The label is the unnumbered `scenarioLabelText`.

**D5 — The heading is the loan, at one size.** Item 28 is the line. The payment leaves. The term joins as `-year` plus the product, and the start month joins at the end. Checked 2026-10-11: `.heading-line` is `1.45rem` and the global `input` rule is `1.05rem`, so the heading controls need the line's size or the fields stay smaller. `#product` stays a native select. `#start` stays the page-drawn button.

**D6 — The bar moves to the summary, and the dropdown bar stays.** Item 13 and item 14. The heading legend goes away because the segment labels above the summary bar name the parts. The dropdown bar stays 3rem, unlabeled, and `aria-hidden`. A zero PE part is omitted on the summary bar, label included.

**D7 — Monthly payment becomes the prevailing total in cents.** Item 15. The whole-dollar figure leaves the heading. The cents stay on the summary. `$4,853.10` and `$5,853.10` are the fresh loan and the $1,000 prevailing-extra loan from `intent/loan-scenarios/` F1 and F7b. The ARM note that calls the summary figure the initial payment would be false, so it goes away. Highest rate and Highest payment still carry the ARM result.

**D8 — The three savings rows always show, and months saved leads with the count.** Item 17 and item 18. `yearsAndMonths` already drops a zero remainder, so the new string is the count alone under 12 and `count (yearsAndMonths)` from 12 up. Hiding the rows when the map is empty is the behavior this replaces.

**D9 — FICO defaults to 780, and the range types the lower score.** Item 27. A missing score is 780 so a loan saved before the field existed keeps today's PMI. The select is a shortcut into the number field, not a replacement for it.

**D10 — The lower PMI bands are the Arch card's standard-coverage cells.** Checked 2026-10-11 against Arch form MCUS-B0283B-0226, the table headed "Amortization Term > 20 Years", fixed columns, first coverage row of each LTV band. The page's four rungs stay. Each lower band uses the card column of the score that band types. The 780+ row is the queued ladder, not the card's 760+ column. Twenty percent down is 0% for every score because B7-1-01 requires insurance only above 80% LTV (https://selling-guide.fanniemae.com/sel/b7-1-01/provision-mortgage-insurance). A percent that is not in requirement 8 is out. The card's ≤20-year table and its non-fixed columns are not a second ladder.

**D11 — PMI refills only when the band or the down payment changes.** Item 26. A hand edit is real until one of those two inputs moves the loan into a different cell. Reloading does not refill a stored percent.

**D12 — Both day-count bases ship, and they do not share a rounding step.** The Conventional Numbers sheet and today's `prepaidInterestCents` use a 360-day year and one half-up at the end. That stays the 360 path, with the day count replaced for the constant 15. The 365 path is the itemization method: round the per diem half up to the cent, then multiply by the days. Checked 2026-10-11: $570,000 at 7.5% for 15 days is 11712 cents times 15 = 175680 cents on 365, and 178125 cents on 360. Regulation Z comment 17(c)(3)-1.ii gives 360 and 365 as disclosure examples and does not choose one for this row, so it is not the settlement. The settlement is the decision in the intent: offer both, default 360, keep the dropdown on the line. On the pictured 20% down loan the 365 total is $20.15 less prepaid interest ($1,454.85 against $1,475.00) and cash to close moves from $139,175.00 to $139,154.85. That gap is small, and the dropdown still ships.

**D13 — Prepaid counts and the cushion are inputs.** Twelve months and four months reproduce today's insurance and tax prepaids on the default rates. The cushion default of $1,500 reproduces today's cushion on the default loan and does not keep tracking tax and insurance after that. A saved loan without the new keys gets those defaults.

**D14 — Upfront MIP and FHA MIP leave the walk.** Item 23 and item 24. The financed principal is the base loan. The fresh loan does not change, because upfront MIP already defaulted to 0. A stored non-zero upfront MIP is dropped on the next save rather than kept as a hidden principal add-on.

**D15 — The form fields use the schedule's edited color.** Item 21 names these three fields and says the color is not showing in Safari. The color is the existing `--edited` blue, painted on the controls themselves, including the select, so the rule is not only a wrapper Safari can ignore. The snapshot is the last Apply, not the schedule's `applied` map.

**D16 — The chart heading leads with the payment number.** `shortDate` is already `Jan 2034`. The number is the payment index. October 2026 plus 87 payments lands on January 2034 because payment 1 is November 2026.

**D17 — ARM terms stay between the heading and Taxes and Insurance.** Item 32's screenshots are the fixed loan. The ARM disclosure is the one block allowed between the heading and Taxes and Insurance, and only while the product is ARM. The summary and the chart still follow Extra Payments.

**D18 — Storage stays version 1 and version 2.** New keys follow the missing-field defaults. The set key and the legacy key do not gain a version.

**D19 — This design pull request does not ship the page.** It adds this folder only. `package.json` stays `0.7.0` and `PAGES_POINT_VERSION` stays `0.7`. The page release sets both to 0.8, in the last build phase.

**D20 — The tagline wraps, and the title bar stays.** The tagline is inline lighter text inside the `h1`. The existing block underline stays under the whole title. Narrow wrapping is the tagline moving under the word Compound, not a second heading.

**D21 — One size includes the product select and the start button.** They are on the heading line, so they take the line's font size. `#product` does not join the extra-form `appearance: none` rule.

**D22 — What this supersedes.** Only these points, and only for the page. `intent/loan-scenarios/` requirement 3's "first control in main, above the h1", and the Export and Import buttons on that row. The list, the set, the label, and the dropdown bar stay. Requirement 12's "the summary's Monthly payment" stays the initial payment is replaced by requirement 10 here. The heading dollar, the heading bar, and the legend in requirement 9 leave the heading. The ARM heading in `intent/arm-loan/` and `intent/loan-scenarios/` D16 loses the payment and gains the term, the FICO score, and the start month. The summary sentence "Initial payment. The extra payment is on top of this amount, and the payment resets at each adjustment." is removed. `intent/complete-loan-picture/` requirements 8, 9, 10, and 11: upfront MIP is not financed, FHA MIP is not shown, the combined disclosure splits, the prepaid day count and the 360/365 basis are inputs, the insurance and tax prepaids take month counts, and the cushion is a dollar default. The 780+ PMI cuts in requirement 9 stay, and they are the 780+ row of requirement 8 here. `intent/ui-followups/` requirement 3's "when the map has any amount" and requirement 4's months-saved wording are replaced by requirement 10 here. The blue schedule cells stay. `intent/amortization-app/`'s `h1` text Amortization is replaced by requirement 2. `AGENTS.md` is updated when the page ships, not in the design pull request.

## 8. Open questions

None. The 360/365 choice is on the prepaid-interest line in this release. Moving it later, if the line is cramped, is out of scope, not an open question.
