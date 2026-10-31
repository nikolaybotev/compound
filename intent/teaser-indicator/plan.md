# plan.md — Teaser indicator

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 2 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The current index is owner-entered. Library parity and the Regulation Z APR solver are later items in the batch and are not this phase.

## Process

One pull request into `main` from `cursor/teaser-indicator-2d3c`. Squash-merge it when the required checks `test`, `web`, and `Analyze (javascript-typescript)` have succeeded, the branch is up to date with `main`, and CodeQL reports no high or critical alert. Do not dispatch a Pages deploy. Do not edit `.github/workflows/`.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `apps/web/unit/arm.ts` | 0 |
| AC2 | `apps/web/unit/arm.ts` and `apps/web/unit/loan.ts` | 0 |
| AC3 | `apps/web/e2e/teaser.spec.ts` at 1280px. `setStartMonth(page, 2026, 10)`. Leave the default 7-year / 12-month ARM. Expand all years before asserting the input named `Index for month 85`. Assert `button#teaser`, and find the teaser heading inside `#knowledge` (the article also has `span#teaser`). | 0 |
| AC4 | same file, edges. The `nope` step starts from rate `3`, not from rate `5`. | 0 |
| AC5 | `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` | 0 |

## Phase 0 — Indicator

Files: `apps/web/src/arm.ts`, `apps/web/src/app.tsx`, `apps/web/src/styles.css`, `apps/web/unit/arm.ts`, `apps/web/unit/loan.ts`, `apps/web/e2e/teaser.spec.ts`, `apps/web/package.json`, `AGENTS.md`, `REVIEW.md`, `README.md`.

1. Add `currentIndex` to the ARM draft, default `""`, loaded like `evenYearly` (a missing or non-string key becomes `""` and does not reject the ARM), written by `armToStorage`. Keep it out of `parseArm` and out of `toBuildReportArm`. The `defaultArm()` equality in `apps/web/unit/arm.ts`, and any key list of a saved ARM, gains `currentIndex`.
2. Add `teaserGap(currentIndexText, marginThousandths, rateThousandths)` and `formatTeaserHint`. Trim the field string and parse it with `percentThousandths`. Return null when the text is blank or fails that parse, when `indexThousandths + marginThousandths` is not a safe integer, or when that sum is less than or equal to `rateThousandths`. `0` is a valid index. Do not apply a cap, a floor, or round-to-1/8. Do not treat "the index is below the start rate" as the test: index `"2"` and margin 2500 against rate 5000 returns null.
3. Add the field with the existing `Field`, the way `#arm-margin` does: `id="arm-current-index"`, label `Current index`, suffix `%`, `term={KNOWLEDGE_ENTRIES.noteRate}`. The alert text is `Current index must be a percent with at most three decimal places.` Keep that alert off `error` / `invalidField`, so it does not replace a loan-field or ARM-term error and does not block switching to ARM. Recompute the last valid thousandths in the initial state and in `reseedFromScenario`. A stored non-empty invalid string shows the alert and means no current index. An invalid keystroke shows the alert and leaves the previous valid thousandths until that field is cleared or replaced with a valid value. A blank field clears both.
4. The button reads those retained thousandths plus the last valid parsed margin, minus `Math.round(ratePercent * 1000)`, and only while the product is ARM and the saved ARM terms parse. Render `button#teaser` as a direct child of `.heading-line`, immediately after the `<span>% </span>` that follows `#rate` and before `#years`, including while the ARM disclosure is closed. It is smaller than the heading rate, `var(--muted)`, on the same baseline, and wraps with the line. Override the default button chrome (border, padding, inherited heading font). Visible text is `teaser` plus the requirement 4 hint. Do not set an `aria-label`. Open with `openKnowledge("arm-rate", "teaser")`.
5. Set `apps/web/package.json` to `0.22.0`. Describe the indicator in `AGENTS.md`, `REVIEW.md`, and `README.md` as requirement 7 says.

DoD: AC1–AC5. No change to `amortize.js`, the CLIs, skill wording, or `.github/workflows/`.

### Build notes (Phase 0)

<Added only after the phase lands.>
