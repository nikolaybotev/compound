# plan.md — Origination fees

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. The separate script, the cent rounding, the 30-year skill default, and the negative-charge case are decided in the spec (D1, D3, D4, D6).

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1–AC7 | `node --test origination_fees.test.js` exits 0 and asserts the cent amounts in the spec | 0 |
| AC8 | The same test file reads the skill text and checks that `scripts/origination_fees.js` resolves to the repo-root script. Workspace link is local and not committed | 1 |

## Phase 0 — Calculator

Files: `origination_fees.js`, `origination_fees.test.js`

1. Add `origination_fees.js` with the flags and JSON fields in requirements 1–7. Use `dollarsToCents` and `formatGroupedCents` from `amortize.js`. Do not add a dependency.
2. Cover AC1–AC7 in `origination_fees.test.js`. `node --test` already discovers that file.

DoD: `node --test origination_fees.test.js` exits 0.

### Build notes (Phase 0)

This phase is the calculator and AC1–AC7. The skill and its AC8 test are Phase 1. No departure from the spec.

## Phase 1 — Skill and docs

Files: `.agents/skills/mortgage-origination-fees/SKILL.md`, `.agents/skills/mortgage-origination-fees/scripts/origination_fees.js`, `.agents/skills/mortgage-loan-calculator/SKILL.md`, `README.md`, `AGENTS.md`, `REVIEW.md`

1. Write the skill to AC8. The script inside the skill directory is a symlink to `../../../../origination_fees.js`.
2. Leave the amortization skill's description and body as they are. A description says when to use that skill. This skill's description is what opens it for a note rate and an APR.
3. Document the command, the 30-year skill default, and the $27,257.20 fixture in `README.md` and `AGENTS.md`. Add this intent folder to `REVIEW.md`.

DoD: the skill names the AC1 cents, the symlink resolves to `origination_fees.js`, and `AGENTS.md` tells agents not to replace 2725720 cents with $27,257.34.

### Build notes (Phase 1)

Phase 0 merged as #18. This phase adds the skill, the AC8 test, and the docs. The amortization skill description does not mention this skill. The workspace symlink `/Users/nikolay/git/.agents/skills/mortgage-origination-fees` is local setup, matching the amortization skill, and is not a file in this repo.
