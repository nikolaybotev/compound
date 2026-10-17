# spec.md — ARM prevailing principal and interest

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-17) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

On an ARM, the prevailing principal and interest is the initial fixed-period payment. The scenario dropdown and the Monthly payment section already add that figure to taxes and insurance and the prevailing extra. A fixed-rate loan still uses its one scheduled payment. The Highest payment line stays the highest scheduled payment. `amortize.js` does not change. This docs pull request leaves the point version at 0.14. The pull request that ships the page sets it to 0.15.

This folder builds on [intent/loan-scenarios/](../loan-scenarios/spec.md) and [intent/arm-fixed-period-pe/](../arm-fixed-period-pe/spec.md). Where `intent/loan-scenarios/` requirement 6 takes an ARM’s principal and interest from the scheduled payment in effect for the most months, this spec wins. Where `intent/arm-fixed-period-pe/` requirement 4, P4, and D4 keep that most-months count, this spec wins for the principal and interest. The prevailing extra stays the fixed-period count from `intent/arm-fixed-period-pe/`. Where `intent/ui-facelift/` requirement 10 sets the 5.875% 7/1 Monthly payment at `$5,953.96` from the post-adjustment payment, this spec wins.

## 2. Goals and non-goals

**Goals**

- G1. Use the initial fixed-period principal and interest as an ARM’s prevailing principal and interest.
- G2. Leave a fixed-rate loan on its one scheduled payment.
- G3. Leave the Highest payment line on the highest scheduled payment.

**Non-goals**

- A change to `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, the skills, or a fixed-rate JSON, CSV, or summary.
- A command-line flag.
- A change to the prevailing-extra count, the schedule’s Payment column, or the Highest payment line.
- A point-version bump on this docs pull request. The pull request that ships the page sets `apps/web/package.json` to `0.15.0` and `PAGES_POINT_VERSION` to `0.15`.
- Naming a credit union in the page, the tests, or these files.

**Release phasing.** G1, G2, and G3 ship together. Nothing is tagged for later.

## 3. Principles

- P1. One walk. The figure is `monthly_payment_cents` on the applied-map report the page already builds. That field is the walk’s initial payment. The page does not grow a second formula.
- P2. The same report’s later `payment_cents` stay on the schedule and in the Highest payment line. They are a different figure.
- P3. Taxes and insurance and the prevailing extra are added beside this principal and interest. They are not folded into it.
- P4. A stored ARM draft with the product set to fixed does not select this rule. The report has no `arm` key, and the fixed path stands.

## 4. Users and scenarios

- On a fixed loan the owner’s Monthly payment and scenario dropdown stay on the one scheduled payment. The fresh visit stays `$4,853.10` and `1: $4,853 - 600K | 5% down | 7.375% | 30 years | fixed`.
- The owner sets the fresh loan to 5.5%, switches to ARM, and sets the start month to November 2026. With no extra, Monthly payment is `$4,152.65`, the bar’s PI is `$3,236.40`, the dropdown is `1: $4,153 - 600K | 5% down | 5.5% | 30 years | 7/1`, and Highest payment is `$4,869.46 from December 2033`.
- On that same ARM the owner’s applied extra is `$823.60` in months 1–84. Monthly payment is `$4,976.25`, the bar’s PI is `$3,236.40`, the dropdown is `1: $4,976 - 600K | 5% down | 5.5% | 30 years | 7/1`, and Highest payment stays `$4,060.00 from December 2033`.
- On the 5.875% 7/1 with no extra, Monthly payment is `$4,288.02` and Highest payment stays `$5,037.71 from November 2033`.

## 5. Functional requirements

1. **The ARM figure.** `modalPaymentCents` keeps its one argument, the report. When `report.arm` is present, it returns `report.monthly_payment_cents` and does not count rows. That field is the walk’s initial payment, the principal and interest during the initial fixed period. On the requirement 6 sample it is 323640 cents. Months 1–84 of that schedule are the same `payment_cents`. Months 85–360 are 406000 cents. The function returns 323640. `scenarioFigures` already calls this function on the applied-map report, and only that report passes `arm` when the product is ARM and the terms parse. A fixed product passes no `arm`, including when ARM terms are stored with `enabled` false.

2. **The fixed figure.** When `report.arm` is absent, `modalPaymentCents` stays the function it is today. Every month through `payoff_month` contributes `monthly_payment_cents`, so the result is that one scheduled payment. A payoff month’s `principal_cents + interest_cents` is not the figure. The fresh fixed loan stays 393685 cents.

3. **What the figure feeds.** The scenario dropdown and the Monthly payment section already use `scenarioFigures`. They pick up the new amount with no second calculation. The closed `#scenario` control shows the whole-dollar prevailing total in the numbered label it already builds: `{n}: ` plus `scenarioLabelText`. Whole dollars are `headingDollarsFromCents`. The Monthly payment region shows `formatMoney` of the cent total, and its summary bar draws the PI segment from these cents, with `flex-grow` set to the cents, labeled `PI`. Taxes and insurance stay the picture’s tax, home insurance, and PMI. The prevailing extra stays `prevailingExtraCents`. The heading line stays the loan facts and has no `= $… / month`. Inactive scenario rows use the same figures for their own loans.

4. **The Highest payment line.** The summary line labeled Highest payment stays `formatMoney(report.arm.max_payment_cents)` and `from` the long date of `report.arm.max_payment_month`. That report is the schedule walk, the one the page already uses for the line. This change does not write the initial payment into that line. On the sample the line stays `$4,060.00 from December 2033`. On the 5.875% 7/1 with start October 2026 and no extra, it stays `$5,037.71 from November 2033`.

5. **The schedule.** ARM mode keeps eleven columns and fixed mode keeps eight. The Payment cell stays that month’s `payment_cents`. On the sample, December 2026 (payment 1) shows `$3,236.40` and December 2033 (payment 85) shows `$4,060.00`. The column is not filled with the prevailing principal and interest.

6. **Fixtures.** The loan is the page’s $600,000 purchase with 5% down, so the financed principal is $570,000, unless a fixture says otherwise. ARM terms, unless a fixture says otherwise, are fixed 84 months, adjust every 12, margin 2.5, caps 5/2/5, lifetime floor 2.5, first-adjustment floor 2.5, round to 1/8 off, and no index. TI on the default picture is 91625 cents. Checked 2026-10-17 with `buildReport` and no edit to `amortize.js`. `paymentDate("2026-11", 85)` is December 2033. `paymentDate("2026-10", 85)` is November 2033. Whole dollars use `headingDollarsFromCents`.

   **S1. The sample.** Note rate 5.5%, start `2026-11`, `$823.60` applied in months 1–84 and nothing after. `monthly_payment_cents` is 323640. Months 1–84 are `payment_cents` 323640. Months 85–360 are 406000, 276 months. Today’s most-months count returns 406000. The prevailing principal and interest is 323640. All 84 fixed-period rows are `extra_cents` 82360, so the prevailing extra is 82360. TI is 91625. The cent total is 497625. Monthly payment is `$4,976.25`. The scenario label’s dollar is `$4,976`. The closed control reads `1: $4,976 - 600K | 5% down | 5.5% | 30 years | 7/1`. The summary bar’s name is `Principal and interest $3,236.40, Taxes and insurance $916.25, Prevailing extra $823.60`, and the PI segment’s `flex-grow` is `323640`. `max_payment_cents` is 406000 and `max_payment_month` is 85, so Highest payment is `$4,060.00 from December 2033`. The same walk’s `even_out_cents` is 82360. The prevailing principal and interest does not read that field. A month-1 lump of $570,000 pays off in month 1: `monthly_payment_cents` and that row’s `payment_cents` are 323640, and `principal_cents + interest_cents` is 261250. The prevailing principal and interest is 323640.

   **S2. The same ARM with no extra.** Start `2026-11`. `monthly_payment_cents` is 323640. Months 85–360 are 486946. Today’s count returns 486946. The prevailing principal and interest is 323640. The prevailing extra is 0. The cent total is 415265. Monthly payment is `$4,152.65`. The scenario label’s dollar is `$4,153`. Highest payment is `$4,869.46 from December 2033`.

   **S3. The 5.875% 7/1 with no extra.** Start `2026-10`. Months 1–84 are 337177 and months 85–360 are 503771. The prevailing principal and interest is 337177. The prevailing extra is 0. The cent total is 428802. Monthly payment is `$4,288.02`. The scenario label’s dollar is `$4,288`. Highest payment is `$5,037.71 from November 2033`. The closed control reads `1: $4,288 - 600K | 5% down | 5.875% | 30 years | 7/1`.

   **S4. $100 in months 1–84 of the 5.875% 7/1.** The prevailing extra stays 10000. The prevailing principal and interest is 337177. Month 85’s `payment_cents` is 493534. The cent total is 438802. Monthly payment is `$4,388.02`. The scenario label’s dollar is `$4,388`. The summary bar’s name is `Principal and interest $3,371.77, Taxes and insurance $916.25, Prevailing extra $100.00`.

   **S5. ARM at the fresh note rate.** Note rate 7.375%, the page’s ARM terms, no extra, start `2026-10`. The prevailing principal and interest is 393685, the same cent amount as the fixed loan. The cent total is 485310. Monthly payment is `$4,853.10`. The scenario label’s dollar is `$4,853`. Highest payment stays `$5,725.59 from November 2033`.

   **S6. A 15-year fixed period at 5.875%.** Fixed period 180 months, no extra. Months 1–180 are 337177 and months 181–360 are 454645. The prevailing principal and interest is 337177. The cent total stays 428802.

   **S7. The $1 boundary on the 5.875% 7/1.** `$1` applied in months 1–68. The prevailing extra stays 100 cents. The prevailing principal and interest is 337177. The cent total is 428902. Months 1–67 only: the prevailing extra is 0 and the cent total is 428802.

   **S8. A fixed loan.** The fresh 7.375% loan, and that loan with a stored ARM draft whose product is fixed, keep modal 393685. `$100` in every month keeps modal 393685 and total 495310. A one-month lump of $570,000 keeps modal 393685.

7. **Docs and version, on the implementation.** This docs pull request does not edit `AGENTS.md`, `REVIEW.md`, `apps/web/package.json`, or `.github/workflows/`. By the end of the page release, `AGENTS.md` says an ARM’s prevailing principal and interest is the applied-map report’s `monthly_payment_cents`, the initial fixed-period payment, and a fixed-rate loan still uses its one scheduled payment. The Highest payment line stays the schedule walk’s maximum. It records the app version as 0.15 (`apps/web/package.json` `0.15.0`, `PAGES_POINT_VERSION` `0.15`) and leaves the 0.14 sentence on the fixed-period prevailing-extra bullet. Things agents get wrong drops the warning that says not to window the modal payment to the fixed period, and gains: do not use the post-adjustment payment as an ARM’s prevailing principal and interest; do not put the initial payment on the Highest payment line; do not read the level-extra checkbox for this figure; do not add a command-line flag, a skill change, or an `amortize.js` change. The warning about principal-plus-interest of the payoff month stays. `REVIEW.md` Compliance names `intent/arm-fixed-period-pi/`. Bugs drops “a modal payment taken from the fixed period only” and names an ARM prevailing principal and interest taken from the post-adjustment payment, and a Highest payment line that is not the schedule walk’s maximum.

## 6. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | `pnpm --dir apps/web test`: S1 through S8. S1’s prevailing principal and interest is 323640, prevailing extra 82360, total 497625, and the schedule walk’s maximum is 406000 at month 85. `paymentDate("2026-11", 85)` is year 2033, month 12. The month-1 lump’s figure is 323640. S2’s figure is 323640 and its total is 415265. S3’s figure is 337177 and its total is 428802. S4’s figure is 337177, extra 10000, total 438802. S5’s figure is 393685 and its total is 485310. S6’s figure is 337177. S7’s totals are 428902 and 428802. S8’s fixed figures stay 393685, including a stored ARM draft whose product is fixed. |
| AC2 | Playwright, clock 2026-10-15: on the fresh loan, set the rate to 5.5, the product to ARM, and the start month to November 2026. The Monthly payment region contains `$4,152.65` and `$3,236.40 PI`. The summary bar’s name is `Principal and interest $3,236.40, Taxes and insurance $916.25`. `#scenario`’s accessible name is `1: $4,153 - 600K \| 5% down \| 5.5% \| 30 years \| 7/1`. Highest payment contains `$4,869.46 from December 2033`. |
| AC3 | Playwright, same clock: import the S1 scenario document from the plan. The Monthly payment region contains `$4,976.25` and `$3,236.40 PI`. The summary bar’s name is S1’s sentence, and its PI segment’s `flex-grow` is `323640`. `#scenario`’s accessible name is `1: $4,976 - 600K \| 5% down \| 5.5% \| 30 years \| 7/1`. Highest payment contains `$4,060.00 from December 2033`. The December 2026 row contains `$3,236.40` and the December 2033 row contains `$4,060.00`. |
| AC4 | Playwright, same clock: the 5.875% 7/1 with no extra shows Monthly payment `$4,288.02` and Highest payment `$5,037.71 from November 2033`. Switching the fresh 7.375% loan to ARM shows Monthly payment `$4,853.10` and leaves Highest payment `$5,725.59 from November 2033`. The existing `$100` fixed-period extra on the 5.875% 7/1 shows Monthly payment `$4,388.02`, PI `$3,371.77`, and scenario name `1: $4,388 - 600K \| 5% down \| 5.875% \| 30 years \| 7/1`. |
| AC5 | `node --test` exits 0 with no change to a calculator test. `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, and `.agents/skills/` have no diff. The page release leaves `apps/web/package.json` at `0.15.0` and `PAGES_POINT_VERSION` at `0.15`. This docs pull request leaves both at `0.14.0` and `0.14`. |

## 7. Design decisions

**D1 — Return `monthly_payment_cents` when `report.arm` is present.** The walk stores the initial payment on that field and uses it for every fixed-period row. Checked 2026-10-17: on S1, `monthly_payment_cents` and months 1–84 are 323640, and months 85–360 are 406000. Counting rows returns 406000. An index, a cap, and an extra change later rows and leave `monthly_payment_cents` on the initial payment. A new helper was rejected because `modalPaymentCents` is already the function the dropdown and the Monthly payment section read.

**D2 — The payoff month’s principal and interest stays out.** S1’s month-1 lump has `payment_cents` 323640 and `principal_cents + interest_cents` 261250. The figure is 323640. The fixed lump in S8 stays 393685.

**D3 — The total adds the extra beside the principal and interest.** On S1 the reset payment 406000 equals 323640 + 82360, and that 82360 is the prevailing extra. Putting 406000 in the PI segment and adding the extra again is the `$5,799.85` total the request retires. The cent total is 497625.

**D4 — The Highest payment line is the schedule maximum.** S1’s maximum is 406000 at month 85, which is December 2033 when the start month is November 2026. S2’s maximum is 486946 at that same month. The line follows the walk that is already on the screen. It does not follow `modalPaymentCents`.

**D5 — The level-extra checkbox is unrelated.** Nikolay, 2026-10-17. `modalPaymentCents` does not read it. This spec does not describe the figure as depending on it. The sentence in the original prompt that names both checkbox states stays in `intent.md` and is not a requirement to test those states. S1’s extra is the applied map of `$823.60` in months 1–84.

**D6 — This docs pull request does not ship the page.** It adds this folder only. `package.json` stays `0.14.0` and `PAGES_POINT_VERSION` stays `0.14`. The pull request that ships the page sets both to 0.15.

## 8. Open questions

None.
