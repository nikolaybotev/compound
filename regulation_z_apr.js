'use strict';

const {
  buildAprReport,
  classifyCharges,
  disclosedAprThousandths,
  formatAprPercent,
  withinTolerance,
} = require('./apr.js');
const { dollarsToCents, formatGroupedCents } = require('./amortize.js');

const PREPAID_AND_EXCLUDED_KINDS = new Set([
  'points',
  'lender-fee',
  'prepaid-interest',
  'mortgage-insurance-premium',
  'application-fee',
  'appraisal',
  'credit-report',
  'flood',
  'tax-service',
  'title',
  'survey',
  'document-preparation',
  'notary',
  'recording',
  'transfer-tax',
  'property-insurance',
  'property-tax',
  'escrow',
  'pest',
  'owners-title',
  'lender-credit',
]);

const PERCENT_PATTERN = /^(?:\d+)(?:\.\d{1,3})?$/;
const DOLLAR_PATTERN = /^(?:\d+)(?:\.\d{1,2})?$/;

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
    price: undefined,
    charges: [],
    mi: undefined,
    'mi-months': undefined,
    'odd-days': undefined,
    'disclosed-apr': undefined,
    json: false,
    'fixed-years': undefined,
    'fixed-months': undefined,
    'adjust-months': undefined,
    margin: undefined,
    caps: undefined,
    floor: undefined,
    'initial-floor': undefined,
    'round-eighth': false,
    'current-index': undefined,
  };
  const booleanFlags = new Set(['--json', '--round-eighth']);
  const repeatable = new Set(['--charge']);
  const valued = new Set([
    '--amount', '--rate', '--years', '--months', '--price', '--charge',
    '--mi', '--mi-months', '--odd-days', '--disclosed-apr',
    '--fixed-years', '--fixed-months', '--adjust-months', '--margin', '--caps',
    '--floor', '--initial-floor', '--current-index',
  ]);
  const seen = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (booleanFlags.has(token)) {
      if (seen.has(token)) fail(`duplicate argument: ${token}`);
      seen.add(token);
      opts[token.slice(2)] = true;
      continue;
    }
    if (repeatable.has(token)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('-')) {
        fail(`missing value for ${token}`);
      }
      opts.charges.push(value);
      i += 1;
      continue;
    }
    if (valued.has(token)) {
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

function parseRate(text, flag, label) {
  if (text === undefined) fail(`missing required argument: ${flag}`);
  if (!PERCENT_PATTERN.test(text)) {
    fail(`invalid ${flag}: ${label} must be a percent greater than zero with at most three decimal places`);
  }
  const rate = Number(text);
  if (!(rate > 0)) {
    fail(`invalid ${flag}: ${label} must be a percent greater than zero with at most three decimal places`);
  }
  return rate;
}

function parseNonNegativeDollars(text, flag) {
  if (!DOLLAR_PATTERN.test(text)) {
    fail(`invalid ${flag}: amount must be a dollar amount greater than or equal to zero, with at most two decimal places`);
  }
  const dollars = Number(text);
  if (!Number.isFinite(dollars) || dollars < 0) {
    fail(`invalid ${flag}: amount must be a dollar amount greater than or equal to zero, with at most two decimal places`);
  }
  return dollars;
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

const ARM_FLAG_NAMES = [
  'fixed-years', 'fixed-months', 'adjust-months', 'margin', 'caps', 'floor',
  'initial-floor', 'round-eighth', 'current-index',
];

function armModeOn(opts) {
  if (opts['current-index'] !== undefined) return true;
  return ARM_FLAG_NAMES.some((name) => {
    if (name === 'round-eighth') return opts[name] === true;
    if (name === 'current-index') return opts[name] !== undefined;
    return opts[name] !== undefined;
  });
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
  if (opts['current-index'] === undefined) missing.push('--current-index');
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

  return {
    arm: {
      fixedMonths,
      adjustMonths,
      marginThousandths,
      initialCapThousandths: caps.initial,
      periodicCapThousandths: caps.periodic,
      lifetimeCapThousandths: caps.lifetime,
      floorThousandths,
      initialFloorThousandths,
      roundEighth: opts['round-eighth'],
      indexByMonth: new Map(),
    },
    currentIndexThousandths: parsePercentFlag(opts['current-index'], '--current-index', 'current index'),
  };
}

function parseCharge(text) {
  const eq = text.indexOf('=');
  if (eq <= 0 || eq === text.length - 1) {
    fail('invalid --charge: must be kind=dollars');
  }
  const kind = text.slice(0, eq);
  const dollarsText = text.slice(eq + 1);
  if (!PREPAID_AND_EXCLUDED_KINDS.has(kind)) {
    fail('unknown finance-charge kind');
  }
  const dollars = parseNonNegativeDollars(dollarsText, '--charge');
  return { cents: dollarsToCents(dollars), kind };
}

function parseOddDays(text) {
  if (text === undefined) return 0;
  if (!/^(?:\d+)$/.test(text) || Number(text) > 29) {
    fail('invalid --odd-days: must be an integer from 0 through 29');
  }
  return Number(text);
}

function formatTolerance(toleranceThousandths) {
  if (toleranceThousandths === 125) return '0.125%';
  if (toleranceThousandths === 250) return '0.25%';
  return formatAprPercent(toleranceThousandths);
}

function bareInvocation(opts) {
  return opts.amount === undefined && opts.rate === undefined
    && opts.years === undefined && opts.months === undefined;
}

function buildCliReport(opts) {
  const principal = parsePositiveDollars(opts.amount, '--amount', 'principal');
  const ratePercent = parseRate(opts.rate, '--rate', 'note rate');
  const { monthCount, yearsForJson } = resolveTerm(opts);

  let priceCents;
  if (opts.price !== undefined) {
    priceCents = dollarsToCents(parsePositiveDollars(opts.price, '--price', 'purchase price'));
  }

  const charges = opts.charges.map(parseCharge);
  const { prepaid_finance_charge_cents: prepaidCents } = classifyCharges(charges);

  let miCents = 0;
  let miMonthsOpt;
  if (opts.mi !== undefined) {
    miCents = dollarsToCents(parseNonNegativeDollars(opts.mi, '--mi'));
    if (opts['mi-months'] !== undefined) {
      if (!(miCents > 0)) fail('--mi-months requires --mi greater than zero');
      miMonthsOpt = parsePositiveTerm(opts['mi-months'], '--mi-months');
      if (miMonthsOpt > monthCount) {
        fail('invalid --mi-months: must not be greater than the term');
      }
    }
  } else if (opts['mi-months'] !== undefined) {
    fail('--mi-months requires --mi greater than zero');
  }

  const oddDays = parseOddDays(opts['odd-days']);

  let arm;
  let currentIndexThousandths;
  if (armModeOn(opts)) {
    if (opts['current-index'] !== undefined && (
      opts['fixed-years'] === undefined && opts['fixed-months'] === undefined
    )) {
      fail('missing required ARM argument: --fixed-years or --fixed-months, --adjust-months, --margin, --caps, --floor');
    }
    const resolved = resolveArm(opts, monthCount);
    arm = resolved.arm;
    currentIndexThousandths = resolved.currentIndexThousandths;
  } else if (opts['fixed-years'] !== undefined || opts['fixed-months'] !== undefined
    || opts['adjust-months'] !== undefined || opts.margin !== undefined
    || opts.caps !== undefined || opts.floor !== undefined) {
    fail('missing required ARM argument: --current-index');
  }

  const report = buildAprReport(
    principal,
    ratePercent,
    monthCount,
    prepaidCents,
    miCents,
    {
      originalValueCents: priceCents,
      miMonths: miMonthsOpt,
      oddDays,
      arm,
      currentIndexThousandths,
      yearsForJson,
    },
  );

  const json = {
    ...report,
    rate_percent: ratePercent,
    months: monthCount,
  };
  if (yearsForJson !== undefined) json.years = yearsForJson;
  if (priceCents !== undefined) json.price_cents = priceCents;
  if (opts['disclosed-apr'] !== undefined) {
    const disclosed = parseRate(opts['disclosed-apr'], '--disclosed-apr', 'disclosed APR');
    json.disclosed_apr_thousandths = disclosedAprThousandths(String(disclosed));
    json.within_tolerance = withinTolerance(
      report.apr_thousandths,
      json.disclosed_apr_thousandths,
      report.tolerance_thousandths,
    );
  }
  return json;
}

function printSummary(report, disclosedAprText) {
  const lines = [
    `Loan amount: ${formatGroupedCents(report.amount_cents)}`,
  ];
  if (report.price_cents !== undefined) {
    lines.push(`Purchase price: ${formatGroupedCents(report.price_cents)}`);
  }
  lines.push(
    `Note rate: ${report.rate_percent}%`,
    `Months: ${report.months}`,
  );
  if (report.years !== undefined) lines.push(`Years: ${report.years}`);
  lines.push(
    `Amount financed: ${formatGroupedCents(report.amount_financed_cents)}`,
    `Prepaid finance charge: ${formatGroupedCents(report.prepaid_finance_charge_cents)}`,
    `Finance charge: ${formatGroupedCents(report.finance_charge_cents)}`,
    `Mortgage insurance: ${formatGroupedCents(report.mortgage_insurance_cents)}`,
    `Annual percentage rate: ${formatAprPercent(report.apr_thousandths)}`,
    `Tolerance: ${formatTolerance(report.tolerance_thousandths)}`,
  );
  if (disclosedAprText !== undefined) {
    lines.push(`Disclosed APR: ${disclosedAprText}%`);
    lines.push(`Within tolerance: ${report.within_tolerance ? 'yes' : 'no'}`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

function runCli(argv) {
  const opts = parseArgs(argv);
  if (bareInvocation(opts)) {
    fail('missing required argument: --amount, --rate, --years, and --months');
  }
  const report = buildCliReport(opts);
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return;
  }
  const disclosed = opts['disclosed-apr'] !== undefined
    ? String(parseRate(opts['disclosed-apr'], '--disclosed-apr', 'disclosed APR'))
    : undefined;
  printSummary(report, disclosed !== undefined ? disclosed : undefined);
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
  buildCliReport,
  parseArgs,
  runCli,
};
