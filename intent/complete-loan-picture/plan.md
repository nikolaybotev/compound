# plan.md — Complete loan picture

| | |
|---|---|
| Implements | [spec.md](spec.md) Draft 3 |
| Status | Draft 3 |
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
| AC2 | `pnpm --dir apps/web test` PMI brackets and rate text `0%`, `0.2%`, `0.35%`, `0.45%` with no bracket sentence; on the default loan, 15-year principal and interest and prepaid interest 175156 | 0 |
| AC3 | Playwright, pinned 2026-10-15, fresh heading `$4,853`, summary `$3,936.85`, picture lines, Nashua / Brentwood note, PMI text `0.35%` | 1 |
| AC4 | Playwright, 20% down clears PMI; upfront MIP 1.75% shows loan `$579,975.00` and matches `buildReport(579975, 7.375, 360, empty)` | 1 |
| AC5 | Playwright, both headers are `summary` elements with no border; Apply leaves tax `2`; Saved by extra `$706.94` | 1 |
| AC6 | Playwright, version-1 storage still shows `$3,792.22` and heading thousands `570` | 1 |
| AC7 | Existing Playwright example, chart, extras, and Saved by extra; `node --test`; JSON and CSV unchanged | 1 |
| AC8 | Feature PR open and unmerged; both Pages URLs checked on the combined `deploy-pages.yml` run that the merge to `main` starts | 3 |

## Phase 0 — Picture arithmetic

Files: `apps/web/src/picture.ts`, `apps/web/unit/picture.ts`

1. Add `picture.ts` with no DOM. It holds the requirement 7 defaults, parses those fields, and returns the cent lines, the heading dollar amount, base cents, and financed cents. Principal and interest is `buildReport` on the financed dollars, the note rate, and `years * 12`. Do not add a payment formula beside that call. Do not edit `amortize.js`. Round upfront MIP and the other percent-of-money lines half up to the cent with the same integer division `downPaymentCents` uses. Keep base cents and financed cents distinct. Base (`B6`) is price minus down. Origination, the upfront MIP amount, and prepaid interest use that base. Financed (`B8`) is base plus upfront MIP. `buildReport` takes the financed dollars.
2. Compare PMI brackets with `percentThousandths`, as requirement 9 states. The rate text is `0%`, `0.2%`, `0.35%`, or `0.45%`. There is no bracket sentence. Keep prepaid interest on `÷ 360 × 15`. Keep the cushion on tax + insurance + FHA MIP.
3. Add the AC1 and AC2 unit tests in `apps/web/unit/picture.ts`. Do not put them where `node --test` collects tests.

DoD: `pnpm --dir apps/web test` exits 0 and the AC1 cents match, including 393685, 485310, 4853, 175156, and 5035156. `node --test` exits 0.

### Build notes (Phase 0)

The half-up division lives in `picture.ts` and matches `downPaymentCents` on the same cents and thousandths. Prepaid interest uses that division on `base × rate thousandths × 15 / (100000 × 360)`.

## Phase 1 — Heading, disclosures, and the page

Files: `apps/web/src/app.tsx`, `apps/web/src/loan.ts`, `apps/web/src/styles.css`, `apps/web/src/disclosure.tsx` if the summary is its own component, `apps/web/e2e/*.spec.ts`, `apps/web/unit/loan.ts`, `AGENTS.md`, `REVIEW.md`

1. Keep `LoanDraft.price` as dollars. Render it in the heading as thousands (`id="price"`). The accessible name is "Purchase price (thousands)". Use a focus buffer so a trailing dot does not fail or rewrite the loan. Validate the thousands text as a positive number with at most five decimal places before `parseLoan`, so `399.999` is `$399,999` and `0.00001` thousand is one cent. Digit-shift a valid entry into the dollar string. Do not run the two-decimal dollar check on the thousands text. Replace `PRICE_MESSAGE` for this field: an invalid entry names the purchase price, describes thousands of dollars, and keeps the last valid loan. `1200` displays as `1200K`. Do not use the sheet formula `LEFT(B3÷1000,3)`. The heading wraps on a narrow viewport. Heading dollars are grouped whole dollars with no cents (`$4,853`). `formatGroupedCents` is the cent formatter for the section rows. Move down payment (`id="down"`) and note rate (`id="rate"`) into that heading. Leave `id="years"` and `id="start"` on the next line. Name the computed figure "Complete monthly payment".
2. Change `defaultDraft` to `$600,000`, down `5`, years `30`, rate `7.375`. Keep the storage key and version `1`. Load a version-1 dollar price as dollars. Add picture fields and `open` with the requirement 6 fallback. Leave `loan.loanCents` as the base, price minus down. Do not write the financed amount back into it. Pass financed cents through `loanReport` into `buildReport`, and through every `savedByExtraCents` call. At upfront MIP 0% those financed cents equal the base. At upfront MIP `1.75` on the default base, the summary loan amount is `$579,975.00` and principal and interest is `buildReport(579975, 7.375, 360, empty)`.
3. Replace the "Make extra payments" `<button>` in `section.prefill` with `<details>` / `<summary>`. Add the picture `<details>` after it and before `Schedule`. The picture title is "Monthly payment and closing costs". Collapsed, only that header shows. Expanded, it shows the label Conventional, then requirement 9's monthly rows, then requirement 10's closing rows. The four echo rows (purchase price, down payment, base loan, total loan amount financed) are read-only. The eight requirement 7 inputs sit on their rows. Down payment stays in the upper block and is absent from the closing block. The property-tax row shows `Nashua: 1.683%; Brentwood: 1.32%.` The PMI rate is the text `0%`, `0.2%`, `0.35%`, or `0.45%`, with no bracket sentence. Set an HTML `aria-expanded` attribute on each `<summary>`. A native summary does not set that attribute, and the existing checks read it. Mark the chevron `aria-hidden`. No bordered button chrome. Apply stays a `<button>`. Do not restyle `.year-row button` or "Expand all years". Both sections are closed when the flag is absent. A saved `prefill.open: true` still opens extra payments. A saved picture `open: true` opens the picture. Toggling either summary writes its flag. Do not clear a saved open flag on load. A malformed picture object falls back to the requirement 7 defaults, closed, and leaves the saved loan, extras, and prefill in place. Picture inputs recompute on a valid edit and do not touch the extra map. An empty picture field is invalid. Do not reuse `parseDollarField`'s empty-as-zero rule for those fields.
4. Point existing Playwright helpers at thousands. Every `#price` fill is thousands: `openExample` in `apps/web/e2e/page.spec.ts`, `extras.spec.ts`, and `saved-by-extra.spec.ts` fills `570`, not `570000`. The old AC4 price fills become `712.5` and `399.999` so the loan amounts stay `$570,000.00` and `$385,999.03`. In `page.spec.ts`, the pinned-clock fresh load and the later lines in that test that keep the loan after a bad price expect `$3,936.85`, not `$3,792.22`. The corrupt `{` reload in `extras.spec.ts` is that same fresh visit: start `2026-10`, payment `$3,936.85`, extra payments collapsed. The collapsed extra-payment check keeps the accessible name "Make extra payments" and reads `aria-expanded` on the summary. Add AC3–AC6, including the Nashua / Brentwood note and the PMI text `0.35%` with no bracket sentence. Keep the November 2039 card, extra Apply, and Saved by extra `$706.94` on the example loan.
5. In `apps/web/unit/loan.ts`, the round-trip test expects the loaded scenario to equal the object that was saved. A version-1 payload with no picture object still restores that loan, and the loaded picture is the requirement 7 defaults, closed.
6. In `AGENTS.md`, record the fresh-visit Conventional default, the heading, the disclosure, that picture principal and interest is `buildReport`, and the prototype URL. Replace the Cloud sentence that says a fresh page load is `$570,000` / 7% / 30 years / 0% down with payment `$3,792.22`. Do not put that old loan back. In `REVIEW.md`, add a Bugs clause for a picture principal and interest that is not `monthly_payment_cents`, a second amortization, and a Pages deploy that uploads production without `prototype/` while this review prototype is up. Add `intent/complete-loan-picture/` to the Compliance list.

DoD: `node --test` exits 0. `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. A fresh pinned October 2026 load shows `$4,853` and summary `$3,936.85`. The `$570,000` / 7% example still shows `$3,792.22`, Saved by extra `$706.94` for $100 in month 1 only, and the November 2039 card. `--json` and the `--schedule` CSV are unchanged. A local `pnpm --dir apps/web build` with `VITE_BASE` unset still uses base `./`.

### Build notes (Phase 1)

- A trailing dot after any whole thousands figure (`600.`, and also `0.`) does not error and does not change the loan, so the decimal point can be typed. The spec names `600.`.
- Blurring the purchase-price field restores the thousands display of the last valid dollar price. An invalid entry keeps its error while those keystrokes are in the field. The error clears on blur because the field no longer shows them.
- A picture value that is not an object falls back to the requirement 7 defaults, closed, and the saved loan stays. A missing picture field, or one that does not parse, uses that field's default. A missing or non-boolean `open` stays closed. A saved `open: true` stays open.
- `loanReport`, `savedByExtraCents`, and `groupByYear` take financed cents. When a caller omits them they use `loan.loanCents`, which is the upfront-MIP 0% case. The page always passes the picture's financed cents. `loan.loanCents` stays the base.
- `percentThousandths` lives in `picture.ts` and `loan.ts` re-exports it, so the heading and the picture share one parser. `picture.ts` keeps its own cents-to-dollars conversion, the same steps as `centsToDollars`, so it does not import `loan.ts`. A cycle there left the saved-picture parser unset.
- The summary keeps the browser's `list-item` display. `display: flex` on the summary element drops its disclosure behavior, so the chevron row is an inner span. This Playwright Chromium exposes a closed `details` as a group and does not expose the summary as a button, so the extra-payment checks read `aria-expanded` and the accessible name on the `summary`. The chart hover in `page.spec.ts` scrolls the chart into view; the heading pushes the old hover point past the 720px Playwright viewport.

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
3. Check out `main` and `ref` in two directories. A second `actions/checkout` must not replace the tree the first build just wrote. Vite writes `apps/web/dist` inside each checkout. Install each checkout on its own. Build `main` with `VITE_BASE=/compound/` and `ref` with `VITE_BASE=/compound/prototype/`. Place the outputs at `site/index.html` and `site/prototype/index.html` before the existence check. On `push`, `inputs.ref` is empty, so the prototype build uses the feature-branch default. It does not use `github.sha`. If `ref` cannot be checked out, fail and upload nothing.
4. Fail the job unless `site/index.html` and `site/prototype/index.html` both exist, the prototype file references `/compound/prototype/`, and the root file does not. Upload `site/` with `actions/upload-pages-artifact` and deploy with `actions/deploy-pages`. This is the only Pages upload while the prototype is up. A later push to `main` runs this same job and rebuilds production and `prototype/` together.
5. Run AC8 on that combined `deploy-pages.yml` run, the one the merge to `main` starts. There is no second Pages workflow. The two URLs share `compound-amortization-v1` on `nikolaybotev.github.io`. Opening the prototype writes that key, so clear it immediately before the production load. Production is then the `main` page: monthly payment `$3,792.22`, and no "Complete monthly payment" figure. The prototype shows the AC3 heading and summary `$3,936.85`.

DoD: AC8. The feature pull request is still open and unmerged. Stop. Do not merge it.

### Build notes (Phase 3)

None yet.
