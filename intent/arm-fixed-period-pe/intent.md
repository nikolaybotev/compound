# intent.md — ARM prevailing extra on the fixed period

| | |
|---|---|
| Captured | 2026-10-17 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/loan-scenarios/](../loan-scenarios/intent.md), [intent/arm-extra-level/](../arm-extra-level/intent.md) |

## Problem

On an ARM, the prevailing extra is counted across every month through payoff. Extras after the first adjustment often differ from the extras in the initial fixed period, and those later months decide the figure. The fixed period is the stretch the owner is looking at.

## Proposed outcome

For an ARM, the prevailing extra is counted only on the months before the first adjustment. The 80 percent rule is the same rule, applied to the fixed-period months that actually occur. A fixed-rate loan keeps its count through payoff. The figure stays where it already appears. The schedule does not gain it.

## Affected users and systems

- **Users:** The owner, reading the prevailing extra on an ARM scenario.
- **Systems:** The page function that already turns an applied-extra report into the prevailing extra, and the scenario label, summary Monthly payment, and summary bar that already show that figure. The calculator library, the command-line tool, and the skills stay as they are.

## Constraints and principles

- The request under Original prompt is the source of truth.
- This folder builds on `intent/loan-scenarios/` and `intent/arm-extra-level/`. The 80 percent test, the applied-extra walk, and the level-extra checkbox stay as those specs left them, except that an ARM’s prevailing extra is counted on the initial fixed period.
- The count uses the walk’s applied extra. Months after the first adjustment are outside it, whether or not “Match the fixed-period total after each reset” is on.
- A fixed-rate loan is unchanged. Its count is still months 1 through payoff.
- The figure stays in the function that already computes it. `amortize.js` does not change. There is no command-line flag and no skill change. The figure is not written into the schedule.
- These three files do not name a credit union.
- The point version stays unchanged on this docs pull request. The pull request that ships the page sets the next point version.

## Open questions (carried into spec.md)

None. The spec records the choices the request left to the page.

## Original prompt (verbatim)

# ARM prevailing extra uses the fixed period

For an ARM loan, the prevailing extra is computed only from the extra amounts in the initial fixed period, the months before the first adjustment. This applies whether or not “Match the fixed-period total after each reset” is on. After the first adjustment the extras can change, and those later months are not part of the count.

The 80 percent rule is unchanged. The denominator is the number of fixed-period months that actually occur. If the loan pays off during the fixed period, that payoff month is the end of the count, same as today. A positive applied extra that is identical on at least 80 percent of those months is the prevailing extra.

A fixed-rate loan is unchanged. Its count is still months 1 through payoff.

The figure stays where prevailing extra is already calculated. Do not add a command-line flag or a skill change for this. Do not change `amortize.js`. Do not write the figure into the schedule.
