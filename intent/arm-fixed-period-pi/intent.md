# intent.md — ARM prevailing principal and interest

| | |
|---|---|
| Captured | 2026-10-17 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/loan-scenarios/](../loan-scenarios/intent.md), [intent/arm-fixed-period-pe/](../arm-fixed-period-pe/intent.md) |

## Problem

On an ARM, the prevailing principal and interest is the scheduled payment that lasts the most months. After the first adjustment that payment is often the one in effect for the rest of the term, so the scenario dropdown and the Monthly payment section follow the adjusted payment. The owner is looking at the payment during the initial fixed period.

## Proposed outcome

For an ARM, the prevailing principal and interest shown in the scenario dropdown and in the Monthly payment section is the initial fixed-period principal and interest. Taxes and insurance and the prevailing extra stay as they are, and the monthly total uses this principal and interest. A fixed-rate loan keeps its one scheduled payment. The Highest payment line stays the highest scheduled payment.

## Affected users and systems

- **Users:** The owner, reading an ARM scenario’s monthly total.
- **Systems:** The page function that already turns an applied-extra report into the prevailing principal and interest, and the scenario dropdown and Monthly payment section that already show that figure. The calculator library, the command-line tool, and the skills stay as they are.

## Constraints and principles

- The request under Original prompt is the source of truth.
- This folder builds on `intent/loan-scenarios/` and `intent/arm-fixed-period-pe/`. The prevailing extra stays the fixed-period count from `intent/arm-fixed-period-pe/`. For an ARM, the principal and interest in the same total is the initial fixed-period payment.
- A fixed-rate loan is unchanged. Its principal and interest is still the one scheduled payment.
- The Highest payment line stays the highest scheduled payment.
- The figure stays where prevailing principal and interest is already calculated. `amortize.js` does not change. There is no command-line flag and no skill change.
- Clarification on 2026-10-17: “Match the fixed-period total after each reset” is unrelated. The behavior does not read that checkbox and is not described as depending on it.
- These three files do not name a credit union.
- The point version stays unchanged on this docs pull request. The pull request that ships the page sets the next point version.

## Open questions (carried into spec.md)

None. The spec records the choices the request left to the page.

## Original prompt (verbatim)

# ARM prevailing principal and interest

For an ARM loan, the prevailing principal and interest is the payment during the initial fixed period. It is not the payment in effect for the most months.

On the sample in the request, the fixed-period payment is $3,236.40 and the payment from the first adjustment on is $4,060.00. The dropdown and the Monthly payment section currently use $4,060.00 as PI, so the total is $5,799.85 and the dropdown shows $5,800. PI there should be $3,236.40. Taxes and insurance and the prevailing extra stay as they are. The sample extra is $823.60 and taxes and insurance are $916.25, so the monthly total becomes $4,976.25 and the dropdown whole dollars become $4,976.

This is the same idea as the fixed-period prevailing extra. It applies whether or not “Match the fixed-period total after each reset” is on.

A fixed-rate loan is unchanged. Its principal and interest is still the one scheduled payment.

The Highest payment line stays the highest scheduled payment. On the sample that remains $4,060.00 from December 2033.

The figure stays where prevailing principal and interest is already calculated. Do not add a command-line flag or a skill change. Do not change `amortize.js`.

## Clarification (verbatim)

Clarification: “Match the fixed-period total after each reset” is unrelated to this change. Do not treat that checkbox as a condition, and do not describe this behavior as depending on it.

For an ARM loan, the prevailing principal and interest shown in the scenario dropdown and in the Monthly payment section is always the initial fixed-period principal and interest. A fixed-rate loan is unchanged. The Highest payment line stays the highest scheduled payment.
