'use strict';

// Fixed-rate mortgage amortization.
// The monthly rate is the note rate divided by 12 (30/360). The walk keeps the
// exact payment and exact interest. Extra principal is applied after that
// month's interest. Reported amounts are rounded half up to the cent once, at output.

// Half up to the cent. Do not use Math.round(dollars * 100): Math.round(1.005 * 100) is 100.
function dollarsToCents(dollars) {
  if (!Number.isFinite(dollars)) {
    throw new Error('amount is not a finite number of dollars');
  }
  const negative = dollars < 0;
  const shifted = Number(`${Math.abs(dollars)}e2`);
  if (!Number.isFinite(shifted)) {
    throw new Error('amount could not be rounded to cents');
  }
  const cents = Math.round(shifted);
  if (!Number.isSafeInteger(cents)) {
    throw new Error('amount is too large to store in cents');
  }
  return negative ? -cents : cents;
}

function formatGroupedCents(cents) {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}.${frac}`;
}

function formatPlainCents(cents) {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

function walk(principal, annualPercent, n, extrasByMonth) {
  const r = (annualPercent / 100) / 12;
  const payment = principal * ((r * ((1 + r) ** n)) / (((1 + r) ** n) - 1));
  let balance = principal;
  let interestTotal = 0;
  let extraApplied = 0;
  let extraUnapplied = 0;
  let payoffMonth = n;
  let paidOff = false;
  const rows = [];

  for (let month = 1; month <= n; month += 1) {
    const requestedExtra = extrasByMonth.get(month) || 0;
    if (paidOff) {
      extraUnapplied += requestedExtra;
      rows.push({
        month,
        interest: 0,
        principalApplied: 0,
        remainingPrincipal: 0,
        extraApplied: 0,
        cumulativeInterest: interestTotal,
      });
      continue;
    }

    const interest = balance * r;
    const scheduledPrincipal = payment - interest;
    const finishes = scheduledPrincipal + requestedExtra >= balance || month === n;
    let principalApplied;
    let appliedExtra;
    if (finishes) {
      appliedExtra = Math.min(requestedExtra, balance);
      extraUnapplied += requestedExtra - appliedExtra;
      principalApplied = balance - appliedExtra;
      balance = 0;
      paidOff = true;
      payoffMonth = month;
    } else {
      appliedExtra = requestedExtra;
      principalApplied = scheduledPrincipal;
      balance -= scheduledPrincipal + requestedExtra;
    }
    interestTotal += interest;
    extraApplied += appliedExtra;
    rows.push({
      month,
      interest,
      principalApplied,
      remainingPrincipal: balance,
      extraApplied: appliedExtra,
      cumulativeInterest: interestTotal,
    });
  }

  for (const row of rows) {
    row.remainingInterest = interestTotal - row.cumulativeInterest;
  }

  return {
    payment,
    rows,
    interestTotal,
    extraApplied,
    extraUnapplied,
    payoffMonth,
  };
}

function scheduleRows(actual, baseline, interestSavedCents) {
  const through = baseline.payoffMonth;
  return actual.rows.slice(0, through).map((row, index, list) => {
    const base = baseline.rows[index];
    const last = index === list.length - 1;
    return {
      month: row.month,
      interest_cents: dollarsToCents(row.interest),
      principal_cents: dollarsToCents(row.principalApplied),
      remaining_principal_cents: dollarsToCents(row.remainingPrincipal),
      remaining_interest_cents: dollarsToCents(row.remainingInterest),
      extra_cents: dollarsToCents(row.extraApplied),
      interest_saved_cents: last
        ? interestSavedCents
        : dollarsToCents(base.cumulativeInterest - row.cumulativeInterest),
    };
  });
}

function buildReport(principal, ratePercent, monthCount, extrasByMonth, yearsForJson) {
  const actual = walk(principal, ratePercent, monthCount, extrasByMonth);
  const baseline = walk(principal, ratePercent, monthCount, new Map());
  const interestCents = dollarsToCents(actual.interestTotal);
  const baselineInterestCents = dollarsToCents(baseline.interestTotal);
  const report = {
    amount_cents: dollarsToCents(principal),
    rate_percent: ratePercent,
    months: monthCount,
    monthly_payment_cents: dollarsToCents(actual.payment),
    payoff_month: actual.payoffMonth,
    interest_cents: interestCents,
    extra_applied_cents: dollarsToCents(actual.extraApplied),
    extra_unapplied_cents: dollarsToCents(actual.extraUnapplied),
    baseline: {
      payoff_month: baseline.payoffMonth,
      interest_cents: baselineInterestCents,
    },
    interest_saved_cents: baselineInterestCents - interestCents,
    months_saved: baseline.payoffMonth - actual.payoffMonth,
  };
  if (yearsForJson !== undefined) {
    report.years = yearsForJson;
  }
  report.schedule = scheduleRows(actual, baseline, report.interest_saved_cents);
  return report;
}

module.exports = {
  buildReport,
  dollarsToCents,
  formatGroupedCents,
  formatPlainCents,
};
