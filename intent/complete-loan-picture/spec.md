# spec.md — Complete loan picture

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-04) |
| Status | Draft 2 |
| Stage | 2 · Design |

## 1. Summary

The amortization page gains the Conventional sheet's monthly payment picture and closing costs, and its primary inputs become the sheet's one-line heading. Extra payments and the new section both open from a disclosure header. Principal and interest still come from `buildReport`. The feature branch is not merged. A combined GitHub Pages artifact publishes the current `main` site at `https://nikolaybotev.github.io/compound/` and this page at `https://nikolaybotev.github.io/compound/prototype/`.

This spec wins over [plan.md](plan.md). Where it narrows [../amortization-app/spec.md](../amortization-app/spec.md), the narrowed points are named in D22. The rest of that spec, [../extra-savings-column/spec.md](../extra-savings-column/spec.md), and [../loan-recast/spec.md](../loan-recast/spec.md) still stand.

## 2. Goals and non-goals

**Goals**

- G1. Show the Conventional monthly breakdown and closing costs on the amortization page, using that sheet's formulas.
- G2. Make the primary inputs the heading `600K | 5% down | 7.375% fixed = $4,853 / month`, with 600, 5, and 7.375 editable and the payment computed.
- G3. Open extra payments and the new section from a header row with a chevron, not from a regular button and not from a popup.
- G4. Keep the schedule, extra principal, Saved by extra, and `buildReport` behavior.
- G5. Publish a review prototype beside the current Pages site, without merging the feature and without replacing production.

**Non-goals**

- Any sheet other than Conventional (July 26th, Sep 4 2020, Eric 2026, FHA 2026, or any other).
- A loan-type control, an FHA product, an ARM, or interest-only.
- Teaching the mortgage skill or the CLI to quote taxes, insurance, or closing costs. The skill still must not invent those.
- A recast control on the page. Recast stays in the skill and the CLI.
- A term in months on the page. The page does not have one today.
- A popup, a second Apply for the picture, or a second amortization formula.
- Merging the feature pull request, or changing what `main` serves at `https://nikolaybotev.github.io/compound/`.

**Release phasing.** Every untagged requirement is in this release. There is no later release inside this intent. The build is one feature pull request that stays open, plus the prototype deploy in D14. That is a departure from "one merged pull request per phase," and [plan.md](plan.md) records it.

## 3. Principles

- P1. `buildReport` is the only amortization. Principal and interest on the page are `monthly_payment_cents`.
- P2. The eight fields in requirement 7 are typed. Upfront MIP is one of them: it overrides `IF(A2="FHA",0.0175,0)` and defaults to that formula's Conventional result, 0%. The sheet formulas decide every dollar that is not one of those eight inputs. The screenshot identifies the sheet and the heading; it is not the formula source.
- P3. A disclosure header is the control. The global bordered `button` style is not how a section opens.
- P4. While the prototype is up, the only Pages upload is the combined artifact: the `main` build at the site root and the feature ref under `prototype/`. A production-only upload is not a publish.
- P5. Round displayed picture money once, half up to the cent, except the heading total, which is the sheet's whole-dollar heading (D8).

## 4. Users and scenarios

- A fresh visit shows `600K | 5% down | 7.375% fixed = $4,853 / month`, term 30 years, and the summary principal and interest `$3,936.85` on a `$570,000.00` loan. Both disclosures are closed.
- The owner opens "Monthly payment and closing costs" and reads the Conventional lines, including cash to close `$50,351.56`.
- The owner changes 5 to 20 in the heading. The loan amount becomes `$480,000.00` and conventional PMI becomes `$0.00`.
- The owner opens "Make extra payments," applies $100 a month, and the schedule and Saved by extra behave as they do today. The picture does not change the extra map.
- A browser that already saved `compound-amortization-v1` keeps that loan. The new picture fields start at the Conventional defaults.
- The owner reviews `https://nikolaybotev.github.io/compound/prototype/` while `https://nikolaybotev.github.io/compound/` stays the `main` page.

## 5. Functional requirements

1. **Scope.** The picture implements the Conventional sheet only. Loan type is the constant `Conventional`. It is a label in the new section, not a control. The other workbook sheets are not modeled.

2. **Heading.** Under the existing `h1`, one line reads `{thousands}K | {down}% down | {rate}% fixed = ${dollars} / month`. The three editable portions are the thousands figure, the down-payment percent, and the note-rate percent. The payment is text. Term and start month are not in that line. They stay as the existing controls (`id="years"`, `id="start"`) on the next line. The heading wraps on a narrow viewport.

3. **Thousands.** The heading price is thousands of purchase-price dollars. `600` is `$600,000`. The stored draft and `LoanDraft.price` stay dollar strings, so a saved `"570000"` is still `$570,000` and displays as `570`. While the price field is focused, it shows the keystrokes. Validate the thousands text before `parseLoan`. A valid entry is a positive number with at most five decimal places, so `399.999` is `$399,999` and `0.00001` thousand is one cent. Digit-shift that text into a dollar string with at most two decimal places, then run `parseLoan` on the dollar string. Do not run today's two-decimal dollar check, or its "number of dollars" message, on the thousands text. An invalid thousands entry names the purchase price, describes thousands of dollars, and keeps the last valid loan. A trailing dot (`600.`) does not error and does not change the loan. Convert with decimal digit shifting, not `Number(text) * 1000`. The sheet formula `LEFT(B3÷1000,3)` is a three-digit display hack. The page shows the full thousands number: `1200` displays as `1200K`. The default `600` matches both. The input keeps `id="price"`. Its accessible name is "Purchase price (thousands)".

4. **Down payment and note rate.** They keep today's parsing and ids (`down`, `rate`): down payment is a percent from 0 inclusive to 100 exclusive with at most three decimal places; the note rate is a percent greater than 0 with at most three decimal places. They move into the heading. Accessible names stay "Down payment" and "Interest". The static text around them is `K | `, `% down | `, `% fixed = `, and ` / month`.

5. **Term.** The term control stays a positive whole number of years, default `30`, `id="years"`. The page does not gain a months term. Changing the term changes the `buildReport` month count (`years * 12`) and drops extra-principal entries past the new count, as it does today. It does not change the prepaid-interest day count (requirement 10, D19): `B6×A5÷360×15`, and the 15 does not follow the term.

6. **Fresh visit and storage.** With no saved scenario, or with a corrupt one, the draft is purchase price `$600,000`, down payment `5`, term `30` years, note rate `7.375`, and the start month equal to the visitor's current month. The storage key stays `compound-amortization-v1`. Version stays `1`. A saved version-1 loan (price still in dollars, down, years, rate, start, extras, prefill, open years) loads as it does today. A saved `prefill.open: true` still opens extra payments. Loading does not clear a saved open flag. Missing picture fields use requirement 7's defaults, and a missing picture `open` flag stays closed. A malformed picture object does not discard the saved loan; the picture falls back to those defaults. Saves add the picture fields. The first-visit loan in `intent/amortization-app` is superseded only for this default (D22). When this default lands, replace the `AGENTS.md` Cloud sentence that says a fresh page load is `$570,000` / 7% / 30 years / 0% down with payment `$3,792.22`. The new sentence is this Conventional visit. Do not put that old loan back.

7. **Picture inputs.** These eight fields are the section's inputs. They are editable inside the new section and recompute as they are typed, the way price and rate do. There is no Apply button for them. Empty is invalid. `parseDollarField` treats an empty extra-payment field as zero; the picture fields do not use that rule. An invalid entry names the field, keeps the last valid picture, and does not change the heading. Defaults, and the grammar:

   | Field | Default | Grammar |
   |---|---|---|
   | Property tax, percent per year | `1.15` | Percent, 0 inclusive, less than 100, at most three decimal places |
   | Home insurance, percent per year | `0.35` | same |
   | FHA upfront MIP, percent of base loan | `0` | same |
   | Lender origination, percent of base loan | `1` | same |
   | Title and escrow, percent of purchase price | `0.75` | same |
   | Lender processing fee | `1200` | Dollars, 0 inclusive, at most two decimal places |
   | Conventional appraisal | `500` | same |
   | Recording and taxes | `800` | same |

   Conventional PMI and FHA MIP rates are computed, not typed (requirement 11). The 15 days in prepaid interest are not an input.

8. **Financed principal.** Base loan cents are today's price cents minus down-payment cents (`downPaymentCents`). Upfront MIP cents are that base times the upfront MIP percent, half up to the cent with the same integer division `downPaymentCents` uses. Financed cents are base plus upfront MIP. On the default base loan, upfront MIP `1.75` is 997500 cents and the financed amount is `$579,975.00`. The page passes financed dollars to `loanReport` / `buildReport` and passes the same financed principal into every `savedByExtraCents` call. At the default upfront MIP of 0%, financed cents equal the base, `$570,000.00`. The summary "Loan amount" is `amount_cents` from that report. Extra principal is still on top of principal and interest. The note under the summary payment stays.

9. **Monthly lines.** Amounts are half up to the cent. Principal and interest is `monthly_payment_cents`, not a local `PMT`. The other lines use these formulas, with loan type fixed at Conventional. `B3` is the purchase price, `B6` the base loan, `B8` the financed amount, `A5` the note rate as a fraction (7.375% is 0.07375), `A4` the down-payment fraction.

   | Line | Formula |
   |---|---|
   | Purchase price | The heading price |
   | Down payment | `B3 × A4`, via `downPaymentCents` |
   | Base loan amount | `B3 × (1 − A4)`, via requirement 8 |
   | Upfront MIP rate | The input, default 0%. The sheet formula `IF(A2="FHA",0.0175,0)` is why the default is 0. There is no FHA switch |
   | Upfront MIP amount | `B6 × rate` |
   | Total loan amount financed | `B6 + upfront MIP` |
   | Principal and interest | `buildReport` on the financed principal, the note rate, and `years × 12` |
   | Property tax | `B3 × tax rate ÷ 12` |
   | Home insurance | `B3 × insurance rate ÷ 12` |
   | FHA MIP rate | `0%`. The sheet formula is `IF(A2="FHA",IF(A4≥0.1,0.5%,0.55%),0%)` |
   | FHA MIP amount | `B8 × rate ÷ 12` |
   | Conventional PMI rate | `IF(A2="Conventional",IF(A4≥0.2,0%,IF(A4≥0.1,0.2%,IF(A4≥0.05,0.35%,0.45%))),0%)`. Compare the down payment in the same thousandths `percentThousandths` already uses: `≥ 20000` → 0%, `≥ 10000` → 0.2%, `≥ 5000` → 0.35%, else 0.45% |
   | Conventional PMI amount | `B8 × rate ÷ 12` |
   | Total monthly payment | Sum of the displayed cent amounts for principal and interest, property tax, home insurance, FHA MIP, and conventional PMI |

   Purchase price, down payment, base loan, and total loan amount financed are read-only echoes of the heading and requirement 8. Only the heading edits price, down payment, and note rate. The section's inputs are the eight fields in requirement 7. The property-tax row includes the sheet's label note, and that note is required: Nashua: 1.683%; Brentwood: 1.32%. The PMI row uses the sheet's label, Conventional PMI (Private Mortgage Insurance), and the computed rate. The sheet does not display a bracket sentence, so the page does not add one. Computed rates display from those constants (`0%`, `0.2%`, `0.35%`, `0.45%`), not from a binary fraction.

10. **Closing lines.** Same rounding. Sums of displayed cents, so the column adds up.

    | Line | Formula |
    |---|---|
    | Lender origination fee | `B6 × origination rate` |
    | Lender processing fee | The dollar input |
    | Conventional appraisal | The dollar input |
    | Title and escrow | `B3 × title rate` |
    | Recording and taxes | The dollar input |
    | Prepaid home insurance | One year of the monthly home-insurance line (`× 12`) |
    | Prepaid interest | `B6 × A5 ÷ 360 × 15`. The 360 and the 15 stay constants. They are not the loan term |
    | Prepaid property taxes | Four months of the monthly property-tax line (`× 4`) |
    | Escrow cushion | Two months of property tax + home insurance + FHA MIP. Conventional PMI is not in the cushion. The sheet formula is `(B11+B12+B13)×2` |
    | Total closing costs | Sum of the closing lines above, and not the down payment |
    | Total cash to close | Down payment + total closing costs |

11. **Section contents and order.** The disclosure is titled "Monthly payment and closing costs". Collapsed, only that header shows. Expanded, it shows the label Conventional, then the monthly rows in requirement 9's table order, then the closing rows in requirement 10's table order. The four echo rows have no inputs. Requirement 7's rate inputs sit on their row next to the computed amount. Flat fees are the amount. Computed rates are text. Dollar outputs use `formatMoney` / `formatGroupedCents`. The heading's whole-dollar figure does not; `formatGroupedCents` always shows cents, so the heading has its own whole-dollar formatting (requirement 12).

12. **Heading payment.** The heading dollar figure is the section's total monthly payment (the sum of those displayed cents) rounded half up to the nearest dollar, with grouping and a `$`, and no cents. The page does not copy the payment formula and does not read an unrounded payment out of `amortize.js`. On the default loan the cent total is 485310 ($4,853.10) and the heading is `$4,853`. The exact unrounded sum, 4853.098…, rounds to the same dollar; that was checked, and it is not a second code path. The heading figure's accessible name is "Complete monthly payment", so it is not the summary region named "Monthly payment".

13. **Disclosures.** Replace the `button` in `apps/web/src/app.tsx` (`section.prefill`, accessible name "Make extra payments", `aria-expanded` bound to `prefill.open`) with a `<details>` / `<summary>` whose summary text is still "Make extra payments". The new section is a second `<details>` / `<summary>` with the title in requirement 11. The summary row is the only control that opens or closes the section: a chevron, the title, no bordered button chrome, and no popup. The chevron is `aria-hidden` so the accessible name stays the title. The summary has an explicit `aria-expanded` attribute, because the existing checks read that attribute and a native summary does not set it as an HTML attribute. The global `button` border in `apps/web/src/styles.css` does not apply to the summary. The Apply button inside extra payments stays a normal button and still replaces the extra column. Both sections are closed when the flag is absent: a fresh visit, a corrupt save, or a picture object with no `open`. A saved `prefill.open: true` still opens extra payments. A saved picture `open: true` still opens the picture. Loading does not clear a saved open flag. `prefill.open` and the picture `open` flag persist in the same storage object. The year-row buttons and "Expand all years" in `apps/web/src/schedule.tsx` stay as they are. Down payment is shown in the upper block and is not repeated in the closing block.

14. **What does not move.** The chart, the schedule columns (including Saved by extra), payoff, interest saved, and months saved stay on the `buildReport` result for the financed principal. Editing a picture input does not run Apply and does not clear extras. The skill, `compound_interest_monthly.js`, and `amortize.js` gain no taxes, insurance, or closing-cost fields.

15. **Prototype gate.** Implement on one branch and open one feature pull request. Do not merge it. Do not push the feature onto `main`. Land the combined publisher on `main` without those feature commits, and pass the open feature branch in as its `ref` (D14). Do not widen the `github-pages` environment so the feature branch can deploy. Then stop. The prototype URL is `https://nikolaybotev.github.io/compound/prototype/`. Production stays `https://nikolaybotev.github.io/compound/`.

## 6. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | A unit test in `apps/web/unit/`, run with `pnpm --dir apps/web test`, for the default picture and `$600,000` / 5% / 7.375% / 30 years, reports financed principal 57000000 cents, principal and interest 393685 cents, tax 57500, insurance 17500, FHA MIP 0, PMI 16625, section total 485310, heading dollars 4853, origination 570000, processing 120000, appraisal 50000, title 450000, recording 80000, prepaid insurance 210000, prepaid interest 175156, prepaid taxes 230000, cushion 150000, closing 2035156, cash to close 5035156. Principal and interest equals `buildReport(570000, 7.375, 360, empty map).monthly_payment_cents`. Do not add `apps/web/test/` or a `*.test.ts` file that `node --test` collects. |
| AC2 | The same test treats down-payment thousandths `≥ 20000` as PMI 0, `≥ 10000` as 0.2%, `≥ 5000` as 0.35%, and below that as 0.45%. At 20% down on $600,000, PMI is 0. At 10% down, PMI is 9000 cents. At 4% down, PMI is 21600 cents. Separately, on the default loan (`$600,000`, 5% down, 7.375%), a 15-year term's principal and interest equals `buildReport` for 180 months on that same financed principal, and prepaid interest stays 175156 cents. That 15-year check is not the 4% row. |
| AC3 | Playwright, clock pinned to 2026-10-15, fresh storage: the heading shows `600`, `5`, `7.375`, and `$4,853`; the summary monthly payment is `$3,936.85` and the loan amount is `$570,000.00`; both disclosures are closed. Expanding the picture shows `$3,936.85`, `$575.00`, `$175.00`, `$0.00` FHA MIP, `$166.25` PMI, `$4,853.10`, and cash to close `$50,351.56`. |
| AC4 | Playwright: changing the heading down payment from 5 to 20 on that loan shows loan amount `$480,000.00` and PMI `$0.00`. Setting upfront MIP to `1.75` on the default base loan shows summary loan amount `$579,975.00`, and the principal-and-interest row equals `buildReport(579975, 7.375, 360, empty)` `monthly_payment_cents`. |
| AC5 | Playwright: "Make extra payments" is a `summary`, and the picture header is a `summary`. Neither summary uses the bordered button chrome (computed border width is 0). On the $570,000 / 7% / 30-year example, Apply of $100 still fills month 1, and Saved by extra for that month alone stays `$706.94`. Setting the property-tax input to `2` and then clicking Apply leaves the tax input at `2`. |
| AC6 | Playwright: a version-1 `compound-amortization-v1` payload with price `"570000"`, down `"0"`, rate `"7"`, years `"30"`, start `"2026-10"` still shows loan amount `$570,000.00` and summary payment `$3,792.22`, and the heading thousands field shows `570`. The picture opens at the requirement 7 defaults. |
| AC7 | The heading price field is thousands in every Playwright fill. `570000` becomes `570`, `712500` becomes `712.5`, and `399999.00` becomes `399.999`, in `page.spec.ts`, `extras.spec.ts`, and `saved-by-extra.spec.ts`. The pinned-clock fresh load in `page.spec.ts` and the corrupt-storage reload in `extras.spec.ts` (the `{` payload) expect the Conventional first visit from requirement 6 and AC3, not `$3,792.22`. The example-loan checks (schedule, chart, November 2039 card, extra prefill, Saved by extra) still enter `$570,000` / 7% / 30 years by filling `570`. `node --test` passes. The calculator's JSON and CSV gain no fields. |
| AC8 | The feature pull request is open and unmerged. With storage cleared, `https://nikolaybotev.github.io/compound/` is the `main` page: monthly payment `$3,792.22`, and no "Complete monthly payment" figure. `https://nikolaybotev.github.io/compound/prototype/` shows the AC3 heading. The prototype HTML references `/compound/prototype/` and the production HTML does not. The two URLs share `localStorage` on `nikolaybotev.github.io`, so this check clears the key before the production load. |

The feature pull request's CI runs `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e`. AC1 and AC2 run only in `pnpm --dir apps/web test`. `node --test` does not collect them. AC8 is the prototype gate after that CI is green. Pull-request CI does not fetch either Pages URL.

## 7. Design decisions

**D1 — Conventional only.** The workbook's sheets are July 26th, Sep 4 2020, Eric 2026, FHA 2026, and Conventional. This change uses the one table on Conventional. Loan type stays the constant `Conventional`. Checked 2026-10-04 by reading the file with `numbers-parser` (it warned that file version 26.4.0 is unsupported, and it still returned the cells below).

**D2 — The picture lives on the page.** It is a section in `apps/web`, beside extra payments. The CLI and the skill do not learn these lines. The skill's rule against inventing taxes and insurance stays.

**D3 — Disclosure headers.** Today's extra-payment control is a `<button>` in `section.prefill` inside `apps/web/src/app.tsx`, styled by the global bordered `button` rule in `apps/web/src/styles.css`, with the panel `hidden` from `prefill.open`. That is the control the prompt rejects. Both sections use `<details>` and `<summary>` with a chevron. Apply stays a button. Year rows and "Expand all years" stay; they are the schedule, not this pattern. No popup.

**D4 — Heading meaning.** `600` is thousands of purchase price, `5` is percent down, `7.375` is the note rate. The payment is computed. The sheet heading formula is `LEFT(B3÷1000,3)&"K | "&ROUND(A4,4)&" down | "&ROUND(A5,5)&" fixed = $"&B15&" / month"`, and the stored formatted value is `600K | 5% down | 7.375% fixed = $4,853 / month`. The page does not copy `LEFT(..., 3)`. Term stays outside the heading because the sheet's heading has no years and the page still needs the control.

**D5 — Formulas come from the file.** Checked 2026-10-04 from the Conventional table (28 rows, 3 columns). Green input cells are loan type, purchase-price thousands `600`, down payment `5%`, and note rate `7.375%`. Term `30` is an input with no fill. The formulas are the ones in requirements 9 and 10. The screenshot was the visual check that this sheet and this heading are the ones in the prompt. An image description of that screenshot inserted `1.15% tax` into the heading; the cell value does not. The heading has no tax segment.

**D6 — Which cells are inputs.** Editable: the three heading fields, term, start month, and requirement 7's eight picture fields. Those eight are typed, which is the exception P2 names. Upfront MIP is one of them even though the sheet computes it, because a non-zero value has to be able to enter the financed principal, and the Conventional result of that formula is the default 0%. A builder who leaves it computed at 0% cannot pass AC4. PMI and FHA MIP stay formulas so the down-payment brackets keep working and FHA stays 0 without a loan-type switch. Flat fees and the rate inputs that are plain cells on the sheet stay editable. The 15-day prepaid-interest count stays a constant.

**D7 — Principal and interest.** Checked 2026-10-04. The sheet formula `PMT(A5÷12,A9×12,B8)×-1` stores 3936.84834130483 and formats it as `3,937` (nearest dollar). `buildReport(570000, 7.375, 360, empty)` returns 393685 cents, `$3,936.85`. The walk's payment differs from the stored sheet number by about 3.6e-12 dollars, and both half-up to the same cent. The page shows `$3,936.85` in the summary and in the picture, because reported amounts round once to the cent and the walk does not round each month. The sheet's `3,937` is the same payment in a whole-dollar format. The page does not show `3,937`.

**D8 — Other rounding.** The sheet formats the picture dollars as whole numbers: PMI `166` (exact 166.25), prepaid interest `1,752` (exact 1751.5625), total monthly `4,853` (exact 4853.098…), closing `20,352` (exact 20351.5625), cash to close `50,352` (exact 50351.5625). The page's section uses cents: `$166.25`, `$1,751.56`, `$4,853.10`, `$20,351.56`, `$50,351.56`. The heading dollar is the nearest dollar of that cent total, not a second rounding of the unrounded sum and not a copied payment formula. On this loan the cent total is `$4,853.10` and both that total and the exact sum 4853.098… round to `$4,853`. Checked 2026-10-04.

**D9 — Term, extras, recast.** The heading hides years. The years control remains. The page has no months term (`LoanDraft` is price, down, years, rate, start), so this change does not add one. Extra principal, Apply-replaces, Saved by extra, and the schedule stay. Recast is untouched in the skill and the CLI.

**D10 — Defaults versus saved loans.** A fresh visit uses the Conventional loan, which replaces the page's `$570,000` / 0% / 7% first visit. A saved version-1 scenario keeps its dollar price and its other loan fields. Picture keys are new; absence means the requirement 7 defaults, section closed. Production and the prototype are the same origin, so they share `compound-amortization-v1`. The prototype check clears that key before reading production.

**D11 — One walk.** Financed cents are the `buildReport` principal. Default upfront MIP 0 leaves the familiar `$570,000`. `savedByExtraCents` uses that same principal. `amortize.js` does not gain picture math.

**D12 — Insurance brackets.** PMI uses the Conventional formula in requirement 9, compared in integer thousandths so 5%, 10%, and 20% land on the sheet's boundaries. FHA MIP's formula evaluates to 0% for Conventional, and the amount formula still multiplies the financed balance.

**D13 — When numbers update.** Heading fields and picture inputs recompute on a valid edit. Extra payments still change the schedule only on Apply or on a committed cell. A picture edit does not apply extras.

**D14 — Prototype deploy.** Checked 2026-10-04. `.github/workflows/deploy-pages.yml` builds with `VITE_BASE=/compound/` and uploads `apps/web/dist` through `actions/upload-pages-artifact` and `actions/deploy-pages`. That artifact is the whole site. A prototype-only upload would delete `https://nikolaybotev.github.io/compound/`. `gh api repos/nikolaybotev/compound/pages` reports `build_type: workflow` and `https://nikolaybotev.github.io/compound/`. The `github-pages` environment's deployment branch policy lists only `main`. Do not widen that policy so the feature branch can deploy. The publisher runs on `main`. Land it on `main` in a commit that does not contain the feature. Pass the open feature branch in as `ref`. While the prototype is up, that combined publisher is the only Pages upload. A push to `main` rebuilds the `main` build at the site root and `prototype/` from `ref` together. It must not publish production alone and delete `prototype/`. `deploy-pages.yml` keeps its `push` to `main` and `workflow_dispatch` triggers and becomes that publisher: `ref` defaults to the open feature branch, a dispatch may pass another ref, the root build uses `VITE_BASE=/compound/`, and `prototype/` uses `VITE_BASE=/compound/prototype/`. If `ref` cannot be checked out, the job fails and uploads nothing. There is no second uploader. The feature pull request is not merged. The URL is `https://nikolaybotev.github.io/compound/prototype/`.

**D15 — Labels follow the sheet.** Row titles are the sheet's names, shortened only as the requirement 9 and 10 tables already are. Order follows the sheet from top to bottom. Base loan, financed amount, and down payment are included so the walk's principal and cash to close can be checked against the rows.

**D16 — Price storage stays dollars.** `LoanDraft.price` remains a dollar string. The heading is a view of that string in thousands, with a focus buffer so `600.` is typeable. Existing `parseLoan` callers keep dollar strings. Every Playwright `#price` fill is thousands: `570000` becomes `570`, `712500` becomes `712.5`, and `399999.00` becomes `399.999`. The pinned-clock fresh load and the corrupt-storage reload follow requirement 6, not the old `$3,792.22` first visit.

**D17 — Closed when the flag is absent.** A fresh visit, a corrupt save, and a picture object with no `open` flag start both sections closed. The heading already shows the complete monthly dollar, so the breakdown is one click away. A saved `prefill.open: true` still opens extra payments. A saved picture `open: true` still opens the picture. Loading does not clear a saved open flag.

**D18 — Dependencies.** No npm dependency on the calculator or on `node --test`. Picture arithmetic lives in `apps/web` and calls `buildReport`. No new page dependency is required.

**D19 — Prepaid interest is not the term.** `B6×A5÷360×15` is 15 days of note-rate interest on the base loan on a 360-day year. Changing the term to 15 years does not change this line.

**D20 — Escrow cushion.** `(monthly tax + monthly insurance + monthly FHA MIP) × 2`. Conventional PMI is outside it, matching `B11+B12+B13` and not `B14`.

**D21 — Two payment figures, two names.** The summary "Monthly payment" remains principal and interest, and extra principal is on top of it. The heading is the complete monthly payment, whole dollars, accessible name "Complete monthly payment". The section total is the cent sum, labeled "Total monthly payment".

**D22 — What this supersedes.** Only these points of `intent/amortization-app`: the fresh-visit loan is the Conventional default instead of `$570,000` / 0% / 7%, and "Make extra payments" is a disclosure summary instead of a bordered button. The `$570,000` / 7% / 30-year example remains the schedule fixture; tests enter it by filling thousands `570`. Saved by extra, the chart, payment 1 being the month after the start month, and Apply replacing the extra column are unchanged. `intent/loan-recast` is unchanged. `intent/mortgage-skill` is unchanged, including its refusal to invent taxes. The `AGENTS.md` Cloud sentence that still names the old fresh load is updated when this default lands, and that old loan is not put back.

## 8. Open questions

None.
