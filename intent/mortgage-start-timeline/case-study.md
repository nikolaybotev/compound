# case-study.md — Alex, a fictional first-time buyer

This file is the worked example for [intent.md](intent.md), [spec.md](spec.md), and [plan.md](plan.md). Alex, the city, the lender, and every date and dollar figure here are invented. They are illustrative example data for this one case. They are not product defaults, not a fresh-visit loan, and not fixtures the page should load.

Nothing here is tax or legal advice. Legal and tax rules cited in the spec were checked only to the extent the spec says. Items the research left unverified stay unverified.

The arithmetic below was re-run on 2026-10-22 with `buildReport` and the page’s prepaid-interest functions (`prepaidInterestCents360`, `prepaidInterestCents365`). Where an earlier draft of the research disagrees by a cent or two, this file uses the walk.

## Profile (invented)

Alex is a single first-time buyer moving out of a rental. The lease is month to month. The last rent in the story was paid November 1, 2026. The page does not assume a last rent date.

| Fact | Illustrative value |
|---|---|
| Purchase price | $525,000 |
| Down payment | 5% ($26,250) |
| Loan amount | $498,750 |
| Term | 30 years (360 payments) |
| Fixed option | 7.000%. Principal and interest $3,318.20 |
| ARM option | 7/6, initial rate 6.250%, principal and interest $3,070.89. Margin 2.75%, caps 5/1/5, floor equal to the margin. An illustrative index of 4.625% at the first change |
| Funding | Monday, November 16, 2026 |
| Recording | Wednesday, November 18, 2026 |
| First payment due | Friday, January 1, 2027 |

The lender in the story is a fictional portfolio lender. The page and the tests do not name a lender.

A 5% late charge on the fixed principal and interest is $165.91. That is 5% of $3,318.20. It is not a stored default. The spec’s grace fields use the usual agency-note blanks (15 days, 5% of principal and interest) as editable information, and a fresh visit still shows the Conventional loan.

Illustrative mortgage insurance of about 0.25% a year is about $103.91 a month. The page keeps the Arch PMI ladder. It does not adopt 0.25%.

## What the schedule shows

The start month is the funding month, November 2026. Row 1 is December 2026, the month that row’s interest accrues. That payment is due January 1, 2027. The payoff line is the due date of the last payment, December 1, 2056, while the last schedule row stays November 2056.

Checked against `buildReport(498750, 7, 360, …)`:

| Row (accrual month) | Interest | Principal | Balance after | Due date (not a column) |
|---|---:|---:|---:|---|
| Dec 2026 | $2,909.38 | $408.82 | $498,341.18 | January 1, 2027 |
| Jan 2027 | $2,906.99 | $411.21 | $497,929.97 | February 1, 2027 |
| Nov 2056 | last row | | $0 | December 1, 2056 |

`payoff_month` is 360. `paymentDate("2026-11", 360)` is November 2056. The due date is `paymentDate("2026-11", 361)`, December 2056, shown as December 1, 2056.

Prepaid interest for November 16–30 (15 days), same loan and rate:

| Basis | Result | Rule |
|---|---:|---|
| 360 | $1,454.69 | One half-up round at the end (`prepaidInterestCents360` → 145469 cents) |
| 365 | $1,434.75 | Per diem rounded first to $95.65, then × 15 (`prepaidInterestCents365` → 143475 cents) |

## ARM option, two different paths

Both paths use a fixed period of 84 payments and a 6-month interval, so payment 85 accrues in December 2033 and the new payment is first due January 1, 2034. The balance after payment 84 is $449,042.53 on either path before the index is considered.

The page’s no-index walk is the worst case under the caps. On these illustrative terms that rate is 11.25% and the payment at month 85 is $4,556.62. That is what the page shows when no index is entered. It is not the 7.375% story below.

The 7.375% story is an index path: index 4.625% plus margin 2.75%, inside the 5-point initial cap. Checked with an index of 4625 thousandths at month 85 only: rate 7.375%, payment $3,383.38, of which interest is $2,759.74 and principal is $623.64.

Dates below use that same first change (December 1, 2033) and a 45-day lookback, which is the usual agency-note blank and not a term the page invents for every note. Calendar days were subtracted in UTC on 2026-10-22.

| When | What |
|---|---|
| May 6–June 5, 2033 | Initial adjustment notice window: 240 to 210 days before January 1, 2034 |
| October 17, 2033 | Index read, 45 days before December 1, 2033 |
| September 3–November 2, 2033 | Later-notice window: 120 to 60 days before January 1, 2034 |
| October 17–November 2, 2033 | The research’s inference that an actual-rate notice cannot go out before the index is read. Labeled inference, not a separate rule |
| December 1, 2033 | Change date. December 2033 accrues at the new rate. Payment 84, due this day, is still the old amount (it covers November) |
| January 1, 2034 | First payment at the new amount |

After that, a 6-month interval changes the rate on June 1 and December 1, and the new payment is first due on July 1 and January 1. The page derives the months from the loan’s interval. It does not hard-code June and December.

## Interest paid in a calendar year

Accrued interest is the sum of the schedule rows whose accrual month falls in the year. Interest paid is prepaid interest in the funding year, plus the rows whose payment is due in that year (the previous accrual row through the November row).

Checked on the fixed walk, funding November 16, 2026, 360-day prepaid interest:

| Year | Accrued (schedule year group) | Paid in that calendar year |
|---|---:|---:|
| 2026 | $2,909.38 | $1,454.69 (closing prepaid only) |
| 2027 | $34,722.44 | $34,752.00 |
| 2028 | $34,354.05 | $34,385.74 |

An earlier draft said accrued 2027 was $34,722.45, accrued 2028 was $34,354.07, and paid 2028 was $34,385.76. Those three figures are a cent or two off the walk. This file and the spec use the walk.

## PMI dates on this amortization

Original value in the story is the $525,000 price. 80% is $420,000. 78% is $409,500. On the fixed walk the first row at or under those balances is payment 130 (balance $419,554.28) and payment 142 (balance $408,762.87). With a November 2026 start those payments are due October 1, 2037 and October 1, 2038.

The page’s midpoint reading is the due date of payment 180, December 1, 2041. [spec.md](spec.md) leaves open whether a different reading of the statute is a month or two later. The 80% date can move earlier when extra principal is applied. The 78% date does not.

The story’s property-tax dollars, supplemental bill, and “likely itemizes in 2027” line are illustrations. The page does not reproduce a California installment calendar, and those dollars are not acceptance criteria.
