# intent.md — Extra savings column

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-03 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [../amortization-app/intent.md](../amortization-app/intent.md) |

## Problem

The schedule shows the extra payment on each row and the summary shows how much interest the whole plan saves. Nothing on the row says what that one extra does over the life of the loan. The interest-saved number already stored on a schedule row is the running difference against a loan with no extras. It is $0 in the month the extra is paid.

## Proposed outcome

The schedule gains one column, immediately after Extra payment. For each month it shows how many dollars of interest that month's extra payment saves over the life of the loan, given the other extras already on the schedule.

## Affected users and systems

- **Users:** The owner, on the amortization page.
- **Systems:** `apps/web`, calling `buildReport` in `amortize.js`. The command-line JSON stays as it is. No new repository.

## Constraints and principles

- The column sits next to Extra payment.
- The amount is the lifetime interest saved by that month's extra, not the interest saved so far.
- The page does not grow a second loan walk. The figure comes from the existing calculator.
- A month with no extra shows no savings from an extra.

## Open questions (carried into spec.md)

None. The design choices made while drafting are D1–D8 in [spec.md](spec.md).

## Original prompt (verbatim)

> Thanks! Go ahead and build this using /ai-native-sdlc I pre-clear review and build gates on my end. Use Composer 2.5 for review and build.

## Source transcript (verbatim)

User:

> Was it not feasible to implement a column in the schedule next to Extra Payment to show how much dollars of interest the extra payment for that month saves over the life of the loan?

Assistant:

> It was feasible. Version 1 left it out because the schedule columns you named did not include it, and the interest-saved figure the calculator already stores does not mean that.
>
> That stored figure is cumulative. It is the interest the no-extra loan has charged through that month, minus the interest this loan has charged through that month. An extra is applied after that month's interest, so the figure is $0.00 in the month you pay it. On the $570,000 loan at 7% for 30 years, $100 extra in each of the first 12 months has saved $39.26 by month 12 and $8,137.70 by the end.
>
> The column you are describing is the lifetime effect of that one row. Remove that month's extra, run the same walk, and subtract. On that loan, $100 in month 1 alone saves $706.94 over the life of the loan. The same $100 in month 12 alone saves $656.93. In month 180 it saves $184.89. Inside the first-year plan, month 1's $100 saves $697.61, because the other eleven extras have also reduced the balance. Those twelve isolated savings add up to $8,180.33, which is more than the plan's $8,137.70, so the column is the marginal savings of that cell given the rest of the schedule.
>
> Each cell needs one more walk. A 30-year loan is a few hundred of those, which the page can do locally.
