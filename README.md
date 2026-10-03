# compound

A zero-dependency Node.js calculator for a fixed-rate, fully amortizing mortgage. It reports the scheduled monthly payment, the interest the loan costs, and, when asked, a month-by-month schedule.

This code was [first published as a GitHub Gist](https://gist.github.com/nikolaybotev/29154383c238a5958352edee512ce787) (August 2022, same `compound_interest_monthly.js` file).

There are no npm dependencies; only the Node.js runtime is required.

A skill at [`.agents/skills/mortgage-loan-calculator/SKILL.md`](.agents/skills/mortgage-loan-calculator/SKILL.md) asks for a missing principal, note rate, term, or extra plan, writes a `month,extra` CSV, and answers from this script. The design is [intent/mortgage-skill/](intent/mortgage-skill/intent.md).

## Requirements

- [Node.js](https://nodejs.org/) 24 or later. Continuous integration runs the tests on Node.js 24.

## Run

From this directory:

```bash
node compound_interest_monthly.js --amount 855000 --rate 6.99 --years 30
```

`--amount` is principal in dollars and must be greater than zero. `--rate` is the annual note rate in percent, greater than zero, with at most three decimal places (`7`, `6.99`, `6.125`). `--years` is the term as a positive integer. All three are required. Invoking the script with no arguments exits non-zero and does not run a built-in loan.

The monthly rate is that note rate divided by 12, the same 30/360 month the script has always used. Each month's interest is the unpaid principal times that rate. The scheduled payment stays constant. The walk uses the exact payment and the exact monthly interest, and it stops charging when the principal reaches zero.

```bash
node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 --json
node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 --schedule
node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 --json --schedule
```

- With no output flags, stdout is a short summary: monthly payment, payoff month, total interest, extra applied, extra unapplied, interest saved, and months saved. Money uses US grouping and two decimal places.
- `--json` writes one JSON object and nothing else. Money fields are integer cents. The object has no `schedule` key.
- `--json --schedule` adds `schedule`: one object per month from 1 through the no-extra payoff. With no extra principal, `extra_cents` and `interest_saved_cents` are 0.
- `--schedule` alone prints a CSV of those same months and nothing else. The header is `month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved`.

Reported amounts are rounded half up to the cent once, at output.

## Extra principal

`--extra` is an optional UTF-8 CSV. The header row is `month,extra`. Each data row is one extra principal payment. `month` is the payment number, from 1 through `years * 12`. `extra` is a positive dollar amount. Rows for the same month are summed. A file with only the header is no extras. A month outside the term, a non-numeric or negative amount, or a missing column exits non-zero.

The extra is applied after that month's interest, so it does not reduce the interest charged that month. The scheduled payment stays the same. Extra principal shortens the loan. Interest stops when the principal reaches zero. The schedule still lists the later months through the no-extra payoff, with interest, principal, extra, remaining principal, and remaining interest at zero. `interest_saved` on each row is cumulative: interest the no-extra loan has charged through that month, minus interest this loan has charged through that month. The last row matches the summary's interest saved.

`fixtures/first-year-100.csv` is $100 of extra principal in each of months 1–12. On a $570,000 loan at 7% for 30 years, that saves $8,137.70 of interest and pays the loan off in month 358, two months early:

```bash
node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 \
  --extra fixtures/first-year-100.csv --json
```

## Skill

[`.agents/skills/mortgage-loan-calculator/SKILL.md`](.agents/skills/mortgage-loan-calculator/SKILL.md) is the front end. It resolves `compound_interest_monthly.js` as `../../../compound_interest_monthly.js` relative to the skill directory. A summary question (interest saved, both interest totals, the scheduled payment, months saved) runs `--json` alone. A month or savings-so-far question runs `--json --schedule` and reads `schedule`. The skill does not amortize the loan itself.

The workspace link is local setup and is not a file in this repo: `/Users/nikolay/git/.agents/skills/mortgage-loan-calculator` points at `../../github.com/nikolaybotev/compound/.agents/skills/mortgage-loan-calculator`.

## Test

```bash
node --test
```

**Footnote — this matches Bankrate, not a servicer's ledger.** The schedule uses the exact payment from the formula and does not round each month's interest to the cent. A lender that bills $3,792.22 and rounds every month's interest to the cent will show a few dollars more interest over 30 years: about $795,203.90 on a $570,000 loan at 7%, against $795,200.72 here. [Bankrate's schedule](https://www.bankrate.com/mortgages/amortization-calculator/) shows $795,200.72; the summary card on that page rounds the same total to $795,201. Compare results with that schedule.

## License

[MIT](LICENSE)
