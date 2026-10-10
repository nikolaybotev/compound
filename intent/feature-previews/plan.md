# plan.md — Feature previews

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 5 |
| Status | Draft 5 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. This pull request does **not** run cutover steps below.

## Phase 2 — gh-pages publish script

Files: `.github/scripts/gh-pages-publish.sh`

1. `production` — production root only; production semver tag when `PAGES_POINT_VERSION` set and tag absent on remote.
2. `feature-sha` — `feat/<12-char-sha>/` full build only.
3. `feature-pr-publish` — `feat/<sha>/` plus `feat/<pr>/index.html` redirect to `/compound/feat/<sha>/`.
4. `feature-pointer-remove` — manual only; the workflow does not call it on pull request close.
5. `production-rollback` — production root from prod tag onto current tip.
6. Skip when `gh-pages` not seeded.

## Phase 3 — Workflows

- `deploy-feature-preview.yml` — `pull_request` (same-repo) and `push` (not `main`/`gh-pages`). Branch push skipped when an open PR uses that branch.
- `publish-gh-pages-production.yml` — production root only.
- `deploy-pages.yml` — unchanged Actions publisher with `prototype/`.

## Cutover (manual — not run from this PR)

1. Identify point semver for the seeded production `main` commit (`PAGES_POINT_VERSION` when ready).
2. Build production from `main`; copy current live `prototype/` once; add `.nojekyll`; create orphan `gh-pages`.
3. Verify files. **Wait for in-flight GitHub Actions Pages deploys to finish; do not cancel them.** **Do not push to `main` between that finish and switching the Pages source**, so a new `deploy-pages` run does not start in the gap.
4. Switch Pages source to branch `gh-pages`, root `/`. Smoke-test production and `prototype/` URLs.
5. Set `PAGES_POINT_VERSION` when the first tagged production publish should run (optional on seed).

**Prototype retirement:** One commit deleting `prototype/` on `gh-pages`.

**Rollback:** `production-rollback` or switch Pages source back to GitHub Actions and run `deploy-pages.yml`.

### Build notes

- Feature retry reapplies the same mode paths (`feature-sha` or `feature-pr-publish` or pointer remove).
- PR close leaves `feat/<n>/index.html` redirect at the last published sha; `feat/<sha>/` trees stay.
