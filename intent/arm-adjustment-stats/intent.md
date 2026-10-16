# intent.md — ARM adjustment stats

| | |
|---|---|
| Captured | 2026-10-16 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/arm-loan/](../arm-loan/intent.md), [intent/arm-extra-level/](../arm-extra-level/intent.md) |

## Problem

An ARM's lifetime ceiling and first adjustment date are visible on the page, and the calculator already walks the reset. Nothing in the library, the command-line tool, or the mortgage skill reports the floor beside that ceiling, the minimum and maximum change in principal and interest at the first adjustment, or the monthly extra that keeps the worst-case payment at that adjustment from rising once the extra's effect on the balance is included.

## Proposed outcome

One formula in the library produces those figures. The command-line tool prints them. The mortgage skill answers from that tool and does not compute them. The page reads them from the library and shows the floor, the payment change, the even-out extra, and a yearly-extra calculator in the ARM section. The Extra Payments form and the schedule stay as they are.

## Affected users and systems

- **Users:** The owner, comparing an ARM's first adjustment on the page or through the skill.
- **Systems:** `amortize.js` and `amortize.d.ts`, `compound_interest_monthly.js`, `.agents/skills/mortgage-loan-calculator/SKILL.md`, and the ARM terms section on the page. The Extra Payments form, the schedule columns, and the ARM concepts skill stay as they are.

## Constraints and principles

- The request under Original prompt is the source of truth.
- This folder builds on `intent/arm-loan/` and `intent/arm-extra-level/`. The walk, the index cell, the schedule, and the level-extra checkbox stay as those specs left them, except for the figures this change adds beside the schedule.
- The formula lives in `amortize.js`. That file stays free of Node APIs. The page imports the library and does not keep a second formula. The skill runs `compound_interest_monthly.js` and does not compute the figures itself.
- The build order is the library, then the command-line tool, then the skill, then the page.
- The even-out extra is the smallest cent at which the first-adjustment payment is at or below the initial principal and interest plus that cent. A fixture that lands one cent under is not called equal. It is not the no-extra payment jump.
- These figures are not written into the schedule, and they do not change the Extra Payments form.
- These three files do not name a credit union.
- The point version stays unchanged on this docs pull request.

## Open questions (carried into spec.md)

None. The spec records the choices the request left open.

## Original prompt (verbatim)

# ARM adjustment stats

Ship the same figures through the stack, in this order: the pure library, the command-line tool, the mortgage skill, then the web app. The page imports the library. It does not keep a second formula. The skill runs the command-line tool and does not compute the figures itself.

Do not change the Extra Payments form, and do not write these figures into the schedule.

## Floor and first-adjustment range

Show the floor rate next to the ceiling rate.

Next to First adjustment, show the minimum and maximum change in the monthly principal-and-interest payment at the first adjustment. Compare each reset payment with the initial principal-and-interest payment.

Compute both ends with no extra payments. The maximum is the ceiling-rate payment minus the initial payment. The minimum is the lowest payment the first adjustment can reach under the caps and the floor, minus the initial payment. The minimum can be negative.

## Even-out extra, worst case

Show the monthly extra that evens the first adjustment in the worst case. Paying that extra during the fixed period makes the ceiling principal-and-interest at the first adjustment equal the initial principal-and-interest plus that extra.

The extra lowers the balance, so the ceiling payment is not the no-extra ceiling payment. Solve for the extra that includes that effect. It is smaller than the maximum payment change above.

If the ceiling payment with no extra is already at or below the initial payment, the even-out extra is 0.

## Yearly extra, separate calculator

In the same ARM section, two inputs that do not touch the Extra Payments form or the schedule: a yearly extra amount and the month of the year it lands.

Given those, solve for the monthly extra such that, at the first adjustment in the worst case:

initial principal-and-interest + monthly extra = ceiling principal-and-interest

The yearly extra changes only the balance used to compute that ceiling payment. The equality is for a normal month, not the month that also includes the yearly extra.
