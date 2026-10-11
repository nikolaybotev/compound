# intent.md — Facelift follow-ups

| | |
|---|---|
| Captured | 2026-10-11 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/ui-facelift/](../ui-facelift/intent.md) |

## Problem

After the 0.8 UI facelift shipped, four layout and control issues remained on the amortization page. The open scenario list is wider than the closed control. FICO is still a typed field beside a range select. Summary prevailing-bar labels do not line up with their segments. ARM terms sit between the summary and the chart instead of directly under the scenario line.

## Proposed outcome

One release at point version 0.9. The scenario menu matches the closed trigger width. FICO is five inline range controls on the heading line; scores below 620 are not enterable and stored scores below 620 load as 620. Summary bar labels sit at the left edge of each segment and stay readable. ARM terms sit directly under the scenario line and above Taxes and Insurance.

## Affected users and systems

- **Users:** The owner on the amortization page.
- **Systems:** `apps/web` sources, styles, unit tests, Playwright specs, `AGENTS.md`, `REVIEW.md`, and this intent folder. `amortize.js` does not change.

## Constraints and principles

- The queue under Original prompt is the source of truth.
- This folder builds on `intent/ui-facelift/`. Where that spec places ARM terms between the summary and the chart, this change wins: ARM terms sit directly under the scenario line and above Taxes and Insurance.
- Do not name a credit union, a borrower, an address, or a loan number in these three files.

## Open questions (carried into spec.md)

None.

## Original prompt (verbatim)

# Facelift follow-ups

Queued after 0.8. Build starts when the build is requested.

![Scenario menu](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/facelift-followups/01-scenario-menu.png)

![FICO menu](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/facelift-followups/02-fico-menu.png)

![Bar labels](/cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/media/facelift-followups/03-bar-labels.png)

1. The open scenario menu is as wide as the closed dropdown.
2. The typed FICO score goes away. The five ranges are the inline control on the scenario line, sized to those options: 780+, 740–779, 700–739, 660–699, and 620–659. A score below 620 can no longer be typed.
3. Each prevailing-bar amount is readable, and it lines up with the left edge of its segment.
4. On an ARM loan, the ARM terms sit directly under the scenario line and above Taxes and Insurance.
