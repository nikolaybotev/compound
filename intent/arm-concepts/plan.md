# plan.md — ARM concepts

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The separate skill (D1), no number (D2), the sheet as example (D8), the Mermaid sequence diagram (D10), and the root test file (D11) are decided in the spec. No calculator, page, or deploy file changes.

## Process

This folder lands as its own pull request holding `intent.md`, `spec.md`, and `plan.md`, on a branch from the latest `main`, with the usual checks (`test.yml` and CodeQL) running on it. It is not merged by the agent that wrote it. Review subagents read with fresh context, the spec against the intent and then this plan against the spec, on the model the owner names for review; the build subagent runs on the model the owner names for the build (the repo's recent cycles used Grok for review and Claude Sonnet for the build, per `intent/ui-followups/intent.md`). The build is one phase and one pull request, started after this folder is reviewed. The skill is not written in the docs pull request (D12).

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `arm_loan_concepts.test.js`: file exists, frontmatter `name` and `description` phrases, no `disable-model-invocation: true`, no `scripts` entry in the skill directory | 0 |
| AC2 | Same test: every required name, formula, relation phrase, and the `mortgage-loan-calculator` hand-off present | 0 |
| AC3 | Same test: no `/\$\s?\d/`, no `/\b(daily|weekly)\b/i`, no `http`, `node scripts/`, `--json`, `--amount`, `--index`, `erDiagram`, `classDiagram`, or `flowchart` | 0 |
| AC4 | Same test: exactly one ` ```mermaid ` fence followed by `sequenceDiagram`, and the block's required words | 0 |
| AC5 | Same test: the sheet's values, the start-rate and ceiling sentence, `30 years`, the `one example` / `not the definition` label; no `Buy-Down` before the first `mermaid` fence | 0 |
| AC6 | Same test for the `README.md`, `AGENTS.md`, and `REVIEW.md` strings; the two other skills unchanged is a pull-request diff check | 0 |
| AC7 | `node --test` exits 0 with the new file collected and the existing suites unedited | 0 |

## Phase 0 — Skill, test, and repo documents

Files: `.agents/skills/arm-loan-concepts/SKILL.md` (new), `arm_loan_concepts.test.js` (new), `README.md`, `AGENTS.md`, `REVIEW.md`

1. Write `.agents/skills/arm-loan-concepts/SKILL.md` to spec requirements 1–8, in requirement 2's order. Frontmatter: `name: arm-loan-concepts` and a `description` written to requirement 1. Then one paragraph saying what the skill is and is not. Then the parameter bullets of requirement 3 with the names in backticks. Then the procedure of requirement 4 as prose paragraphs, each formula inline in backticks with the ASCII hyphen-minus, and the four relations of requirement 5 placed in the paragraph of the formula each follows (D3). Then one ` ```mermaid ` block starting `sequenceDiagram` with participants `Note`, `Servicer`, `Index publisher`, and `Borrower`, a `loop` over change dates, and the messages and notes of requirement 6; write `unpaid balance`, `payments left`, and `notice` in those words. Then the example table of requirement 7 with the sheet's eight rows as the sheet prints them (`7 Years`, `Annually`, `1-Year Constant Maturity Treasury (CMT)`, `2.50%`, `5/2/5`, `2.50%`, `2.50%`, `45 Days`) and a third column for the role, under a heading or lead sentence that says it is `one example` and `not the definition`; beneath it the three sentences on the 5.875% start rate and the `10.875%` ceiling, the `30 years` term, and the `5.50%` Upfront Buy-Down Limit. Then the "How to answer" section of requirement 8. Take every value from `intent/arm-loan/intent.md` Sources and Source transcript (D8); if the PDFs are available and a row differs, stop and correct the spec first. No URL, no command, no `scripts/` directory, no transcript, no daily-versus-weekly sentence.
2. Write `arm_loan_concepts.test.js` at the repo root with `node:test` and `node:assert`, reading the skill with `fs` the way the existing skill tests do. Assert AC1 (existence, frontmatter phrases, the `disable-model-invocation` regex, `fs.readdirSync` of the skill directory has no `scripts`), AC2 (every string listed there, each with a `missing: …` message), AC3 (the regexes and strings listed there, each with a `contains: …` message), AC4 (count of ` ```mermaid ` fences is 1, the next line is `sequenceDiagram`, the block up to its closing fence contains each required word), AC5 (the values and labels; split the text at the first ` ```mermaid ` fence and assert `Buy-Down` is absent from the first part), and AC6's `README.md`, `AGENTS.md`, and `REVIEW.md` strings. Do not require the calculator, and do not spawn a process.
3. `README.md`: after the paragraph that names the two skills, one paragraph naming `.agents/skills/arm-loan-concepts/SKILL.md` as the skill that explains how a fixed-then-adjusting ARM's rate adjusts, saying it produces no number and runs nothing, and linking `intent/arm-concepts/`.
4. `AGENTS.md`: the opening paragraph names the third skill and `intent/arm-concepts/`; Architecture gains a line for `.agents/skills/arm-loan-concepts/SKILL.md` (the procedure in words, no script, no number, the First Entertainment table is an example) and one for `intent/arm-concepts/`; Commands notes that `node --test` collects `arm_loan_concepts.test.js`; Things agents get wrong adds: the concept skill answers how an adjustment happens and never a payment, a reset rate for a loan, or an index value, and a figure question is `mortgage-loan-calculator`; do not run the calculator from it; the first change is bounded by the initial cap and the initial floor, not the periodic cap; the sheet's values are an example, not defaults. Keep every existing sentence.
5. `REVIEW.md`: Bugs adds an answer from the concept skill that states a payment, a reset rate for the user's loan, or an index value, or a procedure that disagrees with `intent/arm-loan/spec.md` requirement 2 (a periodic cap on the first change, a periodic cap measured from the start rate, a ceiling that is not start rate plus lifetime cap); Compliance adds `intent/arm-concepts/`. Keep the Security pass as it is; this skill reads and writes nothing.
6. Do not edit `.agents/skills/mortgage-loan-calculator/SKILL.md`, `.agents/skills/mortgage-origination-fees/SKILL.md`, `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, anything under `apps/web`, or any workflow. The workspace link for this skill, if the owner wants one, is the same kind of uncommitted link the other two skills use and is not a file in this repo.

DoD: `node --test` exits 0 with `arm_loan_concepts.test.js` collected and every AC1–AC6 assertion passing. `.agents/skills/arm-loan-concepts/` contains only `SKILL.md`. The pull-request diff touches only the five files listed for this phase and shows no change to the two other skills. `rg -n 'daily|weekly|http' .agents/skills/arm-loan-concepts/SKILL.md` prints nothing.
