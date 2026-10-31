# plan.md — Page knowledge base

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. Library parity and the APR solver are later items in the batch and are not this phase.

## Process

One pull request into `main`. Do not merge it in this phase. `apps/web/package.json` becomes `0.21.0` in the commit that ships the panel.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `apps/web/unit/knowledge.ts` | 0 |
| AC2 | `apps/web/e2e/knowledge.spec.ts` wide | 0 |
| AC3 | same file, terms | 0 |
| AC4 | same file, 390px sheet | 0 |
| AC5 | `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` | 0 |

## Phase 0 — Panel

Files: `apps/web/src/knowledge.ts`, `knowledge-sources.ts`, `markdown.ts`, `markdown-view.tsx`, `knowledge-panel.tsx`, `term.tsx`, `app.tsx`, `schedule.tsx`, `styles.css`, `vite-env.d.ts`, `apps/web/unit/knowledge.ts`, `apps/web/e2e/knowledge.spec.ts`, `apps/web/package.json`, `AGENTS.md`, `REVIEW.md`, `README.md`, `docs/kb/README.md`.

1. Import the skill and `docs/kb/` as text. Slice the Types section. Render the markdown in the panel.
2. Add the Knowledge control, the term buttons in requirement 5, the side layout above 52rem, and the sheet at 52rem and below.
3. Set `apps/web/package.json` to `0.21.0`. Describe the panel in `AGENTS.md`.

DoD: AC1–AC5. No change to `amortize.js`, the CLIs, or skill wording.
