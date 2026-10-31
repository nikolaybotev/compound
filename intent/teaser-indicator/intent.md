# intent.md — Teaser indicator

| | |
|---|---|
| Captured | 2026-10-31 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [intent/page-knowledge-base/](../page-knowledge-base/intent.md) |

## Problem

The knowledge base already explains a teaser, or discounted initial rate: a start rate below the current index plus the margin. The amortization page does not say when the loan on screen is in that position. The owner has to do the comparison by hand, and the page has nowhere to record the current index.

## Proposed outcome

When the initial rate is below the current index plus the margin, a small indicator sits next to that rate. The hint shows the gap and opens the teaser entry. The owner can enter the current index the comparison needs.

## Affected users and systems

- **Users:** The owner, reading an ARM's start rate on the amortization page.
- **Systems:** The page heading, the ARM terms disclosure, and the knowledge panel entry that already exists for the teaser. The calculator library, the command-line tools, and the skills stay as they are.

## Constraints and principles

- The comparison needs a current-index value. The page does not fetch one.
- The indicator opens the teaser entry already in the knowledge base. It does not add a second explanation.
- A fixed-rate loan has no teaser indicator.
- Library parity and the Regulation Z APR solver are later items. This change does not start them.
- Do not put a personal-data rule in the repo.
- Do not dispatch a Pages deploy.
- The page point version becomes 0.22, including the point version the production publish reads.

## Open questions (carried into spec.md)

1. Where the current index is entered, and what happens when it is missing.
2. Whether caps, the floor, or rounding to the nearest eighth change the comparison.
3. What the indicator and the hint say, and where they sit relative to the note rate.

## Original prompt (verbatim)

> Implement phase 0.22, the teaser indicator, from the 0.22 section of /cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/docs/parity-kb-plan.md. Follow this repo's intent chain (intent/<change>/intent.md, spec.md, plan.md) and the ai-native SDLC skill. Follow the personal-data rule in /cursor/stores/bc-f3b70e0c-aa13-44e4-8e96-471777c06dc5/preferences.md and do not copy that rule into the repo. Branch from current main; knowledge-panel pull request 83 is already merged. Bump the page to 0.22, including PAGES_POINT_VERSION. Open the pull request and merge it when the required checks are green. Do not start the library ports or the Regulation Z APR. Do not dispatch a Pages deploy.

## Source transcript (verbatim)

The approved batch states:

> **0.22 — Teaser indicator.** When the initial rate is below the current index plus the margin, a small indicator sits next to that rate. The hint shows the gap and opens the teaser entry. This needs a current-index value.
