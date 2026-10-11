# intent.md — Schedule and scenario fixes

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-11 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/facelift-touchups/](../facelift-touchups/intent.md) |

## Problem

After 0.10, the closed scenario control leaves off the number the open menu already shows, and the schedule still has a Prevailing extra column beside Extra payment.

## Proposed outcome

One release at point version 0.11. The closed scenario control shows the same list number as the open menu. The schedule no longer has a Prevailing extra column. Extra payment still shows each month’s amount. The prevailing extra stays on the summary bar.

## Affected users and systems

- **Users:** The owner on the amortization page.
- **Systems:** `apps/web` sources, styles only if a column rule depends on the dropped column, unit tests only if a cell index moves, Playwright specs, `AGENTS.md`, `REVIEW.md`, and this intent folder. `amortize.js` does not change.

## Constraints and principles

- The two items under Original prompt are the source of truth. Item 6 in the follow-up queue is already on main and is out of scope.
- This folder builds on `intent/facelift-touchups/`. Where `intent/ui-facelift/` leaves the closed scenario control unnumbered, and where `intent/loan-scenarios/` or `intent/arm-loan/` put a Prevailing extra column on the schedule, this change wins.
- Do not name a credit union in these three files.

## Open questions (carried into spec.md)

None.

## Original prompt (verbatim)

5. The closed scenario dropdown shows the same list number as the open menu, as in `1: $5,853 - 600K | 5% down | 7.375% | 30 years | fixed`.

7. The schedule drops the Prevailing extra column. Extra payment already shows each month’s amount. The prevailing extra stays on the summary bar.
