# plan.md — UI follow-ups

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 2 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The ten items, the blue color, the removed fixed-mode note, and the kept ARM note are decided in the intent and the spec. The deploy, the ARM math, and the CodeQL branch are not touched.

## Process

Review subagents read with fresh context: the spec against the intent, then this plan against the spec, on Grok as the owner named. Build subagents run on Claude Sonnet as the owner named. Four phases, four pull requests into `main`, each merged when CI is green, in this order: summary (0), extra-payments form and column (1), chart legend (2), start-month picker (3). The picker is last because it rewrites the `#start` step in every Playwright spec. Each phase edits only `apps/web/**`, `AGENTS.md`, `REVIEW.md`, and this file. `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, the skills, and `.github/workflows/` have no diff in any phase (AC11). `intent/amortization-app/`, `intent/extra-savings-column/`, `intent/complete-loan-picture/`, `intent/arm-loan/`, and `intent/feature-previews/` are not edited; where this spec changes a sentence of theirs (D20, including the fixed-mode clause of `intent/arm-loan/` requirement 14), this spec wins.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Unit: `yearsAndMonths` F8 strings; year `savedByExtraCents` 139060 / 668128 and sum 807188 vs 813770; the edited predicate; `applied` load, fallback, save, and fresh default | 0 (formatter), 1 (subtotal, predicate, storage) |
| AC2 | Playwright: no `.note` and zero matches for the fixed sentence; `October 2056 (30 years)`; no extras regions | 0 |
| AC3 | Playwright: `$33,200.00`, `$76,366.09`, `2 years 4 months`, `June 2054 (27 years 8 months)`, region order; January plan `$28,000.00`, `2 years`, `October 2054 (28 years)`; month 1 alone `$100.00`, `0` | 0 |
| AC4 | Playwright: ARM note unchanged; ARM `Extra principal paid` `$100.00`, `0`, `October 2056 (30 years)`; `fixed` removes the note | 0 |
| AC5 | Playwright: year-row Saved by extra `$0.00`, `$706.94`, `$1,390.60` / `$6,681.28`, `$1,167.36` / `$6,678.37`; sixth cell fixed, ninth cell ARM | 1 |
| AC6 | Playwright: `data-edited` on commit, `rgb(29, 78, 216)` text and border, cleared after Apply, not set by a keystroke, kept across reload | 1 |
| AC7 | Playwright: the Apply sentence once, in `.apply-row`; old sentence absent; select and input bottoms and heights within 1px; `appearance: none` on the form select and not on `#product` | 1 |
| AC8 | Playwright: the picker on a pinned fresh load; `November 2026`; `Dec 2026` first row; year stepper; Escape; outside pointer down; reload; every spec's `#start` step moved to the picker | 3 |
| AC9 | Playwright: card right-and-below at month 157, left at month 355, the month under a point the card used to cover, keyboard card 16px under the chart top | 2 |
| AC10 | Playwright 375×667 touch: card inside the viewport, not over the tap point, past the chart's bottom; tap outside closes | 2 |
| AC11 | `node --test`, `pnpm --dir apps/web test`, `pnpm --dir apps/web test:e2e` exit 0; no diff outside `apps/web/**`, `AGENTS.md`, `REVIEW.md`, this folder | 0, 1, 2, 3 |
| AC12 | Safari screenshots of the form row and the open picker, attached to the Phase 1 and Phase 3 pull requests | 1 (form), 3 (picker) |
| AC13 | Production check after the Phase 3 merge and publish | 3, after merge |
| AC14 | Docs: each phase adds its spec requirement 12 sentences to `AGENTS.md`, and `REVIEW.md` gains the Bugs, Important, and Compliance lines; read, not scripted | 0 (note, Extra principal paid, durations, REVIEW.md), 1 (subtotal, `data-edited`, `applied`, Apply sentence, select), 2 (legend), 3 (picker) |

## Phase 0 — Summary: note, Extra principal paid, years and months

Files: `apps/web/src/app.tsx`, `apps/web/src/loan.ts`, `apps/web/unit/loan.ts`, `apps/web/e2e/page.spec.ts`, `apps/web/e2e/extras.spec.ts`, `apps/web/e2e/arm.spec.ts`, `AGENTS.md`, `REVIEW.md`

1. `loan.ts`: export `yearsAndMonths(months: number): string` per spec requirement 4 (years part when `X > 0`; months part when `Y > 0` or `X = 0`; singular for 1; one space between). Export `monthsSavedText(months)` returning `String(months)` under 12 and `yearsAndMonths(months)` otherwise.
2. `app.tsx`: render the `<p class="note">` only when `report.arm` is set, with the ARM sentence unchanged; remove the fixed-mode sentence (requirement 2). Add the `Extra principal paid` region with `formatMoney(report.extra_applied_cents)` immediately before `Interest saved`, inside the same `extras.size > 0` condition (requirement 3). Payoff date becomes `` `${longDate(...)} (${yearsAndMonths(report.payoff_month)})` `` and Months saved becomes `monthsSavedText(report.months_saved)` (requirement 4).
3. Unit test (AC1, formatter part) in `apps/web/unit/loan.ts`: the F8 table.
4. Playwright: in `arm.spec.ts`, the two assertions that the fixed-mode region contains `The extra payment is on top of this amount.` become: the region has no `.note`, and `page.getByText("The extra payment is on top of this amount.")` has count 0; the ARM note assertion stays. In `extras.spec.ts`, `Months saved` `28` becomes `2 years 4 months`, and the AC3 regions and order are added; the January plan adds `$28,000.00`, `2 years`, `October 2054 (28 years)`; the AC2 fresh-example checks add `October 2056 (30 years)` and zero matches for `Extra principal paid`. Add the AC4 ARM steps to `arm.spec.ts` (`$100.00`, `0`, `October 2056 (30 years)` after month 1's `100`, and `fixed` removes the note). Existing `toContainText("October 2056")` and `("October 2041")` checks keep passing because the date is still a prefix.
5. `AGENTS.md`: in the `apps/web` Architecture line, after the heading sentence, add that the fixed-mode Monthly payment block has no note and the ARM block keeps its sentence; that the summary shows `Extra principal paid` (`extra_applied_cents`, the applied total, not the requested one) before Interest saved when the map has extras; that Payoff date is `{long date} ({years and months})` and Months saved is the bare count under twelve and years-and-months from twelve. Things agents get wrong: `Extra principal paid` is `extra_applied_cents`, so $100 on every month of the $570,000 / 7% / 30-year loan is `$33,200.00`, not `$36,000.00`. The Architecture line that names `intent/ui-followups/` is already there from the design pull request. `REVIEW.md`: Bugs adds an Extra principal paid that is not `extra_applied_cents`, and a Months saved or payoff duration that does not match `months_saved` or `payoff_month`; Compliance adds `intent/ui-followups/` (spec requirement 12, AC14).

DoD: `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. On the example loan after Apply monthly 100 the summary reads `Extra principal paid $33,200.00`, `Months saved 2 years 4 months`, `Payoff date June 2054 (27 years 8 months)`, and there is no sentence under `$3,792.22` in fixed mode. `git diff --stat main` touches nothing outside `apps/web/`, `AGENTS.md`, `REVIEW.md`, and `intent/ui-followups/plan.md`.

### Build notes (Phase 0)

None yet.

## Phase 1 — Extra-payments form and column: alignment, sentence, blue, subtotal

Files: `apps/web/src/app.tsx`, `apps/web/src/schedule.tsx`, `apps/web/src/loan.ts`, `apps/web/src/styles.css`, `apps/web/unit/loan.ts`, `apps/web/e2e/extras.spec.ts`, `apps/web/e2e/saved-by-extra.spec.ts`, `apps/web/e2e/arm.spec.ts`, `AGENTS.md`, `REVIEW.md`

1. `styles.css`: a `.field select` rule with `appearance: none; -webkit-appearance: none; border-radius: 0; font: inherit; font-size: 1.05rem; line-height: inherit; padding: 0.35rem 1.5rem 0.35rem 0; height: auto; background: transparent url("data:image/svg+xml,…") no-repeat right center;` with the chevron SVG inline (currentColor or `--muted`, no file). Leave the global `select` rule and `.heading-line select.product` alone, so `#product` keeps its native arrow and dotted underline (requirement 5, D7). Add `--edited: #1d4ed8` to `:root`, and `input.extra[data-edited="true"] { color: var(--edited); border-bottom-color: var(--edited); }` (requirement 7, D11). Add `.apply-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem 0.85rem; }` and let `.apply-row .note` use the muted color with no top margin.
2. `app.tsx`: delete the `<p>Apply replaces the extra-payment column.</p>`; wrap the Apply button and `<p class="note">Apply rewrites all extra-payment column values.</p>` in `<div class="apply-row">`; keep the error paragraph below (requirement 6). Add `applied` state and `Scenario.applied`; `applyPrefill` sets both `extras` and `applied` to the new map and persists both; `commitExtra` persists `extras` only; `update()` drops months beyond the term from both maps with `dropExtrasBeyond` and persists both when either changed (requirement 7).
3. `loan.ts`: `Scenario.applied: Map<number, number>`; `defaultScenario` has an empty applied map; `loadScenario` parses `applied` with `parseExtras` and, when the key is missing or does not parse, uses a copy of the loaded `extras`, keeping the loan, extras, prefill, picture, and ARM terms, while a payload that already fails to load still falls back to the fresh scenario (requirement 8, D10); `saveScenario` writes `applied: [...scenario.applied.entries()]`. Export `isEditedExtra(extras, applied, month): boolean` per requirement 7's rule. `ScheduleYear` gains `savedByExtraCents`, summed in `groupByYear` from the rows it pushes (requirement 9). `groupByYear`'s callers pass `applied` through to the rows as a boolean `edited` on `ScheduleMonth`, or `Schedule` receives `applied` and calls the predicate; either way the attribute is derived from the committed maps, never from `editingValue`.
4. `schedule.tsx`: the year row's Saved by extra `<td />` becomes `<td class="money">{formatMoney(year.savedByExtraCents)}</td>` in both column layouts; the extra `<input>` gets `data-edited="true"` when edited and no attribute otherwise.
5. Unit tests (AC1, remaining parts) in `apps/web/unit/loan.ts`: `groupByYear` year sums 139060 and 668128 with total 807188 against `interest_saved_cents` 813770 on the months 1–12 map; `isEditedExtra` for the four cases; `loadScenario` with no `applied` (equal to extras), with `applied: "x"` (equal to extras, loan kept), fresh scenario (empty); `saveScenario` shape.
6. Playwright: `saved-by-extra.spec.ts` AC2 "the 2026 year row's Saved by extra cell is empty" becomes `$706.94`, and the AC3 and AC4 cases add the year-row values (`$1,390.60` / `$6,681.28`; `$1,167.36` / `$6,678.37`); `arm.spec.ts` asserts the ARM year row's ninth cell is a money value (AC5). `extras.spec.ts` adds AC6 in the spec's order, reading `data-edited` and the computed `color` / `border-bottom-color`, including the reload. Add AC7: one match for the new sentence inside `.apply-row` beside the `Apply` button, zero for the old one, the bounding boxes of `#extra-yearly-month` and `#extra-yearly`, and the computed `appearance` values of the two selects.
7. Safari check (AC12, form part): a screenshot of Make extra payments open in Safari on macOS, attached to this pull request.
8. `AGENTS.md`: the extra column's blue rule (`data-edited`, a comparison against the stored `applied` map, cleared by Apply, not a dirty flag); `applied` in storage and the missing-key fallback; the year row's Saved by extra is the sum of that year's cells and does not add up to Interest saved (`$8,071.88` against `$8,137.70` on the first-year plan); the Apply sentence and where it sits; the form select's `appearance: none` and that `#product` is excluded. Things agents get wrong: do not "fix" the year subtotals to sum to Interest saved; do not mark a cell edited on a keystroke. `REVIEW.md`: Bugs adds a year Saved by extra cell that is not the sum of its rows, a cell marked edited that equals the applied map, and a form select that regained the native appearance; Important adds a changed Saved by extra month cell.

DoD: `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. On the example loan after Apply monthly 100, committing `250` in month 3 turns that cell `rgb(29, 78, 216)` and Apply turns it back with `$100.00`; the 2026 year row reads `$1,167.36`; the sentence beside Apply reads `Apply rewrites all extra-payment column values.`; the select's bottom edge is within 1px of the yearly input's. The Safari screenshot is in the pull request.

### Build notes (Phase 1)

None yet.

## Phase 2 — Chart legend follows the pointer

Files: `apps/web/src/chart.tsx`, `apps/web/src/styles.css`, `apps/web/e2e/page.spec.ts`

1. `chart.tsx`: keep `month` and `pinned`; add `anchor: { x: number; y: number } | null` in viewport coordinates. Pointer move (mouse) sets `anchor` from `clientX`/`clientY` and the month from `monthAt`; remove the `legend.contains(event.target)` early return. Touch pointer down sets `anchor` from the event and pins. Focus and ArrowLeft/ArrowRight set `anchor` to the indicated bar's center x (`rect.left + ((month − 0.5) / count) × rect.width`) and `rect.top` (requirement 10, D14). Pointer leave clears the month when not pinned, as today.
2. Measure the card: a `ref` on the legend and a `useLayoutEffect` that reads `offsetWidth` / `offsetHeight` after render and stores them; until measured, render the card with `visibility: hidden` at the anchor so there is no flash at the wrong place. Compute `left` and `top` by requirement 10's rule with `vw = window.innerWidth`, `vh = window.innerHeight`, gap 16, margin 8. Re-measure when `month` changes (the card's height can change between a month with and without an extra only by content, so one measure per render is enough).
3. `styles.css`: `.legend { position: fixed; pointer-events: none; }`, drop `top: 0.75rem`; keep the card's width rule in `chart.tsx` (`min(348, width − 16)`). Keep `z-index: 2`.
4. Playwright, `page.spec.ts`: AC9 on the suite's default 1280×720 viewport after `scrollIntoViewIfNeeded` on the chart, with `indicateMonth(page, 157)` reading the pointer position it used and the card's bounding box (`left ≥ x + 16`, `top ≥ y + 16`, inside the viewport); `indicateMonth(page, 355)` with `right ≤ x − 16`; then move the pointer to a point the first card covered and assert the card's heading is within one month of the bar under that point (compute the expected month from the x coordinate with the same formula as `monthAt`); move the pointer out of the chart and assert the card is gone; keyboard: after `ArrowRight` the card's top is `≥ chart.top + 16`. AC10 in a `test.use({ viewport: { width: 375, height: 667 } })` block: scroll the chart to the top of the viewport (`element.scrollIntoView()` on `[data-testid='chart']`), tap at 50% / 70%, assert the card's box is inside the viewport, does not contain the tap point, and `bottom > chart.bottom`; tap (20, 20) closes it. Keep AC12's existing keyboard and tap assertions.
5. `AGENTS.md`: the legend is `position: fixed`, `pointer-events: none`, anchored to the pointer with a 16px gap, flipping at the window edge, clamped with an 8px margin, keyboard anchor at the bar center and chart top; it may leave the chart's box.

DoD: `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. On a 1280-wide viewport the card for month 157 is to the right of and below the pointer and the card for month 355 is to the left; on 375×667 a tapped card is inside the window and off the tap point.

### Build notes (Phase 2)

None yet.

## Phase 3 — Start-month picker

Files: `apps/web/src/month-picker.tsx` (new), `apps/web/src/app.tsx`, `apps/web/src/styles.css`, `apps/web/e2e/page.spec.ts`, `apps/web/e2e/extras.spec.ts`, `apps/web/e2e/picture.spec.ts`, `apps/web/e2e/saved-by-extra.spec.ts`, `apps/web/e2e/arm.spec.ts`, `AGENTS.md`

1. `month-picker.tsx`: `MonthPicker({ id, value, onChange })` rendering the `<button id={id} type="button" class="month-button" data-value={value} aria-haspopup="dialog" aria-expanded={open}>{longDate(...)}</button>` and, when open, the `role="dialog"` card with `aria-label="Choose start month"`: `Previous year` / year text / `Next year` buttons (disabled at `1000` and `9999`), then twelve `<button type="button" aria-label={`${MONTH_NAMES[i]} ${year}`} aria-pressed={...}>{SHORT_MONTHS[i]}</button>` in a 3×4 grid. Choosing a month calls `onChange("YYYY-MM")`, closes, and focuses the trigger. Escape closes and focuses the trigger. Activating the trigger toggles, and focus stays on the trigger. A document `pointerdown` outside the card, the trigger, and `label[for=id]` closes without moving focus (the pattern `chart.tsx` already uses, with the label added to the inside set so a label click reaches the trigger's `click` as a toggle). The shown year resets to the value's year each time the card opens. No arrow-key grid navigation (D3). `longDate` and `MONTH_NAMES` come from `loan.ts`; export the short month list from `loan.ts` if `month-picker.tsx` needs it.
2. `app.tsx`: replace the `<input id="start" type="month">` with `<MonthPicker id="start" value={draft.start} onChange={(value) => update("start", value)} />` under the same label. `aria-invalid` is dropped from the trigger; the `start` field error remains reachable only from storage through `parseLoan`.
3. `styles.css`: `.month-button` styled as the inputs are (mono, weight 500, `1.05rem`, transparent background, no border except the silver bottom border, left-aligned, same padding); `.month-picker` as a positioned card under the trigger (`position: absolute`, card background, line border, `z-index: 3`), the year row, and the `grid-template-columns: repeat(3, 1fr)` month grid with buttons that show the pressed state.
4. Playwright: add a shared step in each spec that sets the start month through the picker: click `#start`, step `Previous year` / `Next year` until the year text matches, click the button named `{Month} {year}`, and assert `#start` has `data-value`. Replace every `page.locator("#start").fill("2026-10")` with it and every `toHaveValue("2026-10")` on `#start` with `toHaveAttribute("data-value", "2026-10")` and `toHaveText("October 2026")`. Add AC8 to `page.spec.ts` in the spec's order, including `toBeFocused()` on `#start` after a choice and after Escape, the label click opening and closing the card, and the reload.
5. Safari check (AC12, picker part): a screenshot of the open picker in Safari on macOS, attached to this pull request.
6. `AGENTS.md`: the start month is a page-drawn picker (`button#start` with `data-value`, a `Choose start month` dialog, month buttons named `{Month} {year}`), not an `<input type="month">`; the Cloud note that `#start` is not fillable and tests go through the picker. Things agents get wrong: do not put `<input type="month">` back for Chromium only; Safari and Firefox render it as text.
7. After the merge to `main` and the production publish run, check AC13 on https://nikolaybotev.github.io/compound/ with fresh storage. Pull-request CI does not fetch that URL.

DoD: `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0, including AC8 and every spec that used to fill `#start`. On a pinned 2026-10-15 fresh load the trigger reads `October 2026`; choosing `November 2026` makes the first row `Dec 2026` and the payoff `November 2056 (30 years)`. The Safari screenshot is in the pull request. The phase is not done until the production check in step 7 has been made.

### Build notes (Phase 3)

None yet.
