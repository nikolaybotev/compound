# compound

A zero-dependency Node.js calculator for a fixed monthly mortgage payment and its amortization. The change in progress is `intent/mortgage-skill/`: extra principal as a CSV, and a skill that asks for missing facts before it answers.

## Commands

- Install: none. Node.js is the runtime.
- Run: `node compound_interest_monthly.js --amount 855000 --rate 6.99 --years 30` (healthy: a summary whose monthly payment is 5,682.60). `--amount`, `--rate`, and `--years` are required.
- JSON: add `--json`. Month rows: add `--schedule` (CSV alone, or inside the JSON object when combined with `--json`).
- Test: `node --test`
- Lint: none.
- Build: none.
- CI: `.github/workflows/test.yml` runs `node --test` on Node.js 24 for pull requests and pushes.

## Conventions

- Docs follow the solo AI-native SDLC chain: `intent/<change>/intent.md` → `spec.md` → `plan.md`. Update `plan.md` in the same commit when implementation departs from it.
- No npm dependencies.
- The human summary formats money in US locale with two decimal places, from integer cents. `--json` reports money as integer cents. The `--schedule` CSV uses two decimal places and no grouping separators.
- The note rate is percent per year (`6.99` means 6.99%), and the monthly rate is that percent divided by 12.
- There is no default loan. A missing or invalid `--amount`, `--rate`, or `--years` exits non-zero and explains the reason on stderr.

## Architecture

- `compound_interest_monthly.js` is the calculator. It takes the loan as arguments, walks a 30/360 schedule, and stops charging at payoff. Extra principal is not an input yet.
- `compound_interest_monthly.test.js` is the `node --test` suite.
- `intent/mortgage-skill/` is the spec for the extra-payment CSV and `.agents/skills/mortgage-loan-calculator/`.
- `README.md` describes the current script. The spec describes the script after the whole change lands.

## Things agents get wrong

- Do not put the $855,000 / 6.99% / 30-year gist loan back as constants that run when arguments are missing. That scenario is only `--amount 855000 --rate 6.99 --years 30`.
- Charging stops when the principal reaches zero. Do not keep accruing interest after payoff.
- Do not round currency with `Math.round(dollars * 100) / 100`. `Math.round(1.005 * 100)` is 100. Round reported amounts once, at output, half up to the cent.
- The schedule matches Bankrate's table, not a servicer ledger. Do not round the payment or each month's interest to the cent inside the walk. On $570,000 at 7% for 30 years the exact walk totals $795,200.72; a cent-rounded servicing walk is about $795,203.90. The README footnote states that on purpose.
- Commit `e67ec85` removed `Math.ceil` on the payment. Putting that ceiling back, or rounding the walk to cents, reopens a discrepancy the script was changed to close.
