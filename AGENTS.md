# compound

A zero-dependency Node.js calculator for a fixed monthly mortgage payment and its amortization. The skill at `.agents/skills/mortgage-loan-calculator/SKILL.md` asks for missing facts before it answers. The design is `intent/mortgage-skill/`.

## Commands

- Install: none. Node.js is the runtime.
- Run: `node compound_interest_monthly.js --amount 855000 --rate 6.99 --years 30` (healthy: a summary whose monthly payment is 5,682.60). `--amount` and `--rate` are required. Exactly one of `--years` or `--months` is required.
- JSON: add `--json`. Month rows: add `--schedule` (CSV alone, or inside the JSON object when combined with `--json`).
- Extra principal: `--extra fixtures/first-year-100.csv`. The header is `month,extra`. On $570,000 at 7% for 30 years, $100 in months 1–12 saves 813770 cents and pays off in month 358.
- Skill: `.agents/skills/mortgage-loan-calculator/SKILL.md`. It runs `scripts/compound_interest_monthly.js`, a symlink to the calculator at the repo root. Workspace link, not committed: `/Users/nikolay/git/.agents/skills/mortgage-loan-calculator` → `../../github.com/nikolaybotev/compound/.agents/skills/mortgage-loan-calculator`.
- Test: `node --test`
- Page: `pnpm --dir apps/web dev` serves the amortization page. `pnpm --dir apps/web build` writes `apps/web/dist` with Vite `base` `./` unless `VITE_BASE` is set. `pnpm --dir apps/web preview` serves that build. `pnpm --dir apps/web test` runs the page unit tests. `pnpm --dir apps/web test:e2e` runs Playwright against `vite preview` (first time: `pnpm --dir apps/web exec playwright install --with-deps chromium`).
- Lint: none.
- CI: `.github/workflows/test.yml` runs `node --test` on Node.js 24 with no install step, and a second Node.js 24 job that installs the web app with pnpm and runs its unit tests and Playwright. Pull-request CI does not fetch the production URL.
- Pages: https://nikolaybotev.github.io/compound/ is published by `.github/workflows/deploy-pages.yml` on a push to `main` and on `gh workflow run deploy-pages.yml`. That build sets `VITE_BASE=/compound/`. There is no schedule. A local `pnpm --dir apps/web build` leaves `VITE_BASE` unset and keeps base `./`.

## Conventions

- Docs follow the solo AI-native SDLC chain: `intent/<change>/intent.md` → `spec.md` → `plan.md`. Update `plan.md` in the same commit when implementation departs from it.
- The calculator has no npm dependencies. The page's dependencies live in `apps/web` and are installed with pnpm. Do not add a dependency to the calculator or to the `node --test` job.
- The human summary formats money in US locale with two decimal places, from integer cents. `--json` reports money as integer cents. The `--schedule` CSV uses two decimal places and no grouping separators.
- The note rate is percent per year (`6.99` means 6.99%), and the monthly rate is that percent divided by 12.
- There is no default loan. A missing or invalid `--amount`, `--rate`, or term flag exits non-zero and explains the reason on stderr. Exactly one of `--years` or `--months` is required; both or neither fails. No arguments names `--amount`, `--rate`, `--years`, and `--months`. `--json` always includes `months`; `years` appears only when `--years` was passed.

## Architecture

- `amortize.js` is the pure walk. It exports `buildReport(principal, ratePercent, monthCount, extrasByMonth, yearsForJson)`, `dollarsToCents`, `formatGroupedCents`, and `formatPlainCents`. It has no Node APIs. `buildReport` always includes `schedule`. `years` is set on the report only when `yearsForJson` is passed. The page calls this module; it does not keep a second formula.
- `compound_interest_monthly.js` is the calculator CLI. It requires `amortize.js`, parses arguments, reads `--extra`, and prints. It walks a 30/360 schedule, applies extra principal after that month's interest, and stops charging at payoff. The reported schedule still runs through the no-extra payoff; later rows are zeros. `--json` omits `schedule` unless `--schedule` is set.
- `fixtures/first-year-100.csv` is the $100-for-the-first-year example.
- `compound_interest_monthly.test.js` is the `node --test` suite.
- `.agents/skills/mortgage-loan-calculator/SKILL.md` is the front end. It asks for a missing principal, note rate, term, or extra plan, writes a `month,extra` CSV, and answers from `--json`. A month or savings-so-far question adds `--schedule` and reads `schedule`. It does not amortize the loan itself.
- `intent/mortgage-skill/` is the spec and plan for that skill.
- `apps/web` is the amortization page. It imports `buildReport` and `formatGroupedCents` from `amortize.js`. A term in years is `monthCount = years * 12`, passed with the year count as `yearsForJson`. The extra column is the requested dollars; Apply replaces that map. The loan, the map, the prefill, and which years are open are stored under `compound-amortization-v1`. Vite's `base` defaults to `./`. Atkinson Hyperlegible and IBM Plex Mono live in `apps/web/fonts` with their SIL Open Font License files; the build fails, and names the file, if a shipped font's license is not that license.
- `intent/amortization-app/` is the spec and plan for that page.
- `intent/loan-recast/` is the spec and plan for a term in months and a fixed-rate servicer recast via the skill. For a recast question or a term in months, that spec wins over `intent/mortgage-skill/`, which still records the first release's year-only term and recast refusal in its own files.
- `README.md` describes the script and points at the skill.

## Things agents get wrong

- Do not put the $855,000 / 6.99% / 30-year gist loan back as constants that run when arguments are missing. That scenario is only `--amount 855000 --rate 6.99 --years 30`.
- Charging stops when the principal reaches zero. Do not keep accruing interest after payoff. The schedule still lists the later months through the no-extra payoff, with zeros, so the last `interest_saved` matches the summary.
- An extra payment does not reduce that month's interest. On $570,000 at 7%, month 1 interest is 332500 cents even when month 1 includes extra principal. Interest saved is cumulative against the no-extra schedule, so that same example saves 0 cents in month 1 and 813770 cents by month 360.
- The skill asks when the principal, note rate, term, extra plan, or recast month is missing. It does not invent taxes, insurance, or an $855,000 loan. Summary questions use `--json` alone. A month or savings-so-far question is the only reason to add `--schedule` on a non-recast run. A recast uses `--json --schedule` on the first run only.
- The skill runs `scripts/compound_interest_monthly.js`. That file is a symlink to the calculator at the repo root. The spec's `../../compound_interest_monthly.js` is one directory short. `plan.md` records that.
- Do not round currency with `Math.round(dollars * 100) / 100`. `Math.round(1.005 * 100)` is 100. Round reported amounts once, at output, half up to the cent.
- The schedule matches Bankrate's table, not a servicer ledger. Do not round the payment or each month's interest to the cent inside the walk. On $570,000 at 7% for 30 years the exact walk totals $795,200.72; a cent-rounded servicing walk is about $795,203.90. The README footnote states that on purpose.
- Commit `e67ec85` removed `Math.ceil` on the payment. Putting that ceiling back, or rounding the walk to cents, reopens a discrepancy the script was changed to close.
- The amortization page does not grow its own loan walk. It calls `buildReport`. That function takes a month count, not a year count: `buildReport(principal, ratePercent, monthCount, extrasByMonth, yearsForJson)`. A page term in years is `monthCount = years * 12`, and the year count is `yearsForJson`. The loan start month is not payment 1; payment 1 is the next calendar month. Apply replaces the extra column; it does not add to it.
- Do not add `apps/web/test/` or a `*.test.ts` file that `node --test` will discover. The page's unit tests live in `apps/web/unit/` and run with `pnpm --dir apps/web test`.

## Cursor Cloud specific instructions

- Node.js 24 is installed at `/usr/local/lib/nodejs` and linked from `/usr/local/bin`. Login shells prepend `/usr/local/bin`, so `node` and `pnpm` are those binaries. The VM also has an older Node earlier on `PATH`; run the calculator and `node --test` with `/usr/local/bin/node` when `node -v` is not 24.
- The environment install runs `pnpm install --frozen-lockfile` (pnpm 12.6.0, from the root `packageManager` field) and `pnpm --dir apps/web exec playwright install --with-deps chromium`. Page unit tests are `pnpm --dir apps/web test`. End-to-end tests are `pnpm --dir apps/web test:e2e`; Playwright starts its own preview on port 4173.
- The environment start command serves the amortization page at `http://127.0.0.1:5173` and returns immediately when that URL is already up. A fresh page load is the $570,000 / 7% / 30-year loan with a 0% down payment. Its monthly payment is $3,792.22.
