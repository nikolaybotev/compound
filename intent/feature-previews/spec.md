# spec.md — Feature previews

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-10) |
| Status | Draft 2 |
| Stage | 2 · Design |

## 1. Summary

Same-repo pull requests publish amortization previews under `https://nikolaybotev.github.io/compound/feat/<pull-request-number>/` by committing only `feat/<n>/` onto orphan branch `gh-pages`. Production and `prototype/` on that branch are updated only by `publish-gh-pages-production.yml` on pushes to `main` (root + `prototype/`, preserving `feat/`). Until cutover, `deploy-pages.yml` remains the live GitHub Actions publisher; this pull request does not seed `gh-pages` or change the Pages source setting.

## 2. Goals and non-goals

**Goals**

- G1. Preview URL `https://nikolaybotev.github.io/compound/feat/<n>/` after cutover.
- G2. PR open, sync, reopen publish `feat/<n>/`; PR close removes it.
- G3. Production and prototype bytes on `gh-pages` change only on main production publish.
- G4. Per-PR `localStorage` key `compound-amortization-feat-<n>-v1`.

**Non-goals**

- Fork previews, previews without an open PR, or deleting `prototype/` on feat cleanup.
- Merging `gh-pages` into `main`.
- Running test or web CI on pushes to `gh-pages`.
- Cutover execution inside this pull request (documented in [plan.md](plan.md) only).

## 3. Principles

- P1. `gh-pages` holds built site files only (plus `.nojekyll`), on an orphan branch.
- P2. Publishes retry on non-fast-forward: fetch tip, reapply only that job’s paths, push again. No force-push.
- P3. Each publish tags the `gh-pages` commit for rollback (`pages-prod/<main-sha>`, `pages-feat/pr-<n>/<head-sha>`).
- P4. Rollback is a later commit that restores a tagged tree, not history rewrite.

## 4. Requirements

1. **Live publisher (until cutover).** `deploy-pages.yml` stays on `main` push and `workflow_dispatch`; unchanged as today’s Actions upload.
2. **Future publisher.** `publish-gh-pages-production.yml` builds production and `prototype/` from source and commits root + `prototype/` on `gh-pages` without removing `feat/`.
3. **Feature publisher.** `deploy-feature-preview.yml` builds the PR with `VITE_BASE=/compound/feat/<n>/` and `VITE_STORAGE_KEY=compound-amortization-feat-<n>-v1`, then updates only `feat/<n>/` on `gh-pages` (or removes it on close). Same-repo only.
4. **Shared script.** `.github/scripts/gh-pages-publish.sh` performs path-scoped apply and fast-forward retry. If `gh-pages` does not exist yet, exit 0 with a cutover message.
5. **Concurrency.** `gh-pages-publish` concurrency group serializes production and feature commits to `gh-pages`.
6. **CI.** `test.yml` ignores pushes to `gh-pages`.
7. **AGENTS.md** documents dual publisher period, cutover pointer, URLs, and storage keys.

## 5. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | `deploy-pages.yml` still runs on `main` push and `workflow_dispatch` only. |
| AC2 | No `wget` mirror or `deploy-feat-pages.yml`. |
| AC3 | `loan.ts` default storage key `compound-amortization-v1`. |
| AC4 | Preview build with `VITE_BASE=/compound/feat/1/` and `VITE_STORAGE_KEY=compound-amortization-feat-1-v1` references `/compound/feat/1/` in `index.html`. |
| AC5 | `node --test` and `pnpm --dir apps/web test` pass. |
| AC6 | `test.yml` does not run on push to `gh-pages`. |

## 6. Decisions

**D1 — Preview URL.** `/compound/feat/<pull-request-number>/` on the existing Pages site mount.

**D2 — Orphan `gh-pages`.** Site artifact only; not merged to `main`.

**D3 — Path-scoped commits.** Main publish touches root production files and `prototype/` only. Feature publish touches `feat/<n>/` only.

**D4 — Fast-forward retry.** Up to 10 attempts: fetch `gh-pages`, reapply the same path scope, commit, push. No `--force` on the branch.

**D5 — Tags.** `pages-prod/<full-main-sha>`; `pages-feat/pr-<n>/<head-sha>` (suffix `-removed` on close commits when useful).

**D6 — Storage.** `compound-amortization-feat-<n>-v1` per PR; production and prototype keep `compound-amortization-v1`.

**D7 — Cutover.** Manual seed, verify, stop in-flight Actions deploys, switch Pages source to branch `gh-pages`, smoke-test URLs, then retire Actions publisher. Rollback: switch source back to GitHub Actions and rerun `deploy-pages.yml`. See [plan.md](plan.md).

**D8 — Forks.** Same-repo `pull_request` guard only.
