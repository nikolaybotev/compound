# intent.md — Loan scenarios

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-10 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/complete-loan-picture/](../complete-loan-picture/intent.md), [intent/arm-loan/](../arm-loan/intent.md), [intent/ui-followups/](../ui-followups/intent.md) |

## Problem

The amortization page keeps one loan. Every edit is written to a single localStorage value, so a second loan replaces the first. There is no list to switch, no file to move the loans to another browser, and no one monthly figure that includes taxes, insurance, mortgage insurance, and the extra the owner actually pays in most months. The heading's dollar amount is the Conventional sheet's total, which is principal and interest plus taxes and insurance only.

## Proposed outcome

The page stores more than one loan scenario and switches the one being edited from a list at the top. The list can add a scenario and, after a confirmation, remove one. The saved set can be exported as one JSON file and replaced by an import. Each scenario has a prevailing monthly total: the principal-and-interest payment that is in effect for the most months, plus the picture's taxes, home insurance, and PMI or MIP, plus a prevailing extra when the same applied extra covers at least 80 percent of the term's months. The heading shows that total. A color bar beside the amount splits it into principal and interest, taxes and insurance, and the prevailing extra. The schedule shows the prevailing extra next to each month's principal and interest, and the per-month extra column stays.

## Affected users and systems

- **Users:** The owner, comparing loans on the amortization page.
- **Systems:** `apps/web` (the page, its unit tests, and its Playwright specs), `AGENTS.md`, and `REVIEW.md`. `amortize.js`, the CLI, both skills, and the workflows stay as they are.

## Constraints and principles

- More than one scenario is stored. A control at the top switches the scenario being edited. The current single localStorage object under `compound-amortization-v1` still loads: it becomes the first scenario. Do not wipe a saved loan. Production and the prototype share that key. The published prototype only reads version 1, so the version-1 value stays the active scenario in the old shape, and the rest of the set is stored beside it where a version-1 reader cannot overwrite it.
- Export writes every scenario as one JSON file. Import replaces the saved set with that file after the same validation a load uses. A bad file does not discard the current set.
- Prevailing extra is the positive extra amount that is identical on at least 80 percent of the term's month count. Otherwise it is $0. A one-month lump that pays the loan off does not qualify. Requested extras that were not applied do not count. Use the applied extra for each month.
- Principal and interest in the prevailing total is the principal-and-interest payment in effect for the greatest number of schedule months. A tie uses the earlier month. Taxes, home insurance, and PMI or MIP are the monthly picture amounts, 0 when that charge is 0. The prevailing monthly total is those parts plus the prevailing extra.
- The heading shows that prevailing total. The schedule shows the prevailing extra with the monthly principal and interest. The existing per-month extra column stays.
- The list label is the prevailing total, then a hyphen, then price in thousands, down payment percent, the note rate, the parsed term, and fixed or the ARM structure (`7/1` and the like). The note rate is included because the heading's editable fields include it.
- The page still calls `buildReport`. No second amortization formula. ARM math stays as specified.
- The list has a + control that starts a new scenario, and each row has a trash icon, shown on hover, that removes that scenario after confirmation. The last remaining scenario is not removed.
- Next to the prevailing monthly amount, a color bar splits into PI, TI, and PE by their shares of the total. A zero portion takes no width.
- All of this is this release. Nothing is tagged later.
- The numbered decisions in [spec.md](spec.md) are closed.

## Open questions (carried into spec.md)

None. The choices made while drafting are D1–D18 in [spec.md](spec.md).

## Original prompt (verbatim)

> I also want to be able to save multiple loan scenarios and switch between them with a drop-down at the top (right now we only have one loan scenario that is being edited and saved to local storage under a key).
>
> And also to export all the loan scenarios as JSON and import them.
>
> And then I want to introduce the concept of the prevailing monthly payment for a loan scenario: that would be the PITIPE - Principal, Interest, Taxes, Insurance (both home and PMI or MIP), and our very special Prevailing Extra payment - if there is a non-zero extra payment that is the same on 80% or more of the months - that becomes the Prevailing Extra payment (otherwise it is $0) and it is added to the Prevailing Monthly Total.
>
> The drop-down should show the loan scenarios list with each loan scenario named by starting with the Prevailing Monthly Payment Amount, then hyphen and then the high level loan parameters - what is on the heading line today with all editable fields there - the principal, downpayment %, term, fixed or X/Y ARM etc. Actually in the heading we should show the Prevailing Monthly payment also and integrate and show the Prevailing Monthly Extra in the table with all the monthly Principal and Interest etc.
>
> Build this feature. Thanks!

## Follow-up (verbatim)

> Add these to the loan-scenarios spec and plan before you finish the pull request. They are part of this release, not a later one.
>
> - The scenario dropdown has a + control, at the top or the bottom, that starts a new scenario.
> - Each scenario row has a trash icon at the right edge, shown on hover, that removes that scenario after the user confirms. Do not remove the last remaining scenario.
> - Next to the prevailing monthly amount, a color bar splits into three segments whose widths are their shares of that total: PI (principal and interest), TI (taxes plus home insurance plus PMI or MIP), and PE (prevailing extra). A zero portion takes no width. Name the three colors in the spec.
>
> Record them as decisions. Do not start implementation. Do not merge.
