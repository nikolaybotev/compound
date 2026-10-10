# plan.md — Feature previews and gh-pages cutover

| | |
|---|---|
| Implements | [spec.md](spec.md) Approved |
| Status | Executing rollout |
| Stage | 3 · Build + deploy |

Spec wins. Update this file when execution departs from it.

## Implementation (merged via PR #20)

- `apps/web/package.json` version **0.6.0** (release **0.6**, complete-loan-picture). Not **0.7**.
- `publish-gh-pages-production.yml` sets `PAGES_POINT_VERSION: "0.6"`.
- `gh-pages-publish.sh` path-scoped publishes and production tag `0.6` when absent.
- `deploy-feature-preview.yml` sha folders + persistent PR redirect pointers.
- `test.yml` ignores `gh-pages` pushes.

## Rollout

Execute in order. Record dates and SHAs in the execution log at the bottom.

### Step 1 — Backup live site (before seed or source switch)

1. Download the **real** published bytes (not a local build):
   - `https://nikolaybotev.github.io/compound/`
   - `https://nikolaybotev.github.io/compound/prototype/`
2. Use `wget` with page requisites (`-p`) so CSS `url()` assets (fonts, etc.) are included.
3. Verify before pushing backup:
   - Production root: `index.html` and **six** files under `assets/` (two CSS/JS bundles plus four font files in the current deployment).
   - `prototype/`: its own `index.html` and `assets/` tree.
4. Create orphan branch **`pages-backup-pre-gh-pages`**, copy the verified tree, add `.nojekyll`, commit, push to `origin`.
5. **Do not** seed `gh-pages` or change the Pages source until this branch exists.

### Step 2 — Land documentation and CI/CD

1. Commit final `spec.md` and `plan.md` (this document).
2. Merge **PR #20** when CI is green (squash merge if that is repo convention).
3. Do not change Pages source in this step.

### Step 3 — Quiesce Actions deploys

1. List in-flight `deploy-pages` workflow runs; **wait** for them to finish. **Do not cancel.**
2. **Do not push to `main`** between the last Actions deploy completing and Step 5 (source switch), so no new Actions deploy starts in the gap.

### Step 4 — Seed orphan `gh-pages`

1. Check out `main` at the merge commit.
2. Build production: `VITE_BASE=/compound/ pnpm --dir apps/web build`.
3. Assemble seed tree:
   - Production dist at root (`index.html`, `assets/`).
   - Copy **`prototype/`** from the **backup branch** (live bytes), unchanged.
   - Empty `.nojekyll` at root.
   - **No** `feat/` directories.
4. Verify file list matches Step 1 counts for production and prototype.
5. Create orphan branch **`gh-pages`**, commit seed, push to `origin`.

### Step 5 — Switch Pages source

1. In GitHub **Settings → Pages** (or API), set source to **Deploy from a branch**: branch **`gh-pages`**, folder **`/` (root)**.
2. Confirm the source is **not** GitHub Actions for live traffic after this step.
3. Note: an old in-flight Actions deploy cannot revert this setting; it only overwrites content if Actions were still the source—which Step 5 prevents.

### Step 6 — Smoke test

Load:

- `https://nikolaybotev.github.io/compound/` — production loan picture (fresh visit: heading like `600K | 5% down | 7.375% fixed = $4,853 / month`, summary P&I about **$3,936.85**).
- `https://nikolaybotev.github.io/compound/prototype/` — unchanged previous prototype build from backup.

If either URL is wrong: **rollback** per spec §4.9 (switch source back to GitHub Actions, run `deploy-pages.yml`), fix `gh-pages`, stop.

### After cutover

- Routine production updates: pushes to `main` run `publish-gh-pages-production.yml` (root only).
- Feature previews: PR / branch workflows write `feat/` paths on `gh-pages`.
- Optional: disable or stop relying on `deploy-pages.yml` for live traffic; keep the workflow for rollback.

### Prototype retirement (later)

One commit on `gh-pages` deleting `prototype/`. Not a standing job.

## Execution log

| Step | Date (UTC) | Result |
|---|---|---|
| 1 Backup `pages-backup-pre-gh-pages` | | |
| 2 Merge PR #20 | | |
| 3 Actions deploys idle | | |
| 4 Seed `gh-pages` | | |
| 5 Pages source → `gh-pages` | | |
| 6 Smoke test | | |

### Build notes

- PR redirect pointers persist after PR close/merge.
- Feature publish retry reapplies `feature-sha` or `feature-pr-publish` paths only.
- `feature-pointer-remove` exists for manual use only; workflows do not call it on PR close.
