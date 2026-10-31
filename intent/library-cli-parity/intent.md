# intent.md — Library and CLI parity

| | |
|---|---|
| Captured | 2026-10-31 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/arm-extra-level/](../arm-extra-level/intent.md), [intent/loan-recast/](../loan-recast/intent.md), [intent/extra-savings-column/](../extra-savings-column/intent.md), [intent/loan-scenarios/](../loan-scenarios/intent.md), [intent/arm-fixed-period-pe/](../arm-fixed-period-pe/intent.md), [intent/arm-fixed-period-pi/](../arm-fixed-period-pi/intent.md), [intent/clean-closing-costs/](../clean-closing-costs/intent.md), [intent/mortgage-start-timeline/](../mortgage-start-timeline/intent.md) |

## Problem

The amortization page already levels an ARM payment with extra principal, shows both savings figures, names a prevailing principal and interest and a prevailing extra, formats dates from the start month, and prices property tax, insurance, PMI, and closing costs. The calculator library and the command-line tool do not share those formulas. The page term and the ARM initial period are years only. A fixed-rate recast is two calculator runs in the skill, with no library function and no control on the page.

## Proposed outcome

The library owns those formulas. The command-line tool can run them for one loan. The page then calls the same functions, and it can take a term and an initial period in months and show a fixed-rate recast. The page version moves when the page behavior changes.

## Affected users and systems

- **Users:** The owner, asking the calculator or reading the amortization page.
- **Systems:** `amortize.js`, the calculator command-line tool, the mortgage-loan-calculator skill, and the amortization page. The origination-fee tool, the ARM concepts skill, and the knowledge base stay as they are.

## Constraints and principles

- Saved by extra stays two numbers. Interest saved is the cumulative difference from the no-extra schedule. Saved by extra is the lifetime interest one month's extra removes given the rest of the map. Every surface that shows a schedule uses both names.
- Scenario storage and the chart stay on the page. The command-line tool runs one loan per invocation. It accepts tax, insurance, and PMI rates when they are passed. It does not grow a saved set of scenarios.
- The interest walk stays in payment numbers. The start month formats dates. It does not enter the monthly interest math.
- A fixed-rate recast gets a library function and a page control. An ARM recast stays declined.
- Interest-only and option ARMs stay explanation only.
- Level-the-payment extras move into the library so the command-line tool and the page call one function.
- This change does not start the Regulation Z APR. The existing fee inversion stays the fee inversion.
- Do not dispatch a Pages deploy.
- Do not put a personal-data rule in the repo.
- The page version moves when the page behavior changes. Library and command-line work that the page does not yet call does not move it.

## Open questions (carried into spec.md)

1. Which formulas move into `amortize.js`, and which move into a sibling module that still has no Node APIs.
2. How the command-line schedule gains Saved by extra while the fixed-rate summary, and the JSON without a schedule, stay byte-identical.
3. How a funding month is passed without changing the existing `--start` flag that the even-out yearly extra already uses.
4. What the recast control changes on the page, and how a term or an initial period in months is stored without a new scenario-document version.
5. Which page version this is, given that 0.23 is named for the APR solver.

## Original prompt (verbatim)

> Implement the library and CLI parity item from /cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/docs/parity-kb-plan.md (the section "Library and CLI parity, then the page uses it"). Follow this repo's intent chain (intent/<change>/intent.md, spec.md, plan.md) and the ai-native SDLC skill. Follow the personal-data rule in /cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/preferences.md and do not copy that rule into the repo. Branch from current main; teaser pull request 84 is merged as 56c40f571e669952e690b09713941ce0eae0b36f. Use one or more pull requests, as that section says. Merge each when the required checks are green. The page version moves only when page behavior changes. Do not start the Regulation Z APR. Do not dispatch a Pages deploy.

## Source transcript (verbatim)

Approved batch, from the parity plan. The decisions and item 6 are the source of this change.

> - **Saved by extra stays two numbers.** Interest saved is the cumulative difference from the no-extra schedule. Saved by extra is the lifetime interest one month’s extra removes given the rest of the map. Every surface that shows a schedule uses both names. They are not merged into one figure.
> - **Scenario storage and the chart stay on the page.** The CLI runs one loan per invocation. It will accept tax, insurance, and PMI rates when they are passed. It will not grow a saved set of scenarios.
> - **The interest walk stays in payment numbers.** Start month formats dates on the CLI and the page. It does not enter the monthly interest math.
> - **Fixed-rate recast gets a library function and a page control.** An ARM recast stays declined. The two-run procedure is for a fixed rate.
> - **Interest-only and option ARMs stay explanation only.** The APR solver covers a fully amortizing loan, including a discounted ARM and mortgage insurance in the payment stream. It does not become an interest-only or payment-option calculator.
> - **Level-the-payment extras move into the library** so the CLI and the page call one function. That overrides the earlier page-only rule for this one feature.
> - **The new APR is not the existing fee inversion.** `origination_fees.js` finds the prepaid finance charge from a note rate and an APR. Regulation Z here solves the APR from the finance charge.

> 6. **Library and CLI parity, then the page uses it.** One or more pull requests. Level-the-payment extras, a fixed-rate recast function, a term and an initial period in months on the page, both savings metrics, prevailing principal and interest, prevailing extra, start-month dates on the CLI, and closing-cost plus tax, insurance, and PMI formulas the CLI can run. The page version moves when the page behavior changes.
> 7. **0.23 — Regulation Z APR.** Finance charge per 12 CFR 1026.4, excluding third-party fees under 1026.4(c)(7). Amount financed is the loan amount minus prepaid finance charges. Actuarial APR per Appendix J, rounded and within the 1026.22 tolerance. A discounted ARM uses the composite rate: the initial rate for the initial period, then the fully indexed rate at consummation. Mortgage insurance is in the payment stream. Library, CLI, skill, and page, with tests against a published CFPB Loan Estimate and Closing Disclosure. No lender name in the test titles.
