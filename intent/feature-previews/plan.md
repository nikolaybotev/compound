# plan.md — Feature previews

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 2 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. This pull request does **not** run cutover steps below.

## Phase 1 — App storage key

Files: `apps/web/src/loan.ts` (done)

`STORAGE_KEY` from `VITE_STORAGE_KEY`, default `compound-amortization-v1`.

## Phase 2 — gh-pages publish script

Files: `.github/scripts/gh-pages-publish.sh`

1. Modes: `production`, `feature-update`, `feature-remove`.
2. Skip with exit 0 when `refs/heads/gh-pages` is absent.
3. Ensure `.nojekyll` at repo root of `gh-pages`.
4. Retry loop on non-fast-forward push (re-fetch, reapply only this mode’s paths, commit, tag, push). No force-push.

DoD: Documented in AGENTS.md; feature retry behavior in PR description.

## Phase 3 — Workflows

Files:

- `.github/workflows/publish-gh-pages-production.yml` — `main` push + `workflow_dispatch`; build prod + prototype; `gh-pages-publish.sh production` with tag `pages-prod/<github.sha>`.
- `.github/workflows/deploy-feature-preview.yml` — PR events; build feat; `feature-update` / `feature-remove` with tag `pages-feat/pr-<n>/<head-sha>`.
- `.github/workflows/deploy-pages.yml` — unchanged live Actions publisher (remove `pages-feat` merge).
- `.github/workflows/test.yml` — `branches-ignore: gh-pages`.

Remove: `deploy-feat-pages.yml`, `verify-pages-mirror.mjs`, `pages-feat` branch workflow.

DoD: AC1, AC2, AC6.

## Phase 4 — Docs

Files: `AGENTS.md`, `intent/feature-previews/spec.md`

DoD: AC4, AC5.

## Cutover (manual — not run from this PR)

1. Build a complete current production tree (`VITE_BASE=/compound/`) and `prototype/` (`VITE_BASE=/compound/prototype/`) from `main` and the prototype ref.
2. Create orphan branch `gh-pages` with that tree, all assets, `.nojekyll`, and any existing `feat/` folders to keep.
3. Verify files (HTML, JS, CSS, fonts) locally or with a checklist.
4. Stop in-flight GitHub Actions Pages deploys for this repo.
5. In repository **Settings → Pages**, set source to **Deploy from a branch**, branch `gh-pages`, root `/`.
6. Load https://nikolaybotev.github.io/compound/ and https://nikolaybotev.github.io/compound/prototype/ and confirm.
7. Disable or stop relying on `deploy-pages.yml` for live traffic (workflow file may remain until Nikolay removes it).

**Rollback:** Set Pages source back to **GitHub Actions**, run `gh workflow run deploy-pages.yml`, confirm production URLs. To restore `gh-pages` content, add a commit on `gh-pages` that copies a tagged tree (`git checkout tags/pages-prod/<sha> -- .`) without rewriting branch history.

### Build notes

- 2026-10-10: Replaced mirror + `pages-feat` + `deploy-feat-pages.yml` with orphan `gh-pages` path-scoped commits (D2–D5).
- Feature folder publish retry: on rejected push, `gh-pages-publish.sh` fetches the new tip, reapplies **only** `feat/<pr>/` (or production root + `prototype/` for main), commits again, up to 10 times.
