'use strict';

// Prepaid finance charge implied by a fixed-rate mortgage APR.
// The monthly payment is the note-rate payment from amortize.js.
// The amount financed is the present value of that level payment, discounted
// at the APR. The finance charge is the note amount minus the amount financed.
// Both rates are nominal annual rates divided by 12 (30/360). The first
// payment is one full month out, and there is no other periodic finance charge.
// Reported amounts are rounded half up to the cent once, at output.
// The reported note amount equals the amount financed plus the finance charge.

const {
  dollarsToCents,
  formatGroupedCents,
} = require('./amortize.js');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    amount: undefined,
    price: undefined,
    down: undefined,
    downPercent: undefined,
    rate: undefined,
    apr: undefined,
    years: undefined,
    months: undefined,
    json: false,
  };
  const valued = {
    '--amount': 'amount',
    '--price': 'price',
    '--down': 'down',
    '--down-percent': 'downPercent',
    '--rate': 'rate',
    '--apr': 'apr',
    '--years': 'years',
    '--months': 'months',
  };
  const seen = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') {
      if (seen.has(token)) fail(`duplicate argument: ${token}`);
      seen.add(token);
      opts.json = true;
      continue;
    }
    const key = valued[token];
    if (key === undefined) fail(`unknown argument: ${token}`);
    if (seen.has(token)) fail(`duplicate argument: ${token}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('-')) {
      fail(`missing value for ${token}`);
    }
    seen.add(token);
    opts[key] = value;
    i += 1;
  }
  return opts;
}

function parsePositiveDollars(text, flag, label) {
  if (text === undefined) fail(`missing required argument: ${flag}`);
  if (!/^(?:\d+)(?:\.\d+)?$/.test(text)) {
    fail(`invalid ${flag}: ${label} must be a number of dollars greater than zero`);
  }
  const amount = Number(text);
  if (!(amount > 0)) {
    fail(`invalid ${flag}: ${label} must be a number of dollars greater than zero`);
  }
  return amount;
}

function parseDownDollars(text) {
  if (text === undefined) fail('missing required argument: --down');
  if (!/^(?:\d+)(?:\.\d+)?$/.test(text)) {
    fail('invalid --down: down payment must be a number of dollars, zero or greater');
  }
  const amount = Number(text);
  if (!(amount >= 0)) {
    fail('invalid --down: down payment must be a number of dollars, zero or greater');
  }
  return amount;
}

function parseRate(text, flag, label) {
  if (text === undefined) fail(`missing required argument: ${flag}`);
  if (!/^(?:\d+)(?:\.\d{1,3})?$/.test(text)) {
    fail(`invalid ${flag}: ${label} must be a percent greater than zero with at most three decimal places`);
  }
  const rate = Number(text);
  if (!(rate > 0)) {
    fail(`invalid ${flag}: ${label} must be a percent greater than zero with at most three decimal places`);
  }
  return rate;
}

function parseDownPercent(text) {
  if (text === undefined) fail('missing required argument: --down-percent');
  if (!/^(?:\d+)(?:\.\d{1,3})?$/.test(text)) {
    fail('invalid --down-percent: down payment percent must be at least 0 and less than 100, with at most three decimal places');
  }
  const percent = Number(text);
  if (!(percent >= 0) || percent >= 100) {
    fail('invalid --down-percent: down payment percent must be at least 0 and less than 100, with at most three decimal places');
  }
  return percent;
}

function percentThousandths(text) {
  const [whole, fraction = ''] = text.split('.');
  return (Number(whole) * 1000) + Number((`${fraction}000`).slice(0, 3));
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

function resolveTerm(opts) {
  const hasYears = opts.years !== undefined;
  const hasMonths = opts.months !== undefined;
  if (hasYears === hasMonths) {
    fail('exactly one of --years or --months is required');
  }
  if (hasYears) {
    const years = parsePositiveTerm(opts.years, '--years');
    return { monthCount: years * 12, yearsForJson: years };
  }
  return { monthCount: parsePositiveTerm(opts.months, '--months'), yearsForJson: undefined };
}

function halfUpQuotient(numerator, denominator) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error('amount could not be rounded');
  }
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  if (remainder * 2 >= denominator) return quotient + 1;
  return quotient;
}

function loanFromPrice(opts) {
  const hasAmount = opts.amount !== undefined;
  const hasPrice = opts.price !== undefined;
  const hasDown = opts.down !== undefined;
  const hasDownPercent = opts.downPercent !== undefined;
  if (hasAmount && (hasPrice || hasDown || hasDownPercent)) {
    fail('--amount cannot be combined with --price, --down, or --down-percent');
  }
  if (hasDown && hasDownPercent) {
    fail('exactly one of --down or --down-percent may be used with --price');
  }
  if ((hasDown || hasDownPercent) && !hasPrice) {
    fail('--price is required with --down or --down-percent');
  }
  if (!hasAmount && !hasPrice) {
    fail('missing required argument: --amount or --price');
  }
  if (hasAmount) {
    const principal = parsePositiveDollars(opts.amount, '--amount', 'principal');
    return {
      principal,
      amountCents: dollarsToCents(principal),
    };
  }
  if (!hasDown && !hasDownPercent) {
    fail('--price requires --down or --down-percent');
  }
  const price = parsePositiveDollars(opts.price, '--price', 'purchase price');
  const priceCents = dollarsToCents(price);
  let amountCents;
  let downCents;
  let downPercent;
  if (hasDown) {
    downCents = dollarsToCents(parseDownDollars(opts.down));
    if (downCents >= priceCents) {
      fail('invalid --down: down payment must be less than the purchase price');
    }
    amountCents = priceCents - downCents;
  } else {
    parseDownPercent(opts.downPercent);
    downPercent = Number(opts.downPercent);
    const thousandths = percentThousandths(opts.downPercent);
    if (!Number.isSafeInteger(priceCents) || priceCents > Math.floor(Number.MAX_SAFE_INTEGER / 100000)) {
      fail('invalid --price: purchase price is too large');
    }
    amountCents = halfUpQuotient(priceCents * (100000 - thousandths), 100000);
    if (!(amountCents > 0)) {
      fail('invalid --down-percent: down payment must leave a positive loan amount');
    }
  }
  return {
    principal: amountCents / 100,
    amountCents,
    priceCents,
    downCents,
    downPercent,
  };
}

function levelPayment(principal, annualPercent, monthCount) {
  const monthly = (annualPercent / 100) / 12;
  return principal * ((monthly * ((1 + monthly) ** monthCount)) / (((1 + monthly) ** monthCount) - 1));
}

function presentValue(payment, aprPercent, monthCount) {
  const monthly = (aprPercent / 100) / 12;
  return payment * (1 - ((1 + monthly) ** (-monthCount))) / monthly;
}

function pointsThousandths(financeChargeCents, amountCents) {
  const negative = financeChargeCents < 0;
  const scaled = Math.abs(financeChargeCents) * 100000;
  if (!Number.isSafeInteger(scaled)) {
    throw new Error('amount could not be rounded');
  }
  const rounded = halfUpQuotient(scaled, amountCents);
  return negative ? -rounded : rounded;
}

function buildFeeReport(loan, ratePercent, aprPercent, monthCount, yearsForJson) {
  const payment = levelPayment(loan.principal, ratePercent, monthCount);
  const financed = presentValue(payment, aprPercent, monthCount);
  const amountFinancedCents = dollarsToCents(financed);
  const financeChargeCents = loan.amountCents - amountFinancedCents;
  const report = {
    amount_cents: loan.amountCents,
  };
  if (loan.priceCents !== undefined) report.price_cents = loan.priceCents;
  if (loan.downCents !== undefined) report.down_payment_cents = loan.downCents;
  if (loan.downPercent !== undefined) report.down_percent = loan.downPercent;
  report.rate_percent = ratePercent;
  report.apr_percent = aprPercent;
  report.months = monthCount;
  if (yearsForJson !== undefined) report.years = yearsForJson;
  report.monthly_payment_cents = dollarsToCents(payment);
  report.amount_financed_cents = amountFinancedCents;
  report.finance_charge_cents = financeChargeCents;
  report.points_thousandths = pointsThousandths(financeChargeCents, loan.amountCents);
  return report;
}

function formatPoints(thousandths) {
  const negative = thousandths < 0;
  const abs = Math.abs(thousandths);
  const whole = Math.trunc(abs / 1000);
  const fraction = String(abs % 1000).padStart(3, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}%`;
}

function printSummary(report) {
  const lines = [
    `Loan amount: ${formatGroupedCents(report.amount_cents)}`,
  ];
  if (report.price_cents !== undefined) {
    lines.push(`Purchase price: ${formatGroupedCents(report.price_cents)}`);
  }
  if (report.down_payment_cents !== undefined) {
    lines.push(`Down payment: ${formatGroupedCents(report.down_payment_cents)}`);
  }
  if (report.down_percent !== undefined) {
    lines.push(`Down payment percent: ${report.down_percent}%`);
  }
  lines.push(
    `Note rate: ${report.rate_percent}%`,
    `APR: ${report.apr_percent}%`,
    `Months: ${report.months}`,
  );
  if (report.years !== undefined) lines.push(`Years: ${report.years}`);
  lines.push(
    `Monthly payment: ${formatGroupedCents(report.monthly_payment_cents)}`,
    `Amount financed: ${formatGroupedCents(report.amount_financed_cents)}`,
  );
  if (report.finance_charge_cents < 0) {
    lines.push(`Lender credit: ${formatGroupedCents(-report.finance_charge_cents)}`);
  } else {
    lines.push(`Prepaid finance charge: ${formatGroupedCents(report.finance_charge_cents)}`);
  }
  lines.push(`Points: ${formatPoints(report.points_thousandths)}`);
  process.stdout.write(`${lines.join('\n')}\n`);
}

function bareInvocation(opts) {
  return opts.amount === undefined && opts.price === undefined
    && opts.down === undefined && opts.downPercent === undefined
    && opts.rate === undefined && opts.apr === undefined
    && opts.years === undefined && opts.months === undefined;
}

function runCli(argv) {
  const opts = parseArgs(argv);
  if (bareInvocation(opts)) {
    fail('missing required argument: --amount or --price, --rate, --apr, --years, and --months');
  }
  const loan = loanFromPrice(opts);
  const ratePercent = parseRate(opts.rate, '--rate', 'note rate');
  const aprPercent = parseRate(opts.apr, '--apr', 'APR');
  const { monthCount, yearsForJson } = resolveTerm(opts);
  const report = buildFeeReport(loan, ratePercent, aprPercent, monthCount, yearsForJson);
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
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
  buildFeeReport,
  pointsThousandths,
};
