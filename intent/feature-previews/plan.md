# plan.md — Feature previews

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 6 |
| Status | Draft 6 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. This pull request does **not** run cutover steps below.

## App version (complete-loan-picture)

- `apps/web/package.json` version **`0.6.0`** (release **0.6**). This pull request is CI/CD only; it is not app release **0.7**.
- Production `gh-pages` publishes tag point version **`0.6`** via `PAGES_POINT_VERSION` in `publish-gh-pages-production.yml`.
- Point releases **0.1** through **0.5** shipped on the GitHub Actions publisher only; they are **grandfathered and untagged** on `gh-pages`. Do not create retroactive tags for them.
- **0.6** is the first version a production `gh-pages` publish tags. Feature publishes are never tagged.

## Phase 2 — gh-pages publish script

Files: `.github/scripts/gh-pages-publish.sh`

1. `production` — production root only; tag `PAGES_POINT_VERSION` (`0.6`) when absent on remote.
2. `feature-sha` / `feature-pr-publish` — no tags.
3. `production-rollback` — production root from prod tag onto current tip.
4. Skip when `gh-pages` not seeded.

## Phase 3 — Workflows

- `publish-gh-pages-production.yml` — `PAGES_POINT_VERSION: "0.6"`.
- `deploy-feature-preview.yml`, `deploy-pages.yml` — unchanged roles.

## Cutover (manual — not run from this PR)

1. Build production from `main` at release **0.6**; copy current live `prototype/` once; add `.nojekyll`; create orphan `gh-pages`.
2. Verify files. **Wait for in-flight GitHub Actions Pages deploys to finish; do not cancel them.** **Do not push to `main` between that finish and switching the Pages source.**
3. Switch Pages source to branch `gh-pages`, root `/`. Smoke-test URLs.
4. After cutover, the first `publish-gh-pages-production` run on `main` tags the commit `0.6` when that tag is not already on the remote.

**Prototype retirement:** One commit deleting `prototype/` on `gh-pages`.

**Rollback:** `production-rollback` with tag `0.6`, or switch Pages source back to GitHub Actions and run `deploy-pages.yml`.

### Build notes

- PR pointers persist after close at the last published sha.
- Feature retry reapplies the same mode paths.
