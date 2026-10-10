# compound

A zero-dependency Node.js calculator for a fixed-rate, fully amortizing mortgage, or a fixed-then-adjusting ARM. It reports the scheduled monthly payment, the interest the loan costs, and, when asked, a month-by-month schedule.

This code was [first published as a GitHub Gist](https://gist.github.com/nikolaybotev/29154383c238a5958352edee512ce787) (August 2022, same `compound_interest_monthly.js` file).

There are no npm dependencies; only the Node.js runtime is required.

A skill at [`.agents/skills/mortgage-loan-calculator/SKILL.md`](.agents/skills/mortgage-loan-calculator/SKILL.md) asks for a missing principal, note rate, term, or extra plan, writes a `month,extra` CSV, and answers from this script. Term in months and fixed-rate recast are specified in [intent/loan-recast/](intent/loan-recast/intent.md). The first release design is [intent/mortgage-skill/](intent/mortgage-skill/intent.md). A second skill, [`.agents/skills/mortgage-origination-fees/SKILL.md`](.agents/skills/mortgage-origination-fees/SKILL.md), reports the prepaid finance charge implied by a note rate and an APR. Its design is [intent/origination-fees/](intent/origination-fees/intent.md).

A third skill, [`.agents/skills/arm-loan-concepts/SKILL.md`](.agents/skills/arm-loan-concepts/SKILL.md), explains how a fixed-then-adjusting ARM's rate adjusts at change dates. It produces no payment, rate, or index value and runs nothing. Its design is [intent/arm-concepts/](intent/arm-concepts/).

A local amortization page on the same calculator is [apps/web](apps/web). Its design is [intent/amortization-app/](intent/amortization-app/intent.md). From this directory, `pnpm --dir apps/web dev` serves it, `pnpm --dir apps/web build` writes a static `apps/web/dist` (Vite base `./` unless `VITE_BASE` is set), and `pnpm --dir apps/web preview` serves that build. The page calls `buildReport` in `amortize.js`. The published page is [https://nikolaybotev.github.io/compound/](https://nikolaybotev.github.io/compound/). A push to `main` publishes it; `gh workflow run deploy-pages.yml` publishes it again. That build sets `VITE_BASE=/compound/` and does not run on a schedule.

## Requirements

- [Node.js](https://nodejs.org/) 24 or later. Continuous integration runs the tests on Node.js 24.
- Optional: [mise](https://mise.jdx.dev/). From this directory, `mise install` installs the Node version pinned in `mise.toml`.

## Run

From this directory:

```bash
node compound_interest_monthly.js --amount 855000 --rate 6.99 --years 30
```

`--amount` is principal in dollars and must be greater than zero. `--rate` is the annual note rate in percent, greater than zero, with at most three decimal places (`7`, `6.99`, `6.125`). Exactly one of `--years` or `--months` is required. Each accepts a positive integer (`^[1-9]\d*$`): `--years` is the term in years and the payment count is that integer times 12; `--months` is the payment count directly. Passing both term flags, or neither, exits non-zero. Invoking the script with no arguments exits non-zero, names `--amount`, `--rate`, `--years`, and `--months`, and does not run a built-in loan.

The monthly rate is that note rate divided by 12, the same 30/360 month the script has always used. Each month's interest is the unpaid principal times that rate. The scheduled payment stays constant. The walk uses the exact payment and the exact monthly interest, and it stops charging when the principal reaches zero.

```bash
node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 --json
node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 --schedule
node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 --json --schedule
```

- With no output flags, stdout is a short summary: monthly payment, payoff month, total interest, extra applied, extra unapplied, interest saved, and months saved. Money uses US grouping and two decimal places.
- `--json` writes one JSON object and nothing else. Money fields are integer cents. The object always includes `months`, the payment count. It includes `years` only when the term was passed with `--years`. The object has no `schedule` key unless `--schedule` is also set.
- `--json --schedule` adds `schedule`: one object per month from 1 through the no-extra payoff. With no extra principal, `extra_cents` and `interest_saved_cents` are 0.
- `--schedule` alone prints a CSV of those same months and nothing else. The header is `month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved`.

Reported amounts are rounded half up to the cent once, at output.

## Extra principal

`--extra` is an optional UTF-8 CSV. The header row is `month,extra`. Each data row is one extra principal payment. `month` is the payment number, from 1 through the payment count `n` (the `--months` value, or `--years` times 12). `extra` is a positive dollar amount. Rows for the same month are summed. A file with only the header is no extras. A month outside the term, a non-numeric or negative amount, or a missing column exits non-zero.

The extra is applied after that month's interest, so it does not reduce the interest charged that month. The scheduled payment stays the same. Extra principal shortens the loan. Interest stops when the principal reaches zero. The schedule still lists the later months through the no-extra payoff, with interest, principal, extra, remaining principal, and remaining interest at zero. `interest_saved` on each row is cumulative: interest the no-extra loan has charged through that month, minus interest this loan has charged through that month. The last row matches the summary's interest saved.

`fixtures/first-year-100.csv` is $100 of extra principal in each of months 1–12. On a $570,000 loan at 7% for 30 years, that saves $8,137.70 of interest and pays the loan off in month 358, two months early:

```bash
node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 \
  --extra fixtures/first-year-100.csv --json
```

## Adjustable-rate

A fixed-then-adjusting ARM is the same walk with resets. Give any ARM flag and the others it needs, and the calculator treats `--rate` as the initial rate:

```bash
node compound_interest_monthly.js \
  --amount 570000 --rate 5.875 --years 30 \
  --fixed-years 7 --adjust-months 12 \
  --margin 2.5 --caps 5/2/5 --floor 2.5
```

That loan (First Entertainment's 7/1 sheet) pays $3,371.77 for 84 months, resets to 10.875% at payment 85 with a payment of $5,037.71, and costs $1,103,636.33 of interest. The summary appends `Initial rate`, `Highest rate`, `Highest payment`, and `Adjustments`.

| Flag | Meaning |
|---|---|
| `--fixed-years N` or `--fixed-months N` | Payments at the initial rate (`^[1-9]\d*$`). Exactly one is required, and the fixed period must be shorter than the term. |
| `--adjust-months N` | Months between resets (`^[1-9]\d*$`). The first reset is payment `F + 1`, then every `N` payments. |
| `--margin P` | Added to the index at a reset. A percent, `^\d+(?:\.\d{1,3})?$`; `0` is allowed. |
| `--caps I/P/L` | Initial, periodic, and lifetime caps in points, each `0` or more. The ceiling is `--rate` plus the lifetime cap. |
| `--floor P` | Lifetime floor, greater than zero and not above the ceiling. |
| `--initial-floor P` | Floor at the first reset. Defaults to `--floor`. |
| `--round-eighth` | Round index plus margin to the nearest 0.125 point before the caps and floors. Off by default. |
| `--index FILE` | A `month,index` CSV. |

`--amount`, `--rate`, a term, one fixed flag, `--adjust-months`, `--margin`, `--caps`, and `--floor` are required in ARM mode. A missing flag exits non-zero and names every missing flag. `--index`, `--initial-floor`, or `--round-eighth` without the required flags is the same error. Without any ARM flag nothing changes: the fixed-rate output is byte for byte what it was.

**Worst case.** With no index, the first reset moves the rate up by the initial cap and every later reset moves it up by the periodic cap, each time stopping at the ceiling. On 5/2/5 from 5.875% the first reset is 10.875% and every later reset stays there. On 2/2/5 the resets are 7.875%, 9.875%, 10.875%.

**Index.** `--index` takes a UTF-8 CSV with the header `month,index`. `month` is a payment number that must be a reset month; any other month exits non-zero and says it is not an adjustment month. `index` is a percent with at most three decimals, zero allowed. A duplicate month exits non-zero. The BOM, blank-line, and column-count rules are the same as `--extra`. At a reset with an index, the target rate is the index plus the margin (rounded to an eighth with `--round-eighth`). The new rate is that target held between the lower bound and the upper bound: the upper bound is the previous rate plus the cap (initial at the first reset, periodic after) and never above the ceiling; the lower bound is the first-adjustment floor at the first reset, and after that the larger of the previous rate minus the periodic cap and the lifetime floor. A reset with no index takes the upper bound. `fixtures/index-4.42-first-reset.csv` is `85,4.42`; with it the first reset is 6.92% and the payment is $3,695.72, and the total interest is $1,064,081.79.

**Reset payment.** At each reset the payment becomes the level payment that amortizes the actual unpaid balance, including any extra principal already paid, at the new rate over the payments left to maturity. Extra principal therefore lowers the next reset payment rather than shortening the loan: $100 in each of the first 12 payments saves $3,579.36 on this ARM and 0 months.

`--json` adds `arm`: `fixed_months`, `adjust_months`, `margin_percent`, `initial_cap_percent`, `periodic_cap_percent`, `lifetime_cap_percent`, `floor_percent`, `initial_floor_percent`, `ceiling_percent`, `round_eighth`, `max_rate_percent`, `max_rate_month`, `max_payment_cents`, `max_payment_month`, and `adjustments` (`month`, `index_percent`, `fully_indexed_percent`, `rate_percent`, `payment_cents` for every reset through the payoff month). `monthly_payment_cents` and `rate_percent` stay the initial payment and the initial rate. With `--schedule`, each row also has `rate_percent`, `payment_cents`, and `index_percent`.

`--schedule` alone prints a ten-column CSV: `month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved,rate,payment,index`. Money columns have two decimals and no grouping. `rate` and `index` print as percents with trailing zeros removed (`5.875`, `6.92`), and `index` is empty when none was given.

The design is [intent/arm-loan/](intent/arm-loan/intent.md). An ARM is not covered by `origination_fees.js` or by the recast procedure.

## Origination fees

`origination_fees.js` reports the prepaid finance charge implied by a note rate and an APR on a fixed, fully amortizing loan. The monthly payment is the same note-rate payment as the amortization script. The amount financed is the present value of that exact payment discounted at the APR. The charge is the note amount minus the amount financed. Reported amounts are rounded half up to the cent once, at output.

```bash
node origination_fees.js --amount 600000 --rate 6.75 --apr 7.21 --years 30
```

On that loan the payment is $3,891.59, the amount financed is $572,742.80, and the prepaid finance charge is $27,257.20 (4.543% of the note amount). A hand calculation that rounds the payment to $3,891.53 before discounting prints $27,257.34. This script does not do that.

`--rate` and `--apr` are percents greater than zero with at most three decimal places. Exactly one of `--years` or `--months` is required, with the same positive-integer rule as the amortization script. The loan is `--amount`, or `--price` with exactly one of `--down` (dollars, zero or greater, and less than the price) or `--down-percent` (at least 0 and less than 100, at most three decimal places). `--json` writes one object. Money fields are integer cents. `points_thousandths` of 4543 means 4.543%. A negative `finance_charge_cents` is a lender credit. `years` appears only when `--years` was passed.

The figure assumes equal monthly payments and a first payment one full month out. It does not split out monthly mortgage insurance or odd-days interest, and it does not include costs that are outside the APR.

[`.agents/skills/mortgage-origination-fees/SKILL.md`](.agents/skills/mortgage-origination-fees/SKILL.md) is the front end. It asks for a missing note rate, APR, or loan size. When the term is omitted it passes `--years 30` and says so. It runs `scripts/origination_fees.js`, a symlink to this script, and answers from `--json`. The design is [intent/origination-fees/](intent/origination-fees/intent.md).

The workspace link is local setup and is not a file in this repo: `/Users/nikolay/git/.agents/skills/mortgage-origination-fees` points at `../../github.com/nikolaybotev/compound/.agents/skills/mortgage-origination-fees`.

## Skill

[`.agents/skills/mortgage-loan-calculator/SKILL.md`](.agents/skills/mortgage-loan-calculator/SKILL.md) is the front end. It runs `scripts/compound_interest_monthly.js`, a symlink to the calculator at the repo root. A summary question (interest saved, both interest totals, the scheduled payment, months saved) runs `--json` alone. A month or savings-so-far question runs `--json --schedule` and reads `schedule`. A fixed-rate servicer recast is two runs: the first with extras through the recast month, the second with `--months` set to the remaining payment count and no extras. See [intent/loan-recast/](intent/loan-recast/spec.md). The skill does not amortize the loan itself.

The workspace link is local setup and is not a file in this repo: `/Users/nikolay/git/.agents/skills/mortgage-loan-calculator` points at `../../github.com/nikolaybotev/compound/.agents/skills/mortgage-loan-calculator`.

## Test

```bash
node --test
```

With mise installed, `mise run test` runs the same command via `mise.toml`.

**Footnote — this matches Bankrate, not a servicer's ledger.** The schedule uses the exact payment from the formula and does not round each month's interest to the cent. A lender that bills $3,792.22 and rounds every month's interest to the cent will show a few dollars more interest over 30 years: about $795,203.90 on a $570,000 loan at 7%, against $795,200.72 here. [Bankrate's schedule](https://www.bankrate.com/mortgages/amortization-calculator/) shows $795,200.72; the summary card on that page rounds the same total to $795,201. Compare results with that schedule.

## License

[MIT](LICENSE)
