# spec.md — Feature previews

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-10) |
| Status | Draft 6 |
| Stage | 2 · Design |

## 1. Summary

Feature previews on orphan `gh-pages` store each build under `feat/<12-char-commit-sha>/` (full `index.html` and `assets/`). An open same-repo pull request also keeps `feat/<pull-request-number>/index.html` redirecting to the latest sha for that PR. Pushes without an open pull request publish only the sha folder; older sha folders remain. Closing a pull request does not remove `feat/<pull-request-number>/`; the redirect stays aimed at the last published sha. `publish-gh-pages-production.yml` updates only production root files on `gh-pages` and does not touch `prototype/` or `feat/`. Until cutover, `deploy-pages.yml` remains the live Actions publisher with production and `prototype/` in one artifact.

## 2. Goals and non-goals

**Goals**

- G1. Stable PR entry `https://nikolaybotev.github.io/compound/feat/<pull-request-number>/` redirects to the latest `https://nikolaybotev.github.io/compound/feat/<12-char-sha>/`.
- G2. Each build is a complete Vite output under `feat/<12-char-sha>/`.
- G3. Production root on `gh-pages` changes only on main production publish; `prototype/` is seed-only; main never writes `feat/`.
- G4. Storage: PR builds use `compound-amortization-feat-<pull-request-number>-v1`; branch-only builds use `compound-amortization-feat-<12-char-sha>-v1`.

**Non-goals**

- Fork previews, git symlinks, or moving version tags on duplicate prod publishes.
- Ongoing `prototype/` republish on `gh-pages` after cutover seed.
- Feature publish git tags.

## 3. Principles

- P1–P4 unchanged: orphan `gh-pages`, fast-forward retry, production-only semver tags, Actions artifact must include `prototype/` until cutover.

## 4. Requirements

1. **Live publisher (until cutover).** `deploy-pages.yml` unchanged (production + `prototype/`).
2. **Branch production publisher.** Production root only on `gh-pages`.
3. **Feature publisher.** `feature-sha`, `feature-pr-publish` (sha tree + PR redirect). Same-repo PRs on open, sync, reopen; branch push without open PR uses `feature-sha` only. PR close does not run a publish job and does not remove the pointer.
4. **Redirect.** HTML redirect at `feat/<pr>/index.html` to `/compound/feat/<sha>/`; not a symlink.
5. **Storage keys** as in G4; production and prototype stay `compound-amortization-v1`.

## 5. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | `deploy-pages.yml` still builds and uploads production and `prototype/`. |
| AC2 | `publish-gh-pages-production.yml` has no prototype checkout, build, or copy. |
| AC3 | `loan.ts` default storage key `compound-amortization-v1`. |
| AC4 | PR preview build uses `VITE_BASE=/compound/feat/<12-char-sha>/` and `VITE_STORAGE_KEY=compound-amortization-feat-<pr>-v1`. |
| AC5 | `node --test` and `pnpm --dir apps/web test` pass. |
| AC6 | `test.yml` does not run on push to `gh-pages`. |

## 6. Decisions

**D1 — PR URL.** `/compound/feat/<pull-request-number>/` is a redirect pointer; content lives under `/compound/feat/<12-char-sha>/`.

**D13 — Immutable sha folders.** Each publish adds or replaces `feat/<12-char-sha>/` only; prior sha directories remain.

**D3 — Path-scoped commits.** Main: production root only. Feature: sha folder and/or PR pointer only. No workflow writes `prototype/` after seed.

**D6 — Storage.** PR: `compound-amortization-feat-<pull-request-number>-v1`. No PR: `compound-amortization-feat-<12-char-sha>-v1`.

**D4 — Fast-forward retry.** Up to 10 attempts; no branch force-push.

**D5 — Production tags only.** `publish-gh-pages-production.yml` sets `PAGES_POINT_VERSION` to `0.6`, the complete-loan-picture app release (`apps/web` version `0.6.0`). Point releases `0.1` through `0.5` are grandfathered on the Actions publisher and are not tagged on `gh-pages`. The first production `gh-pages` commit tagged is `0.6`. If tag `0.6` already exists, the publish stays green and does not move the tag. Feature publishes are not tagged.

**D7 — Cutover seed.** One-time copy of current production root and `prototype/` onto `gh-pages` plus `.nojekyll`. See [plan.md](plan.md).

**D8 — Forks.** Same-repo `pull_request` guard only.

**D11 — Prototype retirement.** Later removal is a single commit on `gh-pages` deleting `prototype/`, not a standing workflow job.

**D12 — Production rollback.** `production-rollback` reapplies production root from tag `0.6` (or another prod tag) onto the current tip without resetting `prototype/` or `feat/`.
