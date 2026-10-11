# spec.md — Facelift follow-ups

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-11) |
| Status | Draft |
| Stage | 2 · Design |

## 1. Summary

Four follow-ups to the 0.8 UI facelift in `apps/web`. This folder builds on [intent/ui-facelift/](../ui-facelift/spec.md). Where that spec places ARM terms between the summary and the chart, requirement 4 here wins. Everything else in the facelift spec stands unless this spec names a change. `amortize.js` does not change. The point version becomes 0.9 on the pull request that ships this work.

## 2. Goals and non-goals

**Goals**

- G1. Match the open scenario list width to the closed `#scenario` trigger.
- G2. Replace the typed `#fico` field and `#fico-range` select with five inline range controls on the heading line.
- G3. Align summary prevailing-bar labels with the left edge of each segment and keep amounts readable.
- G4. Move ARM terms to sit directly under the scenario line (after the heading and loan field error) and above Taxes and Insurance.

**Non-goals**

- Changes to `amortize.js`, the calculator CLI, skills, or `node --test`.
- A sixth FICO band or typed scores below 620.
- Moving Taxes and Insurance, Extra Payments, the summary, or the chart relative to each other except for ARM terms as stated.

## 3. Functional requirements

1. **Scenario menu width.** The open scenario dialog is a child of the same flex column as the closed `#scenario` trigger. Its width equals the trigger width. It does not span under the three-dot export menu.

2. **FICO.** Remove `#fico` as an input. Remove `#fico-range`. The heading keeps `#fico-score` showing the stored score and the static word `FICO` before the inline control. Five buttons in `.fico-bands` on the heading line label `780+`, `740–779`, `700–739`, `660–699`, and `620–659`. Choosing a band writes that band's lower score (`780`, `740`, `700`, `660`, or `620`) into storage. PMI refill rules from the facelift spec still apply when the band changes. Choosing the band that already contains the score writes the lower score and does not refill PMI. A stored score below 620 loads as `620`. There is no typed entry and no below-620 PMI path from user input.

3. **Summary prevailing bar.** On the Monthly payment line, each segment label (`$… PI`, `$… TI`, `$… PE`) sits in a column whose flex grow matches the segment. The label is left-aligned within that column and shares the segment color styling so the amount stays readable.

4. **ARM order.** When the product is ARM, the ARM terms disclosure is the first `details.arm` block after the heading line and optional loan field error, and before Taxes and Insurance. It is not between the summary and the chart.

## 4. Acceptance criteria

| AC | Check |
|---|---|
| AC1 | Playwright: open scenario dialog width matches `#scenario` client width |
| AC2 | Playwright: FICO bands choose scores, PMI ladder, no `#fico` input |
| AC3 | Playwright: summary labels align with segment columns on the fresh loan |
| AC4 | Playwright: ARM order places ARM terms before Taxes and Insurance |

## 5. Version

`apps/web/package.json` is `0.9.0`. `PAGES_POINT_VERSION` in `publish-gh-pages-production.yml` is `0.9`.
