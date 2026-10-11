# plan.md — Facelift touch-ups

| | |
|---|---|
| Implements | [spec.md](spec.md) |
| Status | Draft |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Process

One pull request into `main`. Merge when `test`, `web`, and CodeQL are green and the branch is up to date with `main`. Squash-merge. Set point version 0.10.

## Implementation

1. **FICO** — Add `FICO_RANGES` and `ficoRangeScore` in `apps/web/src/picture.ts`. Replace `#fico-score`, the word `FICO`, and `FicoBands` with `<select id="fico">`. Style it with the `#product` rules. Delete `apps/web/src/fico-bands.tsx`.

2. **Subtotal** — After the conventional PMI row, add `MoneyRow` `data-line="subtotal"` labeled `Subtotal` for `taxCents + insuranceCents + pmiCents`.

3. **Prevailing bar** — Draw the summary amount inside each segment: left edge at the segment’s left edge, white text, segment color behind the text, no clipping. Leave the dropdown strips unchanged.

4. **Tests and docs** — Update Playwright and the picture unit test. Update `AGENTS.md` and `REVIEW.md`. Bump `apps/web/package.json` and `PAGES_POINT_VERSION` to 0.10.

5. **Month of year color** — Set `color: var(--ink)` on `.field select`. Leave `#extra-yearly-month[data-edited="true"]` on `#1d4ed8`. Playwright checks the unedited ink color, the edited blue, and the return to ink after Apply.

## DoD

`node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. Version is 0.10. `amortize.js` is unchanged.
