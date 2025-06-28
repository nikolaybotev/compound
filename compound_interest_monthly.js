// Brute force compound interest loan payment calculator

// Inputs
let amount = 855_000 // dollars
let interest = 6.99 // percent per year
let term = 30 // years

// Utilities
function amt(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Monthly Payment
let monthly_interest = (interest / 12) / 100
let no_of_payments = term * 12
// See https://www.bankrate.com/mortgages/amortization-calculator/#how-to-calculate
let monthly_payment = Math.ceil(amount * (
    (monthly_interest * (1 + monthly_interest) ** no_of_payments) /
    ((1 + monthly_interest) ** no_of_payments - 1)
))
console.log("Computed monthly payment ", amt(monthly_payment))

// Calculate  Payments
let interest_paid = 0;
let principal_paid = 0;
let principal_left = amount;
let interest_acc = 0;
for (let year = 0; year < term; year += 1) {
    console.log("YEAR ", year, " START");

    for (let month = 0; month < 12; month += 1) {
        if (interest_acc > 0) {
            // payment
            let payment_interest = interest_acc;
            let payment_principal = monthly_payment - payment_interest;
            console.log("  PAYMENT on YEAR ", year, " MONTH ", month, " interest " + amt(payment_interest) + " principal " + amt(payment_principal));

            // update statistics
            interest_paid += payment_interest;
            principal_paid += payment_principal;
            principal_left -= payment_principal;

            // reset interest compounding
            interest_acc = 0;
        }

        // Extra payment on the first month
        // if (year == 0 && month == 1) {
        //     principal_paid += 45;
        //     principal_left -= 45;
        // }

        // Interet compounds monthly
        interest_acc += monthly_interest * (principal_left + interest_acc);
    }

    console.log("YEAR ", year, " SUMMARY");
    console.log("Interest Paid ", amt(interest_paid));
    console.log("Principal Paid ", amt(principal_paid));
    console.log("Principal Left ", amt(principal_left));
    console.log("");
}
