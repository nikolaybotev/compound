# intent.md — Page knowledge base

| | |
|---|---|
| Status | Approved |
| Stage | 4 · Build |

## Original prompt

Implement only the page knowledge base (page version 0.21). Wide screens open a side panel. Phones open a bottom sheet. The page does not navigate away. Terms in the UI link to entries. Share the ARM types explainer with the skill text rather than rewriting it. Use the existing docs/kb/ files for Closing Disclosure versus the note, rider, and deed of trust, and for the teaser rate. Do not put a personal-data rule in the repo. Do not start the library ports or the APR solver. Bump the page point version to 0.21 in the commit that ships the behavior.

## What this change is

The amortization page gains a knowledge panel. The articles already exist. This change opens them beside the loan.

It builds on [intent/arm-concepts/](../arm-concepts/spec.md) and [docs/kb/](../../docs/kb/README.md). The approved sequence is the 0.21 item in the parity, knowledge base, and APR batch. Library parity and the Regulation Z APR solver are later items and are out of this change.
