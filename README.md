# compound

A small Node.js script that computes the **fixed monthly payment** for an amortizing loan and prints a **month-by-month** breakdown of interest versus principal, plus **yearly** running totals.

This code was [first published as a GitHub Gist](https://gist.github.com/nikolaybotev/29154383c238a5958352edee512ce787) (August 2022, same `compound_interest_monthly.js` file).

There are no npm dependencies; only the Node.js runtime is required.

## What it does

1. **Monthly payment** — Uses the standard amortization formula (fixed rate, equal payments over the full term). The implementation follows the same idea as common mortgage calculators; a derivation is outlined on [Bankrate’s amortization calculator](https://www.bankrate.com/mortgages/amortization-calculator/#how-to-calculate).

2. **Payment schedule** — For each month it logs the interest portion and principal portion of that payment, then accumulates totals per year.

3. **Year-end summary** — After each calendar year of payments it prints cumulative interest paid, cumulative principal paid, and remaining principal.

4. **Loan cost** — At the end it prints the total amount paid over the life of the loan (principal repaid plus interest paid; any tiny residual from rounding is reflected in the printed components).

## Requirements

- [Node.js](https://nodejs.org/) (any recent LTS is fine)

## Run

From this directory:

```bash
node compound_interest_monthly.js
```

## Customize the scenario

Edit the constants at the top of `compound_interest_monthly.js`:

| Variable        | Meaning                          |
|-----------------|----------------------------------|
| `loan_amount`   | Principal borrowed (dollars)   |
| `interest`      | Annual interest rate (percent) |
| `term`          | Loan term in years             |

Optional **extra payment** logic is left in comments near the bottom of the inner loop; uncomment and adjust the amount to model a one-time extra principal payment in the first month.

## Output

- One line with the computed **monthly payment**.
- For each month: payment number (year/month), **interest** and **principal** for that installment.
- After each year: **Interest Paid**, **Principal Paid**, **Principal Left** (cumulative / remaining).
- Final line: **Cost of loan** (total outlay over the schedule).

Numbers are formatted with US locale and two decimal places.

## License

[MIT](LICENSE)
