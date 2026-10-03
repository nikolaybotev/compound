# plan.md — Amortization app

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 2 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None before Phase 3. Phase 3 needs GitHub Pages with the source set to GitHub Actions. Checked 2026-10-02: Pages is not enabled on `nikolaybotev/compound`. The phase creates that setting with the API. If the API refuses, stop and tell the owner. Do not switch the site to another host.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `node --test` still reports 379222, 79520072, payoff 360, month-1 interest 332500 | 0 |
| AC2 | `amortize.js` has no Node APIs; `buildReport` and `formatGroupedCents(379222)` match the spec | 0 |
| AC3 | Playwright: example loan, October 2026, summary, November row, 360 bars, November 2039 card | 1 |
| AC4 | Playwright: $712,500 at 20% down, and $399,999.00 at 3.5% | 1 |
| AC5 | Playwright: Apply $100 monthly; interest saved $76,366.09; payoff June 2054; typing without Apply does nothing. Unit test: the map has $100 on months 1 through 360 | 2 |
| AC6 | Playwright: clear month 1, interest stays $3,325.00, Apply puts $100 back. A further Apply with both amounts empty clears the column and hides interest saved | 2 |
| AC7 | Playwright: $1,000 every January lands on month 3, interest saved $66,633.36, payoff October 2054 | 2 |
| AC8 | Playwright: reload restores the column, the prefill, and an opened 2027 group; corrupt storage loads the defaults | 2 |
| AC9 | Playwright blocks foreign hosts; built JS has no `bankrate.com` | 1 |
| AC10 | Deploy workflow has no cron; production URL shows $3,792.22 after the start month is set to October 2026 | 3 |

Suggested build chunk: Phases 0, 1, 2, and 3, in order, each as its own pull request.

## Phase 0 — Pure walk the browser can import

Files: `amortize.js`, `compound_interest_monthly.js`, `compound_interest_monthly.test.js`, `AGENTS.md`

1. Move the walk, `buildReport`, cent rounding, and `formatGroupedCents` into `amortize.js`. No `require`, no `process`, no `fs`. The CLI file requires it and keeps the argument parser, the CSV reader, and the printers.
2. Do not change CLI stdout, stderr, or exit codes. `--json` still omits `schedule` unless `--schedule` is set. `buildReport` itself always includes `schedule`.
3. Add tests for AC2, including a read of `amortize.js` that fails if the source contains `require`, `process`, or `fs`. Keep the existing CLI assertions for AC1.

DoD: `node --test` exits 0. `node -e "const {buildReport,formatGroupedCents}=require('./amortize.js'); const r=buildReport(570000,7,30,new Map()); if(r.interest_cents!==79520072||formatGroupedCents(r.monthly_payment_cents)!=='3,792.22') process.exit(1)"` exits 0. `node compound_interest_monthly.js` with no arguments still exits non-zero and does not print the gist loan.

## Phase 1 — Inputs, summary, chart, schedule

Files: `apps/web/**`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` if a workspace file is how pnpm is pinned, `.github/workflows/test.yml`, `AGENTS.md`, `README.md`, `REVIEW.md`

1. Add the Vite + Preact app at `apps/web`. Pin pnpm with a `packageManager` field. Commit the lockfile. The app imports `buildReport` and `formatGroupedCents` from `../../amortize.js` and does not copy the formula.
2. Build the page to requirements 3–13 and 11, with no extra-payment editor and no prefill section yet. The extra column shows blank. Store and restore the loan inputs only.
3. Self-host Atkinson Hyperlegible and IBM Plex Mono. Read the license file that ships with each font. If it is not the SIL Open Font License, stop that font and record the substitute here before committing the files.
4. Draw the piggy bank and the hooded figure as SVG in the repo. Show both on the hover card and on the indicated bar, including when the band is shorter than the icon.
5. Unit-test the date map, the down-payment cents, and the four band amounts against AC2's month 157 without a second walk: bands come from a `buildReport` result.
6. Playwright, against `vite preview`, for AC3, AC4, and AC9. Set the start month in the test. Block every host other than the preview origin. Fail if `apps/web/dist` assets contain `bankrate.com`.
7. Add a Node.js 24 CI job that installs with pnpm and runs the unit tests and Playwright. Leave the existing `node --test` job with no install step.
8. Document `pnpm --dir apps/web dev`, the build, and the preview in `AGENTS.md` and `README.md`.

DoD: `node --test` exits 0. The web unit tests and Playwright exit 0. Playwright sees $3,792.22, the November 2026 row, 360 bars, and the November 2039 card cents from AC3. The 20% and 3.5% loans match AC4. No request leaves the preview origin.

## Phase 2 — Editable extras and Apply

Files: `apps/web/**`, `AGENTS.md`

1. Add the requested-extra map, the extra-payment fields, and Apply, per requirements 7 and 14–16.
2. The cell shows the requested dollars. Committing a valid amount recomputes through `buildReport`. Apply replaces the map. Typing in the form does not.
3. Persist the map, the form, and which years are open. Ignore a corrupt blob and fall back to the default loan.
4. Playwright for AC5, AC6, AC7, and AC8.

DoD: `node --test` and the web tests exit 0. Apply of $100 monthly shows interest saved $76,366.09, payoff June 2054, and monthly payment $3,792.22, and typing $100 without Apply leaves the extra column blank. Clearing month 1 leaves its interest at $3,325.00, and Apply restores $100.00. A further Apply with both amounts empty clears the column and hides interest saved. January $1,000 lands on month 3 and shows interest saved $66,633.36 and payoff October 2054. A reload keeps the edited cell and leaves 2027 open if it was open.

## Phase 3 — GitHub Pages

Files: `.github/workflows/deploy-pages.yml`, `AGENTS.md`, `README.md`

1. Add the workflow in requirement 18. No cron. `VITE_BASE=/compound/`. Upload `apps/web/dist`. Do not commit the build.
2. If Pages is still off, create it with the GitHub API as a workflow-built site. If that call fails, stop and tell the owner. Do not deploy somewhere else instead.
3. After the merge to `main`, wait for the deploy run. Open `https://nikolaybotev.github.io/compound/`, set the start month to October 2026, and confirm the monthly payment is $3,792.22.

DoD: the workflow file has no `schedule` key. The deploy run on `main` is green. The production page shows $3,792.22 for the example loan with start month October 2026. `AGENTS.md` records the URL and `gh workflow run deploy-pages.yml`.
