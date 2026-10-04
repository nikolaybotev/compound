# plan.md — SDLC validation dummy

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Built (Phase 0) |
| Stage | 4 · Done (validation only) |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. This work item does not publish prices, add dependencies, or change deploy settings.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | Four-path existence test in Phase 0 DoD | 0 |
| AC2 | `grep` for verbatim prompt in Phase 0 DoD | 0 |
| AC3 | `grep` for non-goals and forbidden paths in Phase 0 DoD | 0 |
| AC4 | Plan file grep guards in Phase 0 DoD | 0 |

## Phase 0 — Commit validation chain

Files: `intent/sdlc-validation-dummy/intent.md`, `intent/sdlc-validation-dummy/spec.md`, `intent/sdlc-validation-dummy/plan.md`

1. Add the three markdown files from the spec. Cross-link intent → spec → plan. Keep Status at Draft.
2. Open a pull request on branch `cursor/sdlc-validation-dummy-10be`. Body states validation-only; no calculator or web changes.
3. Do not launch a product build subagent for this intent unless the owner explicitly overrides the non-goals in [spec.md](spec.md).

DoD: All of the following exit 0:

```bash
test -f intent/sdlc-validation-dummy/intent.md
test -f intent/sdlc-validation-dummy/spec.md
test -f intent/sdlc-validation-dummy/plan.md
grep -F '/ai-native-sdlc a dummy work item for validation purposes only' intent/sdlc-validation-dummy/intent.md
grep -qi validation intent/sdlc-validation-dummy/intent.md intent/sdlc-validation-dummy/spec.md intent/sdlc-validation-dummy/plan.md
git diff --name-only origin/main...HEAD | grep -qv '^intent/sdlc-validation-dummy/' && exit 1 || true
```

The last line passes when every changed file path is under `intent/sdlc-validation-dummy/` (or there are no other changes). `node --test` and `pnpm --dir apps/web test` are not required for this phase because AC1–AC4 are documentation checks only.

### Build notes (Phase 0)

Owner approved the build gate on 2026-10-04. The three intent-chain files landed on `cursor/sdlc-validation-dummy-10be` in commit `f4dc73d`. Pull request #14 passed `node --test` and the web CI job with no code changes outside `intent/sdlc-validation-dummy/`. Phase 0 DoD (file tests, verbatim prompt grep, validation markers, diff scope) was re-run at merge time. No departures from [spec.md](spec.md) Draft 1. Product build subagent was not used, per spec non-goals and plan step 3.
