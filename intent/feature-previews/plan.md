# plan.md — Feature previews

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 1 |
| Status | Draft 1 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None.

## Phase 0 — Intent and spec

Files: `intent/feature-previews/{intent,spec,plan}.md`

DoD: Decisions D1–D8 recorded; builds on complete-loan-picture Pages work.

## Phase 1 — App storage key

Files: `apps/web/src/loan.ts`

1. Set `STORAGE_KEY` from `import.meta.env.VITE_STORAGE_KEY` with fallback `compound-amortization-v1`.

DoD: AC3; unit tests unchanged (no env in test runner).

## Phase 2 — Production merge of `pages-feat`

Files: `.github/workflows/deploy-pages.yml`

1. After assembling `site/` from `main` and `prototype/`, check out branch `pages-feat` into `pages-feat/` (`continue-on-error: true`).
2. If `pages-feat/feat` exists, `mkdir -p site/feat` and `cp -a pages-feat/feat/. site/feat/`.
3. Comment that `pages-feat` is written only by `deploy-feature-preview.yml`.

DoD: AC1; production and prototype checks unchanged.

## Phase 3 — Feature preview workflow

Files: `.github/workflows/deploy-feature-preview.yml`

1. `on: pull_request` types `opened`, `synchronize`, `reopened`, `closed`.
2. `permissions: contents: write`, `actions: write`. Concurrency `feature-preview-pages`, `cancel-in-progress: false`.
3. Job guard: same-repo head only.
4. **Publish:** checkout PR head, pnpm install, build with `VITE_BASE=/compound/feat/<number>/` and `VITE_STORAGE_KEY=compound-amortization-feat-<number>-v1`.
5. Clone or init `pages-feat`, copy dist to `feat/<number>/`, commit, push.
6. **Close:** remove `feat/<number>/`, commit, push if changed.
7. When `pages-feat` moved, dispatch `deploy-feat-pages.yml` on `main` via GitHub API.

DoD: AC2; no `github-pages` environment on this workflow.

## Phase 3b — Feat-only Pages publish

Files: `.github/workflows/deploy-feat-pages.yml`

1. `on: workflow_dispatch` only. Concurrency group `pages` with `deploy-pages.yml`.
2. Mirror with `wget -p` (page requisites). Run `.github/scripts/verify-pages-mirror.mjs` on production and prototype before overlaying `feat/`.
3. `rm -rf site/feat`, then copy `pages-feat/feat/` when present.
4. Run the verifier again on the full `site/` (includes each `feat/<n>/index.html`). Fail closed before upload if any linked file is missing.
5. `upload-pages-artifact` and `deploy-pages` on the `github-pages` environment. No checkout of `main` for a build, no pnpm build.

DoD: AC6. Stop and record a blocker if mirroring cannot be made safe; do not merge.

## Phase 4 — Docs and verification

Files: `AGENTS.md`

1. Preview URL, `pages-feat` + dispatch model, storage keys, local preview build command.

DoD: AC4, AC5.

### Build notes

- First PR preview creates branch `pages-feat` with an empty `feat/` tree aside from the first preview folder.
- Departure (2026-10-10): dropped dispatch of `deploy-pages.yml` from feature jobs. Feat publish mirrors the live site instead of rebuilding production (D4, D9).
