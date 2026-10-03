# plan.md — Amortization app

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 3 |
| Status | Draft 3 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None before Phase 3. Phase 3 needs GitHub Pages with the source set to GitHub Actions. Checked 2026-10-02: Pages is not enabled on `nikolaybotev/compound`. The phase creates that setting with the API. If the API refuses, stop and tell the owner. Do not switch the site to another host.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `node --test` still reports 379222, 79520072, payoff 360, month-1 interest 332500 | 0 |
| AC2 | `amortize.js` has no `require`, `import`, `process`, or `fs`; `buildReport` and `formatGroupedCents(379222)` match the spec | 0 |
| AC3 | Playwright: example loan, October 2026, summary, November row, 360 bars, November 2039 card and both icons | 1 |
| AC4 | Playwright: $712,500 at 20% down, and $399,999.00 at 3.5% | 1 |
| AC5 | Playwright: Apply $100 monthly; interest saved $76,366.09; payoff June 2054; typing without Apply does nothing. Unit test: the map has $100 on months 1 through 360 | 2 |
| AC6 | Playwright: clear month 1, interest stays $3,325.00, Apply puts $100 back. A further Apply with both amounts empty clears the column and hides interest saved | 2 |
| AC7 | Playwright: $1,000 every January lands on month 3, interest saved $66,633.36, payoff October 2054 | 2 |
| AC8 | Playwright, clock pinned to 2026-10-15: reload restores the column, the prefill, and an opened 2027 group. Corrupt JSON loads requirement 5, which under that clock is the example loan, a collapsed section, empty amounts, and January | 2 |
| AC9 | Playwright blocks foreign hosts; built JS has no `bankrate.com` | 1 |
| AC10 | Deploy workflow has no cron. After the merge, the production URL shows $3,792.22 with the start month set to October 2026. Pull-request CI does not fetch that URL | 3 |
| AC11 | Playwright, clock pinned to 2026-10-15 and empty storage: the example loan appears without typing the start month. A letter in the price shows an error and leaves $3,792.22 and the chart | 1 |
| AC12 | Playwright: ArrowRight moves the November 2039 card to December 2039 and leaves it open. Tap a bar to pin the card; tap outside to close it. Expand all years shows January 2027; activating it again hides that row | 1 |
| AC13 | Playwright: committing `abc` in an extra cell leaves the previous amount. Apply with monthly `12.345` does nothing and names that field | 2 |
| AC14 | After monthly $100, a term of 15 years drops month 181. Returning to 30 years does not restore it | 2 |
| AC15 | Playwright, fresh storage: Make extra payments is collapsed, both amounts empty, yearly month January | 2 |

Suggested build chunk: Phases 0, 1, 2, and 3, in order, each as its own pull request.

## Phase 0 — Pure walk the browser can import

Files: `amortize.js`, `compound_interest_monthly.js`, `compound_interest_monthly.test.js`, `AGENTS.md`

1. Move the walk, `buildReport`, cent rounding, and `formatGroupedCents` into `amortize.js`. No `require`, no `import`, no `process`, no `fs`. The CLI file requires it and keeps the argument parser, the CSV reader, and the printers.
2. Do not change CLI stdout, stderr, or exit codes. `--json` still omits `schedule` unless `--schedule` is set. `buildReport` itself always includes `schedule`.
3. Add tests for AC2, including a read of `amortize.js` that fails if the source contains `require`, `import`, `process`, or `fs`. Keep the existing CLI assertions for AC1.

DoD: `node --test` exits 0. `node -e "const {buildReport,formatGroupedCents}=require('./amortize.js'); const r=buildReport(570000,7,30,new Map()); if(r.interest_cents!==79520072||formatGroupedCents(r.monthly_payment_cents)!=='3,792.22') process.exit(1)"` exits 0. `node compound_interest_monthly.js` with no arguments still exits non-zero and does not print the gist loan.

## Phase 1 — Inputs, summary, chart, schedule

Files: `apps/web/**`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` if a workspace file is how pnpm is pinned, `.github/workflows/test.yml`, `AGENTS.md`, `README.md`, `REVIEW.md`

1. Add the Vite + Preact app at `apps/web`. Pin pnpm with a `packageManager` field. Commit the lockfile. The Vite `base` defaults to `./`, so `vite build` with `VITE_BASE` unset and `vite preview` open from a folder (D18). The app imports `buildReport` and `formatGroupedCents` from `../../amortize.js` and does not copy the formula.
2. Build the page to requirements 3–13 and 11, with no extra-payment editor and no prefill section yet. The extra column shows blank. Store and restore the loan inputs only.
3. Self-host Atkinson Hyperlegible and IBM Plex Mono, and commit the SIL Open Font License with each file. The build fails, and names the file, if a shipped font's license is not that license. Do not substitute another family.
4. Draw the piggy bank and the hooded figure as SVG in the repo. Show both on the hover card and on the indicated bar, including when the band is shorter than the icon.
5. Unit-test the date map, the down-payment cents, and the four band amounts against AC2's month 157 without a second walk: bands come from a `buildReport` result.
6. Playwright, against `vite preview`, for AC3, AC4, AC9, AC11, and AC12. Pin the clock to 2026-10-15 for AC11. Set the start month in AC3. Block every host other than the preview origin. Fail if `apps/web/dist` assets contain `bankrate.com`.
7. Add a Node.js 24 CI job that installs with pnpm and runs the unit tests and Playwright. Leave the existing `node --test` job with no install step.
8. Document `pnpm --dir apps/web dev`, the build, and the preview in `AGENTS.md` and `README.md`.

DoD: `node --test` exits 0. The web unit tests and Playwright exit 0. Playwright sees $3,792.22, the November 2026 row, 360 bars, and the November 2039 card cents and both icons from AC3. The 20% and 3.5% loans match AC4. A letter in the price leaves that payment and the chart, and says what is wrong. ArrowRight moves the card to December 2039. Expand all years shows January 2027. With the clock pinned to 2026-10-15 and empty storage, the example loan appears without typing the start month. No request leaves the preview origin. A font file whose license is not the SIL Open Font License fails the build.

## Phase 2 — Editable extras and Apply

Files: `apps/web/**`, `AGENTS.md`

1. Add the requested-extra map, the extra-payment fields, and Apply, per requirements 7 and 14–16. The section starts collapsed, with empty amounts and January selected (AC15).
2. The cell shows the requested dollars. Committing a valid amount recomputes through `buildReport`. An invalid commit leaves the previous amount (AC13). Apply replaces the map. An invalid Apply does nothing and names the field. Typing in the form does not change the table.
3. Persist the map, the form, and which years are open. A blob that does not parse is ignored. The page then loads requirement 5, not a hard-coded October 2026 (D19). Pin the AC8 clock to 2026-10-15 so that load is the example loan.
4. Drop requested extras whose month is greater than `years * 12` when the term shrinks (AC14). Lengthening the term does not restore them.
5. Playwright for AC5, AC6, AC7, AC8, AC13, AC14, and AC15.

DoD: `node --test` and the web tests exit 0. Apply of $100 monthly shows interest saved $76,366.09, payoff June 2054, and monthly payment $3,792.22, and typing $100 without Apply leaves the extra column blank. Clearing month 1 leaves its interest at $3,325.00, and Apply restores $100.00. A further Apply with both amounts empty clears the column and hides interest saved. January $1,000 lands on month 3 and shows interest saved $66,633.36 and payoff October 2054. Committing `abc` leaves the previous extra. Apply of `12.345` does nothing and names the monthly field. A term cut to 15 years drops month 181, and restoring 30 years does not bring it back. A fresh visit shows the section collapsed, empty amounts, and January. A reload keeps the edited cell and leaves 2027 open if it was open. Corrupt JSON, with the clock at 2026-10-15, loads the example loan.

## Phase 3 — GitHub Pages

Files: `.github/workflows/deploy-pages.yml`, `AGENTS.md`, `README.md`

1. Add the workflow in requirement 18. No cron. The workflow's build sets `VITE_BASE=/compound/` and uploads that artifact. The default `./` build stays the one `vite preview` serves. Do not commit the build.
2. If Pages is still off, create it with the GitHub API as a workflow-built site. If that call fails, stop and tell the owner. Do not deploy somewhere else instead.
3. After the merge to `main`, wait for the deploy run. Open `https://nikolaybotev.github.io/compound/`, set the start month to October 2026, and confirm the monthly payment is $3,792.22. The phase is not done on a green pull-request job alone. Pull-request CI does not fetch the production URL, because that URL is what this merge publishes.

DoD: the workflow file has no `schedule` key. The deploy run on `main` is green. The production page shows $3,792.22 for the example loan with start month October 2026. `AGENTS.md` records the URL and `gh workflow run deploy-pages.yml`. A local `vite build` with `VITE_BASE` unset still uses base `./`.
