'use strict';

// Fixed-rate and fixed-then-adjusting (ARM) mortgage amortization.
// The monthly rate is the note rate divided by 12 (30/360). The walk keeps the
// exact payment and exact interest. Extra principal is applied after that
// month's interest. Reported amounts are rounded half up to the cent once, at output.

const fs = require('node:fs');
const {
  buildReport,
  dollarsToCents,
  formatGroupedCents,
  formatPlainCents,
} = require('./amortize.js');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
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
    'fixed-years': undefined,
    'fixed-months': undefined,
    'adjust-months': undefined,
    margin: undefined,
    caps: undefined,
    floor: undefined,
    'initial-floor': undefined,
    'round-eighth': false,
    index: undefined,
  };
  const seen = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json' || token === '--schedule' || token === '--round-eighth') {
      if (seen.has(token)) fail(`duplicate argument: ${token}`);
      seen.add(token);
      opts[token.slice(2)] = true;
      continue;
    }
    if (
      token === '--amount' || token === '--rate' || token === '--years'
      || token === '--months' || token === '--extra' || token === '--fixed-years'
      || token === '--fixed-months' || token === '--adjust-months' || token === '--margin'
      || token === '--caps' || token === '--floor' || token === '--initial-floor'
      || token === '--index'
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

const PERCENT_PATTERN = /^\d+(?:\.\d{1,3})?$/;

function percentToThousandths(text) {
  const [whole, fraction = ''] = text.split('.');
  const thousandths = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  return Number.isSafeInteger(thousandths) ? thousandths : undefined;
}

function parsePercentFlag(text, flag, description) {
  const thousandths = PERCENT_PATTERN.test(text) ? percentToThousandths(text) : undefined;
  if (thousandths === undefined) {
    fail(`invalid ${flag}: ${description} must be a percent with at most three decimal places`);
  }
  return thousandths;
}

function parseCaps(text) {
  const parts = text.split('/');
  const names = ['initial', 'periodic', 'lifetime'];
  const message = 'invalid --caps: must be three percents joined by / (initial/periodic/lifetime), each with at most three decimal places';
  if (parts.length !== 3) fail(message);
  const values = parts.map((part) => (PERCENT_PATTERN.test(part) ? percentToThousandths(part) : undefined));
  if (values.some((value) => value === undefined)) fail(message);
  return Object.fromEntries(names.map((name, i) => [name, values[i]]));
}

function loadIndex(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    fail(`cannot read --index file: ${error && error.code ? error.code : 'error'}`);
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  if (lines.length === 0 || lines[0] !== 'month,index') {
    fail('invalid --index: header must be month,index');
  }
  const index = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const rowNumber = i + 1;
    if (line === '') fail(`invalid --index: row ${rowNumber} is empty`);
    const parts = line.split(',');
    if (parts.length !== 2) {
      fail(`invalid --index: row ${rowNumber} must have columns month and index`);
    }
    const [monthText, indexText] = parts;
    const month = /^\d+$/.test(monthText) ? Number(monthText) : NaN;
    if (!Number.isSafeInteger(month)) {
      fail(`invalid --index: month on row ${rowNumber} must be an integer payment number`);
    }
    const thousandths = PERCENT_PATTERN.test(indexText) ? percentToThousandths(indexText) : undefined;
    if (thousandths === undefined) {
      fail(`invalid --index: index on row ${rowNumber} must be a percent with at most three decimal places`);
    }
    if (index.has(month)) {
      fail(`invalid --index: month ${month} on row ${rowNumber} is a duplicate`);
    }
    index.set(month, thousandths);
  }
  return index;
}

const ARM_FLAGS = [
  'fixed-years', 'fixed-months', 'adjust-months', 'margin', 'caps', 'floor',
  'initial-floor', 'round-eighth', 'index',
];

function armModeOn(opts) {
  return ARM_FLAGS.some((name) => (name === 'round-eighth' ? opts[name] : opts[name] !== undefined));
}

function resolveArm(opts, monthCount) {
  const hasYears = opts['fixed-years'] !== undefined;
  const hasMonths = opts['fixed-months'] !== undefined;
  if (hasYears && hasMonths) {
    fail('exactly one of --fixed-years or --fixed-months is required');
  }
  const missing = [];
  if (!hasYears && !hasMonths) missing.push('--fixed-years or --fixed-months');
  if (opts['adjust-months'] === undefined) missing.push('--adjust-months');
  if (opts.margin === undefined) missing.push('--margin');
  if (opts.caps === undefined) missing.push('--caps');
  if (opts.floor === undefined) missing.push('--floor');
  if (missing.length > 0) {
    fail(`missing required ARM argument: ${missing.join(', ')}`);
  }

  const fixedMonths = hasYears
    ? parsePositiveTerm(opts['fixed-years'], '--fixed-years') * 12
    : parsePositiveTerm(opts['fixed-months'], '--fixed-months');
  const adjustMonths = parsePositiveTerm(opts['adjust-months'], '--adjust-months');
  const marginThousandths = parsePercentFlag(opts.margin, '--margin', 'margin');
  const caps = parseCaps(opts.caps);
  const floorThousandths = parsePercentFlag(opts.floor, '--floor', 'floor');
  const initialFloorThousandths = opts['initial-floor'] === undefined
    ? floorThousandths
    : parsePercentFlag(opts['initial-floor'], '--initial-floor', 'first adjustment floor');
  const indexByMonth = opts.index === undefined ? new Map() : loadIndex(opts.index);
  return {
    fixedMonths,
    adjustMonths,
    marginThousandths,
    initialCapThousandths: caps.initial,
    periodicCapThousandths: caps.periodic,
    lifetimeCapThousandths: caps.lifetime,
    floorThousandths,
    initialFloorThousandths,
    roundEighth: opts['round-eighth'],
    indexByMonth,
  };
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

function percentText(percent) {
  return String(percent);
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
  if (report.arm) {
    lines.push(
      `Initial rate: ${percentText(report.rate_percent)}%`,
      `Highest rate: ${percentText(report.arm.max_rate_percent)}% (from month ${report.arm.max_rate_month})`,
      `Highest payment: ${formatGroupedCents(report.arm.max_payment_cents)} (from month ${report.arm.max_payment_month})`,
      `Adjustments: ${report.arm.adjustments.length}`,
    );
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

function printScheduleCsv(schedule, arm) {
  const lines = [
    arm
      ? 'month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved,rate,payment,index'
      : 'month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved',
  ];
  for (const row of schedule) {
    const columns = [
      row.month,
      formatPlainCents(row.interest_cents),
      formatPlainCents(row.principal_cents),
      formatPlainCents(row.remaining_principal_cents),
      formatPlainCents(row.remaining_interest_cents),
      formatPlainCents(row.extra_cents),
      formatPlainCents(row.interest_saved_cents),
    ];
    if (arm) {
      columns.push(
        percentText(row.rate_percent),
        formatPlainCents(row.payment_cents),
        row.index_percent === null ? '' : percentText(row.index_percent),
      );
    }
    lines.push(columns.join(','));
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
  const arm = armModeOn(opts) ? resolveArm(opts, monthCount) : undefined;
  const extras = opts.extra === undefined ? new Map() : loadExtras(opts.extra, monthCount);
  const report = buildReport(principal, ratePercent, monthCount, extras, yearsForJson, arm);

  if (opts.json) {
    const payload = { ...report };
    if (!opts.schedule) delete payload.schedule;
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }
  if (opts.schedule) {
    printScheduleCsv(report.schedule, Boolean(report.arm));
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
