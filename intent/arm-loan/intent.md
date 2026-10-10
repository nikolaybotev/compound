# intent.md — ARM loan

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-10 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/mortgage-skill/](../mortgage-skill/intent.md), [intent/amortization-app/](../amortization-app/intent.md), [intent/loan-recast/](../loan-recast/intent.md), [intent/extra-savings-column/](../extra-savings-column/intent.md), [intent/complete-loan-picture/](../complete-loan-picture/intent.md) |

## Problem

The calculator, the skill, and the page amortize one fixed note rate. The skill refuses an adjustable-rate loan outright. The owner is pricing a Example Credit Union 7/1 ARM against a 30-year fixed, has the lender's rate terms in hand (fixed period, adjustment frequency, index, margin, 5/2/5 caps, floors, lookback), and has no way to see the worst-case payment and interest that those terms allow, or to try an index path of their own, inside the tools this repo already has.

## Proposed outcome

The same calculator runs a fixed-then-adjusting ARM. With only the loan and the lender's terms, it amortizes the worst case the note permits: the rate rises at each adjustment by the cap that applies to that adjustment until it reaches the lifetime ceiling, and the payment is re-amortized at each adjustment over the months left to maturity. The month-by-month table shows the rate in effect and the payment each month, and a person can enter the index value at any adjustment month, beside the extra-payment column, to replace the worst-case assumption for that adjustment and model any other path. Extra principal works as it does today. The skill lifts its refusal for this kind of ARM and asks for the terms it needs. The page gains an ARM mode with the same terms and the same editable table. The fixed-rate loan stays the default everywhere.

## Affected users and systems

- **Users:** The owner, comparing the Example Credit Union 7/1 ARM with a fixed loan and modeling rate paths. Anyone running the script, the skill, or the page.
- **Systems:** `amortize.js` (the pure walk), `compound_interest_monthly.js` (the CLI), `.agents/skills/mortgage-loan-calculator/SKILL.md`, `apps/web`, `README.md`, `AGENTS.md`, `REVIEW.md`. `origination_fees.js` and the fee skill are untouched. The Pages deploy is untouched.

## Constraints and principles

- The default ARM scenario is the worst case: the rate rises by the applicable cap at each adjustment until the lifetime cap. The exact rule comes from the parameter sheet and Ed's email, not from a paraphrase.
- The month-by-month table can override that path at adjustment months, in the same place extra principal is entered. Extra payments stay as they are.
- Backend first. The pure walk lives in the library with no Node APIs; the CLI is the calculator; the skill and the page call that. The page does not get its own formula.
- The skill's "does not cover adjustable loans" is lifted only for fixed-then-adjusting ARMs of the kind in the sheets: an initial fixed period, a regular adjustment interval, index plus margin, initial/periodic/lifetime caps, and a floor. Interest-only, payment-option, and negative-amortization ARMs stay out. This change does not claim to cover every ARM product.
- The fixed-rate loan stays the default product. ARM is a mode with extra inputs. Worst case is the ARM default, not a change to the fixed-rate page.
- Pages publishing stays as it is: content on `gh-pages`, deployed by the Actions workflow on `main`. No deploy redesign.
- The queued UI follow-ups are a separate list and are not folded in.
- Facts are checked before they harden, including the Example Credit Union caps, index, margin, floors, and adjustment frequency. Spec wins over plan.
- A question is left open only if it is truly undecidable. Otherwise the conservative option is decided and recorded.
- Model choices named by the owner: Claude Fable for spec and plan work, Grok for spec and plan review, Claude Sonnet for the build.

## Sources

The public **Example Credit Union** 7/1 figures in this repo were read from a lender parameter sheet and a study printout; that example is invented for explanation and is not any real credit union's or lender's product.

- Parameter sheet: `example_lender_7-1_ARM_Variables_ce19.pdf`, one page, titled "7/1 ARM Variables". Its rows, verbatim: Initial Fixed Period 7 Years; Adjustment Frequency Annually; Benchmark Index 1-Year Constant Maturity Treasury (CMT); Margin 2.50%; Rate Cap Structure (Initial/Periodic/Lifetime) 5/2/5; Initial Floor Rate 2.50%; Lifetime Floor Rate 2.50%; Lookback Period 45 Days; Upfront Buy-Down Limit 5.50%.
- ARM terms study: `example_lender_ARM_Terms_ffdb.pdf`, a 31-page printout of a Gemini chat about ARM terms (created 2026-10-08, published 2026-10-09). Its footer URL is `https://gemini.google.com/share/204b7fb81ff2`. Ed's reply with the terms is on pages 23–24 and is the same list as the parameter sheet, plus: "Our base closing cost fees are the same regardless of loan type. The above parameters are the same for both the 7/1 ARM and 10/1 ARM. The primary difference is the initial fixed-rate period before the first adjustment, which is 7 years for the 7/1 ARM and 10 years for the 10/1 ARM."
- Gemini study link `https://share.gemini.google/gJVq4JiPAL9K`: fetched 2026-10-10. It answered HTTP 200 and redirected to `https://gemini.google.com/share/204b7fb81ff2`, the same share the printout carries, with the page title "Gemini - Understanding ARM Terms". The conversation body is rendered by script and is not in the fetched HTML, so the printout above is the transcript used here. No separate transcript file was attached; the "ARM terms" PDF is that transcript.
- Standard US ARM mechanics checked on 2026-10-10 against the Fannie Mae Multistate Adjustable Rate Note and Rider for the one-year Treasury index (Forms 3501 and 3108) and the Fixed/Adjustable Rate Note for 30-day Average SOFR (`singlefamily.fanniemae.com/media/38916`), and against the CFPB Consumer Handbook on Adjustable-Rate Mortgages. The specific clauses are recorded in [spec.md](spec.md) D3–D7.

## Open questions (carried into spec.md)

1. Is the editable cell at an adjustment month the index value or the resulting note rate? Answered in [spec.md](spec.md) D8.
2. Which cap governs the first adjustment in the worst case, the initial cap or the periodic cap? Answered in D4.
3. Does the calculator round the fully indexed rate to the nearest one-eighth point, as the uniform notes do, when the sheets do not say? Answered in D6.
4. Which parameter-sheet rows enter the arithmetic, and which are recorded terms with no arithmetic (index name, lookback, buy-down limit)? Answered in D9.
5. How does extra principal interact with a payment reset? Answered in D5.
6. Does a fixed-rate recast question still apply to an ARM? Answered in D13.

## Original prompt (verbatim)

> Next feature is a big one: ARM loan support.
>
> Use the attached parameter sheet as a starting point. These are most additional inputs required for properly fully modeling an ARM loan.
>
> By default the Calculator should do the worst case amortization scenario.
> Then we should be able to tweak the rate adjustments in the full month by month table right next to where we enter extra payments. This will allow modeling of all possible scenarios and proper risk modeling and evaluation.
>
> All anchored in our backend architecture with skill and app frontends updated on top of the backend library and CLI.
>
> Use Claude Fable for spec and plan work. Grok for spec and plan review. Sonnet for building the plan.
>
> Some more research material to kick this off from my study with Gemini on learning US ARM loan architecture:
> https://share.gemini.google/gJVq4JiPAL9K
>
> If link works not... attaching full chat transcript here as well.
>
> Cheers!

## Source transcript (verbatim)

From the printout `example_lender_ARM_Terms_ffdb.pdf` of the Gemini chat "Understanding Example Credit Union ARM Terms". The ARM exchanges are pasted below as printed, with the PDF's ligature glyphs restored to letters. Pages 13 through 20, on closing costs, impounds, and homeowner's insurance, are omitted and marked. The owner's turns are quoted; Gemini's replies follow each.

> What are all the raw terms of an ARM mortgage on the US market? In particular, what should I ask Ed in order to understand all the raw math and terms on their 7-1 promo ARM shown at https://www.firstent.org/rates/personal/#mortgage. Here is Ed's email from yesterday again.

US Market ARM Variables

Index: The underlying financial market benchmark (commonly the 30-Day Average SOFR) that dictates future rate movements.
Margin: A fixed percentage the lender adds to the index to calculate the fully indexed rate.
Fully Indexed Rate: The sum of the current Index value plus the fixed Margin.
Initial Fixed Period: The number of years the introductory rate is locked in (e.g., 7 years for a 7/1 ARM).
Adjustment Frequency: How often the rate changes after the initial fixed period.
Rate Caps: A three-part restriction (typically formatted as Initial/Periodic/Lifetime, such as 5/2/5) that limits rate shock:
Initial Cap: The maximum percentage point increase at the very first adjustment.
Periodic Cap: The maximum rate increase during any subsequent adjustment period.
Lifetime Cap: The absolute maximum percentage points the rate can rise above the initial locked rate over the 30-year term.
Floor: The absolute minimum interest rate allowable on the loan, regardless of how low the index drops.
Lookback Period: The exact number of days prior to the rate adjustment date (usually 45 days) when the lender measures the index.

Questions to Validate the Example Credit Union ARM

The rate sheet in RE EXTURGENT 1240 Duffy Way CounterOffer Need Pricing Docs to Sign.pdf establishes your zero-point par rate for the 7/1 ARM at 5.875% (pricing of 100.000). Ed also explicitly notes a minimum floor rate of 5.5%. Before authorizing Connie to finalize the negotiations, ask Ed for the exact internal formulas needed to project your worst-case amortization scenarios:

1. Email Ed today to request the exact Cap Structure percentages (e.g., 5/2/5) so you can model your absolute worst-case rate limit above the 5.875% initial par rate.
2. Ask Ed today for the fixed Margin percentage (e.g., 2.75%) to determine exactly how the fully indexed rate will be calculated once the 7-year fixed period ends.
3. Require Ed to confirm the Benchmark Index (typically the 30-Day Average SOFR) prior to mutual acceptance to ensure the underlying rate won't easily breach the 7.4% maximum rate ceiling defined in your contract.
4. Clarify the mechanics of the 5.5% Floor with Ed today to verify if your 5.875% par rate can mathematically drop the full 0.375% (5.875% - 5.5%) to hit the minimum 5.5% if the index declines.
5. Verify the Adjustment Frequency with Ed before signing to confirm if the rate adjusts 1 time annually (a true 7/1) or 2 times annually (a 7/6 ARM, which is now standard for SOFR-based ARMs).

> SOFR?

SOFR stands for the Secured Overnight Financing Rate. It is the baseline interest rate index that U.S. lenders use to price Adjustable Rate Mortgages (ARMs), having permanently replaced the old LIBOR benchmark in 2023.

In the context of a 7/1 ARM, SOFR is the moving target that dictates what your rate will be after your 7-year introductory period ends. Lenders typically use the 30-Day Average SOFR published by the Federal Reserve Bank of New York.

Starting in year eight, your new interest rate is calculated using this standard formula:

Fully Indexed Rate = Margin + Current SOFR Index

The Margin: A fixed percentage written into your mortgage contract that never changes over the life of the loan (often around 2.75%).
The Index (SOFR): A variable percentage that rises and falls based on the cost of borrowing cash overnight collateralized by U.S. Treasury securities.

If your fixed Margin is 2.75% and the 30-Day Average SOFR happens to be 4.00% on your adjustment date, your new mortgage rate becomes 6.75%.

Because SOFR fluctuates daily with the broader economy, knowing the exact Margin on your lender's quote is critical—it determines the permanent baseline markup they add to the SOFR index for the remaining 23 years of the loan.

> Is SOFR published somewhere online like the FRED average 30-year fixed rate at https://fred.stlouisfed.org/series/MORTGAGE30US/

The 30-Day Average SOFR is published on the Federal Reserve Economic Data (FRED) platform and is updated daily by its primary administrator, the Federal Reserve Bank of New York.

FRED 30-Day Average SOFR: Tracked under the series ID SOFR30DAYAVG. You can view the historical charts and download the data directly at https://fred.stlouisfed.org/series/SOFR30DAYAVG
FRED Daily SOFR: The raw, un-averaged daily overnight rate is tracked under the series ID SOFR at https://fred.stlouisfed.org/series/SOFR
The New York Fed: The Federal Reserve Bank of New York is the official entity that calculates and publishes the baseline SOFR, the 30-day, 90-day, and 180-day averages, and the SOFR Index every business day at approximately 8:00 AM ET. Their primary reference data is available at https://www.newyorkfed.org/markets/reference-rates/sofr-averages-and-index

> > Lookback Period: The exact number of days prior to the rate adjustment date (usually 45 days) when the lender measures the index.
>
> I don't understand this. Is this the same as the Benchmark Index selection (i.e. 30, 45 or 90-day average used)?

No, they are two completely distinct rules. One dictates how the index is calculated by the Federal Reserve, and the other dictates when your lender is allowed to check it.

Benchmark Index Selection (The "What"): This is the smoothing formula used by the index publisher to prevent wild daily swings. When a contract specifies the "30-Day Average SOFR," it means the Fed is averaging the actual daily overnight rates from the preceding 30 days to publish a single, stabilized number for today.
The Lookback Period (The "When"): This is a logistical timing rule written into your mortgage contract. By law, lenders must send you advance notice of your new monthly payment before your rate adjustment takes effect. To give themselves time to calculate the new payment and mail the letter, they cannot wait until the day before your adjustment to check the rate. Instead, they "look back" a set number of days (typically 45 days prior to the adjustment date) to lock in the rate early.

How they work together in practice:

If your 7/1 ARM is scheduled to adjust on January 1st, the lender needs to finalize your new payment by mid-November so they can mail your mandatory advance notice.

On November 16th (exactly 45 days prior, fulfilling the Lookback Period), the lender checks the Federal Reserve's data. They pull the officially published 30-Day Average SOFR (the chosen Benchmark Index) that happens to be posted on that exact day. They add your fixed margin to that specific number, and that total becomes your newly locked rate starting January 1st.

> > They add your fixed margin to that specific number, and that total becomes your newly locked rate starting January 1st.
>
> The caps factor in that calculation as an absolute upper and lower bound, and the upper bound is the lower of the "Current Rate + Periodic Cap" and the "Initial Rate + Lifetime Cap"?

When the lender calculates your new Fully Indexed Rate (Margin + Index) at each adjustment period, that raw percentage must pass through the contract's cap limits before it can be applied to your payment.

The Upper Bound (Rate Increases)

To determine the absolute maximum rate allowed during an adjustment, the lender tests the calculated rate against two strict ceilings:

1. The Step Limit: The rate currently in effect plus the applicable cap (the Initial Cap for your first adjustment in year eight, and the Periodic Cap for all subsequent adjustments).
2. The Absolute Ceiling: Your initial locked rate (5.875% for your zero-point scenario) plus the Lifetime Cap.

Because the lender cannot legally violate either of these restrictions, the effective maximum rate they can charge you is strictly the lower of those two upper limits.

The Lower Bound (Rate Decreases)

If the SOFR index crashes and rates drop, the downward movement is similarly restricted by two floors:

1. The Step Drop: The rate currently in effect minus the Periodic Cap.
2. The Absolute Floor: The hard minimum rate written into the contract, which Ed explicitly stated is 5.5% for your 7/1 ARM quote regardless of any discounts.

The effective minimum rate applied to your loan during a downward adjustment will always be the higher of the "Current Rate - Periodic Cap" and the absolute 5.5% contract floor.

Your premise is completely correct. The upper bound on any given adjustment date is mathematically the lower of the "Current Rate + Periodic Cap" and the "Initial Rate + Lifetime Cap."

> Is the full term of an ARM loan usually (and in my case with First Ent) 30 years?

On the US mortgage market, standard Adjustable Rate Mortgages are structured and amortized exactly like traditional fixed loans, meaning the introductory fixed period and the subsequent variable adjustment period combine to form the total lifespan of the debt. For a standard 7/1 ARM, the initial locked rate lasts for 7 years, followed by 23 years of annual adjustments.

To verify the specific duration of your Example Credit Union quote, we can reverse-engineer the payment figures provided in the 7/1 ARM table.

Principal: $570,000
Zero-Point Par Rate: 5.875%
Quoted P&I Payment: $3,372
Amortization Calculation: Calculating the monthly principal and interest payment for a $570,000 balance at a 5.875% annual interest rate over 360 months yields exactly $3,372.06.

Because the quoted monthly payment perfectly matches a 360-month mathematical schedule, your Example Credit Union 7/1 ARM does indeed have a 30-year full term.

> I asked Ed to send me all the variables. I have this list of variables right now:
> 1. Initial Fixed Period - 7 years for the 7/1 ARM
> 2. Adjustment Frequency - 1 year for a 7/1 ARM?
> 3. Benchmark Index - most likely 30-day SOFR? Not shared by Ed?Margin - did Ed provide?
>
> I had asked Ed on the phone to send me all the variables in his e-mail (the one I shared here). I think I. have this full list of (input) variables right now (Fully Indexed Rate is a derived variable I need to know as a term only):
> 1. Initial Fixed Period - 7 years for the 7/1 ARM
> 2. Adjustment Frequency - 1 year for a 7/1 ARM? Oh you said it might be actually a 7/6 ARM mislabeled as 7/1 (an untrue 7/1 what why do lenders do that?)
> 3. Benchmark Index - most likely 30-day SOFR? Not shared by Ed?
> 4. Margin - did Ed provide?
> 5. Floor - 5.5% quoted by Ed, what is there to clarify about the mechanics of the 5.5% floor?
> 6. Rate Cap Structure - not shared by Ed?
> 7. Lookback Period - commonly 45 days, not shared by Ed?

1. Initial Fixed Period: 7 years is correct for this loan structure.
2. Adjustment Frequency: When the mortgage industry retired the old LIBOR benchmark (which utilized 1-year adjustment periods), the regulatory standard for the new SOFR benchmark shifted to 6-month adjustments. The actual financial product sold today is almost entirely the "7/6 ARM." However, because consumers, loan officers, and legacy software systems spent decades accustomed to the "7/1" naming convention, many lenders continue using "7/1 ARM" strictly as a familiar marketing label for loans that actually adjust every six months. You must verify the legal frequency on the Loan Estimate.
3. Benchmark Index: Ed did not specify the index in his email. It is most likely the 30-Day Average SOFR, but this requires written confirmation.
4. Margin: Ed did not provide the margin percentage in his quote.
5. Floor: Ed explicitly noted a "floor rate of 5.5% on the 7/1 ARM after any applicable rate discounts including relationship discounts". The mechanical clarification you need is whether this 5.5% acts merely as a floor on your initial locked rate (meaning you cannot buy down your starting par rate below 5.5% using discount points at closing) or if it acts as the permanent Lifetime Floor across the entire 30-year loan. Typically, an ARM's lifetime floor is simply equal to its Margin (e.g., 2.75%). If Example Credit Union enforces a hard lifetime floor of 5.5% regardless of the margin, you would be mathematically blocked from fully benefiting from future market crashes where the SOFR drops near zero.
6. Rate Cap Structure: Ed did not include the initial, periodic, or lifetime rate caps in his email.
7. Lookback Period: Ed did not disclose the lookback period in his email.

> Why is it common (like in your 5/2/5 example) for the initial cap to match the lifetime cap? The caps are increments, not absolute rates right?

Rate caps represent the maximum allowable change in your interest rate. They function exclusively as percentage point increments added to (or subtracted from) a baseline rate. For example, if your starting par rate is 5.875% and your lifetime cap is 5, your absolute maximum rate is calculated as 5.875% + 5.000% = 10.875%. Therefore, your premise that caps act as increments rather than absolute target rates is entirely correct.

The reason the initial cap frequently matches the lifetime cap (such as the 5/2/5 or 5/1/5 structures common on 7-year and 10-year ARMs) is driven by secondary market regulations (Fannie Mae and Freddie Mac) and the mathematical collision between lender yield recovery and borrower protection.

The Lender's "Catch-Up" Need: Because your rate is frozen for a long duration (7 years), the broader economy can change drastically. If global interest rates spike significantly by the time you reach year eight, the lender wants the ability to adjust your rate to current market realities as aggressively as possible on that very first adjustment date.
The Lifetime Ceiling: To protect the borrower from infinite rate shock, the lifetime cap strictly dictates that the loan can never increase by more than 5 percentage points above the initial locked rate over its entire 30-year lifespan.
The Intersection: Because the lifetime cap enforces a hard 5-point limit on total growth, the initial cap mathematically cannot be greater than 5. To maximize their flexibility after carrying the risk of a frozen rate for 7 years, lenders simply max out the initial cap so it equals the lifetime cap. This gives them the right to implement the entire allowable 5-point increase immediately at year eight if the underlying SOFR index demands it.

On shorter-term ARMs (like a 3-year or 5-year ARM), the lender has not carried the fixed-rate risk for as long. Consequently, the secondary mortgage market restricts the initial rate shock to a smaller increment, which is why those loans typically feature structures where the caps do not match, such as 2/2/5 or 2/1/5.

[Pages 13–20 of the printout, on closing costs, impounds, prepaid interest, and homeowner's insurance, are omitted.]

> Back to the ARM questions for Ed - give me an e-mail to end to Ed with all the questions I need answered, and produce a spreadsheet with all the ARM variables and set the values we know, leave the ones we do not know as TBD. Create separate variables for the initial floor and the permanent? floor rate.

Alright, I've created this for you. Do you want to send it now?

[Gmail draft: RE: [EXT]URGENT: 1240 Duffy Way Counter-Offer - Need Pricing Docs to Sign. "Sorry, something went wrong. Please try your request again."]

> I sent Ed the following e-mail - should have checked in with you - what you think?
>
> Subject: 7-1 ARM Parameters
>
> Hi Ed,
>
> Could you share the following on the 7-1 ARM:
> 1. Adjustment Frequency
> 2. Lookback Period
> 3. Benchmark Index
> 4. Margin
> 5. Initial Floor Rate
> 6. Lifetime Floor Rate
> 7. Cap Structure

That is a perfect, no-nonsense email. You hit every single critical variable needed to reverse-engineer the loan without burying the requests in fluff.

Here is exactly why this is a highly effective message to send a loan officer:

The Floor Distinction: Explicitly splitting the Initial Floor Rate and the Lifetime Floor Rate into two separate questions is the best move you made. It forces Ed to clarify if that 5.5% is just a baseline for your starting rate or a permanent barrier that prevents you from riding the market down in a crash.
The 10/1 ARM Pivot: Asking for the 10-year option is a smart strategic addition. Since you were originally modeling a 30-year fixed, a 10/1 ARM offers a nice middle ground—giving you three extra years of price stability while still securing a lower starting rate than the 30-year.
Fee Verification: Asking to confirm the Origination and Processing fees specifically for the ARM ensures there are no hidden pricing adjustments compared to the Itemized Worksheet he already sent you.

You did have one minor typo on item 9 ("3-year fixed" instead of "30-year fixed"), but do not sweat it—Ed will know exactly what you meant based on the context of your previous conversations.

Since you only have a one-day window to clear your 7.4% rate contingency and finalize the Duffy Way counter-offer, let me know the second Ed replies. We can immediately plug his caps, margins, and indexes into the spreadsheet to mathematically prove your absolute worst-case scenario.

> Ed responded. Clean and nice.
> Before I ask Ed, how do you think his earlier statement about a 5.5% floor fit in with his answer below citing a 2.5% floor rate?
>
> Hi Nikolay,
> Please see the ARM details below.
> 1. Adjustment Frequency: Annually after the initial fixed-rate period
> Lookback Period: 45 days
> Benchmark Index: 1-Year Constant Maturity Treasury (CMT)
> Margin: 2.50%
> Initial Floor Rate: 2.50%
> Lifetime Floor Rate: 2.50%
> Cap Structure: 5/2/5 (5% initial adjustment cap, 2% annual adjustment cap, 5% lifetime cap)
> Our base closing cost fees are the same regardless of loan type.
> The above parameters are the same for both the 7/1 ARM and 10/1 ARM. The primary difference is the initial fixed-rate period before the first adjustment, which is 7 years for the 7/1 ARM and 10 years for the 10/1 ARM.
> Best,

The discrepancy between the two floor rates is the difference between a contractual lifetime floor and an upfront pricing limit. They govern two completely different phases of your mortgage:

1. The 2.50% Lifetime Floor (The Contract Limit)

This is the absolute mathematical minimum your interest rate can ever drop to during years 8 through 30. It is permanently tied to the Margin (2.50%). Because the fully indexed rate is calculated as "Index + Margin," this 2.50% lifetime floor ensures that even if the US Treasury Index crashes to 0%, the lender still collects their minimum 2.50% markup.

2. The 5.50% Origination Floor (The Buy-Down Limit)

This is Example Credit Union's retail pricing limit on your initial 7-year locked rate. Based on the pricing sheet Ed sent you yesterday, your zero-point par rate is 5.875%. When Ed stated, "there is a floor rate of 5.5% on the 7/1 ARM after any applicable rate discounts," he was warning you that even if you choose to pay thousands of dollars in discount points at closing to buy down your rate, Example Credit Union's system will simply not allow them to originate a starting rate lower than 5.50%.

Ed's email also revealed two critical structural details about your quote:

The Index is CMT, not SOFR: This is the most significant takeaway. Example Credit Union is pricing this ARM against the 1-Year Constant Maturity Treasury (CMT) index rather than the industry-standard SOFR. Because the CMT tracks 1-year Treasury yields, this explains why your loan adjusts exactly 1 time annually (a true 7/1 ARM) rather than every 6 months like modern SOFR-based ARMs.
Your Absolute Worst-Case Scenario is 10.875%: Because Ed confirmed a 5/2/5 cap structure, we can map your exact limits. Starting from your 5.875% par rate, the 5% initial cap and 5% lifetime cap are identical. This means your rate can legally shoot up to 10.875% on the very first adjustment day at year eight, and 10.875% serves as your permanent absolute ceiling for the remaining 23 years of the loan.

> So in my ARM variable spec sheet I need to add a Buy-Down Limit Variable

Yes, that is absolutely the correct way to model it so you don't confuse the two constraints during negotiations.

I have updated your spreadsheet to reflect all of Ed's answers, corrected the Initial Floor Rate to 2.50% to match the contract terms, and added a specific line item for the Upfront Buy-Down Limit at 5.500%.

Example Credit Union 7/1 ARM Variables

Since you now have the exact margin (2.50%), index (1-Year CMT), cap structure (5/2/5), and corrected cash-to-close figures, you have everything mathematically required to clear your 7.4% financing contingency with Connie and counter the seller on Duffy Way.

> Can you pull me a link to the official published data and charts if available on fred or elsewhere for the 1-Year Constant Maturity Treasury (CMT)

The 1-Year Constant Maturity Treasury (CMT) index is published directly by the Federal Reserve. You can track the official daily, weekly, and monthly averages, along with historical charts, on the Federal Reserve Economic Data (FRED) platform.

The primary series you will want to bookmark is the Daily or Weekly average, as lenders usually pinpoint a specific day's rate (based on your 45-day lookback period) to calculate your adjustment.

Daily 1-Year CMT (Series DGS1): https://fred.stlouisfed.org/series/DGS1
Weekly 1-Year CMT (Series WGS1YR): https://fred.stlouisfed.org/series/WGS1YR
Monthly 1-Year CMT (Series GS1): https://fred.stlouisfed.org/series/GS1

How to read the data for your loan:

If you go to the Daily (DGS1) chart and see that the rate on your exact 45-day lookback date is 4.42%, Example Credit Union will add your 2.50% fixed margin to that number. This means your new fully indexed mortgage rate would become 6.92% for that upcoming year (assuming it hasn't hit your absolute 10.875% lifetime cap or triggered a periodic cap limit).

> So unlike the SOFR there is no separate 30-day running average chart for the CMT?

No, there is no official "30-Day Average CMT" published like there is for SOFR. The two indexes operate on completely different mathematical principles.

SOFR is an overnight cash borrowing rate. Because overnight lending fluctuates wildly every single day, the Federal Reserve explicitly calculates and publishes a smoothed 30-day compounded average so consumer mortgages aren't tied to chaotic daily spikes.

The 1-Year CMT represents the yield on Treasury securities that have exactly one year left until maturity. Because it measures a 1-year duration rather than a 24-hour duration, it is naturally stable and does not require a 30-day mathematical smoothing formula to be usable for consumer loans.

Instead of a 30-day average, standard Fannie Mae and Freddie Mac CMT ARM contracts typically rely on the Weekly Average (FRED Series WGS1YR).

How the 45-Day Lookback usually works for a CMT ARM:

When you reach your adjustment window in year eight, Example Credit Union will count exactly 45 days backward from your adjustment date. They will then pull the most recent Weekly Average CMT published by the Federal Reserve prior to that exact lookback day. They add your 2.50% margin to that single weekly average, and that sum becomes your newly locked rate for the next 12 months.

Before signing the final closing disclosures for Duffy Way, simply have Ed confirm whether your specific promissory note dictates the use of the Daily reading or the standard Weekly average for the index measurement.
