# plan.md — Feature previews

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 4 |
| Status | Draft 4 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None. This pull request does **not** run cutover steps below.

## Phase 1 — App storage key

Files: `apps/web/src/loan.ts` (done)

## Phase 2 — gh-pages publish script

Files: `.github/scripts/gh-pages-publish.sh`

1. `production` — replace production root only; fast-forward retry.
2. `feature-update` / `feature-remove` — `feat/<n>/` only; **no git tags**.
3. `production-rollback <message> <prod-version-tag>` — reapply production root from that tag onto current tip; leave `prototype/` and `feat/` on tip unchanged; forward commit only; **no new version tag**.
4. **Production tagging:** after a successful `production` push, annotate tag `PAGES_POINT_VERSION` on the new `gh-pages` commit when that environment variable is set. The workflow reads `vars.PAGES_POINT_VERSION` (repository variable). The repo currently has no git tags, no GitHub releases, and `package.json` version `0.0.0`; **do not invent a version**. The first production `gh-pages` tag is applied on the first publish after Nikolay identifies the point version to track and sets `PAGES_POINT_VERSION`. Until then, publishes commit without tagging and log that fact.
5. Skip all publishes with exit 0 when `gh-pages` is not seeded.

## Phase 3 — Workflows

Files:

- `.github/workflows/publish-gh-pages-production.yml` — passes `PAGES_POINT_VERSION` from `vars.PAGES_POINT_VERSION`; calls `production` mode only.
- `.github/workflows/deploy-feature-preview.yml` — feat modes only; no tags.
- `.github/workflows/deploy-pages.yml` — unchanged Actions publisher with `prototype/`.

## Phase 4 — Docs

Files: `AGENTS.md`, `intent/feature-previews/spec.md`

## Cutover (manual — not run from this PR)

1. Identify the point semver version for the production `main` commit being seeded; record how the repo will track it (git tag on `main`, release, or `vars.PAGES_POINT_VERSION` at publish time).
2. Build production from `main` and copy current live `prototype/` once into the seed tree; add `.nojekyll`.
3. Create orphan `gh-pages`, verify files, stop in-flight Actions deploys, switch Pages source to `gh-pages` `/`, smoke-test URLs.
4. Set `PAGES_POINT_VERSION` before the first automated production publish if the seed commit should receive that tag (or tag the seed commit manually once).

**Prototype retirement:** One `gh-pages` commit deleting `prototype/`.

**Rollback (branch source):** Run `gh-pages-publish.sh production-rollback "<message>" "<prod-version-tag>"` (for example after a bad production publish). That reapplies only production root files from the tagged prod commit onto the current tip; `prototype/` and `feat/` stay. Pages-setting rollback: switch back to GitHub Actions and run `deploy-pages.yml`.

### Build notes

- Main `gh-pages` publish does not touch `prototype/`. `deploy-pages.yml` still ships `prototype/` until cutover.
- Feature publish retry: reapply only `feat/<pr>/`. Production retry: reapply only production root staging.
