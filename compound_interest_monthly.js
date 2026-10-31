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
  levelArmExtras,
  recastFixed,
  savedByExtraByMonth,
  modalPaymentCents,
  prevailingExtraCents,
} = require('./amortize.js');
const { paymentDate, dueDate, formatPayoffDate } = require('./calendar.js');
const {
  buildPictureLines,
  percentOfCents,
  pmiThousandthsForScore,
  titleCentsFromPrice,
} = require('./picture.js');

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
    'even-yearly': undefined,
    'even-month': undefined,
    start: undefined,
    level: false,
    'recast-month': undefined,
    funding: undefined,
    prevailing: false,
    price: undefined,
    'down-percent': undefined,
    tax: undefined,
    insurance: undefined,
    pmi: undefined,
    fico: undefined,
    closing: false,
    'closing-day': undefined,
    'interest-basis': undefined,
    'lender-fees': undefined,
    title: undefined,
    homeowners: undefined,
    'tax-impound-months': undefined,
    'insurance-impound-months': undefined,
    'mi-impound-months': undefined,
    proration: undefined,
    points: undefined,
    'seller-credit': undefined,
    'lender-credit': undefined,
    earnest: undefined,
  };
  const booleanFlags = new Set(['--json', '--schedule', '--round-eighth', '--level', '--closing', '--prevailing']);
  const valueFlags = new Set([
    '--amount', '--rate', '--years', '--months', '--extra', '--fixed-years',
    '--fixed-months', '--adjust-months', '--margin', '--caps', '--floor',
    '--initial-floor', '--index', '--even-yearly', '--even-month', '--start',
    '--recast-month', '--funding', '--price', '--down-percent', '--tax',
    '--insurance', '--pmi', '--fico', '--closing-day', '--interest-basis',
    '--lender-fees', '--title', '--homeowners', '--tax-impound-months',
    '--insurance-impound-months', '--mi-impound-months', '--proration',
    '--points', '--seller-credit', '--lender-credit', '--earnest',
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
    if (valueFlags.has(token)) {
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

const TITLE_PERCENT_PATTERN = /^\d+(?:\.\d{1,5})?$/;

function titleToHundredThousandths(text) {
  const [whole, fraction = ''] = text.split('.');
  const padded = `${fraction}00000`.slice(0, 5);
  return Number(whole) * 100_000 + Number(padded);
}

function parseFundingMonth(text) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(text);
  if (!match) fail('invalid --funding: month must be YYYY-MM');
  return text;
}

function fundingCalendarMonth(text) {
  return Number(text.slice(5, 7));
}

function parseNonNegativeDollars(text, flag) {
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(text)) {
    fail(`invalid ${flag}: amount must be a dollar amount greater than or equal to zero, with at most two decimal places`);
  }
  const dollars = Number(text);
  if (!Number.isFinite(dollars) || dollars < 0) {
    fail(`invalid ${flag}: amount must be a dollar amount greater than or equal to zero, with at most two decimal places`);
  }
  return dollarsToCents(dollars);
}

function parseSignedDollars(text, flag) {
  const negative = text.startsWith('-');
  const body = negative ? text.slice(1) : text;
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(body)) {
    fail(`invalid ${flag}: amount must be a dollar amount with at most two decimal places`);
  }
  const dollars = Number(body);
  if (!Number.isFinite(dollars)) fail(`invalid ${flag}: amount must be a dollar amount with at most two decimal places`);
  const cents = dollarsToCents(dollars);
  return negative ? -cents : cents;
}

function parseDownPercent(text) {
  const thousandths = PERCENT_PATTERN.test(text) ? percentToThousandths(text) : undefined;
  if (thousandths === undefined || thousandths >= 100_000) {
    fail('invalid --down-percent: down payment must be a percent greater than or equal to zero and less than 100, with at most three decimal places');
  }
  return thousandths;
}

function parsePointsPercent(text) {
  const thousandths = PERCENT_PATTERN.test(text) ? percentToThousandths(text) : undefined;
  if (thousandths === undefined || thousandths >= 100_000) {
    fail('invalid --points: points must be a percent greater than or equal to zero and less than 100, with at most three decimal places');
  }
  return thousandths;
}

function parseTitlePercent(text) {
  if (!TITLE_PERCENT_PATTERN.test(text)) {
    fail('invalid --title: title must be a percent with at most five decimal places');
  }
  const units = titleToHundredThousandths(text);
  if (!Number.isSafeInteger(units) || units >= 10_000_000) {
    fail('invalid --title: title must be a percent with at most five decimal places');
  }
  return units;
}

function parseFico(text) {
  if (!/^\d+$/.test(text)) fail('invalid --fico: score must be an integer from 0 through 999');
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < 0 || value > 999) {
    fail('invalid --fico: score must be an integer from 0 through 999');
  }
  return value;
}

function parseClosingDay(text) {
  if (!/^\d+$/.test(text)) fail('invalid --closing-day: day must be an integer from 1 through 31');
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < 1 || value > 31) {
    fail('invalid --closing-day: day must be an integer from 1 through 31');
  }
  return value;
}

function parseImpoundMonths(text, flag) {
  if (!/^\d+$/.test(text)) fail(`invalid ${flag}: count must be an integer from 0 through 999`);
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < 0 || value > 999) {
    fail(`invalid ${flag}: count must be an integer from 0 through 999`);
  }
  return value;
}

function parseInterestBasis(text) {
  if (text !== '360' && text !== '365') fail('invalid --interest-basis: basis must be 360 or 365');
  return text;
}

function accrualMonthString(fundingMonth, paymentNumber) {
  const { year, month } = paymentDate(fundingMonth, paymentNumber);
  return `${year}-${String(month).padStart(2, '0')}`;
}

function dueDateIso(fundingMonth, paymentNumber) {
  const next = dueDate(fundingMonth, paymentNumber);
  return `${next.year}-${String(next.month).padStart(2, '0')}-01`;
}

function requireFlag(opts, name) {
  if (opts[name] === undefined && !opts[name.replace(/-/g, '')]) {
    fail(`missing required argument: --${name}`);
  }
}

function pictureRequested(opts) {
  return opts.tax !== undefined || opts.insurance !== undefined || opts.pmi !== undefined
    || opts.fico !== undefined || opts.closing || opts.prevailing;
}

function prevailingRequested(opts) {
  return opts.prevailing || pictureRequested(opts);
}

function resolvePicture(opts, principalCents, ratePercent, monthCount, yearsForJson) {
  if (opts.pmi !== undefined && opts.fico !== undefined) {
    fail('exactly one of --pmi or --fico is required; both were passed');
  }
  const picture = {};
  const summaryLines = [];
  let priceCents;
  let downThousandths;
  if (opts.price !== undefined) {
    priceCents = dollarsToCents(parseAmount(opts.price));
    if (opts.tax !== undefined || opts.insurance !== undefined) {
      // price required for tax/insurance - already have price
    }
  }
  if (opts.tax !== undefined && opts.price === undefined) fail('missing required argument: --price');
  if (opts.insurance !== undefined && opts.price === undefined) fail('missing required argument: --price');
  if (opts['down-percent'] !== undefined && opts.price === undefined) fail('missing required argument: --price');

  if (opts.price !== undefined) {
    priceCents = dollarsToCents(Number(opts.price));
    const loanCents = dollarsToCents(parseAmount(opts.amount));
    if (opts['down-percent'] !== undefined) {
      downThousandths = parseDownPercent(opts['down-percent']);
      const expectedDown = percentOfCents(priceCents, downThousandths);
      const actualDown = priceCents - loanCents;
      if (expectedDown !== actualDown) {
        fail('invalid --down-percent: price, amount, and down percent do not agree');
      }
    } else {
      downThousandths = Math.round(((priceCents - loanCents) * 100_000) / priceCents);
    }
  }

  let taxThousandths = 0;
  let insuranceThousandths = 0;
  let pmiThousandths = 0;
  if (opts.tax !== undefined) {
    taxThousandths = parsePercentFlag(opts.tax, '--tax', 'property tax');
    const taxCents = percentOfCents(priceCents, taxThousandths, 12);
    picture.property_tax_cents = taxCents;
    summaryLines.push(`Property tax: ${formatGroupedCents(taxCents)}`);
  }
  if (opts.insurance !== undefined) {
    insuranceThousandths = parsePercentFlag(opts.insurance, '--insurance', 'home insurance');
    const insuranceCents = percentOfCents(priceCents, insuranceThousandths, 12);
    picture.insurance_cents = insuranceCents;
    summaryLines.push(`Home insurance: ${formatGroupedCents(insuranceCents)}`);
  }
  if (opts.pmi !== undefined) {
    pmiThousandths = parsePercentFlag(opts.pmi, '--pmi', 'mortgage insurance');
    const pmiCents = percentOfCents(dollarsToCents(parseAmount(opts.amount)), pmiThousandths, 12);
    picture.pmi_cents = pmiCents;
    summaryLines.push(`Mortgage insurance: ${formatGroupedCents(pmiCents)}`);
  } else if (opts.fico !== undefined) {
    if (opts['down-percent'] === undefined && opts.price === undefined) {
      fail('missing required argument: --down-percent');
    }
    const fico = parseFico(opts.fico);
    pmiThousandths = pmiThousandthsForScore(downThousandths, fico);
    const pmiCents = percentOfCents(dollarsToCents(parseAmount(opts.amount)), pmiThousandths, 12);
    picture.pmi_cents = pmiCents;
    picture.pmi_thousandths = pmiThousandths;
    summaryLines.push(`Mortgage insurance: ${formatGroupedCents(pmiCents)}`);
  }

  let closing;
  if (opts.closing) {
    const missing = [];
    if (opts.funding === undefined) missing.push('--funding');
    if (opts.price === undefined) missing.push('--price');
    if (opts['closing-day'] === undefined) missing.push('--closing-day');
    if (opts['interest-basis'] === undefined) missing.push('--interest-basis');
    if (opts['lender-fees'] === undefined) missing.push('--lender-fees');
    if (opts.title === undefined) missing.push('--title');
    if (opts.tax === undefined) missing.push('--tax');
    if (opts['tax-impound-months'] === undefined) missing.push('--tax-impound-months');
    if (opts['insurance-impound-months'] === undefined) missing.push('--insurance-impound-months');
    if (opts['mi-impound-months'] === undefined) missing.push('--mi-impound-months');
    if (opts.proration === undefined) missing.push('--proration');
    if (opts.points === undefined) missing.push('--points');
    if (opts['seller-credit'] === undefined) missing.push('--seller-credit');
    if (opts['lender-credit'] === undefined) missing.push('--lender-credit');
    if (opts.earnest === undefined) missing.push('--earnest');
    if (opts.pmi === undefined && opts.fico === undefined) missing.push('--pmi or --fico');
    if (opts.homeowners === undefined && opts.insurance === undefined) missing.push('--insurance');
    if (missing.length > 0) fail(`missing required argument: ${missing.join(', ')}`);

    const fundingMonth = parseFundingMonth(opts.funding);
    const rateThousandths = percentToThousandths(String(ratePercent));
    const loanCents = dollarsToCents(parseAmount(opts.amount));
    const homeownersAnnual = opts.homeowners !== undefined
      ? parseNonNegativeDollars(opts.homeowners, '--homeowners')
      : undefined;
    const sellerCreditCents = parseNonNegativeDollars(opts['seller-credit'], '--seller-credit');
    const lines = buildPictureLines({
      priceCents,
      financedCents: loanCents,
      ratePercent,
      monthCount,
      yearsForJson,
      rateThousandths,
      taxThousandths,
      insuranceThousandths,
      pmiThousandths,
      titleHundredThousandths: parseTitlePercent(opts.title),
      lenderFeesCents: parseNonNegativeDollars(opts['lender-fees'], '--lender-fees'),
      closingDay: parseClosingDay(opts['closing-day']),
      startMonth: fundingMonth,
      interestBasis: parseInterestBasis(opts['interest-basis']),
      homeownersInsuranceAnnualCents: homeownersAnnual,
      taxImpoundMonths: parseImpoundMonths(opts['tax-impound-months'], '--tax-impound-months'),
      insuranceImpoundMonths: parseImpoundMonths(opts['insurance-impound-months'], '--insurance-impound-months'),
      miImpoundMonths: parseImpoundMonths(opts['mi-impound-months'], '--mi-impound-months'),
      prorationCents: parseSignedDollars(opts.proration, '--proration'),
      pointsThousandths: parsePointsPercent(opts.points),
      sellerCreditCents,
      lenderCreditCents: parseNonNegativeDollars(opts['lender-credit'], '--lender-credit'),
      earnestCents: parseNonNegativeDollars(opts.earnest, '--earnest'),
    });
    closing = {
      lender_fees_cents: lines.lenderFeesCents,
      title_cents: lines.titleCents,
      prepaid_interest_cents: lines.prepaidInterestCents,
      prepaid_interest_days: lines.prepaidInterestDays,
      homeowners_insurance_cents: lines.homeownersInsuranceCents,
      tax_impound_cents: lines.taxImpoundCents,
      insurance_impound_cents: lines.insuranceImpoundCents,
      mi_impound_cents: lines.miImpoundCents,
      proration_cents: lines.prorationCents,
      closing_cents: lines.closingCents,
      points_cents: lines.pointsCents,
      closing_and_points_cents: lines.closingAndPointsCents,
      cash_to_close_cents: lines.cashToCloseCents,
      due_at_closing_cents: lines.dueAtClosingCents,
    };
    summaryLines.push(
      `Lender fees: ${formatGroupedCents(lines.lenderFeesCents)}`,
      `Title, escrow, and recording: ${formatGroupedCents(lines.titleCents)}`,
      `Prepaid interest: ${formatGroupedCents(lines.prepaidInterestCents)}`,
      `Homeowners insurance: ${formatGroupedCents(lines.homeownersInsuranceCents)}`,
      `Property tax impound: ${formatGroupedCents(lines.taxImpoundCents)}`,
      `Insurance impound: ${formatGroupedCents(lines.insuranceImpoundCents)}`,
      `Mortgage insurance impound: ${formatGroupedCents(lines.miImpoundCents)}`,
      `Proration: ${formatGroupedCents(lines.prorationCents)}`,
      `Closing costs: ${formatGroupedCents(lines.closingCents)}`,
      `Points: ${formatGroupedCents(lines.pointsCents)}`,
      `Closing costs and points: ${formatGroupedCents(lines.closingAndPointsCents)}`,
      `Seller credit: ${formatGroupedCents(sellerCreditCents)}`,
      `Lender credit: ${formatGroupedCents(parseNonNegativeDollars(opts['lender-credit'], '--lender-credit'))}`,
      `Cash to close: ${formatGroupedCents(lines.cashToCloseCents)}`,
      `Earnest money: ${formatGroupedCents(parseNonNegativeDollars(opts.earnest, '--earnest'))}`,
      `Due at closing: ${formatGroupedCents(lines.dueAtClosingCents)}`,
    );
    const downCents = priceCents - loanCents;
    if (sellerCreditCents > downCents && downThousandths < 10_000) {
      summaryLines.push('Seller credit exceeds down payment on a loan with less than 10% down. Confirm with your lender.');
    }
    picture.prevailing_total_cents = lines.totalMonthlyCents;
  }

  return { picture, closing, summaryLines };
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
  'initial-floor', 'round-eighth', 'index', 'even-yearly', 'even-month', 'start',
];

const EVEN_YEARLY_PATTERN = /^(?:\d+)(?:\.\d{1,2})?$/;

function parseEvenYearlyCents(text) {
  if (!EVEN_YEARLY_PATTERN.test(text)) {
    fail('invalid --even-yearly: amount must be a dollar amount greater than or equal to zero, with at most two decimal places');
  }
  const dollars = Number(text);
  if (!Number.isFinite(dollars) || dollars < 0) {
    fail('invalid --even-yearly: amount must be a dollar amount greater than or equal to zero, with at most two decimal places');
  }
  return dollarsToCents(dollars);
}

function parseEvenMonth(text) {
  if (!/^(?:[1-9]|1[0-2])$/.test(text)) {
    fail('invalid --even-month: month must be an integer from 1 through 12');
  }
  return Number(text);
}

function parseStartMonth(text) {
  if (/^(?:[1-9]|1[0-2])$/.test(text)) {
    return Number(text);
  }
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(text);
  if (match) {
    return Number(match[2]);
  }
  fail('invalid --start: month must be 1 through 12 or YYYY-MM');
}

function resolveAdjustmentStats(opts) {
  const hasYearly = opts['even-yearly'] !== undefined;
  const hasMonth = opts['even-month'] !== undefined;
  const hasStart = opts.start !== undefined;
  if (!hasYearly && !hasMonth && !hasStart) {
    return {};
  }
  if ((hasMonth || hasStart) && !hasYearly) {
    fail('missing required argument: --even-yearly');
  }
  const yearlyExtraCents = parseEvenYearlyCents(opts['even-yearly']);
  if (yearlyExtraCents > 0) {
    if (!hasMonth) fail('missing required argument: --even-month');
    let startMonth;
    if (hasStart) {
      startMonth = parseStartMonth(opts.start);
    } else if (opts.funding !== undefined) {
      startMonth = fundingCalendarMonth(parseFundingMonth(opts.funding));
    } else {
      fail('missing required argument: --start');
    }
    return {
      yearlyExtraCents,
      yearlyMonth: parseEvenMonth(opts['even-month']),
      startMonth,
    };
  }
  return {};
}

function armTermsOn(opts) {
  return ARM_FLAGS.some((name) => {
    if (name === 'round-eighth') return opts[name] === true;
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
  const arm = {
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
  arm.adjustmentStats = resolveAdjustmentStats(opts);
  return arm;
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

function formatAdjustmentChange(cents) {
  if (cents < 0) {
    return `-${formatGroupedCents(-cents)}`;
  }
  if (cents > 0) {
    return `+${formatGroupedCents(cents)}`;
  }
  return formatGroupedCents(0);
}

function printSummary(report, extensions = {}) {
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
    if (report.arm.first_adjustment !== undefined) {
      const range = report.arm.first_adjustment;
      lines.push(
        `Ceiling: ${percentText(report.arm.ceiling_percent)}% / Floor: ${percentText(report.arm.floor_percent)}%`,
        `First adjustment month ${range.month}: ${formatAdjustmentChange(range.min_change_cents)} to ${formatAdjustmentChange(range.max_change_cents)}`,
        `Even-out extra: ${formatGroupedCents(report.arm.even_out_cents)}`,
        `Monthly extra: ${formatGroupedCents(report.arm.monthly_extra_cents)}`,
      );
    }
  }
  if (extensions.recastLines) lines.push(...extensions.recastLines);
  if (extensions.fundingMonth) {
    lines.push(`Payoff date: ${formatPayoffDate(extensions.fundingMonth, report.payoff_month)}`);
    lines.push('Payments are made in arrears: each month\'s row is the accrual month, paid on the 1st of the following month.');
  }
  if (extensions.prevailing) {
    lines.push(`Prevailing principal and interest: ${formatGroupedCents(extensions.prevailing.principal_and_interest_cents)}`);
    lines.push(`Prevailing extra: ${formatGroupedCents(extensions.prevailing.extra_cents)}`);
  }
  if (extensions.pictureSummary) lines.push(...extensions.pictureSummary);
  if (extensions.prevailingTotalCents !== undefined) {
    lines.push(`Prevailing monthly total: ${formatGroupedCents(extensions.prevailingTotalCents)}`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

function printScheduleCsv(schedule, arm, savedByExtra, fundingMonth) {
  const header = ['month'];
  if (fundingMonth) header.push('accrual');
  header.push('interest', 'principal', 'remaining_principal', 'remaining_interest', 'extra', 'interest_saved', 'saved_by_extra');
  if (arm) header.push('rate', 'payment', 'index');
  const lines = [header.join(',')];
  for (let i = 0; i < schedule.length; i += 1) {
    const row = schedule[i];
    const columns = [row.month];
    if (fundingMonth) columns.push(accrualMonthString(fundingMonth, row.month));
    columns.push(
      formatPlainCents(row.interest_cents),
      formatPlainCents(row.principal_cents),
      formatPlainCents(row.remaining_principal_cents),
      formatPlainCents(row.remaining_interest_cents),
      formatPlainCents(row.extra_cents),
      formatPlainCents(row.interest_saved_cents),
      formatPlainCents(savedByExtra[i]),
    );
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

function scheduleJsonRows(schedule, savedByExtra, fundingMonth) {
  return schedule.map((row, index) => {
    const next = { ...row, saved_by_extra_cents: savedByExtra[index] };
    if (fundingMonth) {
      next.accrual_month = accrualMonthString(fundingMonth, row.month);
      next.due_date = dueDateIso(fundingMonth, row.month);
    }
    return next;
  });
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
  if (
    (opts['even-month'] !== undefined || opts.start !== undefined)
    && opts['even-yearly'] === undefined
  ) {
    fail('missing required argument: --even-yearly');
  }

  if (opts.level && !armTermsOn(opts)) {
    fail('level extras require an ARM');
  }
  if (opts['recast-month'] !== undefined && armTermsOn(opts)) {
    fail('a recast is for a fixed rate');
  }

  const arm = armTermsOn(opts) ? resolveArm(opts, monthCount) : undefined;
  let extras = opts.extra === undefined ? new Map() : loadExtras(opts.extra, monthCount);
  if (opts.level) {
    extras = levelArmExtras(principal, ratePercent, monthCount, arm, extras, 1, new Map());
  }

  let recast;
  if (opts['recast-month'] !== undefined) {
    const recastMonth = parsePositiveTerm(opts['recast-month'], '--recast-month');
    recast = recastFixed(principal, ratePercent, monthCount, extras, recastMonth);
  }

  const report = buildReport(principal, ratePercent, monthCount, extras, yearsForJson, arm);
  const savedByExtra = savedByExtraByMonth(principal, ratePercent, monthCount, extras, arm);

  const fundingMonth = opts.funding !== undefined ? parseFundingMonth(opts.funding) : undefined;

  let picturePayload;
  let closingPayload;
  let pictureSummary = [];
  if (pictureRequested(opts)) {
    const resolved = resolvePicture(opts, dollarsToCents(principal), ratePercent, monthCount, yearsForJson);
    picturePayload = resolved.picture;
    closingPayload = resolved.closing;
    pictureSummary = resolved.summaryLines;
  }

  const prevailing = prevailingRequested(opts) ? {
    principal_and_interest_cents: modalPaymentCents(report),
    extra_cents: prevailingExtraCents(report),
  } : undefined;

  let prevailingTotalCents;
  if (prevailing && picturePayload) {
    prevailingTotalCents = prevailing.principal_and_interest_cents
      + (picturePayload.property_tax_cents ?? 0)
      + (picturePayload.insurance_cents ?? 0)
      + (picturePayload.pmi_cents ?? 0)
      + prevailing.extra_cents;
    picturePayload.prevailing_total_cents = prevailingTotalCents;
  }

  const recastLines = recast ? [
    `Recast month: ${recast.recast_month}`,
    `Recast principal: ${formatGroupedCents(recast.remaining_principal_cents)}`,
    `Recast payment: ${formatGroupedCents(recast.monthly_payment_cents)}`,
    `Recast months: ${recast.months}`,
    `Recast interest: ${formatGroupedCents(recast.interest_cents)}`,
    `Interest through recast: ${formatGroupedCents(recast.interest_through_cents)}`,
    `Lifetime interest with recast: ${formatGroupedCents(recast.lifetime_interest_cents)}`,
  ] : undefined;

  if (opts.json) {
    const payload = { ...report };
    if (!opts.schedule) delete payload.schedule;
    else payload.schedule = scheduleJsonRows(report.schedule, savedByExtra, fundingMonth);
    if (fundingMonth) payload.payoff_date = formatPayoffDate(fundingMonth, report.payoff_month);
    if (recast) payload.recast = recast;
    if (prevailing) payload.prevailing = prevailing;
    if (picturePayload && Object.keys(picturePayload).length > 0) payload.picture = picturePayload;
    if (closingPayload) payload.closing = closingPayload;
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }
  if (opts.schedule) {
    printScheduleCsv(report.schedule, Boolean(report.arm), savedByExtra, fundingMonth);
    return;
  }
  printSummary(report, {
    recastLines,
    fundingMonth,
    prevailing,
    pictureSummary,
    prevailingTotalCents,
  });
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
