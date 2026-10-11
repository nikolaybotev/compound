# plan.md — Facelift follow-ups

| | |
|---|---|
| Implements | [spec.md](spec.md) |
| Status | Draft |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Process

One pull request into `main`. Merge when `test`, `web`, and CodeQL are green and the branch is up to date with `main`. Squash-merge. Set point version 0.9.

## Implementation

1. **Scenario picker** — Wrap `#scenario` and the open dialog in `.scenario-picker` (`flex: 1`, `position: relative`). Set `.scenario-dialog` to `width: 100%` and drop the `min(100%, 28rem)` min-width.

2. **FICO** — Add `apps/web/src/fico-bands.tsx`. Replace `#fico` / `#fico-range` in `app.tsx` with `#fico-score`, `FICO`, and `FicoBands`. Remove `updateFico`. Rename `chooseFicoRange` to `chooseFicoBand`. Add `normalizeStoredFico` in `loan.ts` (scores below 620 → `620`).

3. **Prevailing bar** — Restructure `prevailing-bar.tsx` summary variant into `.summary-prevailing-track` columns with labels above each segment.

4. **ARM placement** — Move the ARM terms `Disclosure` to follow the loan field error and precede Taxes and Insurance.

5. **Tests and docs** — Update Playwright and unit tests, `AGENTS.md`, and `REVIEW.md`. Bump `apps/web/package.json` and `PAGES_POINT_VERSION` to 0.9.

## DoD

`node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. Version is 0.9.
