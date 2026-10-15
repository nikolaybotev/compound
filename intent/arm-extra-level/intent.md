# intent.md — ARM extra level

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-15 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/arm-loan/](../arm-loan/intent.md), [intent/ui-facelift/](../ui-facelift/intent.md) |

## Problem

On an ARM, extra principal is a form the owner fills in and Apply writes onto every month. After a reset the principal-and-interest payment changes, and the extra stays at whatever the form wrote. The owner cannot ask the page to keep each month's principal-and-interest plus extra at the fixed-period total.

## Proposed outcome

The Extra Payments form has a checkbox on ARM loans. It defaults off, and a fixed-rate loan does not show it. When it is on, Apply sets the extras after the fixed period so each month's principal-and-interest plus extra matches that month's fixed-period total, and never goes below zero. Taxes and insurance stay out of the match. A later index edit, when no extra amount has been edited since that Apply, updates the months on the new rate and every later adjustment period the same way.

## Affected users and systems

- **Users:** The owner on the amortization page, comparing an ARM's payment across resets.
- **Systems:** The Extra Payments form, the schedule's extra column, index commits, and the scenario stored for that loan. The calculator library stays as it is.

## Constraints and principles

- The request under Original prompt is the source of truth.
- This folder builds on `intent/arm-loan/` and `intent/ui-facelift/`. The ARM walk, the index cell, and the Extra Payments form stay as those specs left them, except where this change adds the checkbox and the extras that Apply and an index edit write.
- The post-reset extras come from the existing walk. A period's payment is set at the reset. Extras inside that period do not change that payment. `amortize.js` does not change.
- Taxes and insurance are not part of the match.
- These three files do not name a credit union.
- The point version stays unchanged on this docs pull request.

## Open questions (carried into spec.md)

None. The spec records the choices the request left to the page.

## Original prompt (verbatim)

# ARM extra level

Add a checkbox on the Extra Payments form for ARM loans.

When it is on, extra payments after the initial fixed period are set so each month’s principal-and-interest plus extra matches that month’s total during the fixed period. Taxes and insurance are not part of the match.

The fixed-period total for a month is that month’s fixed-period principal-and-interest plus the extra the form would put on that month, including a yearly extra in its month. After a reset, the new extra is the fixed-period total minus the new principal-and-interest, and never below zero. If the new principal-and-interest is already at least the fixed-period total, the extra for those months is 0.

The checkbox is shown for ARM loans and defaults off. Fixed-rate loans do not show it.

Apply writes those extras. If the user later changes an index for an adjustment period, and no extra-payment amount has been edited since that Apply, update the extras for the months on that new rate and for every later adjustment period. Each of those months keeps principal-and-interest plus extra equal to its fixed-period total when the new principal-and-interest is still below that total, and 0 otherwise. If any extra amount was edited since Apply, do not change extras because of the index edit.
