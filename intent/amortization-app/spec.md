# spec.md — Amortization app

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-02) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

A static page in this repo amortizes one fixed mortgage in the browser by calling the same walk as `compound_interest_monthly.js`. The loan amount is the purchase price minus a percent down. The page shows the scheduled payment, that loan amount, total interest, total cost, and the payoff month; a full-width stacked bar chart; and a year-grouped schedule whose extra-payment cells are editable. A monthly amount and a once-a-year amount prefill those cells only when Apply is clicked. GitHub Actions publishes the built page to GitHub Pages.

## 2. Goals and non-goals

**Goals**

- G1. One page, usable from a local file build or from GitHub Pages, with no account and no request sent in order to compute a loan.
- G2. The same cents as the calculator for the same principal, note rate, term, and extra principal.
- G3. Inputs for purchase price, down payment percent, term in years, note rate, and loan start month. The summary shows the derived loan amount, the scheduled monthly payment, total interest, total cost, and the payoff month.
- G4. A full-width stacked bar chart of principal paid, interest paid, loan balance, and interest remaining. The legend is a card on the month under the pointer.
- G5. A schedule grouped by calendar year, with month number, date, principal, interest, extra payment, principal balance, and interest balance.
- G6. The extra payment on each schedule row is editable, and editing it recomputes the loan.
- G7. An expandable "Make extra payments" section above the schedule, with an additional monthly amount and an additional yearly amount in a chosen calendar month, applied only by an Apply button.
- G8. Published on GitHub Pages from this repo by a GitHub Actions workflow, the same shape goldvalue uses for a static `dist`, without goldvalue's data sync or daily cron.

**Non-goals**

- A second repository, a server, an account, or a service worker.
- Adjustable-rate, interest-only, balloon, biweekly, or recast loans. Taxes, insurance, HOA, PMI, points, or fees.
- Bankrate's one-time date field. A one-time extra is an edited cell.
- A form control for "the first N months" or "the first year". That plan is Apply, then edit the cells.
- Applying the prefill on each keystroke.
- Two scenarios side by side, rate alerts, or a saved account.
- Copying Bankrate's navigation, article text, or visual skin.
- Changing what the CLI prints, or what `extra_cents` means in `--json` (applied extra, not requested).
- A daily republish. This page has no external data.

**Release phasing.** G1–G8 are the first release. Untagged requirements below belong to that release.

## 3. Principles

- P1. The page calls `buildReport` in `amortize.js`. It does not reimplement the payment formula, the 30/360 walk, or the extra-principal order.
- P2. Purchase price, down payment, term, rate, and start month recompute as they are edited. The prefill form does not. It changes the schedule only when Apply is clicked.
- P3. The schedule's extra column is the requested extra, in dollars. The calculator still applies it after that month's interest and may leave some of it unapplied. The column keeps showing what was requested.
- P4. The calculator stays in payment numbers. The start month is a view. Payment 1 is the calendar month after the start month.
- P5. Money on the page is the calculator's integer cents, formatted once. The page does not round a dollar amount a second time.
- P6. After the document and its assets have loaded, the page does not fetch. No analytics, no font CDN, no call to Bankrate.
- P7. Apply replaces the requested-extra map with the form's pattern. It does not add the pattern on top of what is already there.
- P8. The four chart bands partition the loan: principal paid plus loan balance is the loan amount, and interest paid plus interest remaining is this run's total interest. The column is as tall as the total cost.

## 4. Users and scenarios

- The owner opens the page. It shows a $570,000 purchase, 0% down, 30 years, 7%, and the current month as the start month. The summary matches the calculator for that principal.
- The owner sets the start month to October 2026. The first schedule row is November 2026. The payoff month is October 2056. Hovering November 2039 shows the month-157 balances in AC3.
- The owner sets the purchase price to $712,500 and the down payment to 20%. The loan amount is $570,000 and the payment matches the example above.
- The owner opens Make extra payments, enters $100 a month, and clicks Apply. The extra column becomes $100 on every payment month. Interest, payoff date, and interest saved update. The monthly payment does not.
- The owner then types $0 into month 13's extra cell and leaves the field. Only that month changes. The form still shows $100. Clicking Apply again puts $100 back on every month, including month 13.
- The owner enters $1,000 in the yearly amount, chooses January, and clicks Apply. Each January payment carries $1,000 plus any monthly amount. Other months do not.
- The owner reloads the page. The loan, the extra column, and the prefill fields are as they were.

## 5. Functional requirements

1. The pure walk lives in `amortize.js` at the repo root. That file has no `require`, no `import` of a Node module, and no reference to `process` or `fs`. It exports `buildReport(principal, ratePercent, years, extrasByMonth)` and `formatGroupedCents(cents)`. `buildReport` is the function the CLI already uses to fill `--json --schedule`: same arguments, same cent fields, schedule always present. `extrasByMonth` is a `Map` from payment number to a positive dollar amount. `compound_interest_monthly.js` remains the CLI. It requires `amortize.js` and its stdout, stderr, and exit codes stay as specified in `intent/mortgage-skill/spec.md`.

2. The page is a Vite + Preact app at `apps/web`. Production output is static files in `apps/web/dist`. The dev server and `vite preview` serve the same app. There is no runtime server. The calculator's `node --test` job does not install npm packages. The web app's dependencies live in its own package and lockfile, installed with pnpm only by the web job and the deploy job.

3. Inputs, in one row that wraps on a narrow window:
   - Purchase price: dollars, greater than zero, at most two decimal places.
   - Down payment: a percent, greater than or equal to zero and less than 100, at most three decimal places.
   - Term: a positive integer number of years, the same rule as `--years`.
   - Interest: the annual note rate in percent, the same rule as `--rate`.
   - Start month: a month and year, no day. The control is a month input.

   The loan amount, in cents, is the purchase price in cents minus the down payment in cents. Down payment cents are the price in cents times the percent, divided by 100, rounded half up to the cent with the calculator's cent rule (not `Math.round(dollars * 100) / 100`). A result that is not greater than zero is invalid. $712,500 at 20% down is a loan of $570,000.00. $399,999.00 at 3.5% down is a down payment of $13,999.97 and a loan of $385,999.03.

4. While an input is invalid, the page says what is wrong and keeps showing the last valid loan. It does not clear the chart to an empty state on the first bad keystroke.

5. The first visit, with nothing saved, uses purchase price $570,000, down payment 0%, term 30, rate 7%, and the start month equal to the visitor's current month. Extras are empty. The prefill amounts are empty and the yearly month is January. The "Make extra payments" section is collapsed.

6. Summary, under the inputs, in this order: Monthly payment, Loan amount, Total interest paid, Total cost of loan, Payoff date. Monthly payment is `monthly_payment_cents`, the scheduled principal and interest, and it does not include extra principal. A line under it says the extra payment is on top of this amount. Total interest is `interest_cents`. Total cost is `amount_cents + interest_cents`. Payoff date is the calendar month of `payoff_month` (requirement 8). When the requested-extra map has any positive amount, the summary also shows Interest saved (`interest_saved_cents`) and Months saved (`months_saved`). When the map is empty, those two are absent. Money uses `formatGroupedCents`.

7. The page passes the derived principal, the rate, the term, and the requested-extra map to `buildReport`. Months in the map outside `1…years * 12` are dropped before the call. Changing price, down payment, term, rate, or start month does not run Apply and does not clear the map, except for that drop when the term shrinks.

8. Payment month 1 is the calendar month after the start month. Payment month `k` is the start month plus `k` months. For a start month of October 2026, month 1 is November 2026, month 157 is November 2039, and month 360 is October 2056. The schedule and the chart stop at `payoff_month`. They do not show the calculator's later zero rows. The payoff date is that last month.

9. The chart is a stacked bar chart, one bar per payment month from 1 through `payoff_month`, across the full width of the page column. There is no legend column. The page column is `min(72rem, 100% - 2rem)`, centered, and the chart spans it. From bottom to top the bands are Principal paid, Interest paid, Loan balance, Interest remaining.
   - Loan balance is `remaining_principal_cents`.
   - Principal paid is `amount_cents - remaining_principal_cents`.
   - Interest remaining is `remaining_interest_cents`.
   - Interest paid is `interest_cents - remaining_interest_cents`.

   Every bar is the same height, the total cost of this run. The scale is that total, so a run with less interest is a shorter column. Summing the rounded principal of each month is not the definition of Principal paid: through month 157 of the example loan that sum is 7 cents lower than `amount_cents - remaining_principal_cents`.

10. The legend is a card drawn over the chart, visible only while a month is indicated. Moving the pointer indicates the month under it. Tabbing to the chart and pressing ArrowLeft or ArrowRight moves that month and keeps the card open. On a touch screen, tapping a bar pins the card, and tapping outside it closes the card. The card is titled with that month's date and lists:
    - Principal paid, with the piggy-bank icon
    - Interest paid, with the hooded figure
    - Loan balance
    - Interest remaining
    - This payment: Principal (`principal_cents`), Interest (`interest_cents`), Extra principal (the requested extra for that month)

    The same two icons are drawn on the hovered bar, centered on their band, when that band is at least 24px tall. They are original SVG drawings in the repo: a piggy bank in side view with a coin slot, and a hooded figure walking with a sack. They are not an emoji, an icon font, or a character from a film.

11. Colors and type are part of the page, not a default theme:
    - Paper `#F2F4F3`, card `#FFFFFF`, ink `#17211F`, muted `#5C6B66`, line `#D7DED9`.
    - Principal paid `#1B7A4D`. Interest paid `#C5362B`. Loan balance `#2A4365`. Interest remaining `#D9A441`.
    - UI text is Atkinson Hyperlegible. Money and month numbers are IBM Plex Mono with tabular figures. Both are OFL and are files in the repo. The page does not request a font from the network. If a file's license is not the SIL Open Font License, the build stops and says so.
    - The title is "Amortization". There is no site navigation and no login.

12. The schedule sits under the chart. Columns, in order: `#`, Date, Principal, Interest, Extra payment, Principal balance, Interest balance. `#` is the payment number. Date is the short month and year (`Nov 2026`). Principal, Interest, Principal balance, and Interest balance are the row's cents. Extra payment is the requested amount, or empty when the month has none.

13. Rows are grouped by calendar year. A year row shows the year, the sum of principal cents, the sum of interest cents, the sum of requested extra, and the principal balance and interest balance of the last payment month in that year. The first year is expanded on first load. Later years are collapsed. A year row toggles that year. "Expand all years" expands or collapses every year. Editing a cell, applying a prefill, or changing the loan does not collapse a year the owner has opened. For the October 2026 example, the 2026 group contains November and December only.

14. The extra-payment cell is a text field. Committing it (Enter or leaving the field) accepts a non-negative dollar amount with at most two decimal places. Zero or an empty field removes that month's extra. Anything else is left unchanged and the field shows the previous amount. The loan recomputes on a successful commit. Other columns are not fields.

15. "Make extra payments" is a button above the schedule. It expands and collapses a section in place, not a modal. The section has:
    - Additional amount to monthly payment
    - Additional yearly payment, and a month-of-year select (January through December)
    - Apply

    Both amounts are non-negative dollar amounts with at most two decimal places, or empty. Apply with either field invalid does nothing and says which field is wrong. A valid Apply builds a new map for months 1 through `years * 12`: every month gets the monthly amount, and every payment whose calendar month is the selected month also gets the yearly amount. Amounts of zero are omitted. That map replaces the requested-extra map. The form fields stay as entered. The button does not ask for confirmation. The section's text says that Apply replaces the extra-payment column.

16. The loan inputs, the requested-extra map, the prefill fields, and which years are expanded are stored in `localStorage` under one versioned key and restored on load. A value that does not parse is ignored, and the page uses requirement 5. The page writes no other storage and no cookie.

17. The built page contains no request to any host except its own files. Playwright covers the fixture with every other host blocked.

18. Deploy. `.github/workflows/deploy-pages.yml` runs on a push to `main` and on `workflow_dispatch`. It does not run on a schedule. It installs with pnpm, builds `apps/web` with `VITE_BASE=/compound/`, and uploads `apps/web/dist` to GitHub Pages with `actions/upload-pages-artifact` and `actions/deploy-pages`. It commits nothing. The site is `https://nikolaybotev.github.io/compound/`. Local `vite preview` uses a relative base so the same `dist` opens from a folder. The workflow's permissions are `contents: read`, `pages: write`, and `id-token: write`.

19. Continuous integration keeps the existing Node.js 24 `node --test` job with no install step. A second job, also Node.js 24, installs the web app and runs its unit tests and Playwright. A pull request that breaks either job is not merged.

## 6. Acceptance criteria

The example loan is purchase price $570,000, 0% down, 30 years, 7%, start month October 2026, unless a row says otherwise.

| ID | Check |
|---|---|
| AC1 | `node --test` exits 0. The CLI fixture is unchanged: $570,000 at 7% for 30 years reports payment 379222 cents, interest 79520072 cents, payoff month 360, and month-1 interest 332500 cents. |
| AC2 | `amortize.js` source contains no `require`, no `process`, and no `fs`. `buildReport(570000, 7, 30, new Map())` returns `monthly_payment_cents` 379222, `interest_cents` 79520072, `payoff_month` 360, month 1 `interest_cents` 332500 and `principal_cents` 46722, month 157 `remaining_principal_cents` 45048005 and `remaining_interest_cents` 31934147, month 360 `remaining_principal_cents` 0. `formatGroupedCents(379222)` is `3,792.22`. |
| AC3 | With the example loan and no extras, the page shows monthly payment $3,792.22, loan amount $570,000.00, total interest $795,200.72, total cost $1,365,200.72, and payoff October 2056. The 2026 group lists November and December only. The November row is month 1, principal $467.22, interest $3,325.00, no extra, principal balance $569,532.78, interest balance $791,875.72. The chart has 360 bars. The card for November 2039 shows principal paid $119,519.95, interest paid $475,859.25, loan balance $450,480.05, interest remaining $319,341.47, and this payment's principal $1,157.67, interest $2,634.55, extra principal $0.00. Interest saved is not shown. |
| AC4 | Price $712,500 and down payment 20% shows loan amount $570,000.00 and monthly payment $3,792.22. Price $399,999.00 and down payment 3.5% shows a loan amount of $385,999.03. |
| AC5 | Apply with monthly $100 and yearly empty, on the example loan, shows extra $100.00 on month 1. The displayed rows stop at payoff, June 2054. The summary shows interest $718,834.63, interest saved $76,366.09, months saved 28, and monthly payment still $3,792.22. The prefill map itself has $100 on every month from 1 through 360; that is a unit test, because months after payoff are not on the page. Typing in the monthly field without Apply does not change the table. |
| AC6 | After AC5, setting month 1's extra cell to $0.00 and committing it leaves month 2 at $100.00, and month 1's interest stays $3,325.00. Clicking Apply again sets month 1 back to $100.00. |
| AC7 | Apply with monthly empty, yearly $1,000, and January, on the example loan with no other extras, puts $1,000.00 on month 3 (January 2027) and not on month 1. Interest saved is $66,633.36, payoff month 336, which is displayed as October 2054. |
| AC8 | Reload restores the loan, the extra column, and the prefill fields. A stored value that is not valid JSON loads the AC3 defaults instead of a blank page. |
| AC9 | The Playwright run blocks every host other than the app and still shows the AC3 payment. The built JavaScript does not contain `bankrate.com`. |
| AC10 | The deploy workflow has no `schedule` trigger. A push to `main` publishes `https://nikolaybotev.github.io/compound/`, and that URL shows $3,792.22 for the default loan once the start month is October 2026. |

October 2054 in AC7: month 1 is November 2026, so month 336 is October 2054. Checked 2026-10-02 by counting months, and by running the CLI on a CSV of $1,000 at months 3, 15, …: `interest_saved_cents` 6663336, `payoff_month` 336.

## 7. Design decisions

**D1 — This is a new intent in the compound repo, not a new repo.** The page's job is to operate the calculator that already lives here. A second repo would have to copy the walk or depend on a published package this repo does not have. The chain it builds on is `intent/mortgage-skill/`.

**D2 — One walk, in a file the browser can load.** Checked 2026-10-02: `compound_interest_monthly.js` exports only `dollarsToCents`, and `require('node:fs')` runs at load. A bundler that loads that file will try to include `node:fs`. The walk moves to `amortize.js` with no Node APIs. The CLI file stays the command the skill runs, and it requires the pure module. The page imports the pure module. That is the same backend: one formula, two callers.

**D3 — The loan amount is price minus percent down.** The prompt preferred that split over typing the principal. Zero percent down is how a known principal is entered: price $570,000, down 0. A dollar down payment is not a separate field. The percent is rounded to a cent before it is subtracted, so the principal is a whole number of cents. Checked the 3.5% case by hand: 3.5% of $399,999.00 is $13,999.965, which is $13,999.97 half up, and the loan is $385,999.03.

**D4 — Payment 1 is the month after the start month.** The attached schedule, with loan start October 2026, begins at November: principal $467.22, interest $3,325.00, balance $569,532.78, which is this calculator's month 1. The summary payoff is October 2056 across 360 payments. October 2026 through October 2056 inclusive is 361 months, so the start month is not itself payment 1. Checked 2026-10-02: month 157 is November 2039, and the chart callout "as of November 2039" (principal paid $119,520, interest paid $475,859, balance $450,480) matches this calculator's month 157 once those cents are rounded to the dollar. The page shows the cents.

**D5 — The chart uses balances, not the sum of rounded months.** Principal paid is loan amount minus remaining principal. Interest paid is total interest minus interest remaining. Checked 2026-10-02 on the example loan: month 157 remaining principal is 45048005 cents, so principal paid is 11951995 cents ($119,519.95). The sum of the rounded `principal_cents` through that month is 11951988. Interest paid is 47585925 cents ($475,859.25). The four bands add up to the total cost on every month, so the column does not change height as the split shifts. Bankrate's callout is those figures to the nearest dollar. We do not adopt that rounding; the mortgage spec already records that their summary card rounds $795,200.72 up to $795,201.

**D6 — The column stops at this loan's payoff.** The CLI keeps zero rows through the no-extra payoff so the last `interest_saved` sits on the sheet. The page is not that sheet. Showing those rows would put empty years on the chart after the loan is gone. Interest saved in the summary still comes from the report's `interest_saved_cents`.

**D7 — Requested extra is the cell; applied extra stays inside the calculator.** `--json` `extra_cents` is what was applied. On the payoff month that can be less than what was asked. If the cell displayed the applied amount, a typed value would change by itself. The page keeps the requested map and sends it to `buildReport`. The summary can still show the report's applied and unapplied totals; the cell shows the request.

**D8 — Apply replaces the column.** The prompt asked for a manual apply because the cells are the custom schedule. A second Apply that added to the cells would double a month the owner had already edited. Replace matches "prefill": the form writes a pattern, and the cells are the source of truth until the next Apply. No confirm dialog. The section says that Apply replaces the column.

**D9 — The form has no end date and no one-time date.** The prompt names two fields, the monthly amount and the yearly amount, and names the cell as the custom case. Bankrate's one-time date is the cell. "The first year only" is Apply, then clear the later cells. A duration field would be a third pattern the prompt did not ask for.

**D10 — Loan edits do not re-run Apply.** The map is stored by payment number. Changing the start month moves the dates under those numbers. Changing the term drops numbers past the new term. Re-applying a January pattern after a start-month change is a new click. Doing it silently would wipe cell edits, which is the thing Apply is not allowed to do by surprise.

**D11 — Terms are live; the prefill is not.** The prompt draws that line so the form will not fight the cells. A cell commits on Enter or blur, which is the smallest step that still feels like editing the table. The loan inputs have no second source of truth, so they update immediately.

**D12 — Vite, Preact, pnpm, GitHub Pages, no cron.** Checked 2026-10-02 against goldvalue's `.github/workflows/deploy-pages.yml`: push to `main`, a daily cron, and `workflow_dispatch`; pnpm; `VITE_BASE=/goldvalue/`; upload `apps/web/dist`; deploy with the Pages actions; the job commits nothing. The cron is there because that site rebuilds market data. This page has no market data, so copying the cron would republish an unchanged bundle every day. The workflow here is push and manual dispatch only. The UI library is Preact because that is the static app goldvalue already ships, and the page is small. Node stays on 24, which is what this repo's test workflow runs. Goldvalue's app uses Node 26; this repo does not take that bump.

**D13 — Pages is not on for this repo yet.** Checked 2026-10-02: `gh api repos/nikolaybotev/compound` reports `has_pages: false`, and the Pages endpoint returns 404. The repo is public. Turning Pages on is a step in the deploy phase, not a reason to pick a different host. The URL is `https://nikolaybotev.github.io/compound/`.

**D14 — The default loan is the documented example.** $570,000, 0% down, 30 years, 7% is the loan the README compares with Bankrate. The start month follows the clock so the page is not stuck on October 2026 forever. Tests that need the screenshot dates set the start month; they do not depend on the day they run.

**D15 — Remember the scenario locally.** An edited extra column that disappears on reload is not a usable schedule. `localStorage` is enough. There is no account to sync.

**D16 — The drawings are ours, and the page does not look like Bankrate.** The prompt asks for a piggy bank and a robber or Robin Hood with a sack. The interest icon is a hooded figure with a sack, which covers that description without drawing a film character. The palette is a cool paper page, verdigris for principal kept, and red for interest taken. It is not Bankrate's navy marketing header, and it is not their article. The article text on that page is not copied.

## 8. Open questions

None.
