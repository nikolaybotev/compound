# case-studies.md — Closing-cost evidence (0.16)

This note records supporting evidence for the **shipped** clean-closing-costs work (page 0.16, pull request 68). It is **not** a change request: it explains why the $3,000 lender-fee default, the title presets, and the prepaid-interest behavior were left as implemented. Do not retune defaults from this file.

Primary sources for the Bank B figures below are five Bank B price-quote worksheets dated **10/13/2026** (project store: `internal/closing-costs/bank-b-price-quote.pdf`, `bank-b-agency30fixed.pdf`, `bank-b-affordable-program.pdf`, `bank-b-fha.pdf`, `bank-b-arm76.pdf`). The reference purchase in the spec (net sheet and Loan Estimate) is the other lender cited in [intent.md](intent.md); those PDFs are not repeated here.

## Second lender quote (Bank B)

Bank B, 10/13/2026, same scenario as the reference purchase ($600,000 price, $570,000 loan, 95% LTV, 30-year conforming fixed at par, 7.250%). The price-quote cover sheet states it is for informational purposes and is not an official Loan Estimate. The conforming fixed breakdown is `bank-b-agency30fixed.pdf`; the cover sheet lists sibling products (7/6 ARM, Affordable Program, FHA) with pointers to the other breakdown PDFs.

### Lender fees

| Item | Source note | Agency 30yr fixed PDF |
| --- | ---: | ---: |
| Appraisal | $710.00 | $710.00 |
| Credit report | $306.00 | $306.00 |
| Processing | $1,745.00 | $1,745.00 |
| Tax service | $87.00 | $87.00 |
| ID verification | $7.30 | $7.30 |
| Financial verification | $95.00 | $95.00 |
| Discount points | $0.00 | $0.00 |
| **Total Bank B fees** | **$2,950.30** | **$2,950.30** |

Flood life-of-loan coverage ($5.00) and flood determination ($5.00) appear under **Third Party Fees** on the breakdown, not in the Bank B fee subtotal. The source note treats that **$10** as separate from lender fees.

The reference lender’s equivalent is **$2,618** (including a $995 rush appraisal). Even a large bank at par came in under **$3,000**. The **$3,000** default leans slightly high against both lenders, as intended.

### Title, escrow, and recording

The source note sums settlement/escrow, lender’s title, endorsements, deed prep, and recording **without** the flood lines:

| Item | Source note | Agency 30yr fixed PDF |
| --- | ---: | ---: |
| Settlement or closing fee | $2,150.00 | $2,150.00 |
| Lender’s title insurance | $1,491.00 | $1,491.00 |
| ALTA 8.1 environmental protection lien | $25.00 | $25.00 |
| Deed preparation | $60.00 | $60.00 |
| Recording (deed + mortgage) | $40.00 + $86.00 | $40.00 + $86.00 |
| **Subtotal in the note** | **$3,852.00** | — |
| Flood items (see above) | (listed separately) | $10.00 |
| **Total third party fees** | — | **$3,862.00** |

The note’s **$3,852** matches the PDF line items above; the worksheet’s **Total Third Party Fees** is **$3,862** because it includes the **$10** flood fees.

Compared to the reference **$3,895.50**, Bank B is in the same ballpark but built differently: full settlement fee placeholder ($2,150), no 50/50 escrow split, no owner’s title policy, no transfer tax. The reference title company’s actual full escrow fee is **$1,575** (buyer’s half **$787.50**).

### Prepaids and impounds (agency 30yr fixed)

| Item | Source note | PDF |
| --- | ---: | ---: |
| Prepaid interest (15 days @ 7.250%) | $1,698.29 | $1,698.29 |
| Homeowner’s insurance (12 months) | $1,800.00 | $1,800.00 |
| Impounds (2 months tax + 2 months insurance) | $1,550.00 | $1,550.00 |

Bank B uses a ballpark **15** days of interest and **2** months of impounds plus **12** months of insurance upfront. That pattern is the underestimate the page avoids by using the real closing-month day count and the scenario’s tax and insurance inputs for impounds and proration.

### Other Bank B products (not benchmarks)

- **Affordable Program** (`bank-b-affordable-program.pdf`): income-limited affordable program; processing **$995.00** plus a lender credit. Does not apply to the conforming reference; ignore as a benchmark.
- **FHA** and **7/6 ARM** breakdowns are on the same quote; they are not the par conforming fixed used for the default comparison.

## Refinance word of mouth

A coworker with a regular bank lender reports each refinance cost about **$4,000**. A refinance still has lender fees (appraisal unless waived), a refinance-rate lender’s title policy, settlement and recording, but no transfer tax and no owner’s policy. Prepaid interest and the new impound deposit are mostly timing (offset by the old loan’s accrued interest and the impound refund). About **$3,000** lender plus about **$1,000** title/escrow is consistent with the **$3,000** lender-fee default. It does not argue for a **$4,000** lender default.

## Not now

A lender-type preset (credit union about $3k versus a bank) or a refinance mode would be separate, small intents only if asked. Do not build them.
