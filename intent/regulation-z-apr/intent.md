# intent.md — Regulation Z APR

| | |
|---|---|
| Captured | 2026-10-31 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/origination-fees/](../origination-fees/intent.md), [intent/arm-loan/](../arm-loan/intent.md), [intent/clean-closing-costs/](../clean-closing-costs/intent.md), [intent/teaser-indicator/](../teaser-indicator/intent.md) |

## Problem

The fee script answers the other direction: given a note rate and an APR, what prepaid finance charge does that pair imply. Nothing in the library, the command-line tools, the skills, or the amortization page solves the APR from the finance charge. A discounted ARM and a loan with mortgage insurance have no APR here at all.

## Proposed outcome

A Regulation Z APR for a fully amortizing fixed-rate loan and for a discounted fixed-then-adjusting ARM. The finance charge follows 12 CFR 1026.4 and leaves out third-party fees under 1026.4(c)(7). The amount financed is the loan amount minus prepaid finance charges. The APR is the actuarial rate in Appendix J, rounded for disclosure and judged against the 1026.22 tolerance. Mortgage insurance is in the payment stream. A discounted ARM uses the initial rate for the initial period and then the fully indexed rate at consummation. The same function serves the library, a command-line tool, a skill, and the page. Tests use a published CFPB Loan Estimate and Closing Disclosure. Test titles do not name a lender.

## Affected users and systems

- **Users:** the owner, asking what APR a set of charges implies, and reading that APR on the amortization page.
- **Systems:** a new pure module, a new command-line tool, a new skill, and the amortization page. `origination_fees.js` stays the fee inversion.

## Constraints and principles

- The new APR is not the existing fee inversion.
- Interest-only, payment-option, and negative-amortization loans stay explanation only. This solver does not become a calculator for those products.
- The interest walk stays in `buildReport`. Reported money is integer cents, rounded half up once at output.
- No lender name in test titles, on the page, or in the skill.
- The page version moves when the page behavior changes. This docs change does not move it.
- Do not dispatch a Pages deploy.

## Open questions (carried into spec.md)

1. Which published Loan Estimate and Closing Disclosure, and which of their figures the actuarial method reproduces exactly.
2. How the disclosed APR is rounded, and which 1026.22 tolerance applies.
3. How a discounted ARM builds the composite payment stream when caps bind.
4. Where the page shows the APR, and which of its closing-cost rows are finance charges.

## Original prompt (verbatim)

> Implement phase 0.23, the Regulation Z APR, from that section of /cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/docs/parity-kb-plan.md. Follow this repo's intent chain (intent/<change>/intent.md, spec.md, plan.md) and the ai-native SDLC skill. Follow the personal-data rule in /cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/preferences.md and do not copy that rule into the repo. Branch from current main; the parity page pull request 89 is merged as 81dc6ed and the page is 0.22.1. Library, CLI, skill, and page, with tests against a published CFPB Loan Estimate and Closing Disclosure. No lender name in test titles. Use one or more pull requests. Merge each when the required checks are green. Bump the page to 0.23, including PAGES_POINT_VERSION, when the page behavior changes. Do not dispatch a Pages deploy.
