# spec.md — SDLC validation dummy

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-04) |
| Status | Built 1 |
| Stage | 4 · Done |

## 1. Summary

Add `intent/sdlc-validation-dummy/` with a complete intent → spec → plan chain. The content proves the AI-native SDLC templates fit this repository. Nothing in the chain authorizes calculator, skill, or web changes.

## 2. Goals and non-goals

**Goals**

- G1. Commit `intent/sdlc-validation-dummy/{intent,spec,plan}.md` with header tables and cross-links that match [templates.md](https://github.com/nikolaybotev/goldvalue) shape used in sibling folders.
- G2. State acceptance criteria that are checkable with read-only commands (file presence, grep for validation markers).
- G3. Record design decisions so a later build subagent would not need to invent scope.

**Non-goals**

- Changing `compound_interest_monthly.js`, `amortize.js`, `apps/web`, or `.agents/skills/`.
- Opening a build-phase pull request or merging product code.
- Updating `REVIEW.md` Bugs/Important lines for this dummy.
- Deploying or touching GitHub Pages.

**Release phasing.** G1–G3 are the only release. There is no phase 1 product work.

## 3. Principles

- P1. Documentation-only diff. The repo's behavior before and after must be identical aside from new markdown under `intent/sdlc-validation-dummy/`.
- P2. Verbatim prompt integrity: the intent's "Original prompt" block matches the user's message exactly.
- P3. Honest status: headers stay Draft; the plan's DoD is artifact verification, not `node --test`.

## 4. Users and scenarios

- A maintainer runs `/ai-native-sdlc` with a dummy prompt and expects a new `intent/<slug>/` without accidental code edits.
- A reviewer opens the three files and sees validation-only language in summary, non-goals, and plan phases.

## 5. Functional requirements

1. The folder name is `sdlc-validation-dummy`.
2. `intent.md` includes Problem, Proposed outcome, Constraints, and Original prompt (verbatim).
3. `spec.md` includes Goals, Non-goals, numbered requirements, acceptance criteria, and at least one design decision.
4. `plan.md` includes acceptance-criteria coverage, at least one phase, and a DoD that does not require modifying non-intent files.
5. Every file in the chain mentions that the work item is for validation only.

## 6. Acceptance criteria

| ID | Criterion | Check |
|---|---|---|
| AC1 | Three files exist under `intent/sdlc-validation-dummy/` | `test -f intent/sdlc-validation-dummy/intent.md && test -f intent/sdlc-validation-dummy/spec.md && test -f intent/sdlc-validation-dummy/plan.md` |
| AC2 | Verbatim prompt is preserved | `grep -F '/ai-native-sdlc a dummy work item for validation purposes only' intent/sdlc-validation-dummy/intent.md` |
| AC3 | Non-goals forbid product code | `grep -qi 'non-goal' intent/sdlc-validation-dummy/spec.md && grep -qi 'calculator\|apps/web\|amortize' intent/sdlc-validation-dummy/spec.md` |
| AC4 | Plan DoD is docs-only | `grep -qi 'intent/sdlc-validation-dummy' intent/sdlc-validation-dummy/plan.md && ! grep -qE 'apps/web|amortize\.js' intent/sdlc-validation-dummy/plan.md` |

## 7. Design decisions

**D1 — Slug name `sdlc-validation-dummy`.** Short, grep-friendly, and obviously not a shipping feature. Rejected: `test-intent` (too generic in CI logs) and `v1.3` (implies a product version).

**D2 — Single documentation phase.** One phase keeps the validation artifact small. A multi-phase dummy would look like real work and invite mistaken builds. Verified: sibling intents use one or more phases; this spec caps at Phase 0.

**D3 — No REVIEW.md edit.** `REVIEW.md` already lists real intent folders for compliance. Adding this dummy would confuse Bug/Important passes. Verified by reading root `REVIEW.md` on 2026-10-04.

## 8. Open questions

None. Build gate for product code is explicitly closed (non-goals). Human approval is only needed if someone wants to run a real build subagent against this folder anyway.
