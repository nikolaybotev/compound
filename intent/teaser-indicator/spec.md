# spec.md — Teaser indicator

| | |
|---|---|
| Derived from | [intent.md](intent.md) (2026-10-31) |
| Status | Draft 2 |
| Stage | 2 · Design |

## 1. Summary

Page version 0.22 adds a teaser indicator to `apps/web`. On an ARM, the owner can enter a current index. When the start rate is below that index plus the margin, a small control sits next to the start rate. Its hint states the gap in points, and activating it opens the existing teaser entry in the knowledge panel.

The comparison is page-only. `amortize.js`, the calculator CLI, the origination-fee CLI, and the three skills do not change. No dependency is added. The scenario document stays version 2.

## 2. Goals and non-goals

**Goals**

- G1. Show a teaser indicator next to the start rate when that rate is below the current index plus the margin.
- G2. Let the owner enter the current index the comparison needs.
- G3. The indicator's hint states the gap, and the control calls the existing opener for `KNOWLEDGE_ENTRIES.teaser` (`arm-rate` / `teaser`), which is `docs/kb/arm-rate.md#teaser`. The URL stays unchanged.

**Non-goals**

- Level-the-payment extras in the library, a fixed-rate recast function, CLI parity, or the Regulation Z APR solver.
- Fetching a published index, or copying the schedule's adjustment-month index into this comparison.
- A premium-rate indicator when the start rate is above the fully indexed rate.
- A personal-data rule in the repo.
- A new scenario-document version.
- A Pages deploy.

**Release phasing.** Every untagged requirement in this spec is this release.

## 3. Principles

- P1. The teaser test is the one in the approved batch: start rate below current index plus margin.
- P2. The current index is not an adjustment index and does not enter the interest walk.
- P3. The teaser article stays the knowledge-base file. The page does not rewrite it.

## 4. Users and scenarios

The owner switches a loan to ARM and types today's index next to the margin. If the start rate is lower than that index plus the margin, the heading shows a small teaser control whose hint is the gap. Activating it opens the teaser article without leaving the loan. A fixed-rate loan, a blank current index, and a start rate that is equal to or above the fully indexed rate show no control.

## 5. Functional requirements

1. **Current index.** ARM terms gains a Current index field, `#arm-current-index`, directly after Margin and before Initial cap. The visible label is `Current index` and the suffix is `%`, the same chrome Margin uses. The label is a term control to the note-rate entry (`arm-rate` / `note-rate`), the same entry Margin already opens. The value is a percent with at most three decimal places, the same grammar as Margin (`percentThousandths` after trimming). Empty is valid and means no current index. `0` is an index of zero. Any other text is invalid.
2. **Invalid current index.** The error is its own alert inside the ARM disclosure: `Current index must be a percent with at most three decimal places.` It does not replace the loan-field error or an ARM-term error, and it does not refuse switching to ARM. On load and on every scenario switch, the last valid thousandths are recomputed from that scenario's `currentIndex`: a string `percentThousandths` accepts is in force, and an empty or invalid string means no current index. A non-empty invalid string also shows the alert. A failed keystroke keeps the previous valid thousandths only until that scenario's field is cleared or replaced with a valid value. Clearing the field clears the error and the current index. Switching scenarios drops the previous scenario's last-valid value.
3. **Comparison.** In integer thousandths, the fully indexed rate is the current index plus the margin. The gap is that sum minus the start rate. The start rate's thousandths are the same `Math.round(ratePercent * 1000)` value the page already passes to `parseArm`. The margin's thousandths are the last valid parsed margin. The indicator is shown only when the product is ARM, the ARM terms parse, a current index is in force, the sum is a safe integer, and the gap is greater than zero. Caps, the lifetime floor, the first-adjustment floor, and Round to nearest 1/8 point do not change the sum or the gap.
4. **Indicator.** The control is `button#teaser`, a direct child of `.heading-line`, immediately after the percent sign that follows `#rate` and before the term field. It is present only while requirement 3 says to show it, including when the ARM disclosure is closed. Fixed mode does not render it, even if a current index is stored. It is smaller than the heading rate, muted, on the same baseline, and wraps with the heading line. It is not a hover-only tooltip. The visible word is `teaser`. The visible hint, inside the same button, is `{gap} point below the fully indexed rate of {fully}%` when the formatted gap is `1`, and `{gap} points below the fully indexed rate of {fully}%` otherwise. `{gap}` and `{fully}` are `formatPercentThousandths` of the gap and of the fully indexed rate, so trailing zeros are removed (`1.5`, `4.5`, `0.125`). The button has no `aria-label` that replaces that hint. Activating it opens the knowledge panel at `arm-rate` / `teaser` and does not change the URL. Close returns focus to this button.
5. **Storage.** `currentIndex` is a string on the ARM draft, loaded the way `evenYearly` is: a missing or non-string key becomes `""` and the rest of the stored ARM is kept (`stored` stays true; margin, caps, and `index` are unchanged). It is not one of the required text fields that reject the whole ARM. `armToStorage` writes the string. The arm object is still written only once the owner has selected ARM or toggled the disclosure. The scenario set written by `serializeStoredSet` stays version 2. The legacy key stays version 1. The current index is not written into the adjustment `index` list.
6. **Walk unchanged.** The current index is not an argument to `buildReport`, and it is not inserted into `indexByMonth`. Payments, the schedule Index column, highest rate, and highest payment stay on the existing walk. Entering a current index does not change principal and interest for the same note rate.
7. **Version and docs.** `apps/web/package.json` is `0.22.0`. `PAGES_POINT_VERSION` in `publish-gh-pages-production.yml` is taken from that version, so the exported point version is `0.22`. The workflow file is not given a second hardcoded copy, and this change does not dispatch a deploy. `AGENTS.md` describes the indicator, the current-index field, and this folder, and records the app version as 0.22. Things agents get wrong gains: do not treat the schedule Index column as the current index; do not show the indicator on a fixed-rate loan or unless the start rate is below the current index plus the margin; do not pass the current index into `buildReport` or the adjustment index; do not apply caps, a floor, or round-to-1/8 to the comparison. `REVIEW.md` names `intent/teaser-indicator/`. `README.md` says an ARM start rate below the current index plus the margin shows a teaser indicator that opens the knowledge entry.

## 6. Acceptance criteria

| AC | Check |
|---|---|
| AC1 | Unit: `teaserGap(currentIndexText, marginThousandths, rateThousandths)`. The current index is the field string. Margin and start rate are thousandths. `"2"`, margin 2500, rate 3000 returns gap 1500 and fully indexed 4500. Rate 4500 and rate 5000 return null. `""`, `"2.5555"`, and `"-1"` return null. `"0"`, margin 2500, rate 2000 returns gap 500. `"2.04"`, margin 2500, rate 4500 returns gap 40. A sum that is not a safe integer returns null. `formatTeaserHint(1500, 4500)` is `1.5 points below the fully indexed rate of 4.5%`. `formatTeaserHint(1000, 2000)` uses `1 point`. |
| AC2 | Unit: a stored ARM without `currentIndex`, and one whose `currentIndex` is not a string, loads `currentIndex` `""` with `stored` true, and its margin, caps, and `index` are unchanged. A string round-trips through `armToStorage`. `defaultArm().currentIndex` is `""`. The scenario set written for that ARM is still version 2, and the legacy key is still version 1. `toBuildReportArm` has no current-index field. |
| AC3 | Playwright, 1280px: a fresh loan has no `#teaser`. Set the start month to October 2026 with the page's month picker. After ARM, rate `3`, margin `2.5`, and current index `2`, `#teaser` shows `teaser` and `1.5 points below the fully indexed rate of 4.5%`. The principal-and-interest figure is unchanged by typing the index. Expand all years, then the input named `Index for month 85` is empty. Activating the control opens the teaser heading in the panel, the price stays `600`, and the URL is unchanged. Close returns focus to `#teaser`. The control remains when the ARM disclosure is closed. |
| AC4 | Playwright: from rate `3`, margin `2.5`, and current index `2` (the 1.5-point hint visible), set the rate to `4.5` and then to `5`; `#teaser` is absent both times. Restore rate `3`, margin `2.5`, and current index `2` so the hint is visible, then replace the current index with `nope`: the alert `Current index must be a percent with at most three decimal places.` is shown and the 1.5-point hint stays until the field is cleared, which removes the control and the alert. Switching the product to fixed removes `#teaser`. Round to nearest 1/8, with index `2.04`, margin `2.5`, and rate `4.5`, shows `0.04 points below the fully indexed rate of 4.54%`. |
| AC5 | `pnpm --dir apps/web test` and `pnpm --dir apps/web test:e2e` exit 0. `apps/web/package.json` is `0.22.0`. The diff does not change `amortize.js`, the CLIs, a skill's wording, or `.github/workflows/`. |

## 7. Design decisions

**D1 — The current index is typed, not fetched.** The page must not request a published index. The schedule Index column is the lookback index at an adjustment month, which is a different number and may be blank. Checked 2026-10-31: `KNOWLEDGE_ENTRIES.teaser` is `arm-rate` / `teaser`, and `docs/kb/arm-rate.md` defines the teaser as a start rate lower than index plus margin. The CHARM illustration there is index 2%, margin 2.5%, start 3%, fully indexed 4.5%.

**D2 — The field sits with the margin, and the indicator sits with the rate.** The comparison is index plus margin, so the input follows Margin. The approved sentence puts the indicator next to the rate, which on this page is `#rate` in `.heading-line`. A hover tooltip would hide the gap on a phone, so the hint is visible text inside the button.

**D3 — Caps, floors, and eighth-rounding stay out of the comparison.** Those bounds apply when a later note rate is set. The approved test is index plus margin, and the knowledge-base article uses that sum before caps. Round to nearest 1/8 changes adjustment rates and does not change this gap. Index `2.04` plus margin `2.5` is 4.54% even when rounding is on.

**D4 — Empty means no comparison.** A default index would invent a teaser on the fresh 7.375% loan. The field starts empty. The indicator appears only after a current index is in force and the gap is positive. Equal and higher start rates show nothing; a premium marker is out of scope.

**D5 — Storage follows `evenYearly`.** That string was added on the ARM draft without a new scenario-document version. `currentIndex` does the same, and it is not one of the required text fields: a missing key must not discard the saved ARM. It stays out of `parseArm`, because an empty index must not refuse ARM mode. Checked 2026-10-31: `serializeStoredSet` writes version 2 and the legacy key stays version 1, both in `loan.ts`. `publish-gh-pages-production.yml` sets `PAGES_POINT_VERSION` from `apps/web/package.json` (major.minor). `0.22.0` exports `0.22`. The workflow is not edited.

**D6 — The last valid index is per scenario.** A failed keystroke keeps that scenario's previous valid thousandths, so a mistyped index does not flicker the heading. Load and scenario switch recompute it from the stored string. An empty or invalid stored string means no current index; a non-empty invalid string shows the alert. Switching scenarios does not carry the previous scenario's last-valid value.

## 8. Open questions

None.
