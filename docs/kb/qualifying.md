# Part C. Qualifying, QM, HPML, APOR, and APR

<a id="part-c"></a>

A question for the prepaid finance charge implied by a fixed loan's note rate and its APR is the origination-fees skill. This page does not restate that calculation. The composite ARM APR below is a different explanation.

<a id="dti"></a>

## C1. What is DTI?

**Debt-to-income ratio** = total monthly debt payments ÷ gross monthly income. For a purchase, the debts include the new housing payment (principal, interest, taxes, insurance, mortgage insurance, and HOA dues, called PITIA) plus car loans, student loans, minimum credit-card payments, and similar debts. Fannie Mae's maximums: 36% manually underwritten (up to 45% with compensating credit score and reserves), and 50% through its automated Desktop Underwriter (**Verified**, [Selling Guide B3-6-02](https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios)). A loan kept in portfolio follows that holder's own limits.

> **Illustration.** Gross income $12,000/month. New PITIA $3,300. Car and student loan $700. Housing ratio 27.5%. Total DTI = (3,300 + 700) / 12,000 = **33.3%**. Not a reader's income or loan.

Fannie Mae also requires re-underwriting if new debt or lower income discovered before closing pushes DTI past its tolerances (**Verified**, B3-6-02). That is one reason not to open new credit before closing.

<a id="qualifying-rate"></a>

## C2. What is the "qualifying rate" on an ARM?

The rate used to compute the payment **for approval purposes**. It can be higher than the start rate so that a borrower is not approved only at a teaser payment. Several different rules use the same phrase:

| Rule | What rate the payment is computed at | Source (**Verified**) |
|---|---|---|
| Ability-to-repay, general rule (all covered loans) | "The fully indexed rate or any introductory interest rate, whichever is greater", with fully amortizing payments | [12 CFR 1026.43(c)(5)(i)](https://www.ecfr.gov/current/title-12/chapter-X/subchapter-B/part-1026/subpart-E/section-1026.43#p-1026.43(c)(5)(i)) |
| General qualified mortgage | "The maximum interest rate that may apply during the first five years after the date on which the first regular periodic payment will be due" | [12 CFR 1026.43(e)(2)(iv)](https://www.ecfr.gov/current/title-12/chapter-X/subchapter-B/part-1026/subpart-E/section-1026.43#p-1026.43(e)(2)(iv)) |
| Fannie Mae, ARM with an initial period of 3 years or less | Maximum rate possible in the first five years | [B3-6-04](https://selling-guide.fanniemae.com/sel/b3-6-04/qualifying-payment-requirements) |
| Fannie Mae, 5-year initial period | Greater of note rate + first-change cap (the max in first five years) or the fully indexed rate (the DU table shows the generic 5-year plan as "greater of fully indexed rate or note rate plus 2%") | B3-6-04 |
| Fannie Mae, initial period longer than 5 years (7/6, 10/6) | "No less than note rate". If the loan is a higher-priced mortgage loan or higher-priced covered transaction: greater of note rate or fully indexed rate (manual underwriting if the fully indexed rate is higher) | B3-6-04 |
| A portfolio ARM | Whatever the guidelines say, but never less than the ability-to-repay rule | **Inference**. Ask. |

**Why "note rate + 2%" comes up:** that is the familiar shortcut for 5-year ARMs, whose initial period ends inside the five-year window the rules look at. **Why 7- and 10-year ARMs often qualify at the note rate:** no rate change can happen in the first five years, so the qualified-mortgage "maximum rate in the first five years" is the start rate itself.

> **Illustration.** A 7/1: start 6.25%, index + margin today = 4.00% + 2.75% = 6.75%.
>
> - The ability-to-repay general rule uses the greater of 6.25% and 6.75%, so **6.75%**.
> - The qualified-mortgage rule uses the maximum rate in the first five years, so **6.25%** (no change is possible before year 8).
> - A Fannie-style 5-year ARM with the same numbers would use the greater of (6.25% + 2) and 6.75%, so **8.25%**.
>
> A creditor making a qualified mortgage must meet both the qualified-mortgage payment rule and the general ability-to-repay consideration. **Inference:** in practice, ask which rate was actually used, and what DTI resulted. This illustration is not a reader's loan.

<a id="qm"></a>

## C3. What is a "qualified mortgage" (QM)?

A qualified mortgage is a loan that meets product-feature and pricing limits set by Regulation Z. In exchange, the creditor gets legal protection on the ability-to-repay requirement. For a **general qualified mortgage** (**Verified**, [12 CFR 1026.43(e)(2)](https://www.ecfr.gov/current/title-12/chapter-X/subchapter-B/part-1026/subpart-E/section-1026.43#p-1026.43(e)(2))):

- **Product features:** regular, substantially equal payments (rate changes on an ARM are allowed). No negative amortization, no interest-only, no balloon, and a term of no more than 30 years.
- **Underwriting:** at the maximum rate in the first five years ([C2](#qualifying-rate)). Income, assets, debts, and DTI or residual income are considered and verified.
- **Points-and-fees test:** total points and fees cannot exceed limits indexed each year. **For 2026:** 3% of the loan amount for loans of $137,958 or more; $4,139 for $82,775–$137,958; 5% for $27,592–$82,775; $1,380 for $17,245–$27,592; 8% below $17,245 (**Verified**, official commentary 43(e)(3)(ii)-1.xii). "Points and fees" ([12 CFR 1026.32(b)(1)](https://www.ecfr.gov/current/title-12/chapter-X/subchapter-B/part-1026/subpart-E/section-1026.32)) generally includes origination charges and discount points, plus certain loan-originator compensation and affiliate charges. It generally excludes interest, bona fide third-party charges not retained by the creditor, and up to **two bona fide discount points** if the undiscounted rate is within 1 point of APOR (or one point if it is within 2 points).
- **Price-based test:** the APR cannot exceed APOR for a comparable transaction ([C4](#hpml)) by the threshold. **For 2026, first liens of $137,958 or more: 2.25 percentage points or more fails** (3.5 for $82,775–$137,958; 6.5 below that and for most manufactured-home loans under $137,958) (**Verified**, commentary 43(e)(2)(vi)-1.v). **ARM twist:** for this test, if the rate can change in the first five years, the APR is computed "by treating the maximum interest rate that may apply during that five-year period as the interest rate for the full term" (**Verified**, 12 CFR 1026.43(e)(2)(vi)).

**Safe harbor vs rebuttable presumption.** A qualified mortgage that is not a higher-priced covered transaction gets a conclusive safe harbor. A qualified mortgage that is higher-priced (APR at least APOR + 1.5 for a first lien) only gets a rebuttable presumption of compliance (**Verified**, [12 CFR 1026.43(e)(1)](https://www.ecfr.gov/current/title-12/chapter-X/subchapter-B/part-1026/subpart-E/section-1026.43#p-1026.43(e)(1)) and (b)(4)).

**Other qualified-mortgage types** exist: small-creditor qualified mortgages held in portfolio ((e)(5), (f)) and **seasoned qualified mortgages** ((e)(7), see [E5](prepaying.md#seasoning)). Regulation Z lists them. This page does not go into them.

<a id="hpml"></a>

## C4. What is a "higher-priced mortgage loan" (HPML), and what is APOR?

**APOR (average prime offer rate)** is "an annual percentage rate that is derived from average interest rates, points, and other loan pricing terms currently offered to consumers… for mortgage transactions that have low-risk pricing characteristics" (**Verified**, [12 CFR 1026.35(a)(2)](https://www.ecfr.gov/current/title-12/chapter-X/subchapter-B/part-1026/subpart-E/section-1026.35)). In other words, it is a weekly benchmark APR for a top-credit borrower.

**HPML:** a first-lien loan on a principal dwelling whose APR exceeds APOR for a comparable transaction, as of the date the rate is set (locked), by **1.5 or more points** (conforming-size), **2.5 or more** (above the Freddie Mac loan limit, "jumbo"), or **3.5 or more** (subordinate liens) (**Verified**, 12 CFR 1026.35(a)(1)). If the rate is re-locked, the **last** rate-set date before closing counts (**Verified**, comment 35(a)(1)-2).

**How the APOR tables work** (**Verified**, [FFIEC/CFPB APOR methodology](https://ffiec.cfpb.gov/tools/rate-spread/methodology)):

- They come from weekly survey data for eight products: 30-, 20-, 15-, and 10-year fixed, and 10/6, 7/6, 5/6, and 3/6 ARMs (SOFR-indexed, 6-month adjustments). The data covers best-quality, 80% LTV or lower, first liens. The CFPB interpolates other buckets (1/6, 2/6, and 1-, 2-, 3-, 5-, and 7-year fixed).
- **Fixed-rate loans are matched by term.** **ARMs are matched by the initial period, not the 30-year term.** A 7/1 compares against the 7-year variable-rate APOR. Uneven periods round to the nearest whole year (the shorter one if exactly halfway).
- The ARM APORs themselves are composite APRs that assume a 2-point annual adjustment cap.
- New values are posted Friday from Thursday's survey, and they are effective the following Monday. The [rate spread calculator](https://ffiec.cfpb.gov/tools/rate-spread) does the lookup.

**What HPML status changes (first liens):** a required escrow account for taxes and insurance, which cannot be cancelled at the borrower's request until at least **five years** after closing and then only below 80% LTV (**Verified**, 12 CFR 1026.35(b)(3)). Special appraisal rules (12 CFR 1026.35(c)). And for prepayment penalties, see [E1](prepaying.md#prepayment).

> **Illustration.** Rate locked when the 7-year variable-rate APOR is 6.05%. The loan's APR is 6.49%. The spread of 0.44 points is under 1.5, so the loan is not an HPML. If the APR were 7.60%, the 1.55 spread would make it an HPML. Not a reader's loan.

<a id="apr"></a>

## C5. APR vs note rate. Why can an ARM's APR sit above its start rate?

- The **note rate** sets the payment. The **APR** is the yearly cost of credit, including prepaid finance charges (points, origination, and similar fees) spread over the term. It is an actuarial yield on the payment schedule.
- For an ARM whose start rate is not set by the index formula (discounted or premium), the APR must be a **composite**. It uses "the initial rate for as long as it is charged and, for the remainder of the term, the rate that would have been applied using the index or formula at the time of consummation". It does not assume future index moves, and any index value from the note's lookback window before closing may be used (**Verified**, official commentary 17(c)(1)-8 and -10).
- So if index + margin at closing is **above** the start rate, the APR is above the start rate **even with zero fees**. If it is **below**, the APR can be below the start rate.

> **Illustration** (approximate actuarial APRs, no odd-days interest). $400,000, 30 years, start 6.25% for 84 payments. Not a reader's loan and not the page's $600,000 scenario.
>
> | Case | Fees | Rate after year 7 used in the APR | APR |
> |---|---|---|---|
> | Fixed 30-year at 6.25% | $4,000 | — | ≈ 6.35% |
> | 7/1, index + margin at closing = 6.75% | $0 | 6.75% | ≈ 6.49% |
> | 7/1, index + margin at closing = 6.75% | $4,000 | 6.75% | ≈ 6.59% |
> | 7/1, index + margin at closing = 5.75% | $0 | 5.75% | ≈ 6.01% |
>
> Comparing an ARM's APR with a fixed-rate loan's APR therefore mixes in an assumption about the index. Compare the start rate, the fully indexed rate, the caps, and the fees separately.
