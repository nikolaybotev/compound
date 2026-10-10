# intent.md — Feature previews

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-10 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [../complete-loan-picture/intent.md](../complete-loan-picture/intent.md) (GitHub Pages publisher and `/compound/prototype/`) |

## Problem

Pull requests that change the amortization page have no URL on the existing GitHub Pages site. Reviewers must run the app locally or rely on CI. The production publisher on `main` replaces the whole site through `actions/deploy-pages` and the `github-pages` environment, so a feature branch cannot safely upload its own tree without clobbering `https://nikolaybotev.github.io/compound/` or `https://nikolaybotev.github.io/compound/prototype/`.

## Proposed outcome

GitHub Pages will serve orphan branch `gh-pages`. Each feature build lands under `feat/<12-char-commit-sha>/`. Open pull requests keep `feat/<number>/index.html` redirecting to the latest sha; closing a PR leaves that pointer at the last published sha. Main updates only production root on `gh-pages`; `prototype/` is seed-only. Until cutover, `deploy-pages.yml` stays the live publisher with `prototype/` in the Actions artifact.

## Affected users and systems

- **Users:** Contributors and reviewers comparing a PR’s page to production without a local build.
- **Systems:** `.github/workflows/deploy-pages.yml`, a new feature-preview workflow, `apps/web` (`VITE_BASE`, storage key), `AGENTS.md`.

## Constraints and principles

- Do not widen the `github-pages` environment to feature branches.
- Do not upload a partial artifact with `deploy-pages` from a feature job.
- Same-repo pull requests only; no fork deploys.
- No deploy when a branch has no pull request.
- Serialize feature publishes if concurrent updates could erase each other.
- No new calculator dependency.

## Open questions (carried into spec.md)

None. Nikolay’s decisions are recorded as D1–D12 in [spec.md](spec.md).

## Original prompt (verbatim)

> Define and implement a feature-preview deploy for nikolaybotev/compound. Follow /home/ubuntu/.cursor/skills-cursor/ai-native-sdlc/SKILL.md. The repo already has the SDLC chain. This is a new intent folder, intent/feature-previews/, linking to the pages deploy it builds on. Read AGENTS.md, .github/workflows/deploy-pages.yml, and the current Pages setup before writing decisions.
>
> Branch from latest origin/main. Open one pull request. Do not merge it. Do not force-push main.
>
> ## Workflow Nikolay asked for
> Feature branches must not deploy to production. Each feature gets its own GitHub Pages URL, independent of the main-branch production deploy. Production stays the current https://nikolaybotev.github.io/compound/ page, including the /compound/prototype/ subpath, which stays at least for now. He suggested a path like /compound-feat-123 or something suitable.
>
> ## Decisions already made
> - Production deploy stays main-only. Pushing a feature branch must not run the production Pages upload and must not replace https://nikolaybotev.github.io/compound/ or https://nikolaybotev.github.io/compound/prototype/.
> - The Pages site is mounted at /compound/. This repo cannot publish https://nikolaybotev.github.io/compound-feat-123/. Use https://nikolaybotev.github.io/compound/feat/<pull-request-number>/ . Deploy when a same-repo pull request is opened or updated. No deploy for a branch with no pull request. Remove that feat/ directory when the pull request closes. Prototype is not a feature preview and is not removed by that cleanup.
> - actions/deploy-pages replaces the whole site, and the github-pages environment has been limited to main. Do not point a feature job at that environment or upload a partial artifact over production. Publish only the feature directory, in a way that keeps the existing production files and prototype/. If two feature publishes can erase each other, serialize them. If you cannot do that without risking production, stop and write the blocker into the plan. Do not ship a clobber.
> - A feature preview is the same origin as production, so localStorage is shared. Bake a separate storage key for preview builds so a preview does not read or write compound-amortization-v1. Production and prototype keep that key.
> - Vite base for a preview is /compound/feat/<number>/. Production base stays /compound/. A local build with VITE_BASE unset stays ./.
> - Same-repo branches only. Do not deploy forks.
> - No new calculator dependency. Update AGENTS.md with the preview command and the production-vs-preview rule. Update plan.md in the same commit if implementation departs from it.
>
> Do not ask questions. Conservative choices stay inside these decisions. Reply with the pull request URL, the preview URL pattern, how a feature publish avoids replacing production, and the storage key.
