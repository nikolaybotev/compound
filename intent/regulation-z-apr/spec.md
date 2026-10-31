# spec.md — Regulation Z APR

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-31) |
| Status | Draft 2 |
| Stage | 2 · Design |

## 1. Summary

`apr.js` solves the actuarial APR under Regulation Z Appendix J for a fully amortizing loan. Prepaid finance charges follow 12 CFR 1026.4, including the exclusion of third-party fees under 1026.4(c)(7). The amount financed is the note amount minus those prepaid charges. Mortgage insurance is part of the payment stream. A discounted ARM uses the initial rate for the initial period and then the fully indexed rate at consummation, through the caps and floors `buildReport` already applies. `regulation_z_apr.js` and a skill answer from that module. The amortization page shows the same APR. `origination_fees.js` is unchanged.

This folder builds on [intent/origination-fees/](../origination-fees/spec.md), [intent/arm-loan/](../arm-loan/spec.md), [intent/clean-closing-costs/](../clean-closing-costs/spec.md), and [intent/teaser-indicator/](../teaser-indicator/spec.md). Where the fee spec stops at the charge implied by a given APR, this spec wins for solving the APR. The fee script and its fixtures stay as they are.

## 2. Goals and non-goals

**Goals**

- G1. Classify prepaid charges under 12 CFR 1026.4 and exclude third-party fees under 1026.4(c)(7).
- G2. Report the amount financed, the finance charge, and the actuarial APR.
- G3. Round the disclosed APR the way a Loan Estimate does, and report the 1026.22 tolerance.
- G4. Put mortgage insurance in the payment stream for as long as the scheduled loan keeps it.
- G5. Price a discounted ARM from the initial rate, then the fully indexed rate at consummation.
- G6. Answer from a command-line tool and a skill that runs it.
- G7. Show that APR on the page. Move the page version when that behavior ships.

**Non-goals**

- Replacing `origination_fees.js` or changing its fixtures, its JSON, or its skill's fee arithmetic.
- Interest-only, payment-option, or negative-amortization arithmetic.
- A construction loan, a buydown schedule the user types payment by payment, or a unit period other than a month.
- Odd days on the page. Prepaid interest there is a prepaid finance charge.
- Extra principal, a recast, or the level-extra map inside the APR. The APR is the scheduled obligation.
- The worst-case ARM rate as the APR.
- Writing the current index into the schedule Index column or into `indexByMonth` for the amortization the page already shows.
- A new scenario-document version.
- A Pages deploy, or any edit under `.github/workflows/`. The page version `0.23.0` is what the publish workflow reads as point version `0.23`.
- A personal-data rule in the repo, or a lender name in a test title, on the page, or in the skill.

**Release phasing.** Untagged requirements are this release. The library lands before the command-line tool, and the page last. The docs pull request leaves `apps/web/package.json` at `0.22.1`. The page phase sets it to `0.23.0`. The publish workflow derives `PAGES_POINT_VERSION` from that version, so the point version is `0.23` without a workflow edit.

## 3. Principles

- P1. `buildReport` is the interest walk and the scheduled principal-and-interest payment. `apr.js` calls it and does not grow a second walk. `apr.js` has no Node APIs.
- P2. Reported money is integer cents. The disclosed APR is an integer count of thousandths of a percent, rounded half up.
- P3. The skill runs the tool with `--json` and reads that object. It does not solve the rate.
- P4. A missing loan amount, note rate, or, on an ARM, the index at consummation is a question, not a default. There is no built-in loan. An omitted term is 30 years, and the answer says so.
- P5. The fee inversion and this solver stay two tools. A fee question stays on the fee skill.

## 4. Users and scenarios

- The owner asks for the APR on the published fixed-rate Closing Disclosure sample. The tool reports 4.174% from that form's amount financed and payment stream.
- The owner lists the published fixed-rate Loan Estimate charges. The tool classifies them, reports 4.269%, and reports that 4.269% is within tolerance of the printed 4.274%.
- The owner asks what APR a $600,000 loan at 6.75% for 30 years implies when the prepaid finance charge is $27,257.20. The tool reports 7.21%.
- The owner asks for the APR on a discounted 7/1 ARM and gives the index at consummation. The tool uses that index for the composite rate. It does not use the lifetime ceiling.
- The owner has not entered a current index on an ARM. The page does not invent one and does not show a percent.
- The owner asks for an interest-only APR. The skill refuses in one sentence.

## 5. Functional requirements

1. **Module.** `apr.js` exports `classifyCharges`, `actuarialAprThousandths`, and `buildAprReport`. `apr.d.ts` declares those exports. No package is added. `node --test` collects `apr.test.js`. `amortize.js` gains no key and no schedule field. A fixed-rate `buildReport` return value stays free of an `apr` key.

2. **Charge classification.** `classifyCharges(charges)` takes an array of `{ cents, kind }`. `cents` is a non-negative safe integer. Kinds that are prepaid finance charges: `points`, `lender-fee`, `prepaid-interest`, `mortgage-insurance-premium`. Kinds that are not: `application-fee` (12 CFR 1026.4(c)(1)), `appraisal`, `credit-report`, `flood`, `tax-service`, `title`, `survey`, `document-preparation`, `notary` (12 CFR 1026.4(c)(7) and fees of that kind), `recording`, `transfer-tax` (12 CFR 1026.4(e)), `property-insurance`, `property-tax`, `escrow`, `pest`, `owners-title`. `lender-credit` is a non-negative amount that reduces the prepaid total and does not reduce it below zero. Any other kind throws `unknown finance-charge kind`. The return value is `{ prepaid_finance_charge_cents, excluded_cents }`. `excluded_cents` is the sum of every non-credit charge that is not a prepaid finance charge. Duplicate kinds add.

3. **Amount financed and finance charge.** The amount financed is the note amount in cents minus `prepaid_finance_charge_cents`. The amount financed must be a positive safe integer. The finance charge is that prepaid total plus the walk's `interest_cents` plus the mortgage-insurance cents included in the stream. Interest is `buildReport`'s `interest_cents` on the APR walk, not a second sum.

4. **Actuarial rate.** `actuarialAprThousandths(amountFinancedCents, paymentCents, oddDays)` takes the amount financed in cents, the monthly payment amounts in cents in order, and `oddDays`. It returns `{ apr_thousandths, irregular, tolerance_thousandths }`. The unit period is one month. There are 12 unit periods in a year. The first payment is one month after consummation, plus an optional odd-days fraction. `oddDays` is an integer from 0 through 29. Zero is a regular first period: payment `k` (1-based) is discounted by `(1 + i) ^ k`. A positive count `f` discounts payment `k` by `(1 + (f / 30) * i) * (1 + i) ^ k`, which is Appendix J's long first period with `t = 1`. The payment list is the scheduled amount for every month through the term, including the last month. It is not the residual payoff. The solver carries full precision. `apr_thousandths` is that nominal annual rate, `i * 12 * 100`, rounded half up to the nearest thousandth of a percent. 4.174235% is 4174. 4.268536% is 4269. 9.6857% is 9686.

5. **Tolerance.** A transaction is irregular when two payments before the final payment differ. An odd first period does not make it irregular. A level stream is regular, including when only the final payment would have differed. The tolerance is 125 thousandths of a percent on a regular transaction (12 CFR 1026.22(a)(2)) and 250 on an irregular transaction (12 CFR 1026.22(a)(3)). The extra mortgage defenses in 1026.22(a)(4) and (a)(5) are not applied. The disclosed comparison, when the caller passes one, is within tolerance when the absolute difference of the two thousandth counts is less than or equal to that tolerance.

6. **Mortgage insurance.** A positive monthly mortgage-insurance amount is added to each scheduled principal-and-interest payment from month 1 through the termination month, inclusive. The termination month is the first month on that APR walk whose `remaining_principal_cents` is less than or equal to 78% of the original value, half up, and it is not later than the midpoint of the term. The midpoint of an even term is half the term; of an odd term it is the term divided by two, rounded up. When the balance never reaches that threshold, the termination month is the midpoint. The search uses the APR walk, the same no-extra `buildReport` that prices the stream. On an ARM that walk carries the consummation index, so the month can differ from the tax table's `terminationPayment`, which uses the schedule walk. Original value is the price in cents when the caller passes one, and otherwise the note amount. An explicit month count, from 1 through the term, replaces that search. Zero insurance adds nothing and does not make the stream irregular by itself.

7. **Fixed payment stream.** For a fixed rate, `buildReport(principal, rate, monthCount, empty map, years or omitted)` supplies `monthly_payment_cents` and `interest_cents`. Every month of the APR stream uses that same `monthly_payment_cents`, plus the insurance in requirement 6. The published sample's payment is 76178 cents and its interest is 11224227 cents.

8. **Discounted ARM.** ARM terms are the object `buildReport` already accepts, without a filled consummation index. The caller passes `currentIndexThousandths`, a non-negative safe integer. The APR walk copies that index onto every adjustment month and calls `buildReport` with an empty extra map. Later months are not left blank, because a blank adjustment month targets the cap. The fully indexed rate is that index plus the margin, then the round-to-eighth flag, the caps, and the floors. The stream uses each row's `payment_cents` from month 1 through the term. A missing index throws `an ARM APR needs the index at consummation`. The current index is not written to the schedule the page shows for amortization. This requirement wins over the teaser rule that the current index is not an argument to `buildReport`, for this APR walk only. The schedule walk and the teaser comparison still omit it.

9. **`buildAprReport`.** Inputs are the principal in dollars, the rate percent, the month count, the prepaid finance charge in cents, the monthly insurance in cents, an optional original value in cents, an optional insurance month count, `oddDays`, an optional `arm` object, and an optional current index. The return value is:

   | Field | Meaning |
   |---|---|
   | `amount_cents` | Note amount |
   | `amount_financed_cents` | Note amount minus prepaid finance charges |
   | `prepaid_finance_charge_cents` | Requirement 2 |
   | `interest_cents` | The APR walk |
   | `mortgage_insurance_cents` | Monthly insurance times the months it is charged |
   | `finance_charge_cents` | Prepaid total plus interest plus insurance |
   | `apr_thousandths` | Requirement 4 |
   | `irregular` | Requirement 5 |
   | `tolerance_thousandths` | 125 or 250 |
   | `mi_months` | Months of insurance in the stream, 0 when there is none |
   | `odd_days` | The fraction's day count |

   On $570,000 at 5.875% for 360 months, initial period 84, adjustment interval 12, margin 2.5, caps 5/2/5, floors 2.5, round-to-eighth off, current index 4, and no insurance or prepaid charge: `apr_thousandths` is 6181, `irregular` is true, and the payment at month 85 is 356380 cents. The same loan with current index 3.375 has a level payment of 337177 cents and `apr_thousandths` 5875.

10. **Command-line tool.** The command is:

    ```bash
    node regulation_z_apr.js \
      --amount 162000 --rate 3.875 \
      (--years 30 | --months 360) \
      [--price 180000] \
      [--charge points=405] \
      [--mi 82.35] [--mi-months 80] \
      [--odd-days 0] \
      [--disclosed-apr 4.274] \
      [--json] \
      [--fixed-years 7 | --fixed-months 84] \
      [--adjust-months 12 --margin 2.5 --caps 5/2/5 --floor 2.5] \
      [--initial-floor 2.5] [--round-eighth] \
      [--current-index 4]
    ```

    `--amount` and `--rate` are required and follow the fee script's rules: amount in dollars greater than zero, rate a percent greater than zero with at most three decimal places. Exactly one of `--years` or `--months` is required, with the same grammar as the fee script. No arguments names `--amount`, `--rate`, `--years`, and `--months`, and does not run a sample loan. `--price` is an optional original value in dollars, greater than zero. `--charge` repeats. The text is `kind=dollars`, dollars greater than or equal to zero with at most two decimal places, and the kind is one of requirement 2. `--mi` is a monthly dollar amount, greater than or equal to zero, at most two decimal places. `--mi-months` is a positive integer no greater than the term and requires `--mi` greater than zero. `--odd-days` is an integer from 0 through 29. `--disclosed-apr` is a percent greater than zero with at most three decimal places. ARM flags use the calculator's grammar. ARM mode is on when any ARM flag or `--current-index` is present. In ARM mode, `--fixed-years` or `--fixed-months` (exactly one), `--adjust-months`, `--margin`, `--caps`, `--floor`, and `--current-index` are required together. `--initial-floor` defaults to `--floor`. `--round-eighth` is off unless passed. A library `Error` exits non-zero and prints the library's message on stderr. An unknown flag, a duplicate non-repeatable flag, and a missing required flag do the same. `--charge` may repeat.

11. **Output.** `--json` writes one object and no other stdout. Money fields are integer cents. `rate_percent` is the parsed note rate. `years` appears only when `--years` was passed. `price_cents` appears only when `--price` was passed. `disclosed_apr_thousandths` and `within_tolerance` appear only when `--disclosed-apr` was passed. The fields are requirement 9's fields plus `rate_percent`, `months`, optional `years`, optional `price_cents`, and the two disclosed fields. With no `--json`, stdout is a summary in this order: loan amount, price when given, note rate, months, years when given, amount financed, prepaid finance charge, finance charge, mortgage insurance, annual percentage rate, and tolerance. Money uses `formatGroupedCents`. The rate is printed from `apr_thousandths` as a percent with trailing zeros after the decimal dropped: 4174 is `4.174%`, 7210 is `7.21%`, 5875 is `5.875%`, 7000 is `7%`. The tolerance prints `0.125%` or `0.25%`. When a disclosed APR was passed, the summary adds `Disclosed APR` and `Within tolerance: yes` or `Within tolerance: no`.

12. **Skill.** `.agents/skills/regulation-z-apr/SKILL.md` runs `scripts/regulation_z_apr.js`, a symlink to the repo-root script. It asks for a missing loan amount, note rate, or term. On an ARM it asks for the initial period, the adjustment interval, the margin, the three caps, the lifetime floor, and the index at consummation. It asks for the monthly insurance amount when the user says there is insurance and does not give one. It passes `--years 30` only when the user gave no term, and it says so. It passes `--price` when the user gave a price, so the insurance endpoint can use it. It writes each charge the user named as `--charge`, using the kinds in requirement 2, and it does not invent a fee, a price, or an index. It never passes `--round-eighth` unless the user says the note rounds to an eighth, and it never passes `--initial-floor` unless the user gave one. It never passes `--odd-days` unless the user gives a long first period in days. It reads `--json`. It does not classify or solve on its own. A negative or zero amount financed is the tool's error, reported, not replaced. It refuses an interest-only, payment-option, or negative-amortization loan in one sentence and does not run the tool. A question that gives an APR and asks for the fee stays on the fee skill. This skill's description says when to use it and does not tell the other skills to redirect.

13. **Page.** The loan summary gains a row after Total cost of loan and before Payoff date. The row's accessible name is `Annual percentage rate`. The term is `id="apr"`. The value is the disclosed percent from requirement 11, and the note under it is `This is not your interest rate.` The walk is `buildAprReport` on the financed principal, the note rate, the term, and an empty extra map. Prepaid finance charges are the picture's points, lender fees, and prepaid interest, minus the lender credit, and not below zero. Seller credit, earnest money, title, escrow, recording, property tax, homeowners insurance, impounds, and proration are not finance charges. Monthly insurance is the picture's PMI cents. The original value is the appraisal when that field has a parsed amount, and otherwise the price. The page passes `oddDays` 0. On an ARM the current index is the retained thousandths the teaser indicator already keeps. A blank current index leaves the value as `Enter the current index to calculate the APR.` and shows no percent. An invalid current-index keystroke keeps the previous retained thousandths, as the teaser already does. Switching to fixed hides nothing of the row: a fixed loan always has a percent. The schedule, the heading note rate, the chart, and the scenario document are unchanged. The page phase sets `apps/web/package.json` to `0.23.0`. `publish-gh-pages-production.yml` reads that version and exports `PAGES_POINT_VERSION` as its major.minor, so `0.23.0` is point version `0.23`. The phase does not edit the workflow and does not dispatch one.

14. **Docs, on the implementation.** The command-line phase records the command and the healthy Closing Disclosure run in `AGENTS.md` and `README.md`. The page phase records the summary row, the charge split, the ARM index rule, and the version `0.23.0` / `0.23`. Things agents get wrong gains: do not solve this APR with `origination_fees.js`; do not treat an appraisal, a title fee, or a recording fee as a finance charge; do not use the worst-case ARM rate as the APR; do not leave later ARM adjustment months blank in the APR walk; do not invent a current index; do not put mortgage insurance on a month after the termination month; do not drop the trailing-zero rule or round the disclosed APR to an eighth; do not name a lender in a test title. The sentence that the current index is not passed to `buildReport` becomes two walks: the schedule walk and the teaser comparison omit it, and the APR walk copies it onto every adjustment month of its own call. `REVIEW.md` Compliance adds `intent/regulation-z-apr/`. Bugs adds an APR, finance charge, or amount financed that disagrees with this spec, a 1026.4(c)(7) fee counted as a finance charge, and an ARM APR taken from the no-index ceiling.

## 6. Acceptance criteria

- AC1. Appendix J example (i), amount advanced $5,000, payment $230, 24 months, regular first period: `apr_thousandths` 9686, which is 9.686% at three decimals and 9.69% at two. `irregular` is false and `tolerance_thousandths` is 125. Appendix J example (ii), amount advanced $6,000, payment $200, 36 months, odd days 19: `apr_thousandths` 11817, which is 11.817% at three decimals and 11.82% at two. `irregular` is false. Appendix J's mortgage with varying payments, amount advanced $39,688.56, odd days 21: each of the thirty yearly amounts in that example is the monthly payment for twelve successive months (360 payments). The two-decimal rate is 9.80%.
- AC2. The published fixed-rate Closing Disclosure sample, note $162,000, rate 3.875%, 360 months, no prepaid finance charge, price $180,000, mortgage insurance $82.35 with no explicit month count: `mi_months` 80, `interest_cents` 11224227, `mortgage_insurance_cents` 658800, `finance_charge_cents` 11883027, `amount_financed_cents` 16200000, `apr_thousandths` 4174, `irregular` true, `tolerance_thousandths` 250. The test title does not name a lender.
- AC3. The published fixed-rate Loan Estimate sample uses the same note, rate, term, price, and insurance. Its charges are points $405, application fee $300, underwriting fee $1,097 as `lender-fee`, appraisal $405, credit report $30, flood determination $20, flood monitoring $32, tax monitoring $75, tax status research $110, pest inspection $135, survey $65, title insurance binder $700, lender's title policy $535, settlement agent fee $502, title search $1,261, recording $85, prepaid interest $262, homeowners insurance $605, escrow $413, and owner's title policy $1,017, each with the kind in requirement 2. `prepaid_finance_charge_cents` is 176400, `amount_financed_cents` is 16023600, `finance_charge_cents` is 12059427, and `apr_thousandths` is 4269. Against disclosed 4.274%, `within_tolerance` is true. The excluded charges do not change the prepaid total. The test title does not name a lender.
- AC4. $600,000 at 6.75% for 30 years with prepaid finance charge 2725720 cents and no insurance: `apr_thousandths` 7210, `amount_financed_cents` 57274280, `irregular` false. The human summary prints `7.21%` and `0.125%`.
- AC5. The requirement 9 ARM, current index 4, no charges and no insurance: `apr_thousandths` 6181 and `irregular` true. Current index 3.375: `apr_thousandths` 5875 and `irregular` false. A missing current index throws `an ARM APR needs the index at consummation`. An index passed on only the first adjustment month is not this function's walk: `buildAprReport` fills every adjustment month, and the month-85 payment is 356380 cents rather than a later step to the ceiling.
- AC6. No arguments exits non-zero, names `--amount`, `--rate`, `--years`, and `--months`, and does not print a $162,000 or $855,000 loan. A missing rate, both term flags, an unknown charge kind, a negative charge, `--mi-months` without insurance, `--odd-days 30`, an ARM run without `--current-index`, and `--current-index` without the other ARM flags each exit non-zero.
- AC7. The skill text tells the agent to run the script, to ask for a missing loan amount, note rate, term, ARM term, consummation index, or insurance amount, to pass `--years 30` only when the term was omitted and to say so, to read `--json`, to refuse interest-only, payment-option, and negative-amortization loans, and not to pass `--round-eighth`, `--initial-floor`, or `--odd-days` unasked. `scripts/regulation_z_apr.js` is a symlink to the repo-root script.
- AC8. On the page, price $200,000, 20% down, note rate 6.75%, 30 years, lender fees $3,000, points 0, start month April 2013, closing day 15, 360-day basis, and no appraisal: the APR row shows `6.966%` and the note `This is not your interest rate.` Raising the title percentage leaves `6.966%`. Lender fees of $0, with that same closing, show a different percent. Start month October 2013 and closing day 1, with the $3,000 lender fee restored, also show a different percent. An ARM with a blank current index shows `Enter the current index to calculate the APR.` and no percent. `apps/web/package.json` is `0.23.0`. The workflow reads that version and exports `PAGES_POINT_VERSION` `0.23`. The phase does not edit the workflow. The docs pull request and the library and command-line pull requests leave `apps/web/package.json` at `0.22.1`.

## 7. Design decisions

**D1 — Two directions stay two tools.** `origination_fees.js` discounts the note-rate payment at a given APR. This module solves the APR from the amount financed and the payment stream. Checked 2026-10-31: the fee fixture's $27,257.20 charge on $600,000 at 6.75% for 30 years solves back to 7.210% when the stream uses `monthly_payment_cents` 389159.

**D2 — The published Closing Disclosure loan calculations are the exact pin.** Appendix H-25(B), the fixed-rate sample, discloses amount financed $162,000.00, finance charge $118,830.27, and APR 4.174%. Checked 2026-10-31: `buildReport` on $162,000 at 3.875% for 360 months returns interest 11224227 cents and payment 76178 cents. Mortgage insurance of $82.35 through the month the balance first is at or under 78% of the $180,000 price is 80 months and 658800 cents. 11224227 + 658800 = 11883027. The actuarial rate on that stream, regular first period, amount financed $162,000, is 4.174235%, which rounds half up to 4.174%. The printed amount financed equals the note amount, so this pin does not subtract the form's origination charges.

**D3 — The published Loan Estimate is a tolerance pin, not a thousandth pin.** Appendix H-24(B), the fixed-rate sample, prints APR 4.274%. Checked 2026-10-31: the same 80-month insurance stream, with prepaid finance charges of points $405, the underwriting fee $1,097, and prepaid interest $262, and with the application fee and the third-party and government fees excluded, produces amount financed $160,236.00 and 4.268536%, which rounds to 4.269%. The difference from 4.274% is five thousandths of a percent, inside the 1/8 point tolerance. No subset of the itemized lines that respects 1026.4 reproduces 4.274% to the thousandth. The test asserts 4269 and that the printed 4.274% is within tolerance. It does not move the solver onto 4.274%.

**D4 — Rounding is three decimal places, then trailing zeros drop.** 12 CFR 1026.37(o)(4)(ii) and comment 37(o)(4)(ii)-1 round a disclosed percentage to three decimal places and then drop trailing zeros to the right of the decimal. Appendix J's examples are published at two decimals (9.69%, 11.82%, 9.80%). The stored figure is three-decimal thousandths. The Appendix J tests also check the two-decimal publication. The disclosed APR is not rounded to the nearest eighth.

**D5 — Insurance ends on the automatic-termination payment of the APR walk.** Comment 1026.18(g)-5 puts mortgage insurance in the stream for the legal obligation. The endpoint is the first payment that leaves the balance at or under 78% of original value, not later than the midpoint, and that payment is included. That is the same formula as the tax table's `terminationPayment`. The search runs on the APR walk. On a fixed loan the two walks match. On an ARM the tax table's schedule walk can target the cap where this walk holds the consummation index, so the months can differ. Checked 2026-10-31: on the fixed sample, that month is 80, and 80 months is the finance charge in D2. Extra principal does not move it.

**D6 — A discounted ARM holds the consummation index at every adjustment.** The commentary to 12 CFR 1026.17(c)(1) on discounted variable-rate transactions uses the initial rate for as long as it is charged and, for the rest of the term, the rate from the index at consummation. `buildReport` targets the cap when an adjustment month has no index. Filling every adjustment month with the current index is what keeps later resets on that index, subject to the caps and floors. Checked 2026-10-31 on the requirement 9 loan: index 4 and margin 2.5 produce a 6.5% rate, payment 356380 cents from month 85, and APR 6.181%. The page's current index is that consummation index. It stays out of the schedule Index column.

**D7 — The page does not model odd days.** Prepaid interest is already a dollar charge on the page. Appendix J odd days remain on the library and the command-line tool for the long-first-period example. Passing both the dollars and the fraction would count the same days twice. The page passes zero odd days.

**D8 — Application fees are excluded.** 12 CFR 1026.4(c)(1) excludes an application fee charged to all applicants. The Loan Estimate line is classified as `application-fee`. Lender fees on the page are one dollar amount with no application-fee split, so the page treats that whole amount as `lender-fee`.

**D9 — The summary row is the disclosure.** The APR sits with the cost figures, after Total cost of loan and before Payoff date, with the sentence a Loan Estimate uses: this is not your interest rate. The heading keeps the note rate.

## 8. Open questions

None.
