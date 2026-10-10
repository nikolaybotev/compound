# spec.md — Feature previews

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-10) |
| Status | Draft 1 |
| Stage | 2 · Design |

## 1. Summary

Same-repo pull requests that touch the web app can publish an amortization preview under `https://nikolaybotev.github.io/compound/feat/<pull-request-number>/`. Production and `prototype/` still publish only from `.github/workflows/deploy-pages.yml` on pushes to `main` and manual dispatch. Feature jobs never use the `github-pages` environment or `actions/deploy-pages` directly.

## 2. Goals and non-goals

**Goals**

- G1. Preview URL pattern `https://nikolaybotev.github.io/compound/feat/<n>/` for PR `<n>`.
- G2. Deploy on PR open, sync, and reopen; remove preview on PR close.
- G3. Keep production and prototype intact on every preview publish.
- G4. Isolate preview `localStorage` from production and prototype.

**Non-goals**

- Fork pull request previews.
- Preview deploy for branches without an open PR.
- Replacing or removing `prototype/` via preview cleanup.
- A second calculator dependency.

## 3. Principles

- P1. `deploy-pages.yml` on `main` is the only workflow that rebuilds production and prototype from source. `deploy-feat-pages.yml` may call `actions/deploy-pages` after mirroring the live site; feature pull-request jobs do not.
- P2. Feature work serializes on one concurrency group when updating shared preview storage.
- P3. Preview builds set `VITE_BASE` and `VITE_STORAGE_KEY` at build time.

## 4. Users and scenarios

- **Reviewer:** Opens the PR, follows the preview link, exercises the page; production data in `compound-amortization-v1` is unchanged.
- **Author:** Pushes to the PR branch; preview updates after CI and the preview workflow.
- **Closer:** Merges or closes the PR; the `feat/<n>/` tree disappears from the next combined Pages deploy.

## 5. Requirements

1. **Production trigger.** `deploy-pages.yml` runs on `push` to `main` and `workflow_dispatch` only. It does not run on `pull_request`.
2. **Preview trigger.** A separate workflow runs on `pull_request` `opened`, `synchronize`, `reopened`, and `closed` when `github.event.pull_request.head.repo.full_name == github.repository`.
3. **Preview path.** Build `apps/web` with `VITE_BASE=/compound/feat/<pull-request-number>/` (trailing slash).
4. **Storage key.** Preview builds set `VITE_STORAGE_KEY=compound-amortization-feat-preview-v1`. Production and prototype builds do not set it; the app keeps `compound-amortization-v1`.
5. **Shared preview store.** Built preview static files live on git branch `pages-feat` under `feat/<pull-request-number>/`. Only the feature-preview workflow writes that branch.
6. **Live site assembly.** Before `upload-pages-artifact`, `deploy-pages.yml` checks out `pages-feat` when present and copies `feat/` into the site artifact beside production root and `prototype/`. A missing `pages-feat` branch does not fail production deploy.
7. **Refresh after preview change.** After pushing `pages-feat`, the feature workflow dispatches `deploy-feat-pages.yml` on `main`. That job mirrors `https://nikolaybotev.github.io/compound/` and `prototype/`, drops any mirrored `feat/`, copies `pages-feat/feat/` into the artifact, and deploys. It does not check out or build `main`.
8. **Cleanup.** On `closed`, remove `feat/<pull-request-number>/` from `pages-feat`, commit, push when changed, and dispatch `deploy-feat-pages.yml` when the branch moved. Do not delete `prototype/`.
9. **Concurrency.** Feature preview jobs use one concurrency group with `cancel-in-progress: false`.
10. **AGENTS.md.** Document preview URL pattern, that production stays `main`-only, local preview build with `VITE_BASE`, and the storage-key rule.

## 6. Acceptance criteria

| ID | Check |
|---|---|
| AC1 | `deploy-pages.yml` still runs only on `main` push and `workflow_dispatch`. |
| AC2 | Feature workflow does not set `environment: github-pages`, does not call `deploy-pages`, and does not dispatch `deploy-pages.yml`. |
| AC6 | `deploy-feat-pages.yml` has no `pnpm build` from a `main` checkout; it mirrors the published site before overlaying `feat/`. |
| AC3 | `loan.ts` uses `import.meta.env.VITE_STORAGE_KEY` with default `compound-amortization-v1`. |
| AC4 | `pnpm --dir apps/web build` with `VITE_BASE=/compound/feat/1/` and `VITE_STORAGE_KEY=compound-amortization-feat-preview-v1` references `/compound/feat/1/` in `index.html`. |
| AC5 | `node --test` and `pnpm --dir apps/web test` pass. |

## 7. Decisions

**D1 — Preview URL.** `https://nikolaybotev.github.io/compound/feat/<pull-request-number>/` because the site mount is `/compound/`, not a second Pages site.

**D2 — No feature `deploy-pages`.** The `github-pages` environment stays limited to `main`; feature jobs must not upload a partial artifact.

**D3 — `pages-feat` branch.** Feature static files are stored on branch `pages-feat` at `feat/<n>/`. Production deploy merges that tree into the full artifact so `deploy-pages` still publishes one complete site.

**D4 — Dispatch refresh.** Feature workflow uses `workflow_dispatch` on `deploy-feat-pages.yml` at `ref: main` after each `pages-feat` push. That workflow mirrors the live production and prototype bytes, then overlays `pages-feat/feat/`. `deploy-pages.yml` rebuilds production only on `main` push or its own `workflow_dispatch`.

**D9 — Mirror risk.** If the mirror step cannot fetch production and prototype, the feat publish job fails and uploads nothing. A failed mirror must not ship a partial tree.

**D5 — Serialization.** Concurrency group `feature-preview-pages`, `cancel-in-progress: false`, on the feature workflow.

**D6 — Storage key.** `compound-amortization-feat-preview-v1` for all feat previews; production and prototype keep `compound-amortization-v1`.

**D7 — Forks.** `if` guard on head repo full name equals `github.repository`.

**D8 — Prototype.** Cleanup touches only `feat/<n>/` on `pages-feat`; `deploy-pages.yml` still builds `prototype/` from its ref.
