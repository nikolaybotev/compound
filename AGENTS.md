# compound

A zero-dependency Node.js calculator for a fixed monthly mortgage payment and its amortization. The change in progress is `intent/mortgage-skill/`: loan terms as arguments, extra principal as a CSV, and a skill that asks for missing facts before it answers.

## Commands

- Install: none. Node.js is the runtime.
- Run: `node compound_interest_monthly.js` (healthy: it prints a monthly payment and a year-by-year schedule for the constants at the top of the file, currently $855,000 at 6.99% for 30 years).
- Test: none yet.
- Lint: none.
- Build: none.

## Conventions

- Docs follow the solo AI-native SDLC chain: `intent/<change>/intent.md` → `spec.md` → `plan.md`. Update `plan.md` in the same commit when implementation departs from it.
- No npm dependencies.
- Money printed by the script uses US locale and two decimal places.
- The note rate is percent per year (`6.99` means 6.99%), and the monthly rate is that percent divided by 12.

## Architecture

- `compound_interest_monthly.js` is the calculator. Extra principal is a commented block in the month loop, not an input.
- `intent/mortgage-skill/` is the draft for arguments, the extra-payment CSV, and `.agents/skills/mortgage-loan-calculator/`.
- `README.md` describes the current script. The spec describes the script after the change lands.

## Things agents get wrong

- Uncommenting the extra-payment block does not answer an interest-saved question. The loop always runs `term * 12` months, so an early payoff drives the balance negative and keeps accruing interest.
- Do not round currency with `Math.round(dollars * 100) / 100`. `Math.round(1.005 * 100)` is 100. The spec uses integer cents.
- Interest accrues once a month at note rate × 30/360, which is the same as dividing the annual rate by 12. A calendar month's actual day count is a different accrual. The payment formula in the script is the fixed payment that zeroes that monthly recurrence after the term.
- Rounding that payment to the cent before walking the schedule leaves a few dollars of principal and raises total interest. On $570,000 at 7% for 30 years the exact walk totals $795,200.72. Report cents at the end; do not round inside the month loop.
