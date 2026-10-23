# Part A. How an ARM's rate works

<a id="part-a"></a>

The concepts skill states the adjustment in names and formulas: change dates, the index as of the lookback, the margin, the fully indexed rate, the caps, the floors, the ceiling, and the payment on the unpaid balance over the payments left. Its Types section is the labeled illustration of the page's $600,000 / 5% down / $570,000 scenario. This page does not repeat that procedure or those figures.

<a id="note-rate"></a>

## A1. What is the "note rate", and how is it different from the index?

**Short answer.** The **note rate** is the interest rate actually written in the promissory note and charged on the balance right now. On a hybrid ARM, the note rate during the **initial period** is the **start rate**, also called the **initial interest rate**. The **index** is a published market benchmark that the note names, such as the 1-Year Constant Maturity Treasury (CMT) or the 30-day average SOFR. The index does not set the rate during the initial period. It only matters at each **change date** after that.

- **Margin:** a fixed number of percentage points written in the note and added to the index at every change date. It never changes for the life of the loan.
- **Fully indexed rate:** index + margin.

**Citation:** [12 CFR 1026.18(s)(7)(vi)](https://www.ecfr.gov/current/title-12/chapter-X/subchapter-B/part-1026/subpart-C/section-1026.18#p-1026.18(s)(7)(vi))

> the interest rate calculated using the index value and margin at the time of consummation

That definition is **Verified**.

On a change date, the new note rate equals the index (read as of the **lookback** date) plus the margin, usually rounded to the nearest 1/8 point, and then held inside the caps and floor (see [A3](#caps)).

**The 1-Year CMT, in plain words.** Uniform ARM notes that use it define the index as "the weekly average yield on United States Treasury securities adjusted to a constant maturity of one year, as made available by the Federal Reserve Board". The "Current Index" is the most recent figure available 45 days before each change date (**Verified** against the Fannie Mae/Freddie Mac uniform 1-Year Treasury ARM note text, for example Form 3512). The Federal Reserve publishes it in its H.15 release. Fannie Mae's own current ARM plans must use the 30-day average SOFR instead (**Verified:** [Selling Guide B2-1.4-02](https://selling-guide.fanniemae.com/sel/b2-1.4-02/adjustable-rate-mortgages-arms)). **Inference:** a 1-Year CMT ARM that adjusts once a year is today usually a portfolio product rather than a loan sold to Fannie Mae.

> **Illustration.** A 7/1 starts at a 6.25% note rate. Its index is the 1-Year CMT and its margin is 2.75%. If the CMT is 4.00% on the lookback date before the first change date, the fully indexed rate is 6.75%, and that becomes the new note rate, because it is within the caps. The 6.25% start rate itself was never "index + margin". It was a price set at the start. This is not a reader's loan and not the page's $600,000 scenario.

<a id="initial-period"></a>

## A2. What are the "initial period" and the "adjustment period"?

The CHARM booklet explains the two numbers in an ARM's name (**Verified**, [CHARM booklet](https://files.consumerfinance.gov/f/documents/cfpb_charm_booklet.pdf), "Learn about how ARMs work"):

> The first number tells you the length of time your initial interest rate lasts. The second number tells you how often the rate changes after that… This period between rate changes is called the adjustment period.

- **7/1:** the initial period is 7 years, then the rate changes every 1 year. That later interval is the adjustment period.
- **7/6 (or 7/6m):** the initial period is 7 years, then the rate changes every 6 months. The concepts skill's Types section says the page's structure label writes a six-month interval without the m, so that hybrid is labeled 7/6.
- **Change date:** the date a new rate takes effect. On uniform notes the new rate starts accruing on the change date, and the new payment is first due on the next monthly payment date (**Verified:** uniform ARM note §4(E): "I will pay the amount of my new monthly payment beginning on the first monthly payment date after the Change Date"). The payment due on the change date itself is still the previous amount.
- **Lookback:** how far before the change date the index is read, often 45 days on uniform notes.

<a id="caps"></a>

## A3. What are caps, floors, and the ceiling?

- **Initial (first-change) cap:** the most the rate can move at the first change date. On longer hybrids it is often 2 or 5 points.
- **Periodic (subsequent) cap:** the most the rate can move at each later change date, measured from the rate then in effect.
- **Lifetime cap:** the most the rate can ever rise above the start rate. **Ceiling (maximum rate)** = start rate + lifetime cap.
- Caps are written initial/periodic/lifetime. For example, Fannie Mae's standard 7- and 10-year SOFR ARMs are listed as 5/1/5 (**Verified:** [B3-6-04](https://selling-guide.fanniemae.com/sel/b3-6-04/qualifying-payment-requirements) DU table). The CHARM sample loan uses 2% first and 2% later changes, with an 8% maximum.
- **Floor (minimum rate):** the lowest the rate can go. CHARM: "Generally, an ARM's interest rate is never lower than the margin." Fannie Mae requires that "Mortgage interest rates may never decrease to less than the ARM's margin, regardless of any downward interest rate cap" (**Verified**, B2-1.4-02).
- Fannie Mae says lifetime caps apply to increases only, and per-adjustment caps apply to increases and decreases (**Verified**, B2-1.4-02). Other notes can differ.

> **Illustration** (a 7/1, caps 5/2/5, floor = margin = 2.75%, start 6.25%): ceiling = 6.25% + 5 = 11.25%. The first change can land anywhere from 2.75% to 11.25%. Each later change can move at most 2 points from the rate then in effect, and never above 11.25% or below 2.75%. This is not a reader's loan and not the page's $600,000 scenario.

<a id="teaser"></a>

## A4. What is a "teaser", "start", or "discounted" rate?

CHARM (**Verified**, "Teaser rates"):

> Some lenders offer a 'teaser,' 'start,' or 'discounted' rate that is lower than their fully indexed rate. When the teaser rate ends, your loan takes on the fully indexed rate.

In its example, the index is 2% and the margin 2.5%, so the fully indexed rate is 4.5%. With a 3% teaser, "even if the index doesn't change, your interest rate still increases from 3% to 4.5%".

**How to spot one:** compare the start rate with today's index + margin. If the start rate is lower, the loan is discounted, and an increase is built in even if markets stay flat. If the start rate is higher, the loan is "premium" priced, and a drop is built in if markets stay flat. Regulation Z treats both cases the same way for the APR (see [C5](qualifying.md#apr)).

The jump in the payment when a discounted initial rate ends, or when the rate rises at a change date, is the payment increase [A7](#arm-example) walks. **Inference:** people sometimes call that jump payment shock. The CHARM booklet describes the increase. This page does not treat "payment shock" as a term the booklet has to use.

<a id="index-replacement"></a>

## A5. Can the index be replaced?

Not at will. The note names the index and the margin, and they are not swapped because a different benchmark would be preferable. What the note does contain is a **fallback (replacement-index) clause** for when the index stops being available.

- **Older uniform notes** say: "If the Index is no longer available, the Note Holder will choose a new index that is based upon comparable information. The Note Holder will give me notice of this choice" (**Verified:** uniform 1-Year and 3-Year Treasury ARM note and rider text).
- **Newer notes** (the language written after the LIBOR transition) define objective **Replacement Events**. These are the index administrator permanently stopping publication, or officially declaring the index no longer reliable or representative. The note holder then takes a replacement index recommended by the Federal Reserve Board or the New York Fed (or a committee they convened), or otherwise makes a "reasonable, good faith effort" to pick a replacement index and margin that "minimize any change in the cost of the loan" (**Verified:** [ARRC recommended ARM fallback language, Nov 2019](https://www.newyorkfed.org/medialibrary/Microsites/arrc/files/2019/ARM_Fallback_Language.pdf), §4(G)).
- Fannie Mae tells lenders to advise borrowers "that an alternative published index will be selected (consistent with the provisions of the mortgage note) should the original index… no longer be available or published" (**Verified**, B2-1.4-02).

**What to read in the note:** the exact index definition, the lookback, the rounding rule, and whether the fallback clause is the short "comparable information" version or the detailed replacement-event version. The detailed version also says whether the margin can be replaced along with the index.

<a id="notices"></a>

## A6. When will I hear about a rate change?

Regulation Z requires two kinds of notices for ARMs (**Verified**, [12 CFR 1026.20(c) and (d)](https://www.ecfr.gov/current/title-12/chapter-X/subchapter-B/part-1026/subpart-C/section-1026.20)). The same windows are the page timeline in [`intent/mortgage-start-timeline/spec.md`](../../intent/mortgage-start-timeline/spec.md). This article does not restate that page's five lines or its UTC day counts.

- **Initial interest rate adjustment notice** (§1026.20(d)), sent once before the first change: "at least 210, but no more than 240, days before the first payment at the adjusted level is due". Because the index is not known that far ahead, it can contain an estimate.
- **Rate and payment change notice** (§1026.20(c)(2)), sent for each change that changes the payment: "at least 60, but no more than 120, days before the first payment at the adjusted level is due". That 60-to-120-day window is the one for an **adjustment period** of 6 months or 12 months, including a 7/6, a 5/6, and a 7/1. The shorter 25-to-120-day window applies only to ARMs with uniformly scheduled adjustments every 60 days or more often, and to certain pre-2015 loans. A 1-month adjustment period is that every-60-days-or-more-often case.

Both are counted back from the **first payment at the new amount**, not from the change date. The payment due on the change date is still the previous amount. The new payment is first due on the first monthly payment date after the change date.

<a id="arm-example"></a>

## A7. Worked illustration: one adjustment, start to finish

> **Illustration only.** $400,000 loan, 30 years, a 7/1, start rate 6.25%, 1-Year CMT + 2.75% margin, caps 5/2/5, floor 2.75%. Not a reader's loan, and not the page's $600,000 scenario.
>
> - Principal and interest during the initial period (payments 1–84): **$2,462.87**.
> - Balance after payment 84 (scheduled, no extra payments): **≈ $360,134**.
> - First change date: the rate for payment 85 is set from the index on the lookback date. 276 payments remain.
>
> | Index on lookback date | Index + margin | New rate after caps | New P&I (276 payments left) |
> |---|---|---|---|
> | 3.50% | 6.25% | 6.25% | $2,462.87 (unchanged) |
> | 4.00% | 6.75% | 6.75% | ≈ $2,572.85 |
> | 5.50% | 8.25% | 8.25% | ≈ $2,916.01 |
> | 9.00% | 11.75% | **11.25%** (ceiling) | ≈ $3,654.43 (worst case) |
>
> The new payment is recalculated on the **actual** balance over the remaining term. That is why extra principal paid earlier lowers it (see [E2](prepaying.md#extra-principal)).
