# intent.md — Amortization app

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-02 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [../mortgage-skill/intent.md](../mortgage-skill/intent.md) |

## Problem

The mortgage calculator answers a fixed loan from the command line, and the skill answers the same loan in chat. Neither is a page a person can operate: change the price or the rate, see the balance shift, and type an extra principal amount on one month without writing a CSV. Bankrate's amortization calculator is that page, and it is the wrong one to extend. It is their site, the chart is a set of lines with a legend pinned to the side, and an extra-payment field changes the schedule as you type, which fights a schedule whose extra column is itself editable.

## Proposed outcome

A single page, opened in a browser, with no account and no server. The loan is a purchase price and a down payment, a term, a note rate, and a start month. Under that sits the payment, the derived loan amount, the interest, the total cost, and the payoff month. Under that, a full-width stacked bar chart of principal paid, interest paid, loan balance, and interest remaining, with the legend appearing only while the pointer is on a month. Under that, the schedule by year, and the extra payment on each row can be edited. A "Make extra payments" section above the table prefills a monthly amount and a once-a-year amount, and it changes the table only when Apply is clicked.

## Affected users and systems

- **Users:** The owner, in a browser. Anyone who opens the published page.
- **Systems:** `compound_interest_monthly.js` and the pure walk it will call. A static page in this repo, published to GitHub Pages the way [goldvalue](https://github.com/nikolaybotev/goldvalue) publishes `apps/web/dist`. No new repository. No network service at runtime.

## Constraints and principles

- The page runs entirely in the browser. Computing a loan does not call a server.
- The numbers come from this repo's calculator. The page does not grow a second amortization.
- The layout is top to bottom: inputs, summary, chart, extra-payment prefill, schedule.
- The chart is a stacked bar chart and uses the full width of the page. The legend is a popup on the month under the pointer, not a column beside the chart.
- Extra payment cells in the schedule are editable.
- The monthly and yearly prefill is applied by a button, not on each keystroke.
- Principal paid is drawn with a piggy bank. Interest paid is drawn with a hooded figure carrying a sack of money.
- Deployed to GitHub the way goldvalue is: a static build, GitHub Actions, GitHub Pages.

## Open questions (carried into spec.md)

None. The design choices made while drafting are D1–D17 in [spec.md](spec.md).

## Original prompt (verbatim)

> Take a look at the @github.com/nikolaybotev/compound/intent/mortgage-skill project's intent plan and spec. The project just got built, let's start on the next project spec and plan using /ai-native-sdlc .
>
> I want an app that is similar to and inspired by bankrate's calculator at https://www.bankrate.com/mortgages/amortization-calculator/ , but with key adjustments and distinctive features:
>
> 1) SPA that runs entirely locally in browser.
> 2) Backed by our @github.com/nikolaybotev/compound/compound_interest_monthly.js as the backend
> 3) Deployed to github similar to how @github.com/nikolaybotev/goldvalue  is deployed.
> 4) A top-down layout with:
> a) Inputs (Loan amount, term, Interest, start month) at the top. Maybe better to split Loan amount into Purchase Price and % downpayment, and derive the loan amount.
> b) Summary (Monthly payment, Loan amount, Total interest paid, Total cost of loan, Payoff date) below that
> c) Chart below, full width, with Principal paid, Interest paid, Loan balance, Interest remaining, and unlike the bankrate chart I want ours to be a stacked bar chart. The legent should not be permanently visible on the right, but instead full-width chart, with popup legend that shows up on hover over the chart showing the values at the given point. Additional values should be shown in the popup legend for that month's payment - Principal, Interest, Extra Principal
> d) Schedule below the chart with # (Month Number), Date, Principal, Interest, Extra Payment, Principal balance, Interest balance. Schedule should be grouped by year similar to how bankrate does it
> e) Key feature! Extra Payment in the schedule should be editable!
> f) To facilitate schedule extra payments prefill, we should have a "Make extra payments button that opens a popup (or expandable section actually) situated above the schedule table with "Additional amount to monthly payment" and "Additional yearly payment every" fields ala bankrate. Unlike bankrate's live edits, because we have full schedule extra payment customizability, the "Make extra payments" fields should be applied manually by clicking an "Apply" button on the form.
>
> Styling:
>
> A) Principal paid should have a piggy bank icon in the chart, Interest paid should have a bank robber (or robin hood) carrying a sack of money icon.

The message included two screenshots of that Bankrate page for a $570,000 loan at 7% for 30 years with loan start date October 2026: the chart, and the schedule.
