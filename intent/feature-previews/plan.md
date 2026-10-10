# plan.md — Feature previews

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 3 |
| Status | Draft 3 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. This pull request does **not** run cutover steps below.

## Phase 1 — App storage key

Files: `apps/web/src/loan.ts` (done)

## Phase 2 — gh-pages publish script

Files: `.github/scripts/gh-pages-publish.sh`

1. `production` mode replaces only root production paths from staging (`index.html`, `assets/`, and any other top-level files from the production dist). Leaves `feat/`, `prototype/`, and `.nojekyll` on the branch unchanged (except `.nojekyll` is ensured each commit).
2. `feature-update` / `feature-remove` touch only `feat/<n>/`.
3. Fast-forward retry; skip when `gh-pages` is absent.

## Phase 3 — Workflows

Files:

- `.github/workflows/publish-gh-pages-production.yml` — `main` push + `workflow_dispatch`; production build only; no prototype ref or fallback.
- `.github/workflows/deploy-feature-preview.yml` — PR feat publishes.
- `.github/workflows/deploy-pages.yml` — unchanged; still builds production **and** `prototype/` for the live Actions site.

DoD: AC1, AC2, AC6.

## Phase 4 — Docs

Files: `AGENTS.md`, `intent/feature-previews/spec.md`

## Cutover (manual — not run from this PR)

1. Build production from `main` (`VITE_BASE=/compound/`) and copy the **current** live `prototype/` tree (from the Actions-published site or a one-off build) into a staging tree.
2. Create orphan `gh-pages` with production root, `prototype/` as copied once, `.nojekyll`, and any `feat/` folders to keep.
3. Verify files (production root, `prototype/`, fonts in each tree).
4. Stop in-flight GitHub Actions Pages deploys.
5. Switch Pages source to branch `gh-pages`, root `/`.
6. Smoke-test https://nikolaybotev.github.io/compound/ and https://nikolaybotev.github.io/compound/prototype/.
7. Rely on `publish-gh-pages-production.yml` for production root updates only; do not add a standing prototype republish job.

**Prototype retirement:** One commit on `gh-pages` that deletes `prototype/` when Nikolay retires it.

**Rollback:** Pages source back to GitHub Actions; run `deploy-pages.yml`. Restore `gh-pages` from a tag via a forward commit if needed.

### Build notes

- 2026-10-10: Main `gh-pages` publish does not build or update `prototype/` (D3, D11). `deploy-pages.yml` still ships prototype until cutover.
- Feature publish retry: reapply only `feat/<pr>/`; main publish retry reapply only production root files from staging.
