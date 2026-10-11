# spec.md — Schedule and scenario fixes

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-11) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

Two fixes on the amortization page after 0.10. The closed scenario control gains the same 1-based list number the open menu already shows. The schedule drops the Prevailing extra column. This folder builds on [intent/facelift-touchups/](../facelift-touchups/spec.md). Where [intent/ui-facelift/](../ui-facelift/spec.md) says the closed `#scenario` name does not gain the number, requirement 1 here wins. Where [intent/loan-scenarios/](../loan-scenarios/spec.md) and [intent/arm-loan/](../arm-loan/spec.md) put Prevailing extra on the schedule, requirement 2 here wins. Everything else in those specs stands. `amortize.js` does not change. The point version becomes 0.11.

## 2. Goals and non-goals

**Goals**

- G1. Show the open menu’s list number on the closed scenario control.
- G2. Remove the Prevailing extra column from the schedule without removing each month’s extra amount or the summary bar.

**Non-goals**

- Item 6 of the follow-up queue (Month of year ink). It is already on main.
- Changes to `amortize.js`, the calculator CLI, the skills, or a fixed-rate JSON, CSV, or summary.
- Numbering the remove-confirmation label. It stays the unnumbered `scenarioLabelText`.
- Removing the summary prevailing bar, the dropdown strip, or the prevailing-extra calculation.

**Release phasing.** Both goals ship in this release. Nothing is tagged for later.

## 3. Principles

- P1. The closed control and the open row for the same scenario use one string: `{n}: ` plus `scenarioLabelText`.
- P2. Extra payment remains the month’s requested extra. The prevailing extra remains a summary-bar amount.

## 4. Users and scenarios

- The owner looks at the closed control and sees `1: $4,853 - 600K | 5% down | 7.375% | 30 years | fixed` on a fresh visit. After Apply of $1,000 in every month, that same loan reads `1: $5,853 - 600K | 5% down | 7.375% | 30 years | fixed`. Opening the menu shows that same string on row 1.
- A second scenario, while it is active, reads `2: ` plus its label. Choosing scenario 1 again returns the closed control to `1: `.
- The owner opens the schedule. There is no Prevailing extra header. Extra payment still shows the amount for that month. The Monthly payment bar still draws the PE segment when the prevailing extra is positive.

## 5. Functional requirements

1. **Closed scenario number.** `scenarioLabelText` stays unnumbered. The closed `#scenario` visible text (`.scenario-trigger-text`) and its `aria-label` are `{active + 1}: ` plus that label. The open row for index `i` keeps `{i + 1}: ` plus the same label, for both its visible text and its `aria-label`. On a fresh visit the closed name is `1: $4,853 - 600K | 5% down | 7.375% | 30 years | fixed`. After Apply of $1,000 on every month of that loan, it is `1: $5,853 - 600K | 5% down | 7.375% | 30 years | fixed`. Checked 2026-10-11: the open menu in `scenarios.tsx` already prefixes the number, and the closed button uses the bare label; `page.spec.ts` already shows Monthly payment `$5,853.10` and `$1,000.00 PE` after that Apply; `headingDollarsFromCents` rounds half up, so 585310 cents is $5,853. The remove dialog still asks `Remove scenario {n}?` and its `.scenario-confirm-label` stays the unnumbered label.

2. **Schedule columns.** Delete the Prevailing extra header and its year and month cells. Fixed mode has eight columns: `#`, Date, Principal, Interest, Extra payment, Saved by extra, Principal balance, Interest balance. ARM mode has eleven: `#`, Date, Rate, Payment, Principal, Interest, Index, Extra payment, Saved by extra, Principal balance, Interest balance. Index stays immediately before Extra payment. Extra payment is still the input of that month’s requested dollars. The year row’s Extra payment cell is still that year’s extra total. Saved by extra is unchanged as a figure; in fixed mode its month cell and year cell move from index 6 to index 5. The summary `PrevailingBar` (`variant="summary"`) still shows the PE amount. `Schedule` no longer takes `prevailingExtraCents`. Checked 2026-10-11: `schedule.tsx` renders the column, the year cell is empty, and the month cell repeats `formatMoney(prevailingExtraCents)`; `app.tsx` still mounts the summary bar from `activeFigures.prevailingExtraCents`.

3. **Docs and version.** `AGENTS.md` describes the numbered closed control, the eight- and eleven-column schedules, and this folder, and it says the point version is 0.11. Things agents get wrong gains: do not leave the closed control unnumbered; do not put the Prevailing extra column back. `REVIEW.md` Compliance names `intent/schedule-scenario-fixes/`. `apps/web/package.json` is `0.11.0`. `PAGES_POINT_VERSION` is `0.11`.

## 6. Acceptance criteria

| AC | Check |
|---|---|
| AC1 | Playwright: fresh closed `aria-label` and `.scenario-trigger-text` are `1: $4,853 - 600K \| 5% down \| 7.375% \| 30 years \| fixed`. After Apply of $1,000 every month, both are `1: $5,853 - 600K \| 5% down \| 7.375% \| 30 years \| fixed`, and open row 1’s name matches. A second active scenario starts with `2: `. The confirm label does not start with a number prefix. |
| AC2 | Playwright: fixed headers are the eight names in requirement 2, with no Prevailing extra header. After Apply of $100, month 1’s Extra payment input is `100.00` and the summary bar contains `$100.00 PE`. ARM headers are the eleven names, Index immediately before Extra payment, eight columns when the product is fixed. |
| AC3 | `node --test`, `pnpm --dir apps/web test`, and `pnpm --dir apps/web test:e2e` exit 0. `amortize.js` has no diff. Version is `0.11.0` and `PAGES_POINT_VERSION` is `0.11`. |

## 7. Design decisions

**D1 — The number is a presentation prefix.** `scenarioLabelText` stays the unnumbered body so storage and the confirm label do not gain a second copy of the index. The closed control and the open row share `{index + 1}: ${label}`. Rejected: baking the number into `scenarioLabelText`, which would number the confirm label and every caller.

**D2 — The confirm label stays unnumbered.** The prompt numbers the closed dropdown. The question remains `Remove scenario {n}?` with the unnumbered label on the next line, as `intent/ui-facelift/` D4 already set.

**D3 — Drop the column, keep the bar and the extra input.** The month cell that repeated the scenario prevailing extra is the one that goes. Extra payment already holds the month’s amount. The summary bar is the place the prompt keeps the prevailing extra.

**D4 — Point version 0.11.** `package.json` `0.11.0` and `PAGES_POINT_VERSION` `"0.11"` in the same pull request that ships the page.

## 8. Open questions

None.
