# intent.md — Facelift touch-ups

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-11 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/facelift-followups/](../facelift-followups/intent.md) |

## Problem

After the 0.9 follow-ups, three controls on the amortization page are still wrong. FICO is a score plus a row of range buttons. Taxes and Insurance lists property tax, home insurance, and conventional PMI without a subtotal. The summary prevailing bar puts each amount above its segment, where a narrow segment clips the amount.

## Proposed outcome

One release at point version 0.10. FICO is one inline dropdown of the five ranges, the same kind of control as fixed/ARM. Taxes and Insurance ends with the subtotal of those three monthly amounts. The summary prevailing bar shows each component’s dollar amount inside the segment, readable, starting at the segment’s left edge.

## Affected users and systems

- **Users:** The owner on the amortization page.
- **Systems:** `apps/web` sources, styles, unit tests, Playwright specs, `AGENTS.md`, `REVIEW.md`, and this intent folder. `amortize.js` does not change.

## Constraints and principles

- The queue under Original prompt is the source of truth.
- This folder builds on `intent/facelift-followups/`. Where that spec keeps a score, the word FICO, and range buttons, or places summary-bar amounts above the segments, this change wins.
- Do not name a credit union, a borrower, an address, or a loan number in these three files.

## Open questions (carried into spec.md)

None.

## Original prompt (verbatim)

# Facelift touch-ups

Implement now. Builds on `intent/facelift-followups/`.

![FICO control](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/facelift-touchups/01-fico.jpg)

![Prevailing bar](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/facelift-touchups/02-bar.jpg)

1. FICO is only an inline dropdown, the same kind of control as the fixed/ARM dropdown. It shows the range: 780+, 740–779, 700–739, 660–699, or 620–659. No separate low-bound score such as 780, no extra FICO label, and no button grid.
2. Taxes and Insurance ends with a subtotal of property tax, home insurance, and conventional PMI.
3. The prevailing bar shows each component’s dollar amount. The amount is readable and lines up with the left edge of its segment.
