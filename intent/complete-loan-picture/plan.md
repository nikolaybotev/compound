# plan.md — Complete loan picture

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 2 |
| Status | Draft 2 |
| Stage | 3 · Build |

Spec wins. Update this file in the same change whenever implementation departs from it.

## Stops

None that need Nikolay. D14 is decided. The feature pull request stays open. The prototype URL is `https://nikolaybotev.github.io/compound/prototype/`.

## Departure from one merged pull request per phase

The spec forbids merging the feature. Phases 0 and 1 are commits on the single feature branch that contains this plan. They are not separate pull requests. Phase 2 opens that pull request and does not merge it. Phase 3 is the exception: a workflow-only change on `main`, which may be merged. It does not contain the feature commits. It turns `deploy-pages.yml` into the combined publisher in D14. The `github-pages` environment still accepts a deploy only from `main`. Do not widen it so the feature branch can deploy.

## Acceptance-criteria coverage

| AC | Check | Phase |
|---|---|---|
| AC1 | `pnpm --dir apps/web test` default-picture cents, and principal and interest equals `buildReport` | 0 |
| AC2 | `pnpm --dir apps/web test` PMI brackets; on the default loan, 15-year principal and interest and prepaid interest 175156 | 0 |
| AC3 | Playwright, pinned 2026-10-15, fresh heading `$4,853`, summary `$3,936.85`, picture lines | 1 |
| AC4 | Playwright, 20% down clears PMI; upfront MIP 1.75% shows loan `$579,975.00` and matches `buildReport(579975, 7.375, 360, empty)` | 1 |
| AC5 | Playwright, both headers are `summary` elements with no border; Apply leaves tax `2`; Saved by extra `$706.94` | 1 |
| AC6 | Playwright, version-1 storage still shows `$3,792.22` and heading thousands `570` | 1 |
| AC7 | Existing Playwright example, chart, extras, and Saved by extra; `node --test`; JSON and CSV unchanged | 1 |
| AC8 | Feature PR open and unmerged; both Pages URLs checked after the prototype workflow | 3 |

## Phase 0 — Picture arithmetic

Files: `apps/web/src/picture.ts`, `apps/web/unit/picture.ts`

1. Add `picture.ts` with no DOM. It holds the requirement 7 defaults, parses those fields, and returns the cent lines, the heading dollar amount, and financed cents. Principal and interest is `buildReport` on the financed dollars, the note rate, and `years * 12`. Do not add a payment formula beside that call. Do not edit `amortize.js`.
2. Compare PMI brackets with `percentThousandths`, as requirement 9 states. Keep prepaid interest on `÷ 360 × 15`. Keep the cushion on tax + insurance + FHA MIP.
3. Add the AC1 and AC2 unit tests in `apps/web/unit/picture.ts`. Do not put them where `node --test` collects tests.

DoD: `pnpm --dir apps/web test` exits 0 and the AC1 cents match, including 393685, 485310, 4853, 175156, and 5035156. `node --test` exits 0.

### Build notes (Phase 0)

None yet.

## Phase 1 — Heading, disclosures, and the page

Files: `apps/web/src/app.tsx`, `apps/web/src/loan.ts`, `apps/web/src/styles.css`, `apps/web/src/disclosure.tsx` if the summary is its own component, `apps/web/e2e/*.spec.ts`, `apps/web/unit/loan.ts`, `AGENTS.md`, `REVIEW.md`

1. Keep `LoanDraft.price` as dollars. Render it in the heading as thousands (`id="price"`). Use a focus buffer so a trailing dot does not fail or rewrite the loan. Shift decimal digits when converting. Move down payment (`id="down"`) and note rate (`id="rate"`) into that heading. Leave `id="years"` and `id="start"` on the next line. Name the computed figure "Complete monthly payment".
2. Change `defaultDraft` to `$600,000`, down `5`, years `30`, rate `7.375`. Keep the storage key and version `1`. Load a version-1 dollar price as dollars. Add picture fields and `open` with the requirement 6 fallback. Pass financed cents through `loanReport` into `buildReport`, and through `savedByExtraCents`, defaulting to `loan.loanCents` so a 0% upfront MIP is today's base loan.
3. Replace the "Make extra payments" `<button>` in `section.prefill` with `<details>` / `<summary>`. Add the picture `<details>` after it and before `Schedule`. Chevron on the summary, no bordered button chrome. Apply stays a `<button>`. Do not restyle `.year-row button` or "Expand all years". Both sections are closed when the flag is absent. A saved `prefill.open: true` still opens extra payments. Do not clear a saved open flag on load. Picture inputs recompute on a valid edit and do not touch the extra map. An empty picture field is invalid. Do not reuse `parseDollarField`'s empty-as-zero rule for those fields.
4. Point existing Playwright helpers at thousands. Every `#price` fill is thousands: `openExample` in `apps/web/e2e/page.spec.ts`, `extras.spec.ts`, and `saved-by-extra.spec.ts` fills `570`, not `570000`. The old AC4 price fills become `712.5` and `399.999` so the loan amounts stay `$570,000.00` and `$385,999.03`. The pinned-clock fresh load in `page.spec.ts` and the corrupt-storage reload in `extras.spec.ts` (the `{` payload) expect the Conventional heading and `$3,936.85`, not `$3,792.22`. The collapsed extra-payment check keeps the accessible name "Make extra payments" and reads `aria-expanded` on the summary. Add AC3–AC6. Keep the November 2039 card, extra Apply, and Saved by extra `$706.94` on the example loan. Validate thousands text before `parseLoan`, then digit-shift into the dollar string. Do not run the two-decimal dollar check on the thousands text.
5. In `AGENTS.md`, record the fresh-visit Conventional default, the heading, the disclosure, that picture principal and interest is `buildReport`, and the prototype URL. Replace the Cloud sentence that says a fresh page load is `$570,000` / 7% / 30 years / 0% down with payment `$3,792.22`. Do not put that old loan back. In `REVIEW.md`, add a Bugs clause for a picture principal and interest that is not `monthly_payment_cents`, a second amortization, and a Pages deploy that uploads production without `prototype/` while this review prototype is up. Add `intent/complete-loan-picture/` to the Compliance list.

DoD: `node --test` exits 0. `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. A fresh pinned October 2026 load shows `$4,853` and summary `$3,936.85`. The `$570,000` / 7% example still shows `$3,792.22`, Saved by extra `$706.94` for $100 in month 1 only, and the November 2039 card. `--json` and the `--schedule` CSV are unchanged. A local `pnpm --dir apps/web build` with `VITE_BASE` unset still uses base `./`.

### Build notes (Phase 1)

None yet.

## Phase 2 — Open the feature pull request

Files: none beyond Phases 0 and 1

1. Push the feature branch. Open one pull request into `main`. The body lists Phases 0 and 1 and the AC1–AC7 evidence. Do not merge it. Do not enable auto-merge.

DoD: the pull request is open, CI is green (`node --test` and the web job), and `main` does not contain the page change.

### Build notes (Phase 2)

None yet.

## Phase 3 — Prototype beside production

Files: `.github/workflows/deploy-pages.yml` on `main` only. Do not land this by merging the feature pull request. Do not add a second workflow that also uploads to Pages.

Checked 2026-10-04: `deploy-pages.yml` uploads the whole `apps/web/dist`. The `github-pages` deployment branch policy is only `main`. Publishing a prototype-only tree would replace `https://nikolaybotev.github.io/compound/`. Widening the environment so the feature branch can deploy is rejected.

1. Open a pull request whose only change is `deploy-pages.yml`. The open feature branch already has the page. Set the workflow's `ref` default to that branch. Merge the workflow pull request when its CI is green. That merge is a push to `main`, so the combined job publishes both trees. It must not upload production alone.
2. The workflow still runs on `push` to `main` and on `workflow_dispatch`. Permissions stay `contents: read`, `pages: write`, and `id-token: write`. Concurrency group stays `pages`, `cancel-in-progress: false`. Environment stays `github-pages`. Input `ref` defaults to the open feature branch. A dispatch may pass another ref. A push uses the default.
3. Check out the workflow SHA (`main`) and build `apps/web` with `VITE_BASE=/compound/` into `site/`. Check out `ref` and build with `VITE_BASE=/compound/prototype/` into `site/prototype/`. Install each checkout on its own. If `ref` cannot be checked out, fail and upload nothing.
4. Fail the job unless `site/index.html` and `site/prototype/index.html` both exist, the prototype file references `/compound/prototype/`, and the root file does not. Upload `site/` with `actions/upload-pages-artifact` and deploy with `actions/deploy-pages`. This is the only Pages upload while the prototype is up. A later push to `main` runs this same job and rebuilds production and `prototype/` together.
5. After that run is green, open both URLs. With storage cleared, production is the `main` page: monthly payment `$3,792.22`, and no "Complete monthly payment" figure. The prototype shows the AC3 heading and summary `$3,936.85`.

DoD: AC8. The feature pull request is still open and unmerged. Stop. Do not merge it.

### Build notes (Phase 3)

None yet.
