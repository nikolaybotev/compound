# intent.md — Clean closing costs

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-21 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Evidence | [case-studies.md](case-studies.md) — Chase and reference quotes that support the shipped 0.16 defaults (not a change request). |
| Builds on | [intent/complete-loan-picture/](../complete-loan-picture/intent.md), [intent/ui-facelift/](../ui-facelift/intent.md), [intent/loan-scenarios/](../loan-scenarios/intent.md) |

## Problem

The closing-cost block is a percent origination fee, a flat processing fee, an appraisal, a title percent, a flat recording charge, prepaid month counts, a raw interest-day count, and a flat escrow cushion. A quarter point on the reference purchase was booked as origination. The block cannot show a clean closing cost with that quarter point left out, and it cannot show points, seller credit, lender credit, or earnest money on their own.

## Proposed outcome

Closing Costs becomes the estimate in the prompt. Lender fees are one dollar amount, default $3,000, the top of the quoted $2,500–$3,000 range including appraisal. Title, escrow, and recording is one percent of price: buyer-pays-all fills 1.00%, the quoted escrow-side rule of thumb, and the default 50/50 preset stays 0.75%. Points, including the reference quarter point, sit outside the clean total. On the reference purchase that clean total is $16,572.41. There is no percentage origination fee.

## Affected users and systems

- **Users:** The owner, reading and editing closing costs on a saved or fresh loan.
- **Systems:** The page’s picture form, its closing-cost lines, and the picture object inside the existing scenario document. `amortize.js`, the calculator CLI, and the skills stay as they are.

## Constraints and principles

- The prompt under Original prompt is the source of truth. Where the page disagrees, the prompt wins, and the spec records what the page does today.
- The $3,000 lender-fee default stays. It is the top of the quoted $2,500–$3,000 range, including appraisal. It is not retuned to the reference $2,618.
- Buyer-pays-all fills 1.00% of price. That is the quoted “escrow side about 1% of price.” The 50/50 preset stays 0.75%. It is a lean-high step down from that 1% rule of thumb, not a fit to the reference share.
- The reference quarter point is points. It is not part of the clean baseline. The clean reference figure on the net sheet is $16,572.41. There is no percentage origination fee.
- Points are outside the closing-cost subtotal. The page shows that subtotal, the points line, and the closing-costs-and-points total.
- Property-tax and mortgage-insurance defaults stay. This change does not touch the PMI ladder or the 1.15% tax default or the 0.35% insurance default.
- Prepaid interest keeps the current 360 and 365 rounding and the basis dropdown. The spec checks the prompt’s reference cents against those functions.
- There is no county table, no automatic tax-proration calendar, and no screen that pastes a net sheet or a Loan Estimate.
- Saved scenarios still load. The scenario document stays version 2 unless that document cannot hold the fields.
- A failed or partial save still restores the last complete pair.
- The page, the tests, `AGENTS.md`, and these three files do not name the institution, a title company, or a street address. The quoted ranges above may be cited without that name.
- This pull request is the docs only. It does not bump the point version. The pull request that ships the page sets 0.16.

## Open questions (carried into spec.md)

None. The spec records the checked prepaid-interest cents and the one-cent insurance-impound adjustment that keep the clean line at $16,572.41.

## Original prompt (verbatim)

# Clean closing costs

Design for the page’s closing-cost estimate. The reference purchase is the attached net sheet and Loan Estimate. Do not put a credit union name, a title company name, or the street address in the page, in tests, or in `AGENTS.md`. The intent may cite the quoted ranges below without the institution’s name.

## Addendum

A lender’s own preapproval quotes, repeated in 7/2025, 4/2026, and 10/2026, put that lender’s side of estimated closing fees at $2,500–$3,000 including appraisal, plus prepaid and prorated items, and the escrow side at about 1% of the purchase price. The reference lender fees were $2,618, inside that range, even with a rushed appraisal of $995 rather than about $550 plus a rush fee of about $150. The $3,000 default stays: it is the top of a real quoted range.

The same quote is the sanity check for the title presets. Buyer-pays-all at 1.00% of price matches “escrow side about 1% of price.” The reference case was 0.65% only because of the 50/50 splits. The 50/50 preset stays 0.75%, a lean-high step down from the 1% rule of thumb, not a fit to 0.65%.

The reference $1,425 was a quarter point. The rate sat on either side of par, so the choice was a 0.25-point credit or a 0.25-point charge. The charge was booked on the Loan Estimate as origination. Treat it as points. Do not model a percentage origination fee at all. The clean reference figure, with the quarter point excluded, is $16,572.41: lender fees $2,618.00 + title, escrow, and recording $3,895.50 + prepaids $10,058.91. The page’s single end-round on 365-day interest makes that line $16,572.40.

Reference PDFs for the spec writer only:

- `/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/internal/closing-costs/buyer-net-sheet.pdf`
- `/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/internal/closing-costs/loan-estimate.pdf`
- `/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/internal/closing-costs/compound-current.pdf`

## What changed from the proposal

The proposal is right about the split. These are the decisions that differ.

**Points are an add-on. The clean reference figure is $16,572.41.** That is lender fees $2,618.00 + title, escrow, and recording $3,895.50 + prepaids and impounds $10,058.91. The $1,425 quarter point is not part of it, even though the Loan Estimate booked the charge as origination. There is no percentage origination fee. Show closing costs, points, and closing costs and points as separate lines. The clean-cost fixture targets $16,572.41 on the net sheet and $16,572.40 after the page’s interest rounding.

**The fixture needs the reference tax, insurance, and mortgage-insurance amounts, not the page’s 1.15% / 0.35% / 0.35% inputs.** Those defaults cannot reproduce the prepaid dollars. The reproduction inputs are below. The 50/50 preset is a fresh-loan default of 0.75% of price. It is not the percentage that equals $3,895.50. The fixture sets the title percent to the reference share, 0.64925% of price ($3,895.50).

**No county table and no automatic tax proration.** Three presets fill an editable percent of price. Proration is a dollar input because it can run either direction. The default is one month of property tax, which leans high versus the reference $813.92.

**No paste-a-net-sheet view in this change.** The reference numbers are a unit fixture. A reconciliation screen can wait.

**Property-tax and PMI defaults stay.** Raising the tax default from 1.15% to 1.25%, or lowering the 780+ PMI rate, changes the fresh-visit monthly payment. Both are real follow-ups. This change does not touch the PMI ladder. The reference case typed 0.35% PMI; that is an input, not proof of the ladder.

**Prepaid interest keeps the current rounding and the 360/365 control.** Default basis stays 360, which is the higher per diem. Do not round the 360 per diem before multiplying. Do not single-round the 365 charge. The net sheet’s $113.22 × 25 = $2,830.50 rounds the 365 per diem first. One end round of the same charge is $2,830.48. The fixture expects the page’s rule, and the spec records the two-cent gap. Do not drop the basis dropdown.

**Closing day uses the real length of the closing month.** Day 1 is a full month. Do not use 31 for every month. If the page’s start month is the first payment month, the closing month is the previous month, and the form shows that month next to the day. Clamp an impossible day to the last day of that month.

## Form

Replace the origination percent, the flat processing fee, the title-and-escrow percent, the raw prepaid-interest day count, the prepaid-tax months, and the flat escrow cushion.

1. **Lender fees.** One dollar amount. Default $3,000, the top of the quoted $2,500–$3,000 range including appraisal. Not a percent of the loan. Points are not included. There is no percentage origination field.
2. **Title, escrow, and recording.** One percent of price. Presets fill it and stay editable after that: buyer pays all fills 1.00% (the quoted “escrow side about 1% of price”), 50/50 fills 0.75% (lean high versus the reference 0.65%, which was low only because of the split), seller pays the owner’s policy and escrow fills 0.40%. Default preset is 50/50. The percent is of price, not of the loan.
3. **Prepaids, from inputs the page already has, plus the new counts.**
   - Prepaid interest. Closing day of month, default 1. Days = days in the closing month − closing day + 1. Basis 360 or 365, default 360. Show the computed day count.
   - Homeowners insurance. Twelve months from the existing insurance rate. Round once, to the cent, at the end.
   - Impounds. Separate month counts for property tax, insurance, and mortgage insurance. Defaults 6, 3, and 2. Mortgage-insurance impound is zero when there is no MI. Do not add another cushion on top of these months.
   - Property-tax proration. Dollar input. Default one month of property tax at the scenario’s tax rate.
4. **Add-ons, outside the closing-cost subtotal.**
   - Points, a percent of the loan. Default 0.
   - Seller credit, dollars. Default 0. When the down payment is under 10% and the credit is over 3% of price, show a soft warning that the usual conventional cap is 3% of the lower of price or appraisal, and that this check uses price because there is no appraisal. Do not block the value. Do not encode the rest of the interested-party-contribution matrix.
   - Lender credit, dollars. Default 0.
   - Earnest money already paid, dollars. Default 0.
   - Down payment stays the existing price and down-payment fields. Do not add a second one.

## Totals

- Closing costs = lender fees + title, escrow, and recording + prepaid interest + 12 months of insurance + the three impounds + tax proration.
- Points on their own line.
- Closing costs and points = closing costs + points. This is the $17,997.41 line.
- Cash to close = down payment + closing costs and points − seller credit − lender credit.
- Due at closing = cash to close − earnest money.

Money is integer cents. Round each reported line once, half up.

## Reference fixture

Price $600,000, loan $570,000, note rate 7.25%, 30-year fixed. Tax monthly $625 (1.25% of price). Insurance annual $1,972. Mortgage insurance monthly $99.75. Lender fees $2,618. Title percent 0.64925. Basis 365. Closing day 6 in a 30-day month (25 days). Impound months 6, 3, and 2. Proration $813.92. Points 0.25% ($1,425). Seller credit $10,000. Earnest money $18,000. Down payment $30,000.

Expected, with the page’s single end-round on 365-day interest ($2,830.48, two cents under the net sheet’s $2,830.50):

- Lender fees $2,618.00
- Title, escrow, and recording $3,895.50
- Prepaid interest $2,830.48
- Insurance $1,972.00
- Insurance impound $493.00 (3 × $1,972 / 12, rounded once; the net sheet’s $492.99 is a one-cent difference)
- Mortgage-insurance impound $199.50
- Tax impound $3,750.00
- Proration $813.92
- Closing costs $16,572.40
- Points $1,425.00
- Closing costs and points $17,997.40
- Cash to close $37,997.40
- Due at closing $19,997.40

The spec may adjust a line by a cent if the existing insurance rounding is already defined. It must say so. It must not change `amortize.js`.

A fresh visit with the new defaults should land above this reference, not below it. The $3,000 lender fee, 0.75% title preset, closing day 1, 360-day basis, and one month of proration are the buffer. Do not retune them to hit $17,997.

## Storage

Saved scenarios must survive. Map an existing origination percent, processing fee, and title percent into the new lender-fee and title-percent fields so a saved loan does not jump to the new defaults on load. New visits use the new defaults. A failed or partial save still restores the last complete pair. Do not write a new scenario-document version unless the current version-2 document cannot hold the fields.

## Out of scope

The amortization walk, `amortize.js`, the calculator CLI, both fee and loan skills, the PMI ladder, the 1.15% tax default, the 0.35% insurance default, a county or state fee table, an automatic proration calendar, and a screen that pastes a Loan Estimate.

## Release

Docs pull request only. The page pull request that ships the form sets 0.16.
