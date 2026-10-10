# spec.md — Feature previews

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-10) |
| Status | Draft 4 |
| Stage | 2 · Design |

## 1. Summary

Same-repo pull requests publish previews under `https://nikolaybotev.github.io/compound/feat/<pull-request-number>/` by committing a complete build under `feat/<n>/` on orphan branch `gh-pages`. `publish-gh-pages-production.yml` updates only production root `index.html` and `assets/` on `gh-pages`; it never builds, copies, updates, or deletes `prototype/` or `feat/`. Until cutover, `deploy-pages.yml` remains the live GitHub Actions publisher and keeps shipping production and `prototype/` in one artifact; this pull request does not seed `gh-pages` or change the Pages source setting.

## 2. Goals and non-goals

**Goals**

- G1. Preview URL `https://nikolaybotev.github.io/compound/feat/<n>/` after cutover (each preview is a full Vite build with its own `index.html` and `assets/`).
- G2. PR open, sync, reopen publish `feat/<n>/`; PR close removes it.
- G3. Production root on `gh-pages` changes only on main production publish; `prototype/` and `feat/` stay unless manually changed or feat cleanup runs.
- G4. Per-PR `localStorage` key `compound-amortization-feat-<n>-v1`.

**Non-goals**

- Fork previews or previews without an open PR.
- Ongoing `prototype/` republish on `gh-pages` (seed once at cutover; retire later with a one-off commit that deletes the folder).
- Merging `gh-pages` into `main`.
- Running test or web CI on pushes to `gh-pages`.

## 3. Principles

- P1. `gh-pages` holds built site files only (plus `.nojekyll`), on an orphan branch.
- P2. Publishes retry on non-fast-forward: fetch tip, reapply only that job’s paths, push again. No force-push.
- P3. Only successful **production** publishes on `gh-pages` receive an annotated tag: the point semver version of the `main` commit being published, once the repo tracks that version. Feature and other commits are not tagged.
- P4. `deploy-pages.yml` must keep including `prototype/` in the Actions artifact until cutover; omitting it would delete the live path.

## 4. Requirements

1. **Live publisher (until cutover).** `deploy-pages.yml` on `main` push and `workflow_dispatch` builds production and `prototype/` and uploads the full site (unchanged).
2. **Branch production publisher.** `publish-gh-pages-production.yml` builds production from `main` only and commits root `index.html` and `assets/` on `gh-pages`. It does not touch `prototype/` or `feat/`.
3. **Feature publisher.** `deploy-feature-preview.yml` builds the PR and updates only `feat/<n>/` on `gh-pages`. Same-repo only.
4. **Shared script.** `.github/scripts/gh-pages-publish.sh` applies path scopes and fast-forward retry. If `gh-pages` is absent, exit 0 with a cutover message.
5. **Concurrency.** `gh-pages-publish` serializes commits to `gh-pages`.
6. **CI.** `test.yml` ignores pushes to `gh-pages`.
7. **AGENTS.md** documents dual publisher period, prototype seed-only rule, and storage keys.

## 5. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | `deploy-pages.yml` still builds and uploads production and `prototype/`. |
| AC2 | `publish-gh-pages-production.yml` has no prototype checkout, build, or copy. |
| AC3 | `loan.ts` default storage key `compound-amortization-v1`. |
| AC4 | Preview build with `VITE_BASE=/compound/feat/1/` and `VITE_STORAGE_KEY=compound-amortization-feat-1-v1` references `/compound/feat/1/` in `index.html`. |
| AC5 | `node --test` and `pnpm --dir apps/web test` pass. |
| AC6 | `test.yml` does not run on push to `gh-pages`. |

## 6. Decisions

**D1 — Preview URL.** `/compound/feat/<pull-request-number>/` on the existing Pages mount.

**D2 — Orphan `gh-pages`.** Site artifact only; not merged to `main`.

**D3 — Path-scoped commits.** Main branch publish replaces production root files only. Feature publish touches `feat/<n>/` only. No workflow writes `prototype/` after cutover seed.

**D4 — Fast-forward retry.** Up to 10 attempts; no branch force-push.

**D5 — Production tags only.** Tag name is the point version (for example the same identifier as a future `main` release tag). Set `PAGES_POINT_VERSION` for the workflow when that version is known. The repo has no tags and `package.json` is `0.0.0` today; do not invent a version. The first production `gh-pages` tag waits until the version is identified.

**D12 — Production rollback.** `production-rollback` in `gh-pages-publish.sh` copies production root files from a tagged prod commit onto the current `gh-pages` tip (forward commit). It does not reset the branch; `prototype/` and `feat/` on the tip stay. Rollback commits are not version-tagged.

**D6 — Storage.** `compound-amortization-feat-<n>-v1` per PR; production and prototype keep `compound-amortization-v1`.

**D7 — Cutover seed.** One-time copy of current production root and `prototype/` onto `gh-pages` plus `.nojekyll`. See [plan.md](plan.md).

**D8 — Forks.** Same-repo `pull_request` guard only.

**D11 — Prototype retirement.** Later removal is a single commit on `gh-pages` deleting `prototype/`, not a standing workflow job.
