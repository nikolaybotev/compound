# spec.md — Feature previews and gh-pages cutover

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-10) |
| Status | Approved |
| Stage | 2 · Design |

## 1. Summary

GitHub Pages for this repo serves an **orphan `gh-pages` branch**: the built site tree plus an empty `.nojekyll` at the root. Production updates replace only the site root (`index.html` and `assets/`). `prototype/` is copied once at seed from the live site and is never republished by a workflow. Feature previews live under `feat/<12-char-commit-sha>/`; open pull requests also keep `feat/<pull-request-number>/index.html` as an HTML redirect to the latest sha. Closing or merging a pull request does **not** remove that pointer. Version **0.6** (complete-loan-picture, `apps/web` `0.6.0`) is the current app release; production `gh-pages` commits are tagged `0.6` when that tag is not already on the remote.

## 2. Goals and non-goals

**Goals**

- G1. Stable PR URL `https://nikolaybotev.github.io/compound/feat/<n>/` redirects to the latest `https://nikolaybotev.github.io/compound/feat/<12-char-sha>/`.
- G2. Each feature build is a full Vite output under `feat/<12-char-sha>/` with `VITE_BASE=/compound/feat/<sha>/`.
- G3. Production root on `gh-pages` changes only via `publish-gh-pages-production.yml` on `main`; `prototype/` and `feat/` are not rewritten by that job.
- G4. Correct storage keys for production, prototype, PR previews, and branch-only previews.
- G5. Documented rollout with backup, seed, source switch, and rollback.

**Non-goals**

- Merging `gh-pages` into `main`.
- Fork pull request previews.
- Git symlinks on Pages (not followed).
- Republishing `prototype/` after seed.
- App release **0.7** (this change is CI/CD only).
- Retroactive `gh-pages` tags for releases **0.1**–**0.5**.
- Feature publish git tags.

## 3. Architecture

| Piece | Role |
|---|---|
| `gh-pages` (orphan) | Pages source after cutover; built files only + `.nojekyll`. |
| `pages-backup-pre-gh-pages` (orphan) | Full mirror of the live site before cutover (production + `prototype/` + all referenced assets). |
| `deploy-pages.yml` | **Until cutover:** live publisher via GitHub Actions (`deploy-pages`). **After cutover:** retained for rollback; must still build production + `prototype/` if run while Actions is the source again. |
| `publish-gh-pages-production.yml` | On `main` push / dispatch: build production from `main`, commit root only on `gh-pages`, tag `0.6` when absent. |
| `deploy-feature-preview.yml` | PR and non-`main` branch pushes: `feat/<sha>/` and optional PR redirect pointer. |
| `.github/scripts/gh-pages-publish.sh` | Path-scoped commits with fast-forward retry (no force-push). |

`test.yml` does not run on pushes to `gh-pages`.

## 4. Publish semantics

### 4.1 Fast-forward retry

Every publish fetches the current `gh-pages` tip, applies **only that job’s paths**, commits, and pushes. On non-fast-forward rejection, fetch again, reapply the same paths, and retry (up to 10 attempts). No `--force` on the branch.

### 4.2 Main production publish

- Builds `apps/web` from `main` with `VITE_BASE=/compound/`.
- Replaces top-level production files on `gh-pages` (from staging: `index.html`, `assets/`, and any other top-level files from the production dist).
- Does **not** delete or overwrite `prototype/` or `feat/`.
- After a successful push, if `PAGES_POINT_VERSION` is `0.6` and tag `0.6` does not exist on the remote, create annotated tag `0.6`. If tag `0.6` already exists, log and exit **0** (do not move the tag, do not fail).

### 4.3 Prototype

- Seeded once at cutover from the **backed-up live** `prototype/` tree (not rebuilt from `main` on seed).
- No workflow republishes `prototype/` after seed.
- Retirement: one manual commit on `gh-pages` that deletes `prototype/`.

### 4.4 While Actions is still the source

`deploy-pages.yml` must continue to upload production **and** `prototype/` in one artifact. Omitting `prototype/` from that artifact deletes `https://nikolaybotev.github.io/compound/prototype/`.

### 4.5 Feature previews

- **Sha folder:** full build at `feat/<12-char-sha>/` (`index.html` + `assets/`). `VITE_BASE=/compound/feat/<sha>/`.
- **Pull request:** same build; also write `feat/<pull-request-number>/index.html` redirecting to `/compound/feat/<sha>/` (HTML meta refresh + link; not a symlink). Each new push updates the pointer to the new sha.
- **No open PR:** branch push publishes only `feat/<sha>/` (skipped when an open PR exists for that branch).
- **PR close/merge:** pointer **remains** at the last published sha; sha folders are never deleted by the workflow.
- **Forks:** same-repo only.

### 4.6 Storage keys (`localStorage`)

| Context | Key |
|---|---|
| Production and prototype | `compound-amortization-v1` |
| PR preview build | `compound-amortization-feat-<pull-request-number>-v1` |
| Branch-only preview (no open PR) | `compound-amortization-feat-<12-char-sha>-v1` |

Set via `VITE_STORAGE_KEY` at build time; default in `loan.ts` remains `compound-amortization-v1`.

### 4.7 Versioning and tags

| Release | Intent folder | `gh-pages` prod tag |
|---|---|---|
| 0.1 | mortgage-skill | (grandfathered, untagged) |
| 0.2 | amortization-app | (grandfathered, untagged) |
| 0.3 | loan-recast | (grandfathered, untagged) |
| 0.4 | extra-savings-column | (grandfathered, untagged) |
| 0.5 | origination-fees | (grandfathered, untagged) |
| **0.6** | complete-loan-picture | **`0.6`** (first prod tag on `gh-pages`) |

`apps/web/package.json` is **`0.6.0`**. This infrastructure change is not **0.7**.

Feature publishes are **never** tagged.

### 4.8 Production rollback on `gh-pages`

`gh-pages-publish.sh production-rollback <message> <prod-version-tag>` copies **production root files only** from the tagged commit onto the **current** `gh-pages` tip (forward commit). Does not reset the branch; `prototype/` and `feat/` on the tip stay. Rollback commits are not version-tagged.

### 4.9 Pages source rollback

If cutover is wrong: switch the repository Pages source back to **GitHub Actions**, run `deploy-pages.yml` (`gh workflow run deploy-pages.yml`), confirm production and `prototype/` URLs, then fix `gh-pages` offline.

## 5. Workflows and files

- `.github/workflows/publish-gh-pages-production.yml` — `PAGES_POINT_VERSION: "0.6"`.
- `.github/workflows/deploy-feature-preview.yml` — `pull_request` (opened, synchronize, reopened) and `push` (not `main` / `gh-pages`).
- `.github/workflows/deploy-pages.yml` — unchanged responsibility for Actions-era full-site deploy.
- `.github/scripts/gh-pages-publish.sh` — `production`, `feature-sha`, `feature-pr-publish`, `feature-pointer-remove` (manual only), `production-rollback`.
- `.github/workflows/test.yml` — `branches-ignore: gh-pages`.

## 6. Acceptance criteria (implementation)

| ID | Check |
|---|---|
| AC1 | `deploy-pages.yml` builds and uploads production and `prototype/`. |
| AC2 | `publish-gh-pages-production.yml` does not build or write `prototype/`. |
| AC3 | `loan.ts` default `compound-amortization-v1`; preview keys via `VITE_STORAGE_KEY`. |
| AC4 | PR preview uses `VITE_BASE=/compound/feat/<12-char-sha>/` and PR storage key. |
| AC5 | `node --test` and `pnpm --dir apps/web test` pass. |
| AC6 | No test workflow on push to `gh-pages`. |

## 7. Rollout (operator order)

See [plan.md](plan.md) for step-by-step execution. **Step 1 is always backup** to `pages-backup-pre-gh-pages` before seed or source switch.
