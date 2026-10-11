# spec.md — Facelift touch-ups

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-11) |
| Status | Draft |
| Stage | 2 · Design |

## 1. Summary

Three touch-ups to the 0.9 follow-ups in `apps/web`. This folder builds on [intent/facelift-followups/](../facelift-followups/spec.md). Where that spec shows a stored score, the word FICO, and `.fico-bands`, requirement 1 here wins. Where that spec places summary prevailing-bar amounts above the segments, requirement 3 here wins. Everything else in the follow-ups spec stands. `amortize.js` does not change. The point version becomes 0.10 on the pull request that ships this work.

## 2. Goals and non-goals

**Goals**

- G1. Replace the FICO score, the word FICO, and the range buttons with one inline range dropdown.
- G2. End Taxes and Insurance with a subtotal of property tax, home insurance, and conventional PMI.
- G3. Draw each summary prevailing-bar amount inside its segment, readable, at the segment’s left edge.

**Non-goals**

- Changes to `amortize.js`, the calculator CLI, skills, or `node --test`.
- A sixth FICO band, a typed score, or a visible FICO label.
- Amounts on the scenario-menu color strips.
- A subtotal that includes prepaid tax, prepaid insurance, or closing costs.

## 3. Functional requirements

1. **FICO.** Remove `#fico-score`. Remove the static word `FICO`. Remove `.fico-bands`. The heading has one `<select id="fico">` in that spot, the same kind of control as `#product`: a native select, native arrow, dotted underline, and the heading font size. Its accessible name is `FICO range`. Its options, in order, are `780+`, `740–779`, `700–739`, `660–699`, and `620–659`. The selected option is the range that contains the stored score. Choosing an option writes that range’s lower score (`780`, `740`, `700`, `660`, or `620`) and follows the follow-ups PMI refill rule: a band change refills; choosing the band that already contains the score writes the lower score and does not refill. A stored score below 620 still loads as `620`. A stored score inside a band, such as `770`, displays that band and is not rewritten on load. The fresh heading text is `600K | 5% down | 7.375% 30-year fixed | 780+ | starting October 2026`.

2. **Taxes and Insurance subtotal.** The last row of that table is `Subtotal` (`data-line="subtotal"`). Its amount is property tax plus home insurance plus conventional PMI, in cents, with no rate field. On the fresh Conventional loan that is `$916.25`. At 20% down, PMI is `$0.00` and the subtotal is `$750.00`. Editing any of the three amounts updates the subtotal.

3. **Summary prevailing bar.** On the Monthly payment line, each positive component is a segment. The amount `{dollars} {PI|TI|PE}` is drawn inside the segment, in white on the segment color, starting at the segment’s left edge, and is not clipped. A segment narrower than its amount lets the amount extend past the segment, still starting at that segment’s left edge, with the segment color behind the text. A zero share is omitted. The scenario-menu strips stay color-only.

## 4. Acceptance criteria

| AC | Check |
|---|---|
| AC1 | Playwright: `#fico` shows the five ranges; the fresh heading is `600K \| 5% down \| 7.375% 30-year fixed \| 780+ \| starting October 2026`; no `#fico-score`, no `.fico-bands`, and the heading text has no `FICO`. Choosing `740–779` sets PMI to `0.53` and the heading shows that range. A stored `770` shows `740–779` and keeps a hand-edited PMI of `0.5`. Changing the down payment from 5 to 6 refills PMI. |
| AC2 | Playwright: the last Taxes and Insurance row is Subtotal `$916.25` on the fresh loan and `$750.00` at 20% down. |
| AC3 | Playwright: the fresh Monthly payment bar shows `$3,936.85 PI` and `$916.25 TI` inside the segments, each amount’s left edge on its segment’s left edge, white, and not clipped. `$1,000` extra adds `$1,000.00 PE`. |
| AC4 | `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. `amortize.js` has no diff. Version is `0.10.0` and `PAGES_POINT_VERSION` is `0.10`. |

## 5. Design decisions

**D1 — The range select is the whole FICO control.** `#product` is the model: native arrow, not `appearance: none`. The stored value stays the lower score the PMI ladder already uses. The control displays the range, so a mid-band stored score such as `770` shows `740–779` until the owner picks a range. Checked 2026-10-11 against `apps/web/src/fico-bands.tsx` and `#product` in `styles.css`.

**D2 — The subtotal is the three monthly rows.** Property tax, home insurance, and conventional PMI are the Taxes and Insurance table. Prepaid amounts live under Closing Costs and are not in this sum. On the fresh loan the three rows are `$575.00`, `$175.00`, and `$166.25`, which sum to `$916.25`, the same cents as the TI segment.

**D3 — Amounts sit in the summary bar.** The 0.9 labels sit above the segments and clip when the column is narrower than the text. This release paints the amount inside the segment. White on `#1b7a4d`, `#2a4365`, and `#8a6218` stays readable, including when a narrow segment’s text extends across the next color, because the text carries its own segment color. Scenario-menu bars are `3rem` wide and stay unlabeled.

## 6. Version

`apps/web/package.json` is `0.10.0`. `PAGES_POINT_VERSION` in `publish-gh-pages-production.yml` is `0.10`.

## 7. Open questions

None.
