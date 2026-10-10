# intent.md — ARM concepts

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-10 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/arm-loan/](../arm-loan/intent.md) |

## Problem

The calculator and its skill answer an ARM question with a number: the worst-case payment, the interest on an index path, the rate at month 85. They ask for terms first and then run the script. A person who asks how a rate adjustment happens at all, what the margin does, why the first change is different from the later ones, or what the lookback is for, is not asking for a figure, and the calculator skill has no place to answer them without a loan to run. The repo holds that procedure only as arithmetic inside `intent/arm-loan/spec.md` requirement 2 and as a transcript of a study chat, neither written for a person who wants the concept.

## Proposed outcome

A second ARM skill that explains the adjustment procedure and produces no number. It lists the parameters of a fixed-then-adjusting ARM, then walks through a change date in prose with formulas written in names: the index as of the lookback plus the margin is the fully indexed rate; the initial cap and floor bound the first change; the periodic cap bounds each later move from the rate then in effect; the lifetime ceiling and floor bound every rate; the rate charged is applied to the unpaid balance over the payments left in the term. The same text states how the parameters relate: a higher margin lifts every future fully indexed rate; a ceiling defined as start rate plus lifetime cap moves with the start rate; the periodic cap measures from the rate just before the change, not the start rate; an index for one month does not change a month that is not a change date. One sequence diagram shows the procedure. One short table shows the parameters with the First Entertainment 7/1 sheet's values, labeled as an example. The calculator skill keeps the numbers.

## Affected users and systems

- **Users:** The owner, and anyone who asks an agent how an ARM adjusts. An agent that needs the procedure in words before it decides whether a question is a calculator question.
- **Systems:** A new skill at `.agents/skills/arm-loan-concepts/SKILL.md`. A `node --test` file that reads it. `README.md`, `AGENTS.md`, and `REVIEW.md` where they list skills and intents. `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, the calculator skill, the fee skill, `apps/web`, and the workflows are untouched.

## Constraints and principles

- This skill is not the calculator. The calculator skill stays on numbers. This skill answers "how does a rate adjustment happen?" and does not produce a payment.
- The document is the adjustment procedure: an early bullet list of the key parameters, then the procedure in prose with formulas in names, not dollars, with the relations between the parameters in that same text.
- One sequence diagram of the procedure. No entity diagram of this app.
- A short example table of the parameters with sample values taken from the First Entertainment 7/1 sheet, labeled as one example and not the definition. The values come from the sheet; none is invented.
- The study transcript is not pasted. The daily-versus-weekly CMT statistics are not included; they are not recomputed yet.
- The skill does not fetch an index and does not run the calculator.
- The skill is written in the build phase, not in the docs pull request that carries these three files.
- Decisions are numbered. A question stays open only if it is truly undecidable.
- The spec and plan go up as a pull request on a branch from the latest `main`, and the usual checks run on it. Nothing is merged and nothing is pushed to `main` by this work.

## Sources

- Parameter sheet `First_Entertainment_7-1_ARM_Variables_ce19.pdf` and the terms printout `First_Entertainment_ARM_Terms_ffdb.pdf`, both named in the prompt. The sheet's rows and Ed's email from the printout are recorded verbatim in [intent/arm-loan/intent.md](../arm-loan/intent.md) under Sources and Source transcript, and [intent/arm-loan/spec.md](../arm-loan/spec.md) D2 records the check of that record against both PDFs on 2026-10-10. The sample values in [spec.md](spec.md) are taken from that record; see D8 there.
- The adjustment procedure as the calculator implements it: [intent/arm-loan/spec.md](../arm-loan/spec.md) requirements 1–6 and D3–D7.

## Open questions (carried into spec.md)

None. The choices made while drafting are D1–D12 in [spec.md](spec.md).

## Original prompt (verbatim)

> Write the spec and plan for a new ARM concept skill in nikolaybotev/compound, and open a pull request. Do not merge. Do not push to main. Do not implement a calculator change.
>
> Read /home/ubuntu/.cursor/skills-cursor/ai-native-sdlc/SKILL.md and AGENTS.md. New intent folder intent/arm-concepts/ linking to intent/arm-loan/. Branch from latest origin/main. The pull request holds intent.md, spec.md, and plan.md. The usual checks should run.
>
> This skill is not the calculator. The calculator skill stays on numbers. This skill answers "how does a rate adjustment happen?" and does not produce a payment.
>
> The document is the adjustment procedure:
> - Early bullet list of the key parameters of an ARM loan.
> - Then the procedure in prose, with formulas in names, not dollars. The note sets the change dates. On a change date the index is read as of the lookback, the margin is added, and that sum is the fully indexed rate. The initial cap and floor bound the first change. After that, the periodic cap bounds the move from the rate then in effect, and the lifetime ceiling and floor bound every rate. The rate charged is applied to the unpaid balance for the payments left in the term.
> - Relations in that same text: a higher margin lifts every future fully indexed rate; a lifetime ceiling defined as start rate plus lifetime cap moves with the start rate; a periodic cap uses the rate just before that change, not the start rate; an index for one month does not change a month that is not a change date.
> - One sequence diagram of that procedure. No entity diagram of this app.
> - A short example table of the parameters with sample values taken from the First Entertainment 7/1 sheet. Label it as one example, not the definition. Sheet: /home/ubuntu/.cursor/projects/workspace/uploads/First_Entertainment_7-1_ARM_Variables_ce19.pdf and /home/ubuntu/.cursor/projects/workspace/uploads/First_Entertainment_ARM_Terms_ffdb.pdf. Read them for the sample values. Do not invent values.
> - Do not paste the study transcript. Do not include the daily-versus-weekly CMT statistics. Those are not recomputed yet.
> - The skill does not fetch an index and does not run the calculator.
>
> Put the skill itself in the plan as the build, at .agents/skills/arm-loan-concepts/SKILL.md, written in the build phase, not in this docs pull request. Number the decisions. No open questions unless truly undecidable.
>
> Reply with the pull request URL and the decision list.
