# intent.md — Complete loan picture

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-04 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [../amortization-app/intent.md](../amortization-app/intent.md), [../extra-savings-column/intent.md](../extra-savings-column/intent.md), [../loan-recast/intent.md](../loan-recast/intent.md) |

## Problem

The amortization page shows principal and interest, the schedule, and extra principal. It does not show the rest of the monthly payment or the cash due at closing that the Conventional sheet of the Numbers workbook already calculates: taxes, insurance, mortgage insurance, and the closing-cost lines. The primary inputs are a stack of labeled fields, not the one-line heading of that sheet. The extra-payment block is opened by a regular button, which is the popup-or-section idea landing as both.

## Proposed outcome

The page still amortizes with the existing calculator. A heading in the form `600K | 5% down | 7.375% fixed = $4,853 / month` is the primary input, with the purchase price in thousands, the down payment, and the note rate editable in place and the payment computed. Extra payments and a new monthly-payment and closing-cost section each open from their own header row, with a chevron, not from a separate button and not from a popup. The new section follows the Conventional sheet only. A prototype of that page is published beside the current GitHub Pages site for review, and the feature is not merged.

## Affected users and systems

- **Users:** The owner, in a browser, comparing a conventional purchase with the Numbers sheet.
- **Systems:** The amortization page in `apps/web`, which already calls `buildReport` in `amortize.js`. GitHub Pages at `https://nikolaybotev.github.io/compound/`, plus a new prototype URL recorded in [spec.md](spec.md). The command-line calculator and the mortgage skill stay as they are.

## Constraints and principles

- Use only the Conventional sheet. The other sheets in the workbook are out of scope.
- The page does not grow a second amortization. Principal and interest come from `buildReport`.
- Extra principal, Saved by extra, the schedule, and the skill's recast stay.
- The heading payment is computed. It is not a typed field.
- Do not merge the feature into `main`. Do not replace the current Pages site. Publish the prototype beside it, then stop for review.
- No new dependency on the calculator. Page dependencies stay in `apps/web`.

## Open questions (carried into spec.md)

None. The choices made while drafting are D1–D22 in [spec.md](spec.md).

## Original prompt (verbatim)

> Nikolay July 26th Purchase Parameters - Mortgage Loan Calculator.numbers /ai-native-sdlc to build a complete picture monthly payment and closing costs to our amortization calculator. This should be an expandable section like the extra payments one. I am not too fond of the UI of using a regular-looking button to toggle an expandable section (my prompt was not clear - I was rambling about a button opening a popup OR an expandable section and I got both - a button that controls an expandable section) - can we improve the expandable section UI from a button to a more traditional expandable section visual, and use that for both the extra payments, and for the complete loan calculator)?
>
> Also I would love to explore compressing the inputs UI into something that matches the heading of the Numbers sheet - "600K | 5% down | 7.375% fixed = $4,853 / month" with each portion in-line editable (600, 5, 7.375).
>
> Use ONLY the "Conventional" sheet from the Numbers file! Ignore the other sheets! Refer to screenshot.
>
> Drive this all the way through review and build gates without me - have my clearance.
>
> Deviation from skill workflow: Stop short of merging the build PR! Deploy the final version from the PR branch onto a new test location on github.io (side-by-side with current main-branch deployment) and stop for me to review the new prototype version.
