---
name: regulation-z-apr
description: >-
  Calculates the Regulation Z actuarial annual percentage rate from the note
  amount, prepaid finance charges under 12 CFR 1026.4, the scheduled payment
  stream (including mortgage insurance), and on a discounted ARM the index at
  consummation. Use when the user asks for an APR, amount financed, or finance
  charge from loan terms and closing costs, not when they give an APR and ask
  for the fee (that stays on the origination-fees skill). Runs
  scripts/regulation_z_apr.js and reads --json. Does not cover interest-only,
  payment-option, or negative-amortization loans.
---

# Regulation Z APR

This skill is the front end for `regulation_z_apr.js`. It classifies charges only by passing `--charge` flags; it does not classify or solve on its own. Do not use `origination_fees.js` for this APR.

## Ask before answering

Ask, and wait, when any of these is missing:

- the loan amount (note amount in dollars)
- the note rate
- the term in years or months

On an adjustable-rate loan also ask for the initial fixed period, adjustment interval, margin, three caps, lifetime floor, and the index at consummation.

When the user says there is mortgage insurance but does not give a monthly amount, ask for that monthly amount.

If the term is missing, pass `--years 30` and say that the answer uses 30 years because no term was given.

Pass `--price` when the user gave a purchase price so the insurance endpoint can use original value. Write each charge the user named as `--charge kind=dollars` using the kinds the tool accepts. Do not invent a fee, a price, or an index.

Never pass `--round-eighth` unless the user says the note rounds to an eighth. Never pass `--initial-floor` unless the user gave a first-adjustment floor. Never pass `--odd-days` unless the user gives a long first period in days.

## Run the script

Resolve the real directory of this `SKILL.md` first (follow symlinks), then run `scripts/regulation_z_apr.js` in that folder.

```bash
node scripts/regulation_z_apr.js \
  --amount LOAN --rate NOTE_RATE \
  (--years TERM_YEARS | --months TERM_MONTHS) \
  [--price PRICE] \
  [--charge kind=dollars]... \
  [--mi MONTHLY] [--mi-months N] \
  [--odd-days 0-29] \
  [--disclosed-apr APR] \
  [--fixed-years N | --fixed-months N \
    --adjust-months N --margin M --caps I/P/L --floor F \
    --current-index INDEX] \
  [--round-eighth] [--initial-floor F] \
  --json
```

Read `--json`. Money fields are integer cents. `apr_thousandths` is the disclosed APR in thousandths of a percent (7210 is 7.21%). Report the APR with trailing zeros dropped after three decimal places, the way the human summary prints it.

If the script exits non-zero, tell the user the reason on stderr. A negative or zero amount financed is the tool's error; do not replace it.

## Refuse

If the user describes an interest-only, payment-option, or negative-amortization loan, say this calculator only covers a fully amortizing scheduled obligation and do not run the tool.

If the question gives an APR and asks for the prepaid finance charge or points, use the mortgage-origination-fees skill instead.

## Fixture

The published fixed-rate Closing Disclosure sample: note $162,000, rate 3.875%, 30 years, price $180,000, mortgage insurance $82.35 per month with no explicit month count — APR 4.174%, finance charge $118,830.27, 80 months of insurance in the stream.
