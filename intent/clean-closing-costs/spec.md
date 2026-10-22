# spec.md — Clean closing costs

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-21) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

The Closing Costs section becomes a clean estimate. Lender fees are one dollar amount, default $3,000. Title, escrow, and recording is one percent of price, filled by three presets and then editable. Prepaids and impounds come from the loan the page already has, plus a closing day, three impound month counts, and a dollar proration. Points, seller credit, lender credit, and earnest money sit outside that subtotal. There is no percentage origination fee.

On the reference purchase the clean closing cost, quarter point excluded, is $16,572.41. The page’s line on those inputs is that same figure. The quarter point is $1,425 on its own line. This spec wins over [plan.md](plan.md). Where it replaces a closing-cost sentence of [../complete-loan-picture/spec.md](../complete-loan-picture/spec.md) or [../ui-facelift/spec.md](../ui-facelift/spec.md), D20 names the sentence.

This pull request does not implement the page and does not bump the point version. The pull request that ships the form sets 0.16.

## 2. Goals and non-goals

**Goals**

- G1. Replace the closing-cost inputs with the dollar lender fee, the title percent and its presets, the closing day, the impound counts, the proration, and the add-ons in the prompt.
- G2. Show closing costs, points, and closing costs and points as separate lines. The clean line excludes the quarter point.
- G3. Reproduce the reference purchase as a unit fixture at $16,572.41 clean, with the quarter point still visible on the points line.
- G4. Keep a saved loan’s origination dollars and title percent by mapping them into the new fields. A new visit uses the new defaults.
- G5. Leave the amortization walk, the monthly tax and insurance defaults, and the PMI ladder alone.

**Non-goals**

- Any change to `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, the skills, or `node --test`.
- A percentage origination fee, or filing the quarter point as origination.
- A county or state fee table, an automatic proration calendar, or a screen that pastes a net sheet or a Loan Estimate.
- Raising the 1.15% tax default or changing the PMI ladder. Both would change the fresh-visit monthly payment.
- Fitting the 50/50 preset to the reference title share.
- Retuning the $3,000 lender fee, the 0.75% preset, closing day 1, the 360-day basis, or the one-month proration so the fresh visit hits $16,572.41 or $17,997.
- A new scenario-document version. The picture object inside version 2 can hold the new fields.
- Naming the institution, a title company, or a street address on the page, in tests, or in `AGENTS.md`.
- Bumping `apps/web/package.json` or `PAGES_POINT_VERSION` in this docs pull request. Both stay 0.15. The page release sets 0.16.

**Release phasing.** Every untagged requirement is this release. The docs pull request is not a build phase.

## 3. Principles

- P1. One walk. Closing costs do not call the ARM walk and do not change `buildReport`. Prepaid interest uses the note rate on the base loan.
- P2. Round each reported line once, half up to the cent, with the 365-day interest path left as it is: the per diem is rounded first and then multiplied. Do not single-round that charge. Do not round a 360 per diem before multiplying.
- P3. The clean subtotal excludes points. The quarter point is an add-on. Default points are 0, so a fresh visit’s clean total has no quarter point in it.
- P4. A saved loan is kept. An existing origination percent and processing fee become the lender-fee dollars. An existing title percent stays the title percent. Missing new keys use the new defaults. A new visit uses those defaults directly.
- P5. The quoted ranges may be cited without the institution’s name: lender fees $2,500–$3,000 including appraisal, and the escrow side about 1% of price.

## 4. Users and scenarios

The fresh loan is still the Conventional visit: purchase price $600,000, 5% down, 30 years, note rate 7.375%, start month equal to the visitor’s current month. On a clock pinned to 2026-10-15 the start month is October 2026, and that month is the closing month.

- Closing Costs is still the disclosure under the chart. It opens on `closingOpen`. A fresh visit is closed.
- The fresh estimate uses lender fees $3,000, the 50/50 preset at 0.75% of price, closing day 1, basis 360, impound months 6, 3, and 2, points 0, and proration equal to one month of property tax at 1.15%. The clean total is $18,102.40. That is above the reference $16,572.41.
- The reference purchase is a unit fixture, not a fresh visit. Its clean total is $16,572.41. Its quarter point, $1,425, is on the points line and is not inside that total. Closing costs and points are $17,997.41.
- Choosing buyer-pays-all writes 1% of price and leaves the percent editable. Choosing 50/50 writes 0.75%. Choosing the seller preset writes 0.40%. Typing 0.64925% shows no preset and titles $3,895.50 on a $600,000 price.
- A saved picture that still has an origination percent and a processing fee loads as lender-fee dollars equal to that percent of the loan plus the processing fee. It does not jump to $3,000, and it does not show a percent origination field. A saved title percent stays. A picture that was never stored uses the new defaults.
- Changing the down payment under 10% with a seller credit over 3% of price shows the soft warning. The value is kept.

## 5. Functional requirements

1. **Scope.** This replaces the closing-cost form only. Taxes and Insurance stay the property-tax percent, the home-insurance percent, Conventional PMI, and the subtotal, including the Nashua and Brentwood note. The monthly amounts stay `percentOfCents` of price or of the base loan, divided by 12. The PMI ladder is untouched. The disclosure title stays `Closing Costs`. It stays under the chart and above the schedule. `closingOpen` still starts closed when the flag is absent.

2. **What leaves the form.** These controls and rows go away: lender origination percent (`#picture-origination`), lender processing fee (`#picture-processing`), conventional appraisal (`#picture-appraisal`), recording and taxes (`#picture-recording`), prepaid home-insurance months (`#picture-insurance-months`), the raw prepaid-interest day count (`#picture-interest-days`), prepaid property-tax months (`#picture-tax-months`), and the flat escrow cushion (`#picture-cushion`). Nothing in the new section is a percentage origination fee. The quarter point is not filed on an origination row. Checked 2026-10-21: the current form’s closing sum is origination percent of the base loan, plus processing, appraisal, title percent of price, recording, monthly insurance times the insurance-month count, prepaid interest, monthly tax times the tax-month count, and the cushion dollars. Cash to close is that sum plus the down payment. The current page has no points, seller credit, lender credit, or earnest money.

3. **Lender fees.** One dollar amount. Id `picture-lender-fees`, accessible name `Lender fees`, row `data-line="lender-fees"`, label `Lender fees`. Default `3000`. The grammar is today’s non-negative dollar grammar: empty is invalid, at most two decimal places. The amount is those cents. It is not a percent of the loan. Points are not included. The default is the top of the quoted $2,500–$3,000 range, and that range includes appraisal, so there is no second appraisal row. Do not retune $3,000 to the reference $2,618.

4. **Title, escrow, and recording.** One percent of price, not of the loan. Id `picture-title` stays, accessible name `Title, escrow, and recording`, row `data-line="title"`, label `Title, escrow, and recording`. The grammar accepts 0 inclusive and less than 100, with at most five decimal places, so `0.64925` is valid. Three decimal places cannot represent that share: today’s `percentThousandths` stops at three. Store the rate as an integer count of hundred-thousandths of a percent (`0.64925` is 64925, `0.75` is 75000, `1` is 100000, `0.40` is 40000). The cents are one half-up of price cents times that count divided by 10,000,000. A missing or invalid stored title on an existing picture is `0.75`. A new visit is `0.75`.

   The preset control is a select, id `picture-title-preset`, accessible name `Title, escrow, and recording preset`, in a `.field` so it keeps `color: var(--ink)`. The options, in order, are `50/50`, `Buyer pays all`, and `Seller pays the owner's policy and escrow`. Choosing one writes `0.75`, `1`, or `0.40` and leaves the percent editable. The selected option is the one whose rate equals the current percent. When none match, the select shows a blank option that is not a preset and does not write a percent. The default selection on a fresh visit is `50/50`.

   Buyer-pays-all at 1.00% is the quoted escrow-side rule of thumb, about 1% of price. The 50/50 preset at 0.75% is a lean-high step down from that 1%, not a fit to the reference share. The addendum’s “0.65%” is that share described in hundredths. It is not a preset. 0.65% of $600,000 is $3,900.00. The fixture percent is 0.64925%, which is $3,895.50. The seller preset is 0.40%.

5. **Prepaid interest.** Row `data-line="prepaid-interest"`, label `Prepaid interest`. The input is the closing day, id `picture-closing-day`, accessible name `Closing day`. A valid day is a whole number from 1 through 31. Empty, 0, and anything else are invalid and keep the last valid day. Default `1`. The basis select stays `#picture-interest-basis`, accessible name `Interest day-count basis`, options `360` and `365`, default `360`. Do not drop it. A stored basis other than the string `365` loads as `360`.

   The closing month is the loan’s start month. Payment 1 is the next calendar month: `paymentDate("2026-11", 1)` is December 2026, so a November 2026 start is already the closing month. The prompt’s rule that would step back a month applies only when the start month is payment 1. It does not apply here. The row shows that month’s long date beside the day (`November 2026`). The day count is the length of that month, minus the closing day, plus 1. Day 1 is the whole month. The length is the Gregorian length of that month, including leap years. A year divisible by 4 is a leap year, except a year divisible by 100 is not, except a year divisible by 400 is. Do not use 31 for every month. October 2026 has 31 days, November 2026 has 30, February 2026 and February 1900 have 28, and February 2028 and February 2000 have 29. The row shows the count as `1 day` when it is 1 and otherwise `{n} days`.

   A day past the month’s length is clamped to the last day of that month. Clamping is not a field error. It rewrites the stored day when the start month changes and when a typed day 1 through 31 does not fit, and it clamps a stored day on load. The day count uses the clamped day.

   The charge uses the current functions and no other rounding. Basis 360 is one half-up of base cents × rate thousandths × days ÷ (100000 × 360). Do not round that per diem first. Basis 365 is one half-up of base cents × rate thousandths ÷ (100000 × 365), then multiplied by the days, with no second rounding. Do not replace that with one end round of the whole charge. A day count of 0 cannot occur, because the closing day is at least 1 and at most the length of the month.

6. **Homeowners insurance.** Row `data-line="homeowners-insurance"`, label `Homeowners insurance`. The amount is twelve months of the existing insurance rate, rounded once, half up, at the end: `percentOfCents(priceCents, insuranceThousandths)` with one part. It is not twelve times the monthly insurance line. Those two can differ. On the default 0.35% of $600,000 they are both $2,100.00. The row shows the static text `12 months` and has no month input. The Taxes and Insurance monthly insurance line stays the current monthly round.

7. **Impounds.** Three month counts, each a whole number from 0 through 999, empty invalid, defaults `6`, `3`, and `2`. Ids `picture-tax-impound-months`, `picture-insurance-impound-months`, and `picture-mi-impound-months`. Accessible names `Property tax impound months`, `Insurance impound months`, and `Mortgage insurance impound months`. Rows `tax-impound`, `insurance-impound`, and `mi-impound`, labels `Property tax impound`, `Insurance impound`, and `Mortgage insurance impound`. A stored count outside 0 through 999 loads as that field’s default. There is no further cushion on top of these months.

   Property-tax impound is the displayed monthly property-tax cents times the tax-impound count. Mortgage-insurance impound is the displayed monthly PMI cents times the MI-impound count, and it is zero when the monthly PMI cents are zero. The month field stays. Insurance impound is the displayed monthly insurance cents times the insurance-impound count. That is the existing prepaid pattern: the monthly line is already rounded, and the count is whole, so the product needs no second rounding. It is not one half-up of the annual closing line times the count divided by 12. The prompt’s $493.00 is that second formula. This spec adjusts the reference impound to the first formula and says so in D6.

8. **Property-tax proration.** A dollar amount that may be negative. Id `picture-proration`, accessible name `Property-tax proration`, row `data-line="proration"`, label `Property-tax proration`. The grammar is an optional leading minus, then today’s dollar grammar. Empty is invalid. Minus alone is invalid. When the stored key is absent or invalid, the field is one month of property tax at that scenario’s tax rate: the displayed monthly tax cents, written as a field string with no grouping and with `.00` omitted when the cents are zero (`57500` cents is `575`, `81392` cents is `813.92`, a negative uses a leading minus). A later edit of the tax rate does not rewrite a proration that is already stored. A fresh visit has no stored proration, so the shown value is one month of the 1.15% tax, `575`. Changing the tax rate on that visit, before the owner edits proration, updates the shown proration, because it is still the default. Once the owner edits the field, or a saved picture contains the key, it sticks.

9. **Add-ons.** These rows are outside the closing-cost subtotal. They do not enter the closing-cost sum.

   - Points. A percent of the base loan, today’s three-decimal percent grammar, 0 inclusive and less than 100. Id `picture-points`, accessible name `Points`, row `data-line="points"`, label `Points`. Default `0`. The cents are `percentOfCents(loanCents, pointsThousandths)`. The reference quarter point is 0.25% of $570,000, which is $1,425.00. The reference Loan Estimate books that charge as origination. The page does not. There is no percentage origination field to put it on.
   - Seller credit. Non-negative dollars. Id `picture-seller-credit`, accessible name `Seller credit`, row `data-line="seller-credit"`, label `Seller credit`. Default `0`. When the down-payment thousandths are below 10000 and the credit cents satisfy `creditCents * 100 > priceCents * 3`, show a note, not a field error: `The usual conventional cap is 3% of the lower of price or appraisal. This check uses price because there is no appraisal.` Do not block the value. A credit equal to 3% of price does not warn. A down payment of exactly 10% does not warn, at any credit. Do not encode the rest of the interested-party-contribution matrix. The note follows the current down payment and the current valid credit.
   - Lender credit. Non-negative dollars. Id `picture-lender-credit`, accessible name `Lender credit`, row `data-line="lender-credit"`, label `Lender credit`. Default `0`.
   - Earnest money already paid. Non-negative dollars. Id `picture-earnest`, accessible name `Earnest money already paid`, row `data-line="earnest"`, label `Earnest money already paid`. Default `0`.
   - Down payment stays the heading price and down-payment fields. Do not add a second one, and do not add a down-payment row in this section.

   An invalid entry names the field, keeps the last valid picture, and uses the same message shapes the picture fields use. Dollar fields other than proration say greater than or equal to zero. Proration does not. Points say at most three decimal places. Title says at most five. Impound months say a whole number from 0 through 999. Closing day says a whole number from 1 through 31. Empty is invalid. The extra-payment rule that an empty field is zero does not apply.

10. **Totals.** Sums of the displayed cents. Labels and rows:

    | Row | Label | Amount |
    |---|---|---|
    | `closing` | Closing costs | Lender fees + title + prepaid interest + the twelve-month insurance line + the three impounds + proration |
    | `points` | Points | The points cents, already listed above |
    | `closing-and-points` | Closing costs and points | Closing costs + points |
    | `cash-to-close` | Cash to close | Down payment + closing costs and points − seller credit − lender credit |
    | `due-at-closing` | Due at closing | Cash to close − earnest money |

    Closing costs do not include points, the down payment, either credit, or earnest money. A negative proration reduces closing costs. A negative cash to close or due-at-closing is allowed. `formatMoney` today prefixes `$` onto a string that already contains the minus, so a negative looks like `$-813.92`. These lines, and `formatMoney` itself, put the minus before the dollar sign (`-$813.92`). Positive amounts stay as they are.

    The order in the table is lender fees, title, prepaid interest, homeowners insurance, property-tax impound, insurance impound, mortgage-insurance impound, proration, closing costs, points, closing costs and points, seller credit, lender credit, cash to close, earnest money, due at closing. Seller credit, lender credit, and earnest money stay inputs on those rows.

11. **Reference fixture.** A unit test, not a Playwright typing of a percent that cannot exist. Price $600,000, loan $570,000, note rate 7.25% (7250 thousandths), 30-year fixed. Tax monthly $625 (1.25% of price; the monthly cents are 62500). Insurance annual is 197200 cents, passed in directly. No percent of $600,000 with at most five decimal places equals $1,972: 1972 / 6000 percent is 0.3286 with 6 repeating. The form’s insurance percent stays three decimals. Mortgage insurance monthly is 9975 cents. Lender fees 261800 cents. Title 64925 units (0.64925%). Basis 365. A 30-day month, closing day 6, so the day count is 25. Impound months 6, 3, and 2. Proration 81392 cents. Points 250 thousandths (0.25%). Seller credit 1,000,000 cents. Earnest money 1,800,000 cents. Down payment 3,000,000 cents. Lender credit 0.

    Checked 2026-10-21 from the reference net sheet, without naming the institution or the title company: the loan charges other than the $1,425 origination line sum to $2,618.00, and that sum includes the appraisal on that sheet. The title, escrow, and recording charges sum to $3,895.50. Prepaid interest is $113.22 a day for 25 days, $2,830.50. The twelve-month insurance premium is $1,972.00. The insurance impound is 3 × $164.33 = $492.99. Mortgage insurance is 2 × $99.75 = $199.50. Tax is 6 × $625 = $3,750.00. Proration is $813.92. Those prepaids sum to $10,058.91. Clean closing costs, quarter point excluded, are $2,618.00 + $3,895.50 + $10,058.91 = $16,572.41. The reference Loan Estimate uses 22 days of interest, not 25, and a different total. It is not this fixture. The addendum’s $16,572.41 is this net-sheet figure.

    The page lines on those inputs:

    | Line | Cents | Dollars |
    |---|---|---|
    | Lender fees | 261800 | $2,618.00 |
    | Title, escrow, and recording | 389550 | $3,895.50 |
    | Prepaid interest | 283050 | $2,830.50 |
    | Homeowners insurance | 197200 | $1,972.00 |
    | Insurance impound | 49299 | $492.99 |
    | Mortgage-insurance impound | 19950 | $199.50 |
    | Tax impound | 375000 | $3,750.00 |
    | Proration | 81392 | $813.92 |
    | Closing costs | 1657241 | $16,572.41 |
    | Points | 142500 | $1,425.00 |
    | Closing costs and points | 1799741 | $17,997.41 |
    | Cash to close | 3799741 | $37,997.41 |
    | Due at closing | 1999741 | $19,997.41 |

    The insurance impound is `halfUp(197200, 12) × 3` = 16433 × 3. It is not `halfUp(197200 × 3, 12)`, which is 49300 cents. The annual line stays 197200 cents, not 12 × 16433. D5 and D6 record why this is not the prompt’s $2,830.48 / $493.00 / $16,572.40 table. The points cents are not inside the 1657241. November 2026 is the 30-day month this fixture uses when it goes through the calendar: closing day 6 produces 25 days, and payment 1 is December 2026.

12. **Fresh visit.** Clock 2026-10-15, no stored loan. October 2026, closing day 1, 31 days, basis 360, rate 7.375% (7375 thousandths), loan 57,000,000 cents, price 60,000,000 cents. Lender fees 300000. Title 0.75% is 450000. Prepaid interest 361990. Twelve-month insurance 210000. Insurance impound 3 × 17500 = 52500. Tax impound 6 × 57500 = 345000. Mortgage-insurance impound 2 × 16625 = 33250. Proration 57500. Points 0. Closing costs and closing costs and points are both 1810240 ($18,102.40). Cash to close and due at closing are both 4810240 ($48,102.40). 1810240 is greater than 1657241. Do not retune the defaults to close that gap. Switching the basis to 365 on that same day count changes prepaid interest to 357027 ($3,570.27), closing costs to 1805277 ($18,052.77), and cash to close to 4805277 ($48,052.77). Switching back restores the 360 figures. At 20% down the monthly PMI cents are 0, so the mortgage-insurance impound is 0 while its month field stays `2`.

13. **Storage.** The legacy key stays version 1. The set key stays version 2. The picture object gains `lenderFees`, `closingDay`, `taxImpoundMonths`, `insuranceImpoundMonths`, `miImpoundMonths`, `proration`, `points`, `sellerCredit`, `lenderCredit`, and `earnest`. `title` and `interestBasis` stay. `open` and `closingOpen` stay. The save does not write `origination`, `processing`, `appraisal`, `recording`, `insuranceMonths`, `taxMonths`, `interestDays`, or `cushion`. `pictureDraftEqual` compares the new fields, so a legacy picture that differs from the active one still replaces only the active scenario.

    Load rules:

    - No picture value, or a picture that is not an object: the new defaults, including lender fees `3000` and title `0.75`. Do not invent a 1% origination fee on that path. PMI still fills from the down payment and the score, as it does today.
    - A picture object with a valid `lenderFees` dollar uses it. Origination and processing on that object are ignored.
    - A picture object without a valid `lenderFees` maps once: origination percent of the base loan, missing or invalid origination treated as 1%, plus the processing dollars, missing or invalid processing treated as $1,200. The result is a dollar field string. Later edits of the price do not rescale it. The percent is not shown and is not saved back. On a $570,000 loan, stored origination `1` and processing `1200` become `6900` ($5,700 + $1,200). The stored appraisal and recording amounts are not added. The reference $2,618 already contains that purchase’s appraisal as part of the one lender-fee figure; a saved appraisal row is a different amount and is dropped.
    - Title keeps a stored percent that passes the five-decimal grammar, including `0.5` and `0.64925`. Otherwise `0.75`.
    - A stored `interestDays` is not the closing day. Absent or invalid `closingDay` is `1`, then clamped to the start month.
    - A stored `taxMonths` is not the tax impound. Absent impound counts use 6, 3, and 2.
    - A stored `cushion` is not the proration. Absent proration uses requirement 8.
    - Absent points, seller credit, lender credit, and earnest money are `0`.

    A failed or partial save still restores the last complete pair of keys and shows `Could not save this loan.` This change does not add a third key and does not change that restore.

14. **What does not change.** `amortize.js` gains no closing-cost math and no Node API. The CLI and both skills are unchanged. The heading, the prevailing payment, the schedule, extra principal, and Apply are unchanged. An ARM’s prepaid interest uses the heading note rate and the base loan, not a fully indexed rate and not the reset payment. The monthly payment picture does not read the closing-cost total.

15. **Names and docs.** The page, the tests, and `AGENTS.md` do not name the institution, a title company, or a street address. The quoted $2,500–$3,000 range and the “about 1% of price” rule may be cited without that name. This docs pull request does not edit `AGENTS.md`, `REVIEW.md`, `apps/web/package.json`, or the workflows. By the end of the page release, `AGENTS.md` describes the closing-cost form in this spec, says the clean reference excluding the quarter point is $16,572.41, says there is no percentage origination fee, says the point version is 0.16, and does not name the institution. Things agents get wrong gains: do not add a percentage origination fee; do not put the quarter point inside closing costs; do not copy a stored interest-day count into the closing day; do not use 31 days for every closing month; do not treat the start month as payment 1 when counting closing days; do not single-round the 365 charge; do not bump the scenario document to version 3. The existing warnings against rounding the 360 per diem first, and against dropping the basis dropdown, stay.

## 6. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | Unit (`pnpm --dir apps/web test`): the reference fixture in requirement 11. Closing costs are 1657241 cents. Points are 142500 and are not inside that sum. Closing costs and points are 1799741. Cash to close is 3799741. Due at closing is 1999741. Prepaid interest equals `prepaidInterestCents365(57000000, 7250, 25)` and is 283050. One end round of that same charge is 283048 and is not the line. Insurance impound is 49299, not 49300. The twelve-month insurance line is 197200, not 12 × 16433. Title `0.64925` of 60,000,000 cents is 389550. `0.65` of that price is 390000. |
| AC2 | Unit: fresh-visit cents in requirement 12, including 1810240 greater than 1657241, the 365 switch to 357027 and 1805277, and a 20% down mortgage-insurance impound of 0. October 2026 day 1 is 31 days. November 2026 day 6 is 25 days. November day 31 clamps to 30 and the count is 1. February 2026 and February 1900 clamp 31 to 28. February 2028 and February 2000 clamp 31 to 29. `paymentDate("2026-11", 1)` is December 2026. A proration of −10000 cents reduces closing costs by 10000. `formatMoney(-81392)` is `-$813.92`. |
| AC3 | Unit: a picture object with origination `1`, processing `1200`, title `0.5`, appraisal `500`, recording `800`, interestDays `15`, taxMonths `4`, cushion `1500`, on the $600,000 / 5% loan, loads lender fees `6900`, title `0.5`, closing day `1`, tax impound months `6`, proration `575`, points `0`. The loaded draft has no origination percent. A picture object that already has lender fees `2618` keeps `2618` and ignores origination `1`. A missing picture value loads lender fees `3000` and title `0.75`. A stored title `0.64925` loads. A stored basis other than `365` loads as `360`. An empty closing field is invalid and does not become zero. |
| AC4 | Unit: seller credit 1800001 cents on a $600,000 price with down payment under 10% warns. 1800000 cents does not. Down payment of exactly 10% with credit 10,000,000 cents does not. The warning text is requirement 9’s sentence. |
| AC5 | Playwright, clock 2026-10-15, fresh storage, Closing Costs opened: lender fees `3000` and `$3,000.00`, preset `50/50`, title `0.75` and `$4,500.00`, closing day `1`, month `October 2026`, text `31 days`, basis `360`, prepaid interest `$3,619.90`, homeowners insurance `$2,100.00` and `12 months`, impounds `$3,450.00`, `$525.00`, and `$332.50`, proration `575` and `$575.00`, closing costs `$18,102.40`, points `0` and `$0.00`, closing costs and points `$18,102.40`, cash to close `$48,102.40`, due at closing `$48,102.40`. There is no `#picture-origination`, `#picture-processing`, `#picture-appraisal`, `#picture-recording`, `#picture-interest-days`, or `#picture-cushion`. Basis `365` changes interest to `$3,570.27`, closing costs to `$18,052.77`, and cash to close to `$48,052.77`. Basis `360` restores them. |
| AC6 | Playwright, that visit: Buyer pays all writes title `1` and `$6,000.00`. The seller preset writes `0.40` and `$2,400.00`. `50/50` writes `0.75` and `$4,500.00`. Typing `0.64925` clears the preset selection and shows `$3,895.50`. Setting the start month to November 2026 shows `November 2026`. Closing day `6` shows `25 days`. Closing day `31` becomes `30` and shows `1 day`. Down payment `20` shows a mortgage-insurance impound of `$0.00` and leaves the month field at `2`. |
| AC7 | Playwright: seller credit `18000.01` at 5% down shows requirement 9’s note and keeps the value. `18000` hides the note. Down payment `10` with seller credit `100000` hides the note. A picture-less version-1 loan (price `570000`, down `0`, rate `7`, years `30`, start `2026-10`) shows lender fees `3000` and title `0.75`, and does not show an origination field. A version-2 document whose picture has origination `1`, processing `1200`, and title `0.5`, on the $600,000 / 5% loan, imports to lender fees `6900` and title `0.5`, with closing day `1`. |
| AC8 | `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. The diff contains no `amortize.js`, no CLI, and no skill. `apps/web/package.json` is `0.16.0` and `PAGES_POINT_VERSION` is `0.16`. The page, the tests, and `AGENTS.md` do not name the institution. This docs pull request is not AC8. AC8 is the page pull request. |

The page pull request’s CI runs `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e`. AC1 through AC4 run only in `pnpm --dir apps/web test`. `node --test` does not collect them. Pull-request CI does not fetch the Pages URL.

## 7. Design decisions

**D1 — The clean figure is $16,572.41, and the quarter point is not in it.** Checked 2026-10-21 by adding the net-sheet groups: lender fees $2,618.00, title $3,895.50, prepaids $10,058.91. The $1,425 origination line on that sheet is the quarter point. Closing costs and points are $17,997.41, which is the separate total in the prompt. The page’s closing-cost line on the fixture is $16,572.41, not a number that already contains $1,425.

**D2 — There is no percentage origination fee.** The reference Loan Estimate books the quarter point as origination. The page files 0.25% on the points row. The origination percent control is removed. A stored percent is converted to lender-fee dollars once and is not shown again. A new visit does not synthesize a 1% origination fee.

**D3 — $3,000 stays.** The addendum says the quoted lender-side range is $2,500–$3,000 including appraisal, and the reference $2,618 sits inside it, appraisal included. The default is the top of that range. It is not retuned to $2,618, and the fresh visit is not retuned toward $16,572.41 or $17,997.

**D4 — The presets are 0.75, 1.00, and 0.40.** Buyer-pays-all at 1.00% matches the quoted escrow side of about 1% of price. The default 50/50 preset at 0.75% is a lean-high step down from that 1% rule of thumb. It is not fitted to the reference share. Checked 2026-10-21: 0.64925% of $600,000 is $3,895.50, and 0.65% of $600,000 is $3,900.00. The addendum’s “0.65%” names that share in hundredths. The fixture keeps 0.64925%.

**D5 — Prepaid interest keeps the current functions. The fixture interest is $2,830.50.** Checked 2026-10-21. `prepaidInterestCents365(57000000, 7250, 25)` rounds the per diem to 11322 cents and multiplies by 25, which is 283050 cents, $2,830.50, the same as $113.22 × 25. One end round of base × rate × 25 ÷ 365 is 283048 cents, $2,830.48. The prompt calls $2,830.48 the page’s rule and says that rule makes the clean line $16,572.40. That label does not match the function. The same prompt says to keep the current rounding and not to single-round the 365 charge. The fixture uses the function. The two-cent gap is the unused end-round, and the spec records it here. Applying that end-round would also move the existing 20% down, 15-day, 7.375% charge from 145485 cents ($1,454.85) to 145479 cents ($1,454.79). The page phase does not do that. Basis 360 stays one end round of the whole charge. On this loan for 25 days that is 286979 cents, which is not the fixture, because the fixture’s basis is 365.

**D6 — The insurance impound is adjusted by one cent, to $492.99.** The prompt’s line is one half-up of 3 × $1,972 / 12, which is $493.00, and it says the spec may adjust a line by a cent if the existing insurance rounding is already defined. The existing prepaid pattern rounds the monthly amount and multiplies by the month count. One half-up of $1,972 / 12 is $164.33, and three times that is $492.99, which is also the net-sheet impound. This spec uses $492.99 and says so. The twelve-month line stays $1,972.00, the given annual rounded once, not 12 × $164.33 ($1,971.96). With D5, the clean line is $16,572.41 rather than the prompt’s $16,572.40 or the $16,572.42 that $493.00 would produce beside $2,830.50. The page’s insurance impound uses the displayed monthly insurance cents times the count, so it stays tied to the Taxes and Insurance row. The reference fixture, which supplies the annual in cents, uses the same monthly-then-multiply step.

**D7 — The closing month is the start month.** Checked 2026-10-21 by reading `paymentDate`. The start month plus the payment number is payment 1’s month, so payment 1 is the next month. The prompt steps back a month only if the start month is already payment 1. The form shows the start month’s long date beside the closing day.

**D8 — Title needs five decimal places.** Checked 2026-10-21. 0.64925% of $600,000 is $3,895.50 exactly, and the current three-decimal percent grammar cannot store 649.25 thousandths. The other picture percents stay at three decimals. Points stay at three. 0.25% of $570,000 is $1,425.00 exactly.

**D9 — The reference insurance annual is cents, not a typed percent.** Checked 2026-10-21. No five-decimal percent of $600,000 is $1,972. The unit fixture passes 197200 cents. The form does not grow extra decimal places on the insurance rate to chase that dollar.

**D10 — Appraisal and recording are not separate lines and are not migrated.** The current defaults are $500 and $800, and both enter today’s closing sum. The new sum has neither. The storage map names the origination percent, the processing fee, and the title percent. A stored appraisal is not added to the lender fee. The reference appraisal is already inside the typed $2,618.

**D11 — Migration is a one-time dollar conversion.** The origination percent is applied to the loan that is loading, added to the processing fee, and stored afterwards as dollars. A later price edit does not recompute it. If `lenderFees` is already valid, it wins. A missing picture is a new visit at $3,000, not a synthetic 1% fee.

**D12 — Old day and month counts are not the new fields.** A stored interest-day count of 15 is a count of days, not a closing day. Copying it would mean the 15th of the month. The loaded closing day is 1. A stored four-month tax prepay is not the six-month impound. A stored cushion is not the proration.

**D13 — The scenario document stays version 2.** Checked 2026-10-21. `serializeStoredSet` writes `version: 2` and the picture as a nested object. New keys fit. The legacy key stays version 1 and still holds only the active scenario. The two-key restore is unchanged.

**D14 — Proration is a dollar the owner owns, and it may be negative.** The default, used when the key is absent, is one month of the scenario’s property tax, which leans high versus the reference $813.92. After the owner edits it, or after it has been saved, a tax-rate edit does not rewrite it. A negative amount reduces closing costs. The comparison for the seller-credit warning uses exact integer cents and does not round 3% of price to a cent first.

**D15 — The warning is one sentence, and it does not block.** Only down payments under 10% and credits over 3% of price. The check uses price because the appraisal field is gone. No other rung of the contribution matrix is encoded.

**D16 — Fresh-visit points are zero.** The clean fresh total therefore equals closing costs and points. The quarter point appears only when the owner types one, as the fixture does.

**D17 — The fresh visit lands above the reference.** Checked 2026-10-21. October 2026, day 1, 31 days, basis 360, the new defaults: closing costs 1810240 cents, $18,102.40, against the reference 1657241 cents. The buffer is the $3,000 fee, the 0.75% preset, closing day 1, the 360-day basis, and one month of proration. None of those move to chase $16,572.41.

**D18 — Dependencies.** No npm dependency on the calculator or on `node --test`. The new arithmetic stays in `apps/web` and uses the half-up helper `picture.ts` already has. `amortize.js` does not change.

**D19 — This docs pull request does not ship the page.** It adds this folder only. `package.json` stays `0.15.0` and `PAGES_POINT_VERSION` stays `0.15`. The page release sets both to 0.16. It does not start a Pages build. `AGENTS.md` is updated then, without the institution’s name and without a percentage origination fee.

**D20 — What this supersedes.** Only these points, and only for the page.

- `intent/complete-loan-picture/` requirement 10, the closing rows and the cash-to-close definition. The monthly lines in that spec’s requirement 9 are already narrowed by `intent/ui-facelift/`. This spec does not bring them back.
- `intent/ui-facelift/` requirement 14, the closing rows, the origination percent, the processing fee, the appraisal, the recording charge, the prepaid month counts, and the flat cushion. Requirement 15’s raw day-count input is replaced by the closing day. Requirement 15’s basis dropdown, the 360 end-round, and the 365 per-diem-first multiply stay. D12 of that spec, the sentence that describes the 365 path, stays. The 20% down closing total of $19,175.00 and cash to close of $139,175.00 in that spec’s AC10 are retired.
- `intent/ui-facelift/` D13, the prepaid counts and the cushion default, for this form.
- The page-phase `AGENTS.md` sentence that still describes `#picture-interest-days` as the prepaid-interest input. That edit is part of the page release, not this docs pull request.

## 8. Open questions

None. The prompt’s expected table lists prepaid interest $2,830.48 and closing costs $16,572.40. D5 and D6 record why the fixture is $2,830.50 and $16,572.41 instead, and the two-cent end-round is recorded there rather than used.
