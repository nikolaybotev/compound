'use strict';

// Fixed-rate mortgage amortization.
// The monthly rate is the note rate divided by 12 (30/360). The walk keeps the
// exact payment and exact interest. Extra principal is applied after that
// month's interest. Reported amounts are rounded half up to the cent once, at output.

const fs = require('node:fs');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

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

function parseArgs(argv) {
  const opts = {
    amount: undefined,
    rate: undefined,
    years: undefined,
    months: undefined,
    extra: undefined,
    json: false,
    schedule: false,
  };
  const seen = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json' || token === '--schedule') {
      if (seen.has(token)) fail(`duplicate argument: ${token}`);
      seen.add(token);
      opts[token.slice(2)] = true;
      continue;
    }
    if (
      token === '--amount' || token === '--rate' || token === '--years'
      || token === '--months' || token === '--extra'
    ) {
      if (seen.has(token)) fail(`duplicate argument: ${token}`);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('-')) {
        fail(`missing value for ${token}`);
      }
      seen.add(token);
      opts[token.slice(2)] = value;
      i += 1;
      continue;
    }
    fail(`unknown argument: ${token}`);
  }
  return opts;
}

function parseAmount(text) {
  if (text === undefined) fail('missing required argument: --amount');
  if (!/^(?:\d+)(?:\.\d+)?$/.test(text)) {
    fail('invalid --amount: principal must be a number of dollars greater than zero');
  }
  const amount = Number(text);
  if (!(amount > 0)) {
    fail('invalid --amount: principal must be a number of dollars greater than zero');
  }
  return amount;
}

function parseRate(text) {
  if (text === undefined) fail('missing required argument: --rate');
  if (!/^(?:\d+)(?:\.\d{1,3})?$/.test(text)) {
    fail('invalid --rate: note rate must be a percent greater than zero with at most three decimal places');
  }
  const rate = Number(text);
  if (!(rate > 0)) {
    fail('invalid --rate: note rate must be a percent greater than zero with at most three decimal places');
  }
  return rate;
}

function loadExtras(filePath, monthCount) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    fail(`cannot read --extra file: ${error && error.code ? error.code : 'error'}`);
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  if (lines.length === 0 || lines[0] !== 'month,extra') {
    fail('invalid --extra: header must be month,extra');
  }
  const extras = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const rowNumber = i + 1;
    if (line === '') fail(`invalid --extra: row ${rowNumber} is empty`);
    const parts = line.split(',');
    if (parts.length !== 2) {
      fail(`invalid --extra: row ${rowNumber} must have columns month and extra`);
    }
    const [monthText, extraText] = parts;
    if (!/^\d+$/.test(monthText)) {
      fail(`invalid --extra: month on row ${rowNumber} must be an integer from 1 through ${monthCount}`);
    }
    const month = Number(monthText);
    if (!Number.isSafeInteger(month) || month < 1 || month > monthCount) {
      fail(`invalid --extra: month on row ${rowNumber} must be an integer from 1 through ${monthCount}`);
    }
    if (!/^\d+(?:\.\d+)?$/.test(extraText)) {
      fail(`invalid --extra: extra on row ${rowNumber} must be a positive dollar amount`);
    }
    const extra = Number(extraText);
    if (!(extra > 0)) {
      fail(`invalid --extra: extra on row ${rowNumber} must be a positive dollar amount`);
    }
    extras.set(month, (extras.get(month) || 0) + extra);
  }
  return extras;
}

function parsePositiveTerm(text, flag) {
  if (!/^[1-9]\d*$/.test(text)) {
    fail(`invalid ${flag}: term must be a positive integer`);
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value)) {
    fail(`invalid ${flag}: term must be a positive integer`);
  }
  return value;
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

function resolveTerm(opts) {
  const hasYears = opts.years !== undefined;
  const hasMonths = opts.months !== undefined;
  if (hasYears && hasMonths) {
    fail('exactly one of --years or --months is required');
  }
  if (!hasYears && !hasMonths) {
    fail('exactly one of --years or --months is required');
  }
  if (hasYears) {
    const years = parsePositiveTerm(opts.years, '--years');
    return { monthCount: years * 12, yearsForJson: years };
  }
  const months = parsePositiveTerm(opts.months, '--months');
  return { monthCount: months, yearsForJson: undefined };
}

function printSummary(report) {
  const lines = [
    `Monthly payment: ${formatGroupedCents(report.monthly_payment_cents)}`,
    `Payoff month: ${report.payoff_month}`,
    `Total interest: ${formatGroupedCents(report.interest_cents)}`,
    `Extra applied: ${formatGroupedCents(report.extra_applied_cents)}`,
    `Extra unapplied: ${formatGroupedCents(report.extra_unapplied_cents)}`,
    `Interest saved: ${formatGroupedCents(report.interest_saved_cents)}`,
    `Months saved: ${report.months_saved}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function printScheduleCsv(schedule) {
  const lines = [
    'month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved',
  ];
  for (const row of schedule) {
    lines.push([
      row.month,
      formatPlainCents(row.interest_cents),
      formatPlainCents(row.principal_cents),
      formatPlainCents(row.remaining_principal_cents),
      formatPlainCents(row.remaining_interest_cents),
      formatPlainCents(row.extra_cents),
      formatPlainCents(row.interest_saved_cents),
    ].join(','));
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

function runCli(argv) {
  const opts = parseArgs(argv);
  if (
    opts.amount === undefined && opts.rate === undefined
    && opts.years === undefined && opts.months === undefined
  ) {
    fail('missing required argument: --amount, --rate, --years, and --months');
  }

  const missing = [];
  if (opts.amount === undefined) missing.push('--amount');
  if (opts.rate === undefined) missing.push('--rate');
  if (missing.length > 0) {
    fail(`missing required argument: ${missing.join(', ')}`);
  }

  const principal = parseAmount(opts.amount);
  const ratePercent = parseRate(opts.rate);
  const { monthCount, yearsForJson } = resolveTerm(opts);
  const extras = opts.extra === undefined ? new Map() : loadExtras(opts.extra, monthCount);
  const report = buildReport(principal, ratePercent, monthCount, extras, yearsForJson);

  if (opts.json) {
    const payload = { ...report };
    if (!opts.schedule) delete payload.schedule;
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }
  if (opts.schedule) {
    printScheduleCsv(report.schedule);
    return;
  }
  printSummary(report);
}

function main() {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    fail(error && error.message ? error.message : String(error));
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  dollarsToCents,
};
