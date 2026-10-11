# plan.md — Schedule and scenario fixes

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None.

## Process

One pull request into `main`. Merge when `test`, `web`, and CodeQL are green and the branch is up to date with `main`. Squash-merge. Set the point version to 0.11.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Playwright closed label, `$5,853` after $1,000 Apply, open row match, `2: ` on the second scenario, unnumbered confirm label | 0 |
| AC2 | Playwright eight- and eleven-column headers, Extra payment `100.00`, summary `$100.00 PE` | 0 |
| AC3 | `node --test`, `pnpm --dir apps/web test`, `pnpm --dir apps/web test:e2e`; `git diff -- amortize.js` empty; version `0.11.0` / `0.11` | 0 |

## Phase 0 — Number the closed control and drop the column

Files: `apps/web/src/scenarios.tsx`, `apps/web/src/schedule.tsx`, `apps/web/src/app.tsx`, `apps/web/e2e/scenarios.spec.ts`, `apps/web/e2e/arm.spec.ts`, `apps/web/e2e/page.spec.ts`, `apps/web/e2e/saved-by-extra.spec.ts`, `apps/web/e2e/picture.spec.ts`, `apps/web/package.json`, `.github/workflows/publish-gh-pages-production.yml`, `AGENTS.md`, `REVIEW.md`

1. In `scenarios.tsx`, prefix the closed `#scenario` text and `aria-label` with `{active + 1}: `, using the same prefix the open row already builds (requirement 1, D1). Leave `.scenario-confirm-label` on the unnumbered label (D2).

2. In `schedule.tsx`, remove the Prevailing extra header, the empty year cell, and the month cell. Remove the `prevailingExtraCents` prop and the `app.tsx` argument (requirement 2, D3). Leave Extra payment and the summary `PrevailingBar` in place.

3. Playwright. Closed names in `scenarios.spec.ts` gain the prefix, including the fresh `1: $4,853 - …` string, the `$1,000` Apply string `1: $5,853 - …`, a `2: ` active scenario, and an unnumbered confirm label (AC1). Replace the Prevailing extra column test with the eight fixed headers, no Prevailing extra header, Extra payment `100.00`, and `$100.00 PE` (AC2). `arm.spec.ts`: header counts 8 and 11, drop Prevailing extra from the ARM header list, year row 11 cells with Rate, Payment, and Index empty. `page.spec.ts`: the November row’s extra cell is the empty input and Saved by extra is `$0.00`. `saved-by-extra.spec.ts` and `picture.spec.ts`: Saved by extra month and year cells move from index 6 to index 5; Extra payment header moves from index 5 to index 4.

4. `AGENTS.md` and `REVIEW.md` per requirement 3. `apps/web/package.json` `0.11.0`. `PAGES_POINT_VERSION` `"0.11"` (D4). That is the only workflow edit. Feature publishes are not tagged.

DoD: `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. `amortize.js` has no diff. The fresh closed name is `1: $4,853 - 600K | 5% down | 7.375% | 30 years | fixed`. The package version is `0.11.0` and `PAGES_POINT_VERSION` is `0.11`.

### Build notes (Phase 0)

The committed Extra payment input prints `100.00`, the existing `extraInputValue` format. AC2 names that string.
