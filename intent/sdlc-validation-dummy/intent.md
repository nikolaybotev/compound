# intent.md — SDLC validation dummy

| | |
|---|---|
| Author | Validation run (Cloud Agent) |
| Captured | 2026-10-04 |
| Status | Built (validation) |
| Stage | 4 · Done |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [../mortgage-skill/intent.md](../mortgage-skill/intent.md) |

## Problem

The AI-native SDLC chain in this repo is real product work (`intent/mortgage-skill/`, `intent/amortization-app/`, and others). There is no throwaway folder that exercises the artifact shape—header table, verbatim prompt, numbered decisions, phased plan—without touching the calculator or the web app.

## Proposed outcome

A dedicated `intent/sdlc-validation-dummy/` folder holds draft `intent.md`, `spec.md`, and `plan.md` that follow the playbook templates. The work item is labeled validation-only everywhere it matters. No production code, tests, or deploy steps change because of this folder.

## Affected users and systems

- **Users:** Anyone validating that `/ai-native-sdlc` still produces a coherent intent chain in the compound repo.
- **Systems:** Git documentation under `intent/` only. `AGENTS.md`, `REVIEW.md`, `amortize.js`, `apps/web`, and CI workflows are out of scope.

## Constraints and principles

- The original prompt stays verbatim below.
- Spec and plan must be internally consistent and explicitly forbid implementation.
- Do not rename or duplicate root `AGENTS.md` / `REVIEW.md` for this exercise.
- Treat this folder as non-authoritative for product behavior; `REVIEW.md` compliance passes still point at the real intent folders.

## Open questions (carried into spec.md)

None for a validation dummy. Decisions are recorded as D1–D3 in [spec.md](spec.md).

## Original prompt (verbatim)

> /ai-native-sdlc a dummy work item for validation purposes only
