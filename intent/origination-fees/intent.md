# intent.md — Origination fees

| | |
|---|---|
| Author | Nikolay Botev |
| Captured | 2026-10-06 |
| Status | Draft |
| Stage | 1 · Plan |
| Feeds | [spec.md](spec.md) → [plan.md](plan.md) |
| Builds on | [../mortgage-skill/intent.md](../mortgage-skill/intent.md) |

## Problem

The amortization skill answers a fixed payment, extra principal, and a recast. It does not answer what a lender's APR implies was charged up front. A note rate and an APR, plus a loan amount or a price and down payment, are enough to recover that prepaid finance charge, and a hand calculation that rounds the payment first reports the wrong cents.

## Proposed outcome

A person can ask, in ordinary language, what fees, points, or lender credit a fixed mortgage's note rate and APR imply. The loan can be named as an amount, or as a purchase price with a down payment in dollars or a percent. Missing rate, APR, or loan size is asked for before any number is given. The charge comes from a calculator, not from discounting the payments in the chat.

## Affected users and systems

- **Users:** The owner, comparing a quoted note rate and APR. Anyone who runs the script from the repo.
- **Systems:** A new `origination_fees.js`. A skill at `.agents/skills/mortgage-origination-fees/`, linked from the workspace `.agents/skills/` the same way the amortization skill is linked. The amortization calculator and its skill stay the place for payment, interest, and recast questions.

## Constraints and principles

- The skill is a front end for the script. The charge comes from running the script.
- The payment is the same note-rate payment the amortization calculator already uses. Reported money is rounded once, at output.
- A "net rate" in the question is the note rate.
- Ask for a missing note rate, APR, or loan size. Do not fill them in.
- The number is the prepaid finance charge implied by the APR. It is not a closing-cost worksheet.

## Open questions (carried into spec.md)

None. The design choices made while drafting are D1–D9 in [spec.md](spec.md).

## Original prompt (verbatim)

````
write a skill in the compound repo to calculate the fees for a mortgage origination given the net rate, the APR and the loan amount (or purchase price and downpayment amount or percent). here is what another agent gave me as a formula:

```python
# Verify the APR to fees formula
def calculate_fees(P, r_note, r_apr, years=30):
    n = years * 12
    i_note = r_note / 12 / 100
    i_apr = r_apr / 12 / 100
    
    # Monthly payment from note rate
    M = P * (i_note * (1 + i_note)**n) / ((1 + i_note)**n - 1)
    
    # Present value of payments discounted at APR
    P_net = M * (1 - (1 + i_apr)**(-n)) / i_apr
    
    # Fees = Original Loan - Net Loan Amount
    fees = P - P_net
    return M, P_net, fees

# Test with Tomo: Rate = 6.75%, APR = 7.21%, Payment = $3,888
# Let's see what loan amount gives M = 3888 at 6.75%
r_tomo = 6.75
apr_tomo = 7.21
i_tomo = r_tomo / 12 / 100
n = 360
# 3888 = P * (i * (1+i)^n) / ((1+i)^n - 1)
P_tomo = 3888 / ((i_tomo * (1 + i_tomo)**n) / ((1 + i_tomo)**n - 1))
print(f"Implied Loan Amount for Tomo: {P_tomo:.2f}")

M, P_net, fees = calculate_fees(P_tomo, r_tomo, apr_tomo)
print(f"Monthly payment: {M:.2f}")
print(f"P_net: {P_net:.2f}")
print(f"Fees implied: {fees:.2f}")
print(f"Fees as % of loan (points): {fees / P_tomo * 100:.3f}%")


```

```text
Implied Loan Amount for Tomo: 599446.72
Monthly payment: 3888.00
P_net: 572214.66
Fees implied: 27232.06
Fees as % of loan (points): 4.543%


```

You cannot calculate the fees using *only* the loan amount and the note rate—you must also have the **APR** to solve the equation. The APR is the mathematical key that allows you to reverse-engineer exactly how much cash they are hiding.

Here is the exact algebra to strip away the smoke and mirrors and calculate the hidden fees ($F$).

### The Variables

* **$P$** = Original Loan Amount
* **$r_{note}$** = Note Rate (expressed as a decimal, e.g., 0.0675)
* **$r_{APR}$** = APR (expressed as a decimal, e.g., 0.0721)
* **$n$** = Total number of months (360 for a 30-year fixed)

---

### Step 1: Calculate the Monthly Payment ($M$)

First, calculate the standard Principal & Interest payment using the Note Rate:


$$M = P \times \frac{\frac{r_{note}}{12}}{1 - \left(1 + \frac{r_{note}}{12}\right)^{-n}}$$

### Step 2: Calculate the "Net Loan Amount" ($P_{net}$)

The APR is mathematically defined as the discount rate that makes the present value of all 360 of your payments equal to the Net Loan Amount. To reverse-engineer this, you take the monthly payment ($M$) and discount it backwards using the APR:


$$P_{net} = M \times \frac{1 - \left(1 + \frac{r_{APR}}{12}\right)^{-n}}{\frac{r_{APR}}{12}}$$

### Step 3: Extract the Hidden Fees ($F$)

The fees are simply the difference between the face value of the loan and the Net Loan Amount you just calculated:


$$F = P - P_{net}$$

---

### The Single Master Formula

If you want to plug it all into a single calculator line:


$$F = P - \left[ P \times \left( \frac{\frac{r_{note}}{12}}{1 - \left(1 + \frac{r_{note}}{12}\right)^{-n}} \right) \times \left( \frac{1 - \left(1 + \frac{r_{APR}}{12}\right)^{-n}}{\frac{r_{APR}}{12}} \right) \right]$$

### The Formula in Action (The Tomo Screenshot)

Let's apply this exact math to the **Tomo Mortgage** quote from your Bankrate screenshot to see exactly what they are doing.

* **Note Rate:** 6.750% ($r_{note} = 0.0675$)
* **APR:** 7.210% ($r_{APR} = 0.0721$)
* **Assumed Loan:** $600,000 ($P = 600000$)

**1. The Payment:**


$$M = 600000 \times \frac{0.005625}{1 - (1.005625)^{-360}} = \mathbf{\$3,891.53}$$

**2. The Net Loan Amount:**


$$P_{net} = 3891.53 \times \frac{1 - (1.006008)^{-360}}{0.006008} = \mathbf{\$572,742.66}$$

**3. The Hidden Fees:**


$$F = \$600,000 - \$572,742.66 = \mathbf{\$27,257.34}$$

By running their advertised numbers through the federally mandated formula, you can prove that Tomo's "low" 6.75% rate is actually a mirage built on charging you over **$27,000 in hidden discount points and origination fees** (roughly 4.5 points) upfront.
````
