# plan.md — ARM loan

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The first-reset cap (D4), the index-not-rate cell (D8), optional eighth rounding (D6), and the actual-balance reset (D5) are decided in the spec. The deploy is not touched.

## Process

Review subagents read with fresh context: the spec against the intent, then this plan against the spec, on Grok as the owner named. Build subagents run on Claude Sonnet as the owner named, one pull request per phase, merged when CI is green. Suggested chunks: Phases 0–2 together (library, CLI, skill), then Phases 3–4 (page). `intent/mortgage-skill/`, `intent/loan-recast/`, `intent/amortization-app/`, `intent/extra-savings-column/`, `intent/complete-loan-picture/`, and `intent/feature-previews/` are not edited; where they refuse an ARM, this spec wins.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `node --test`; fixed-rate `buildReport` objects, `--json`, CSV, and summary unchanged | 0, 1 |
| AC2 | Library test: F2 (337177 → 10.875 / 503771 at 85, interest 110363633), F3, F4, F12 | 0 |
| AC3 | Library test: F5, F6 (4.92 at 97), F7 (11.5 → 10.875), F8, F9 vs F5 | 0 |
| AC4 | Library test: F10 (357936, 0 months, 502039; 30906; 30907), F11 (payoff 181, `max_payment_month` 1) | 0 |
| AC5 | Library throws; CLI exits non-zero with the message, for the six invalid cases | 0, 1 |
| AC6 | CLI summary lines, `arm` JSON, row 85 fields, ten-column CSV, flag errors, `fixtures/index-4.42-first-reset.csv` reproduces F5 | 1 |
| AC7 | Skill text items; `README.md` and `AGENTS.md` document flags, CSV, `arm`, healthy command | 1, 2 |
| AC8 | `pnpm --dir apps/web test`: `loanReport` equals `buildReport` on FE, labels, storage fallbacks, index drop on term change, Saved by extra 30907 | 3 |
| AC9 | Playwright: fixed visit unchanged; ARM heading `7/1` and `$4,288`, terms, summary, 2033 rows, ten columns | 3 (heading, terms, summary), 4 (columns, rows) |
| AC10 | Playwright: index 4.42 path, revert, fixed/ARM switch, reload, clear, Saved by extra `$309.06` | 4 |
| AC11 | Production check after the last merge | 4, after merge |

## Phase 0 — ARM walk in the library

Files: `amortize.js`, `amortize.d.ts`, `amortize.test.js` (new, collected by `node --test`)

1. Add the optional sixth argument `arm` to `buildReport` per spec requirement 7. When it is `undefined`, do not touch the existing path: the same `walk`, the same report keys, no `arm` key, no added row fields (AC1).
2. Validate `arm` first and throw an `Error` naming the term: `fixedMonths` not in `[1, monthCount)`; `adjustMonths < 1`; a negative cap or margin; a floor `≤ 0`; a floor above `R0 + CL`; an `indexByMonth` key that is not a reset month or is above `monthCount`; a negative index. Reset months are `fixedMonths + 1 + k × adjustMonths` for `k ≥ 0`.
3. Implement requirements 2–6 in the walk, in integer thousandths: `R0 = Math.round(ratePercent * 1000)` (test `6.99 → 6990`), `cap_j`, `upper_j`, `lower_j`, the worst-case target, the index target with optional half-up rounding to 125 thousandths, the clamp, and the payment reset on the balance after `m − 1` over `n − m + 1`. The monthly rate is `thousandths / 100000 / 12`. Keep extra principal after interest and payoff handling as they are. Run the baseline with the same `arm` and an empty extras map.
4. Build `report.arm` with the fields in requirement 8, including `adjustments` through the payoff month (a reset in the payoff month is listed), `max_rate_*`, and `max_payment_*` (`max_payment_month` 1 when no reset payment exceeds the initial payment). Add `rate_percent`, `payment_cents`, and `index_percent` to every schedule row in ARM mode only. Percent output is `thousandths / 1000`.
5. Update `amortize.d.ts`: the `Arm` argument type, `ArmReport`, `Adjustment`, and the optional row fields.
6. Write `amortize.test.js` with AC1 (fixed objects unchanged, including a deep-equal against the current `--json --schedule` of the $570,000 / 7% / 30-year loan with the first-year $100 extras: interest 813770 saved, payoff 358), AC2, AC3, AC4, and the library half of AC5. Assert the cents and thousandths listed in spec requirement 18.

DoD: `node --test` exits 0 with the new file collected. The FE run through `buildReport` returns `monthly_payment_cents` 337177, `arm.adjustments[0]` `{ month: 85, index_percent: null, fully_indexed_percent: null, rate_percent: 10.875, payment_cents: 503771 }`, and `interest_cents` 110363633. `buildReport(570000, 7, 360, firstYearMap, 30)` is unchanged and has no `arm` key. `amortize.js` still requires nothing.

## Phase 1 — CLI flags, index CSV, summary, and CSV

Files: `compound_interest_monthly.js`, `compound_interest_monthly.test.js`, `fixtures/index-4.42-first-reset.csv` (new), `README.md`, `AGENTS.md`

1. Parse `--fixed-years`, `--fixed-months`, `--adjust-months`, `--margin`, `--caps`, `--floor`, `--initial-floor`, `--round-eighth`, and `--index` per spec requirement 9. ARM mode is on when any is present. Report every missing required ARM flag in one message. Reject both fixed flags, neither fixed flag in ARM mode, and `--index` / `--initial-floor` / `--round-eighth` without the required ARM flags. Keep every existing error, including the no-argument message and the exactly-one-term rule. Parse percents to thousandths with the existing three-decimal grammar; `--caps` is three of them joined by `/`.
2. Load `--index` per requirement 10: header `month,index`, reset months only (the message says the month is not an adjustment month), no duplicates, index `≥ 0`, the same BOM and empty-row rules as `loadExtras`. Pass a `Map` of thousandths.
3. Call `buildReport` with the `arm` object; let a library `Error` become the non-zero exit with its message. Append the four summary lines in ARM mode; print percents from thousandths with trailing zeros trimmed. Extend the CSV to the ten columns in ARM mode only. `--json` prints the `arm` object and the row fields; `--json` without `--schedule` still omits `schedule`.
4. Add `fixtures/index-4.42-first-reset.csv` with `month,index` and `85,4.42`.
5. Tests: the CLI half of AC5, AC6, and a byte-identity test for AC1 (fixed `--json`, `--schedule`, and summary of `--amount 570000 --rate 7 --years 30` equal their pre-change strings captured in the test).
6. `README.md`: an "Adjustable-rate" section with the requirement 9 command on FE, the flag grammar, the `month,index` CSV, the worst-case rule in one paragraph (first reset by the initial cap, then the periodic cap, never above the ceiling), the reset re-amortization sentence, the `arm` JSON fields, the ten-column CSV, and a pointer to this folder. `AGENTS.md`: a Commands line with the FE healthy command (highest payment 5,037.71 from month 85), the Architecture line for the sixth `buildReport` argument and `arm` report, and these Things agents get wrong: the first reset uses the initial cap, so 5/2/5 from 5.875% is 10.875% at payment 85; the index cell and CSV take the index, not the rate, and the walk adds the margin and applies the caps; a reset re-amortizes the actual balance, so extras lower the next reset payment instead of shortening the term (F10); the fixed-rate output is unchanged and tested byte-for-byte; floors must be positive; `amortize.js` still has no Node APIs; `--round-eighth` is off unless asked.

DoD: `node --test` exits 0. `node compound_interest_monthly.js --amount 570000 --rate 5.875 --years 30 --fixed-years 7 --adjust-months 12 --margin 2.5 --caps 5/2/5 --floor 2.5` ends with `Adjustments: 23` and shows `Highest payment: 5,037.71 (from month 85)`. The same with `--index fixtures/index-4.42-first-reset.csv --json` has `arm.adjustments[0].rate_percent` 6.92 and `interest_cents` 106408179. `node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 --json --schedule` is unchanged. `README.md` and `AGENTS.md` carry the items in step 6.

## Phase 2 — Skill and review instructions

Files: `.agents/skills/mortgage-loan-calculator/SKILL.md`, `REVIEW.md`, `AGENTS.md`

1. Rewrite the skill per spec requirement 12 and AC7: the lifted description; the ARM ask list with the optional first-adjustment floor and the "uses the lifetime floor and says so" rule; index name and lookback not required, no fetching; the worst-case sentence; the `month,index` CSV at reset months only, with "year 8" / "first adjustment" = `F + 1`, "every adjustment" = one row per reset month through `n`, and the calendar mapping shared with the recast section; the `rate − margin` statement; the `--json` fields read for a summary and the `--schedule` fields for a month; the one-sentence ARM recast decline; the refusal paragraph naming interest-only, payment-option, and negative-amortization loans; never passing `--round-eighth` or `--initial-floor` unasked; the run example with the ARM flags in brackets. Keep every existing fixed-rate and recast instruction and the script path rule.
2. `REVIEW.md`: Bugs adds an ARM payment, rate, or interest that disagrees with spec requirement 18; a first reset governed by the periodic cap; a rate above the ceiling or below the floor in effect; a reset payment that is not the level payment on the actual balance over the remaining months; an index accepted at a non-reset month; a fixed-rate JSON, CSV, or summary that changed; a page figure that disagrees with `buildReport` for the same `arm` object; a skill that supplies a fixed period, interval, margin, cap, floor, or index value the user did not give. Compliance adds `intent/arm-loan/`. Important adds a wrong worst-case payment or rate and an ARM figure the spec forbids.
3. `AGENTS.md`: the skill description line and the Architecture line for the skill, and the sentence that `intent/arm-loan/` wins over the earlier specs' ARM refusals.

DoD: `node --test` exits 0. The skill file contains each AC7 item. `REVIEW.md` names `intent/arm-loan/`. The workspace symlink still resolves to the skill file.

## Phase 3 — Page: product, terms, model, summary

Files: `apps/web/src/arm.ts` (new), `apps/web/src/loan.ts`, `apps/web/src/app.tsx`, `apps/web/src/styles.css`, `apps/web/unit/arm.ts` (new), `apps/web/unit/loan.ts`, `apps/web/e2e/arm.spec.ts` (new), `AGENTS.md`

1. `arm.ts`, no DOM: the `ArmDraft` (requirement 16 fields as text, `enabled`, `open`, `roundEighth`, `index` map), `defaultArm()` with the sheet's values, `parseArm(draft, years)` returning thousandths and a field-level message (fixed period must be shorter than the term; grammars from requirement 9), `armLabel(fixedYears, adjustMonths)` (`7/1`, `7/6`, `10/1`), `resetMonths(fixedMonths, adjustMonths, monthCount)`, `dropIndexBeyond(index, resetMonths)`, `armFromStorage(value)` with the requirement 16 fallback, and `toBuildReportArm(values, index)` producing requirement 7's object. Percents via `percentThousandths`.
2. `loan.ts`: `Loan.arm?` carrying the parsed terms and the index map; `loanReport` and `savedByExtraCents` pass `toBuildReportArm` as the sixth argument; `Scenario.arm`; `loadScenario` / `saveScenario` read and write `arm` additively with version `1`; `defaultScenario` has `arm` disabled and closed.
3. `app.tsx`: replace the `% fixed = ` span with `% `, the ARM-only structure-label span, `<select id="product" aria-label="Loan product">` with `fixed` and `ARM`, and ` = `. Add the "ARM terms" `Disclosure` under the Term / Start month row, rendered only in ARM mode, open on the first switch, with the nine inputs and the two read-only lines (`Ceiling {ceiling}%`, `First adjustment {long date} (payment {F + 1})`). Validate on input like the picture fields: an invalid entry names the field, keeps the last valid terms, and does not change the schedule. On a valid term, fixed-period, or interval change, drop index entries that are no longer reset months. Add the "Highest rate" and "Highest payment" summary regions in ARM mode and the ARM note under Monthly payment. Switching to `fixed` keeps `arm` in storage with `enabled: false`.
4. Unit tests (AC8) in `apps/web/unit/arm.ts` and `apps/web/unit/loan.ts`: `loanReport` on FE equals `buildReport` with the same `arm` (337177, 503771, 110363633); labels; a scenario without `arm` loads fixed with defaults; a malformed `arm` keeps the loan, extras, prefill, and picture; fixed years 7 → 10 drops month 85 and keeps 121; `savedByExtraCents` 30907 for month 1 of the 1–12 plan; the storage round trip includes `arm`. Not under `apps/web/test/` and not a `*.test.ts`.
5. `arm.spec.ts`, clock 2026-10-15: the AC9 heading, terms, and summary checks (fixed visit still `$4,853` with `fixed` selected; after rate `5.875` and ARM: `7/1`, `$4,288`, the nine defaults, `Ceiling 10.875%`, `First adjustment November 2033 (payment 85)`, `$3,371.77`, `10.875% from November 2033`, `$5,037.71 from November 2033`, `$1,103,636.33`, `October 2056`). Existing specs that read the heading text keep passing; if one asserted the literal `% fixed = ` span, point it at the select's selected option.
6. `AGENTS.md`: the page's ARM mode, the product select, the ARM terms defaults, the structure label, and that page ARM figures are `buildReport` with the `arm` argument.

DoD: `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. A fresh pinned load is unchanged (`$4,853`, `fixed`). The ARM steps above show `$5,037.71 from November 2033`.

## Phase 4 — Page: rate and index columns

Files: `apps/web/src/schedule.tsx`, `apps/web/src/loan.ts`, `apps/web/src/app.tsx`, `apps/web/src/styles.css`, `apps/web/e2e/arm.spec.ts`, `AGENTS.md`

1. `ScheduleMonth` gains `ratePercent`, `indexPercent`, and `isReset`. `groupByYear` fills them from the row fields and the loan's `arm`. In ARM mode `Schedule` renders the ten columns in spec requirement 15's order; in fixed mode it renders today's eight. Year rows leave Rate and Index empty.
2. The Index cell is an input only on reset rows, `aria-label` `Index for month N`, committing on blur or Enter, empty deletes, invalid reverts, the same editing-state pattern the extra cell uses (a separate `editingIndexMonth` so an index edit and an extra edit cannot collide). A commit updates `arm.index`, persists, and recomputes the report and Saved by extra. Apply still touches only extras.
3. `arm.spec.ts` adds the AC9 column checks (ten columns, Index immediately before Extra payment, `5.875%` on October 2033, `10.875%` and `$4,620.03` on November 2033) and AC10 in the spec's order: `4.42` → `6.92%`, `$2,939.82`, `$4,978.20 from November 2035`, `$1,064,081.79`; `abc` reverts; `fixed` → eight columns, no "Highest payment", `$643,835.49`; ARM again → `4.42` and `$4,978.20`; reload keeps it; clear → AC9; extra `100` on month 1 → Saved by extra `$309.06` and Interest saved `$309.06`.
4. `AGENTS.md`: the ten ARM columns, the index cell rules, and that Saved by extra on an ARM uses the same `arm` object on both runs.
5. After the merge to `main` and the production publish run, check AC11 on https://nikolaybotev.github.io/compound/ with fresh storage: the fixed `$4,853` visit, then the AC9 ARM steps showing `$5,037.71`. Pull-request CI does not fetch that URL.

DoD: `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0, including AC9 and AC10. The fixed-mode schedule still has eight columns and the existing Saved by extra checks pass unchanged.
