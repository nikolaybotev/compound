# spec.md — Page knowledge base

| | |
|---|---|
| Derived from | [intent.md](intent.md) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

Page version 0.21 adds a knowledge panel to `apps/web`. A viewport wider than 52rem opens a side panel. A viewport at 52rem or below opens a bottom sheet. The loan stays mounted and the URL path does not change. Terms in the UI open entries. The ARM types article is the Types section of `.agents/skills/arm-loan-concepts/SKILL.md`. The other articles are the files in `docs/kb/`.

`amortize.js`, the calculator CLI, the origination-fee CLI, and the wording of the three skills do not change. No dependency is added.

## 2. Goals and non-goals

**Goals**

- G1. Open the knowledge base without leaving the amortization page.
- G2. Show the skill's Types section and the `docs/kb/` articles from those files.
- G3. Link the terms already on the page to the matching entries.

**Non-goals**

- Level-the-payment extras in the library, a fixed-rate recast function, CLI parity, or the Regulation Z APR solver.
- The 0.22 teaser indicator beside the note rate.
- A personal-data rule in the repo.
- Rewriting the skill or the knowledge-base articles.
- A new scenario-document version.

## 3. Requirements

1. **Panel.** A Knowledge control opens the index (`docs/kb/README.md`). Above 52rem the panel is a side region (`complementary`) and the loan stays usable. At 52rem and below the same panel is a bottom sheet (`dialog`, `aria-modal="true"`) with a scrim. Escape closes it, except while the start-month picker or the scenario-remove confirmation is open. Close returns focus to the control that opened it. The sheet traps Tab inside the panel and marks the loan `inert`. The side panel does not.
2. **ARM types.** The types article is the skill markdown from `## Types` through the character before `## Parameters`. The page renders that text. It does not include Parameters, the procedure, the example table, or How to answer.
3. **Knowledge-base articles.** Each file in `docs/kb/` is an article, rendered from that file. In-file anchors and links between those files stay inside the panel. The skill path opens the types article. An `http` or `https` link opens in a new tab. Any other path is text and does not navigate.
4. **Named entries.** Closing Disclosure versus the note, the ARM rider, and the deed of trust is `docs/kb/documents.md#cd-vs-note`. Acceleration is `#acceleration` in that file. Partial prepayment is `docs/kb/prepaying.md#extra-principal`. The teaser rate and payment shock are `docs/kb/arm-rate.md#teaser`.
5. **Terms.** These controls open the entry named:
   - the ARM structure label opens types
   - Initial period, Adjusts every, First adjustment, Change date, and the level-extra checkbox open `#initial-period`
   - Margin, Index, the round-to-1/8 checkbox, and the timeline Index line open `#note-rate`
   - the cap and floor fields, Ceiling, and Floor open `#caps`
   - Initial notice and Later notice open `#notices`
   - Extra principal paid and the Extra payment column open `#extra-principal`
   - Conventional PMI opens `#pmi-removal`
   - Points and Lender credit open `#points`
   - Closing Disclosure in Moving in opens `#cd-vs-note`
   - Grace days and Late charge open `#acceleration`
6. **Version and docs.** `apps/web/package.json` is `0.21.0`. `AGENTS.md` describes the panel and the 52rem sheet. The knowledge-base index no longer says the panel is unbuilt.

## 4. Acceptance

| AC | Check |
|---|---|
| AC1 | Unit: the types article equals the skill slice between `## Types` and `## Parameters` and does not contain `## How to answer`. `articleMarkdown` for documents, prepaying, and arm-rate is those files. A citation href keeps parentheses. A repo path that is not an article resolves as stay. |
| AC2 | Playwright, 1280px: Knowledge opens a side panel, the loan price stays, the URL stays, ARM types shows Traditional ARM and Hybrid ARM from the skill, and Close returns focus. |
| AC3 | Playwright: Extra principal paid, Closing Disclosure, Grace days, Initial period, and Part A show the knowledge-base sentences for partial prepayment, the deed of trust, acceleration, the adjustment period, and payment shock. An eCFR link is `target="_blank"`. |
| AC4 | Playwright, 390px: the panel is a dialog sheet in the lower part of the window, the price stays visible, and Escape closes it. |
| AC5 | `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `apps/web/package.json` is `0.21.0`. The diff does not change `amortize.js`, the CLIs, or a skill's wording. |

## 5. Decisions

**D1 — 52rem is the sheet breakpoint.** That is the page's existing narrow layout. Below it a side column would cover the loan. The sheet is the phone presentation. Checked against `styles.css` `@media (max-width: 52rem)`.

**D2 — The types article is a slice, not a second copy.** `armTypesMarkdown` returns the skill text from `## Types` through the line before `## Parameters`. The unit test compares it to that slice.

**D3 — Articles are the files.** The panel imports `docs/kb/*.md`. Rendering does not rewrite sentences. A path the panel cannot open stays text so the loan page does not navigate away.

**D4 — The side panel is not modal.** The loan remains editable beside it. The sheet is modal because it covers the loan.

**D5 — No new dependency.** A small markdown renderer covers the headings, lists, tables, quotes, emphasis, code, and links those files use.
