# intent.md — UI follow-ups

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-04 (queued), 2026-10-10 (released for design) |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/amortization-app/](../amortization-app/intent.md), [intent/extra-savings-column/](../extra-savings-column/intent.md), [intent/complete-loan-picture/](../complete-loan-picture/intent.md), [intent/arm-loan/](../arm-loan/intent.md), [intent/feature-previews/](../feature-previews/intent.md) |

## Problem

The amortization page works, and ten small things about it get in the way of reading it. The start month is a plain text field in Safari (`2026-11`) because that browser has no month picker. The summary says the extra payment is on top of the monthly payment even when there is no extra payment, and it does not say how much extra principal was paid. "Months saved" and the payoff date are a raw month count and a bare date, so 28 months and April 2056 take arithmetic to read. The month-of-year dropdown in the extra-payments form sits lower than the text fields beside it in Safari. The sentence about Apply is at the top of the form, away from the button it describes, and says "replaces" when it rewrites every cell. A cell edited by hand looks the same as one Apply wrote, so there is no way to see what the next Apply will overwrite. Saved by extra has no yearly subtotal while every other money column does. The chart legend stays pinned inside the chart and only slides sideways, so on a small screen it covers the bars and the pointer cannot reach the months underneath it.

## Proposed outcome

The same page, with those ten things fixed, in one release. The start month opens a calendar-style month picker in every browser. The fixed-rate summary drops the extra-payment sentence, gains an "Extra principal paid" figure, and reads months saved and the payoff duration in years and months. The month-of-year select lines up with its neighbours in Safari. The Apply sentence sits beside the button and says it rewrites all extra-payment column values. Cells edited since the last Apply are blue until Apply runs. The year rows carry a Saved by extra subtotal. The legend follows the pointer and stays out from under it.

## Affected users and systems

- **Users:** The owner, on the amortization page, in Safari and Chromium, on a desktop and on a phone.
- **Systems:** `apps/web` only: `src/app.tsx`, `src/schedule.tsx`, `src/chart.tsx`, `src/loan.ts`, `src/styles.css`, a new month-picker component, the unit tests in `apps/web/unit/`, and the Playwright specs in `apps/web/e2e/`. `AGENTS.md` and `REVIEW.md` are updated where the page's described behavior changes. `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, both skills, and the workflows are untouched.

## Constraints and principles

- All ten items ship in this release. None is deferred.
- Item 2 removes the fixed-mode sentence "The extra payment is on top of this amount." The ARM sentence from `intent/arm-loan/` stays word for word: "Initial payment. The extra payment is on top of this amount, and the payment resets at each adjustment."
- Edited extra-payment fields are blue until Apply. The color was offered as a suggestion in the list and is now the choice.
- No change to the ARM rate math, to the Pages deploy, or to the CodeQL work on its own branch.
- The page keeps calling `buildReport`. No figure on the page comes from a second formula. Every new number is read from, or summed from, the report the page already has.
- Design decisions are numbered. A question stays open only if it is truly undecidable.
- The repo's feature cycle: Claude Fable writes the spec and plan, Grok reviews them, Claude Sonnet builds. The spec and plan go up as a pull request and the usual checks run on it.

## Open questions (carried into spec.md)

None. The choices made while drafting are D1–D20 in [spec.md](spec.md).

## Original prompt (verbatim)

> # UI follow-ups
>
> Queued 2026-10-04. Do not start until the complete loan picture prototype is up for review. These touch the same page as that work.
>
> 1. Start month uses a calendar popup. It is a plain-text field today (`2026-11`).
> 2. Remove the note "The extra payment is on top of this amount."
> 3. Add "Extra principal paid" before "Interest saved".
> 4. Months saved reads "X years Y months" when X > 0.
> 5. Payoff date adds "(X years Y months)" after the date. The years part shows only when X > 0.
> 6. Month of year dropdown lines up with the text fields beside it in Safari: bottom silver border and the text baseline.
> 7. Move "Apply replaces the extra-payment column." next to the Apply button and change it to "rewrites all extra-payment column values."
> 8. Extra-payment fields edited since the last Apply show in another color (blue is the suggestion) and return to the normal color on Apply.
> 9. Saved by extra also shows yearly subtotals.
> 10. The chart legend follows the cursor. It currently stays inside the chart and only slides left and right, so on a small screen it covers the chart and the pointer cannot reach the values underneath.
>
> ![Start month field](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-followups/start-month.png)
>
> ![Extra payment note](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-followups/extra-payment-note.png)
>
> ![Loan summary](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-followups/loan-summary.png)
>
> ![Extra payments form](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-followups/extra-payments-form.png)
>
> ![Chart legend](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/ui-followups/chart-legend.png)

## Decisions given with the request (verbatim)

The owner released the queued list for design on 2026-10-10 with these decisions already made:

> - All ten items in that list are in this release.
> - Item 2 removes the fixed-mode sentence "The extra payment is on top of this amount." Keep the ARM sentence from intent/arm-loan: "Initial payment. The extra payment is on top of this amount, and the payment resets at each adjustment." Record that split.
> - Edited extra-payment fields use blue until Apply. That color was a suggestion and is now the choice.
> - Do not change ARM rate math, Pages deploy, or the CodeQL work that is happening on another branch.
> - Number decisions. Leave a question open only if it is truly undecidable.

## Screenshots

Copies of the five screenshots from the prompt, taken in Safari on the production page on 2026-10-04:

- [screenshots/start-month.png](screenshots/start-month.png): the heading row with Start month as a text field showing `2026-11` (item 1).
- [screenshots/extra-payment-note.png](screenshots/extra-payment-note.png): the Monthly payment block with the sentence to remove highlighted (item 2).
- [screenshots/loan-summary.png](screenshots/loan-summary.png): the summary grid with Payoff date `April 2056`, Interest saved `$25,252.33`, and Months saved `7` (items 3–5).
- [screenshots/extra-payments-form.png](screenshots/extra-payments-form.png): the extra-payments form with the Month of year select sitting below the baseline of the two amount fields (item 6).
- [screenshots/chart-legend.png](screenshots/chart-legend.png): the legend card covering the left half of the chart (item 10).
