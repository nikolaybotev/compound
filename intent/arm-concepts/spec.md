# spec.md — ARM concepts

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-10) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

A skill at `.agents/skills/arm-loan-concepts/SKILL.md` explains how a fixed-then-adjusting ARM changes its rate. It is one document: a bullet list of the parameters, the adjustment procedure in prose with formulas written in names, the relations between the parameters in that same prose, one sequence diagram of the procedure, and one short table of the parameters with the First Entertainment 7/1 sheet's values labeled as an example. It produces no payment, no rate for a person's loan, and no index value. It does not run `compound_interest_monthly.js` and does not fetch anything. A question that wants a number is the calculator skill's question.

This folder builds on [intent/arm-loan/](../arm-loan/spec.md). The procedure this skill describes is the one that spec's requirements 1–6 implement and its D3–D7 justify. Where this skill names a step, that spec's arithmetic is the exact form. Nothing in `intent/arm-loan/` changes.

## 2. Goals and non-goals

**Goals**

- G1. Answer "how does a rate adjustment happen?" for a fixed-then-adjusting ARM in words a person can follow: the change dates, the index as of the lookback, the margin, the fully indexed rate, the caps, the floors, the ceiling, and the payment on the unpaid balance over the payments left.
- G2. State how the parameters relate, so a person can tell what a different margin, start rate, periodic cap, or a single index reading would do, without a number.
- G3. Show the procedure once as a sequence diagram.
- G4. Show one lender's values as an example of the parameters, taken from the First Entertainment 7/1 sheet, labeled as an example and not as the definition.
- G5. Open for concept questions and stay closed for number questions, which remain with `mortgage-loan-calculator`.

**Non-goals**

- A payment, an interest total, a worst-case rate, or a rate for the user's loan. Those come from the calculator and its skill.
- Fetching, quoting, or estimating an index value from FRED, the New York Fed, or anywhere else.
- Saying whether a note reads a daily or a weekly index figure, or any statistic about the difference. That comparison is not recomputed and is not in this skill.
- The study transcript. It is recorded in `intent/arm-loan/intent.md` and is not pasted here.
- An entity or class diagram of this repo, the calculator, or the page.
- Interest-only, payment-option, negative-amortization, balloon, or payment-capped ARMs. The procedure is the fully amortizing one.
- APR, the prepaid finance charge, or points. Those stay with `origination_fees.js`.
- Any change to `amortize.js`, `compound_interest_monthly.js`, `origination_fees.js`, the calculator skill, the fee skill, `apps/web`, or the workflows.

**Release phasing.** Every requirement is this release. There are no later-tagged items.

## 3. Principles

- P1. No number for the user's loan. The skill may write a formula in names and may repeat a parameter from the example table. It never computes a payment, an interest figure, or a rate for a loan the user describes, and it never tells the user what the index is.
- P2. One procedure, two readers. The prose is for a person. The named formulas are the same arithmetic the calculator runs, so an agent that has read this skill and then runs the calculator sees the same steps with symbols (D4).
- P3. The sheet is an example. The First Entertainment values illustrate the parameters. The procedure is defined by the prose, not by those values, and the skill says so beside the table.
- P4. Concepts are not a front door to the calculator. The skill names the calculator skill once, as the place for a figure, and does not instruct the agent to run the script.
- P5. Nothing fetched. The skill has no URL, no command, and no script directory.

## 4. Users and scenarios

- The owner asks how the 7/1 ARM will reset in 2033. The skill walks through the change date: the index read 45 days before, the margin added, the first change bounded by the initial cap and the initial floor and the ceiling, and the payment re-amortized on the unpaid balance over the payments left. No payment is given. If the owner then asks what that payment is, the calculator skill answers.
- The owner asks why a 2.50% margin matters when the caps already limit the rate. The skill answers from the relations: the margin is in every future fully indexed rate, so a higher margin lifts every one of them, and the caps only bound how far each change can move.
- The owner asks whether the second adjustment can go up by 5 points. The skill answers that after the first change the periodic cap bounds each move from the rate then in effect, and that the ceiling, start rate plus lifetime cap, bounds every rate.
- The owner asks what the 1-year CMT is today. The skill says it does not fetch an index and explains what the index reading does in the procedure.
- The owner asks what happens if the index is low in a month that is not a change date. The skill answers that an index for a month that is not a change date changes nothing; only the reading as of the lookback before a change date enters a rate.
- The owner asks an agent for "the ARM parameters". The agent shows the bullet list and, if asked for an example, the First Entertainment table with its label.

## 5. Functional requirements

1. **Location and shape.** The skill is the single file `.agents/skills/arm-loan-concepts/SKILL.md` with YAML frontmatter `name: arm-loan-concepts` and a `description`. It has no `scripts/` directory and no other file. The description says the skill explains how a fixed-then-adjusting ARM's rate adjusts (change dates, index, lookback, margin, fully indexed rate, caps, floors, ceiling, re-amortized payment), that it is for "how does it work" and "what does this term mean" questions even when the user does not call it a skill, and that it gives no payment, interest, rate, or index value and does not run the calculator.

2. **Order of the document.** After the frontmatter and a one-paragraph statement of what the skill is and is not, the body is, in this order: the parameter list (requirement 3), the procedure in prose (requirement 4) with the relations inside it (requirement 5), the sequence diagram (requirement 6), the example table (requirement 7), and a short "How to answer" section (requirement 8). Nothing else: no transcript, no index statistics, no diagram of the repo.

3. **Parameter list.** An early bullet list of the key parameters of a fixed-then-adjusting ARM, each with the name used in the formulas and one sentence of meaning:
   - start rate (`start_rate`): the note rate charged through the fixed period; the rate the lifetime ceiling is measured from.
   - term (`term_payments`): the number of monthly payments to maturity; an ARM is amortized over the same term as a fixed loan.
   - initial fixed period (`fixed_payments`): the payments at the start rate before the first change date.
   - adjustment interval (`adjust_interval`): the payments between change dates after the first.
   - index: the published benchmark the note names; its reading enters the fully indexed rate.
   - lookback: the number of days before a change date as of which the index is read (`index_at_lookback`).
   - margin (`margin`): the fixed amount the note adds to the index.
   - initial cap (`initial_cap`): how far the first change may move the rate from the start rate.
   - periodic cap (`periodic_cap`): how far any later change may move the rate from the rate then in effect.
   - lifetime cap (`lifetime_cap`): how far above the start rate the rate may ever be; the ceiling is `start_rate + lifetime_cap`.
   - initial floor (`initial_floor`): the lowest rate the first change may set.
   - lifetime floor (`lifetime_floor`): the lowest rate any later change may set.

   The list says that a note that names one floor uses it as both. It does not list the upfront buy-down limit, the index publisher, or a payment cap.

4. **The procedure, in prose, with formulas in names.** The text walks one change date and reads, in substance:
   - The note sets the change dates. The first is the payment after the fixed period, `first_change = fixed_payments + 1`, and each later one is `adjust_interval` payments after the last. A month that is not a change date keeps the rate then in effect.
   - On a change date the index is read as of the lookback, the margin is added, and that sum is the fully indexed rate: `fully_indexed_rate = index_at_lookback + margin`. If the note rounds that sum (the uniform notes round to the nearest one-eighth of one percentage point), the rounding is applied here, before the caps (D6).
   - The ceiling is `lifetime_ceiling = start_rate + lifetime_cap`.
   - The first change is bounded by the initial cap and the initial floor: `upper_first = min(start_rate + initial_cap, lifetime_ceiling)`, `lower_first = initial_floor`, and `new_rate = max(min(fully_indexed_rate, upper_first), lower_first)`.
   - After that, the periodic cap bounds the move from the rate then in effect in both directions, and the lifetime ceiling and floor bound every rate: `upper = min(rate_in_effect + periodic_cap, lifetime_ceiling)`, `lower = max(rate_in_effect - periodic_cap, lifetime_floor)`, and `new_rate = max(min(fully_indexed_rate, upper), lower)`.
   - The rate charged is applied to the unpaid balance for the payments left in the term: `monthly_rate = new_rate / 12`, `payments_left = term_payments - payments_made`, and `payment = unpaid_balance × monthly_rate / (1 - (1 + monthly_rate) ^ -payments_left)`. That payment is charged from the change date until the next one. The unpaid balance is the actual balance, so principal paid ahead lowers the next payment rather than the rate.

   The prose gives these as named quantities, with an ASCII hyphen-minus as the minus sign so the test can match them. It contains no dollar amount and no payment figure (AC3).

5. **Relations, in that same text.** Within requirement 4's prose, not in a separate list, the skill states:
   - A higher margin lifts every future fully indexed rate, because the margin is a term of `fully_indexed_rate` at every change date.
   - A lifetime ceiling defined as `start_rate + lifetime_cap` moves with the start rate: a lower start rate is a lower ceiling.
   - A periodic cap uses the rate just before that change, `rate_in_effect`, not `start_rate`.
   - An index for one month does not change a month that is not a change date; only `index_at_lookback` before a change date enters a rate.

6. **Sequence diagram.** Exactly one fenced ` ```mermaid ` block whose first line is `sequenceDiagram`. Participants are the note (the terms), the servicer, the index publisher, and the borrower. Inside a loop over change dates it shows: the change date arriving from the note; the servicer reading the index from the publisher as of the lookback; the servicer forming `fully_indexed_rate`, applying the first-change or periodic bounds and the ceiling and floor, and setting `payment` on the unpaid balance over the payments left; the notice to the borrower; and the borrower paying at the new rate until the next change date. There is no other diagram and no `erDiagram`, `classDiagram`, or `flowchart` block.

7. **Example table.** A table titled as one example of the parameters, not the definition, with the First Entertainment 7/1 sheet's values and each row's role in the procedure. The rows and values, as the sheet prints them: Initial Fixed Period, 7 Years; Adjustment Frequency, Annually; Benchmark Index, 1-Year Constant Maturity Treasury (CMT); Margin, 2.50%; Rate Cap Structure (Initial/Periodic/Lifetime), 5/2/5; Initial Floor Rate, 2.50%; Lifetime Floor Rate, 2.50%; Lookback Period, 45 Days. Beneath the table, three sentences: the start rate is not a row on the parameter sheet, and the zero-point par rate on the rate sheet that the study read was 5.875%, so the ceiling for that quote is `start_rate + lifetime_cap` = 5.875% + 5 points = 10.875%; the term the study confirmed is 30 years; the sheet also prints an Upfront Buy-Down Limit of 5.50%, which is a pricing rule on the start rate a lender will originate and not a term of the adjustment. That ceiling sum is the only arithmetic in the skill (D8). No value in the table or the sentences is from anywhere but that sheet and the printout of Ed's reply, as recorded in `intent/arm-loan/intent.md`.

8. **How to answer.** A short closing section tells the agent: answer from this document and quote the step or relation the question is about; do not compute a payment, an interest figure, a reset rate, or an index value; do not fetch an index; when the user wants a figure, say that `mortgage-loan-calculator` is the skill that runs the calculator and asks for the terms, and do not run the calculator from here; do not supply the example's values as the user's terms; and say the First Entertainment table is one lender's example when it is shown.

9. **Repo documents.** `README.md` gains one paragraph naming the skill and this folder beside the two existing skills. `AGENTS.md` names the skill in its opening paragraph and Architecture, states that it produces no number and runs nothing, and adds to Things agents get wrong that a payment, rate, or index question is not this skill's and that the first change is bounded by the initial cap and the initial floor. `REVIEW.md` adds to Bugs an answer from this skill that states a payment, a reset rate for the user's loan, or an index value, or a procedure that disagrees with `intent/arm-loan/spec.md` requirement 2 (a periodic cap on the first change, a periodic cap measured from the start rate, a ceiling that is not `start_rate + lifetime_cap`); and adds `intent/arm-concepts/` to Compliance. The calculator skill's `SKILL.md` and the fee skill's `SKILL.md` are not edited.

10. **Verification.** A test file `arm_loan_concepts.test.js` at the repo root, collected by `node --test` with no install step and no dependency, reads the skill and asserts AC1–AC6. It does not run the calculator.

## 6. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | The file `.agents/skills/arm-loan-concepts/SKILL.md` exists, its frontmatter has `name: arm-loan-concepts` and a `description`, the description contains `how a fixed-then-adjusting ARM` and `does not run the calculator`, and the file does not match `disable-model-invocation:\s*true`. The skill directory contains no `scripts` entry. |
| AC2 | The skill contains each of these strings: `start_rate`, `term_payments`, `fixed_payments`, `adjust_interval`, `index_at_lookback`, `margin`, `initial_cap`, `periodic_cap`, `lifetime_cap`, `initial_floor`, `lifetime_floor`, `fully_indexed_rate = index_at_lookback + margin`, `lifetime_ceiling = start_rate + lifetime_cap`, `rate_in_effect + periodic_cap`, `rate_in_effect - periodic_cap`, `unpaid_balance`, `payments_left`, `change date`, `lookback`, `higher margin`, `moves with the start rate`, `not a change date`, `one floor`, and `mortgage-loan-calculator`. |
| AC3 | The skill does not match `/\$\s?\d/` (no dollar figure), does not match `/\b(daily|weekly)\b/i` (no daily-versus-weekly comparison), does not contain `http`, `node scripts/`, `--json`, `--amount`, or `--index` (no fetch, no run), and does not contain `erDiagram`, `classDiagram`, or `flowchart`. |
| AC4 | The skill contains exactly one ` ```mermaid ` fence, and the line after it is `sequenceDiagram`. That block contains `loop`, `index`, `margin`, `cap`, `floor`, `ceiling`, `unpaid balance`, `payments left`, and `notice`. |
| AC5 | The skill contains `7 Years`, `Annually`, `1-Year Constant Maturity Treasury (CMT)`, `2.50%`, `5/2/5`, `45 Days`, `5.875%`, `10.875%`, `5.50%`, `30 years`, `one example`, and `not the definition`. The parameter list (the text before the first `mermaid` fence) does not contain `Buy-Down`. |
| AC6 | `README.md` contains `arm-loan-concepts` and `intent/arm-concepts/`; `AGENTS.md` contains `arm-loan-concepts`; `REVIEW.md` contains `intent/arm-concepts/`. `.agents/skills/mortgage-loan-calculator/SKILL.md` and `.agents/skills/mortgage-origination-fees/SKILL.md` are byte-identical to `main` at the build's base commit (checked in the pull request diff, not by the test). |
| AC7 | `node --test` exits 0 with `arm_loan_concepts.test.js` collected. The existing tests in `compound_interest_monthly.test.js`, `amortize.test.js`, and `origination_fees.test.js` are unchanged. |

## 7. Design decisions

**D1 — A separate skill, not a section of the calculator skill.** The calculator skill's contract is ask for the terms, run the script, read `--json`. A concept question has no terms to ask for and nothing to run, and a description that opened the calculator skill for "how does it work" would send an agent down the ask-and-run path for a question that wants a paragraph. So the procedure is its own skill at `.agents/skills/arm-loan-concepts/`, and the calculator skill is not edited. The owner stated this split: the calculator skill stays on numbers.

**D2 — No number for the user's loan.** The skill never computes a payment, an interest figure, a reset rate, or an index value, and it does not run the calculator (P1, P4). A formula in names is allowed because it is the procedure, not a result. The one arithmetic the skill shows is the example's ceiling sum (D8). A skill that illustrated each step with a dollar figure was rejected: it would duplicate `intent/arm-loan/spec.md` requirement 18's fixtures in prose, drift from them, and invite the agent to answer a payment question from the text.

**D3 — Fixed order: parameters, procedure with relations, diagram, example.** The owner gave this order, and it reads from vocabulary to mechanism to picture to instance. The relations sit inside the procedure prose rather than in a separate list because each one is a consequence of a formula just stated: the margin relation follows `fully_indexed_rate`, the ceiling relation follows `lifetime_ceiling`, the periodic-cap relation follows the later-change bounds, and the non-change-date relation follows the change-date sentence. A separate "Relations" heading was rejected because it would restate the formulas.

**D4 — Names map one-to-one to the calculator's symbols.** The skill's names are words; `intent/arm-loan/spec.md` requirement 2 uses symbols. The mapping is `start_rate` = `R0`, `term_payments` = `n`, `fixed_payments` = `F`, `adjust_interval` = `A`, `margin` = `M`, `initial_cap` = `C1`, `periodic_cap` = `Cp`, `lifetime_cap` = `CL`, `lifetime_floor` = `FL`, `initial_floor` = `F1`, `index_at_lookback` = `index`, `rate_in_effect` = `Rc`, `upper_first` / `upper` = `upper_j`, `lower_first` / `lower` = `lower_j`, and `payments_left` = `n - m + 1` at reset month `m`. This table is recorded here so the two documents cannot drift without a reviewer seeing it; the skill itself does not print the symbols.

**D5 — The procedure is the uniform-note procedure the calculator already implements.** The first change is bounded by the initial cap and the initial floor (arm-loan D4 and D7, from the Fannie Mae note's Section 4(D) and the CFPB handbook). Later changes are bounded by the periodic cap in both directions from the rate in effect, and by the ceiling and the lifetime floor (D7). The payment re-amortizes the actual unpaid balance over the payments left (D5). A reader who follows this skill and then reads the calculator's `arm.adjustments` sees the same steps. Checked 2026-10-10 against those decisions and requirement 2; nothing new was researched for this skill, and none of the arm-loan decisions is reopened.

**D6 — Rounding to an eighth is one conditional sentence.** The uniform notes round the fully indexed rate to the nearest one-eighth of one percentage point; the First Entertainment sheet does not say whether its note does (arm-loan D6). The skill says that if the note rounds that sum, the rounding is applied before the caps, and leaves it there. It is not a row in the parameter list or the example table because the sheet has no such row and the owner's procedure does not name it. Omitting it entirely was rejected because an agent that has read the calculator's `--round-eighth` flag should find the step in the procedure.

**D7 — Lookback and index are described, not resolved.** The skill says what the lookback does: the index is read as of that many days before the change date, which gives the servicer time to set the payment and send the notice before it takes effect. It does not say which published series or whether a daily or a weekly figure is read, and it carries no statistic about that difference, because the owner says that comparison is not recomputed. It has no URL, since it fetches nothing (P5). AC3 enforces the absence of `daily`, `weekly`, and `http`.

**D8 — Sample values are the sheet's rows, from the repo's verbatim record.** The prompt names two PDFs. On the VM that drafted this folder those paths did not exist, so the values are taken from `intent/arm-loan/intent.md`, which quotes the parameter sheet's rows verbatim under Sources and pastes Ed's reply from the terms printout under Source transcript, and from `intent/arm-loan/spec.md` D2, which records that the record was checked against both PDFs on 2026-10-10. The two agree on every row. The table shows the eight sheet rows that are adjustment parameters. The start rate, 5.875%, is not on the parameter sheet; it is the zero-point par rate the study read from the rate sheet, and it is given beneath the table with that attribution so the ceiling relation can be shown once as `5.875% + 5 points = 10.875%`, the figure arm-loan F2 confirms as `ceiling_percent`. The 30-year term is the study's confirmation. The Upfront Buy-Down Limit, 5.50%, is a sheet row but a pricing rule, not an adjustment term (arm-loan D9); it is named beneath the table so a reader who has the sheet sees why it is not in the procedure. No value is invented. If the builder has the PDFs and finds a row that differs from this record, the spec is corrected first and the skill follows.

**D9 — One hand-off sentence to the calculator skill, by name.** The skill names `mortgage-loan-calculator` once as the skill that runs the calculator and asks for the terms. Naming it is the smallest way to keep a figure question off this skill without the agent guessing which skill has the script. The calculator skill's description does not mention this skill; a description says when to use its own skill (origination-fees D1), and the calculator skill is not edited.

**D10 — One sequence diagram in Mermaid, no repo diagram.** The owner asked for one sequence diagram of the procedure and no entity diagram of this app. Mermaid's `sequenceDiagram` renders on GitHub and reads as text for an agent, and the repo adds no tooling for it. The participants are the actors in the procedure (note, servicer, index publisher, borrower), not modules of this repo. AC4 pins the single block and its first line.

**D11 — A `node --test` file pins the text.** The repo already pins the two other skills' text from `compound_interest_monthly.test.js` and `origination_fees.test.js`. This skill has no script of its own, so its checks are a new root file `arm_loan_concepts.test.js`: presence of the names, formulas, values, and labels (AC2, AC4, AC5), and absence of dollar figures, daily/weekly, URLs, commands, and other diagram kinds (AC3). It needs no dependency and no install step, so the `test` job stays as it is. Putting the checks in `compound_interest_monthly.test.js` was rejected because that file is the calculator's suite and this skill does not run the calculator.

**D12 — The skill is built in a later pull request.** This folder is the docs pull request: `intent.md`, `spec.md`, `plan.md`. The skill, its test, and the `README.md`, `AGENTS.md`, and `REVIEW.md` lines are Phase 0 of [plan.md](plan.md), built by a fresh-context subagent after this folder is reviewed. The owner asked for that split so the design can be read before the text is written.

## 8. Open questions

None.
