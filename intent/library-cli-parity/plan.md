# plan.md — Library and CLI parity

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 3 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The funding flag, the two term strings, the informational recast control, and page version `0.22.1` are decided in the spec. Regulation Z APR is a later item and is not a phase. No Pages workflow is dispatched.

## Process

The design pull request is this folder only. It does not change `apps/web/package.json` or a workflow. Review of the spec against the intent, then of this plan against the spec, is fresh context before the build. Build phases are separate pull requests, merged in order when `test`, `web`, and `Analyze (javascript-typescript)` have succeeded, the branch is up to date with `main`, and CodeQL reports no high or critical alert. Squash-merge. Do not dispatch a Pages deploy. Do not edit `.github/workflows/`.

`intent/arm-extra-level/`, `intent/loan-recast/`, `intent/arm-loan/`, `intent/clean-closing-costs/`, and the other folders this spec builds on are not edited. Where this spec wins, the new folder says so.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `node --test` library cases | 0 |
| AC2 | `node --test` command-line cases | 1 |
| AC3 | `node --test` funding, tax, and closing cases | 0 for `picture.js` and `calendar.js`; 1 for the flags |
| AC4 | Skill text and the existing skill tests | 2 |
| AC5 | `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` | 3 |
| AC6 | Version and workflow diff | 0, 1, and 2 leave `apps/web/package.json` at `0.22.0`; 3 sets `0.22.1` and does not edit `.github/workflows/` |

## Phase 0 — Library

Files: `amortize.js`, `amortize.d.ts`, `amortize.test.js`, `calendar.js`, `calendar.d.ts`, `calendar.test.js`, `picture.js`, `picture.d.ts`, `picture.test.js`, `AGENTS.md`, `README.md`.

1. Add the exports in spec requirements 2, 3, 4, and 5 to `amortize.js`, with those signatures. Do not copy the page functions' parameter lists. `levelArmExtras` takes principal dollars, the rate, the month count, `arm`, the form-extra map, `fromMonth`, and the kept map. It throws `level extras require an ARM` when `arm` is missing, and it ignores `adjustmentStats`. The prefill map stays on the page until Phase 3. `savedByExtraCents` subtracts as requirement 4 says. `savedByExtraByMonth` returns an array of length `monthCount`. `modalPaymentCents` and `prevailingExtraCents` match the page bodies. Do not add a field to the object `buildReport` returns. `recastFixed` throws the two sentences in requirement 3.
2. Add `calendar.js` by copying the date bodies from `apps/web/src/loan.ts` (`paymentDate`, `dueDate`, `yearsAndMonths`, `formatPayoffDate`). Leave the page copies in place until Phase 3. Do not import Node. `formatPayoffDate("2026-10", 360)` is `November 1, 2056 (30 years)`. `paymentDate("2026-10", 1)` is November 2026. `yearsAndMonths(13)` is `1 year 1 month`.
3. Add `picture.js` by copying the cents bodies from `apps/web/src/picture.ts`. Leave the page copies in place until Phase 3. Export what requirement 7 names: `percentOfCents`, `titleCentsFromPrice`, the 360 and 365 prepaid-interest functions (the 365 charge stays per-diem cents times days), `closingInterestDays` and the month-length helpers, `pmiThousandthsForScore` with the ladder as written in `apps/web/src/picture.ts`, and `buildPictureLines`. Leave parsing, defaults, storage, and the FICO labels on the page. `buildPictureLines` calls `buildReport` for principal and interest. The integer inputs from `intent/clean-closing-costs/` requirement 11 return `closing_cents` 1657241. `percentOfCents(60000000, 1150, 12)` is 57500.
4. Declare the new exports in the `.d.ts` files. The page does not call them yet. In `AGENTS.md` Architecture and in `README.md`, name `calendar.js` and `picture.js` and the new `amortize.js` exports. Do not document the command-line flags here.

DoD: `node --test` exits 0. AC1, and the library numbers in AC3 (`1657241`, `57500`, `November 1, 2056 (30 years)`). The fixed-rate `buildReport` objects gain no key. `apps/web/package.json` is still `0.22.0`.

### Build notes (Phase 0)

The amortization AC2 source scan now rejects `require(` calls only, because `levelArmExtras` throws `level extras require an ARM`.

## Phase 1 — Command-line tool

Files: `compound_interest_monthly.js`, `compound_interest_monthly.test.js`, `README.md`, `AGENTS.md`, `REVIEW.md`.

1. Parse `--level`, `--recast-month`, `--funding`, `--prevailing`, and the picture flags in spec requirement 7. Unknown flags still fail. `--funding` and the picture flags are not members of `ARM_FLAGS`. `--start` stays as it is.
2. `--level` calls `levelArmExtras` with `--extra` as the form map, or an empty map when `--extra` is omitted, `fromMonth` 1, and an empty kept map, then passes that map to `buildReport`. Assert the F2 map from AC2. `--recast-month` appends the seven summary lines in requirement 3, in that order, and the JSON `recast` object. Money uses `formatGroupedCents`. The two month counts are plain integers. ARM flags plus `--recast-month` print `a recast is for a fixed rate`, exit non-zero, and do not call `recastFixed`.
3. Insert `saved_by_extra` immediately after `interest_saved` on the fixed header and on the ARM header. The ARM header then continues `rate,payment,index`. `--json --schedule` adds `saved_by_extra_cents` on every row. When `--funding` is set, append the payoff line and the arrears sentence in requirement 6, set JSON `payoff_date` to `formatPayoffDate` with no label prefix, insert CSV `accrual` (`YYYY-MM`) after `month`, and on `--json --schedule` add `accrual_month` and `due_date` (`YYYY-MM-DD`, the 1st). An invalid `--funding` exits non-zero and names the flag. A positive `--even-yearly` takes its calendar month from `--start` when that flag is present, otherwise from the month inside `--funding`. When both are present, `--start` is the even-out month. Leave the human summary and `--json` without `--schedule` byte-identical for the pinned fixed loan, and assert the two sha256 values in spec requirement 4.
4. Picture output follows spec requirement 7, including the summary labels and the `picture`, `prevailing`, and `closing` keys. A missing companion names the flag and prints nothing on stdout. Do not fill the page's $3,000 fee or the fresh-visit rates. `--homeowners` and `--insurance` may both be present. Assert the AC3 command, including `closing.closing_cents` 1657241.
5. Document the flags in `README.md` and `AGENTS.md`. `REVIEW.md` Compliance names this folder. Bugs names a Saved by extra cell equal to cumulative `interest_saved_cents`, a `--funding` run whose payment changed, an ARM recast that prints a payment, and a picture rate the command invented. Add the command-line Things-agents-get-wrong lines from spec requirement 10, and rewrite the older sentences that forbid a prevailing-extra flag and a new fixed-rate schedule column.

DoD: `node --test` exits 0. AC2 and AC3. `apps/web/package.json` is still `0.22.0`. The page sources are untouched.

### Build notes (Phase 1)

`armTermsOn` treats `--level` separately so a default `level: false` does not turn on ARM parsing. Schedule CSV and JSON digests changed; summary and JSON without `--schedule` stay pinned. The page unit test that shells the calculator expects `saved_by_extra` on the schedule. The page itself is unchanged.

## Phase 2 — Skill

Files: `.agents/skills/mortgage-loan-calculator/SKILL.md`, and the skill assertions in `compound_interest_monthly.test.js` if they still require the two-run wording.

1. Replace the skill's two-run recast instructions with `--recast-month` and the `recast` JSON fields in spec requirement 3. Keep the definition of a servicer recast, the ask when the month is missing, the calendar mapping, the refusal of an ARM recast in one sentence, and the further run only when the owner asks about extras after the recast.
2. Tell the agent to pass `--level` with the form-extra CSV for an initial-period total, and not to solve the extra. Tell it to read `interest_saved_cents` as Interest saved and `saved_by_extra_cents` as Saved by extra, and that the column sum is not Interest saved.
3. Tell the agent to pass `--funding` when the user gave a funding month and asked for a payoff date, and to read `payoff_date`. Tell it to pass tax, insurance, PMI, and closing flags only with figures the user gave, and to ask when a required companion is missing. It still does not invent those rates, a recast fee, or an $855,000 loan.

DoD: AC4. `node --test` exits 0. `apps/web/package.json` is still `0.22.0`.

### Build notes (Phase 2)

Skill AC6 assertions now expect `--recast-month` and parity flags instead of the two-run recast wording.


Files: `apps/web/src/loan.ts`, `apps/web/src/picture.ts`, `apps/web/src/arm.ts`, `apps/web/src/tax.ts`, `apps/web/src/app.tsx`, `apps/web/src/styles.css`, the unit tests under `apps/web/unit/`, the Playwright tests under `apps/web/e2e/`, `apps/web/package.json`, `AGENTS.md`, `REVIEW.md`, `README.md`.

1. Point the page at the library. The page `levelArmExtras` keeps the signature existing tests call: it builds the form map with `buildPrefillMap`, converts financed cents to dollars, and calls the library function in requirement 2. `savedByExtraCents` keeps its page signature and calls requirement 4. `modalPaymentCents`, `prevailingExtraCents`, `paymentDate`, `dueDate`, `yearsAndMonths`, and `formatPayoffDate` call the library. `buildPicture` calls `buildPictureLines`. Delete the copied arithmetic. `armLabel` and `parseArm` take month counts, as requirement 8 says.
2. Add `termUnit`, `months`, `#term-unit`, and `#months` per spec requirement 8. There is one requirement 8. The years-mode heading string stays `30-year` because the unit select's selected text is `year` and it replaces the literal suffix. Add `fixedUnit`, `initialMonths`, `#arm-fixed-unit`, and `#arm-fixed-months`. Replace every `loan.years * 12` walk, including `tax.ts`, with `loan.monthCount`. The parsed loan has no `years` field that stays 30 on a month term. Pass `yearsForJson` only for a year term. Update `armLabel` call sites: `armLabel(84, 12)` is `7/1` and `armLabel(84, 1)` is `7/1mo`.
3. Add the Recast disclosure and `recastMonth` per spec requirement 9. Fixed product only. Call `recastFixed`. Do not change the schedule from that control.
4. Set `apps/web/package.json` to `0.22.1`. Describe the controls and this version in `AGENTS.md` and `README.md`. Add the requirement 10 lines Phase 1 did not already add (scenario document version 3, page version `0.23`, a Pages deploy). Do not edit `.github/workflows/`. Do not dispatch a deploy. The fresh Conventional visit stays $600,000, 5% down, 30 years, 7.375%, heading prevailing payment $4,853, summary principal and interest $3,936.85.
5. Tests cover AC5: the fresh heading string, no `#teaser` until the existing teaser steps, a stored loan without `termUnit` is 30 years, 13 months is a 13-month walk with heading `13-month` and scenario label `13 months`, 18 months initial on a 30-year ARM is `18mo/12mo`, 84 months with a 12-month interval is `7/1`, 7 years with a 1-month interval is `7/1mo`, and the recast sample's control shows `$3,195.68` while the scheduled payment is unchanged. The set document stays version 2. Existing teaser, knowledge, closing-cost, and Saved by extra tests stay green.

DoD: AC5 and AC6. `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0.

### Build notes (Phase 3)

Page `headingText` e2e helper lives in `apps/web/e2e/heading.ts`. Recast disclosure sits before Schedule; `moving-in.spec.ts` expects `Recast` between Moving in and Schedule. Restored `knowledgeStack` state after recast UI landed. Term heading uses a `-` span plus `#term-unit` options `year` / `month`.
