'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { dollarsToCents } = require('./compound_interest_monthly.js');

const script = path.join(__dirname, 'compound_interest_monthly.js');
const firstYear = path.join(__dirname, 'fixtures', 'first-year-100.csv');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
}

function jsonRun(args) {
  const result = run(args);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

function withCsv(contents, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'compound-'));
  const file = path.join(dir, 'extra.csv');
  fs.writeFileSync(file, contents);
  try {
    return fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function scheduleRow(schedule, month) {
  const row = schedule.find((item) => item.month === month);
  assert.ok(row, `missing month ${month}`);
  return row;
}

test('half-up rounding does not use the broken cents multiply', () => {
  assert.equal(Math.round(1.005 * 100), 100);
  assert.equal(dollarsToCents(1.005), 101);
  assert.equal(dollarsToCents(1.004), 100);
  assert.equal(dollarsToCents(3792.2242225213395), 379222);
});

test('AC1 $200,000 at 6% for 30 years pays 119910 cents', () => {
  const report = jsonRun(['--amount', '200000', '--rate', '6', '--years', '30', '--json']);
  assert.equal(report.monthly_payment_cents, 119910);
  assert.equal(report.payoff_month, 360);
  assert.equal(report.months, 360);
  assert.equal(report.years, 30);
  assert.equal(report.interest_saved_cents, 0);
  assert.equal(report.months_saved, 0);
  assert.equal(report.baseline.payoff_month, report.payoff_month);
  assert.equal(report.baseline.interest_cents, report.interest_cents);
  assert.equal('schedule' in report, false);
});

test('AC2 $570,000 at 7% for 30 years, no extras', () => {
  const report = jsonRun(['--amount', '570000', '--rate', '7', '--years', '30', '--json']);
  assert.equal(report.monthly_payment_cents, 379222);
  assert.equal(report.interest_cents, 79520072);
  assert.equal(report.payoff_month, 360);
  assert.equal(report.extra_applied_cents, 0);
  assert.equal(report.extra_unapplied_cents, 0);
  assert.equal(report.interest_saved_cents, 0);
  assert.equal(report.months_saved, 0);
  assert.equal(report.baseline.interest_cents, 79520072);
  assert.equal(report.baseline.payoff_month, 360);
  assert.equal('schedule' in report, false);

  const scheduled = jsonRun([
    '--amount', '570000', '--rate', '7', '--years', '30', '--json', '--schedule',
  ]);
  assert.equal(scheduled.schedule.length, 360);
  assert.equal(scheduled.schedule[0].month, 1);
  assert.equal(scheduled.schedule[0].interest_cents, 332500);
  assert.equal(scheduled.schedule[0].extra_cents, 0);
  assert.equal(scheduled.schedule[0].interest_saved_cents, 0);
  assert.equal(scheduled.schedule[359].remaining_principal_cents, 0);
  assert.equal(scheduled.schedule[359].remaining_interest_cents, 0);
  assert.equal(scheduled.schedule[359].interest_saved_cents, 0);
  for (const row of scheduled.schedule) {
    assert.ok(row.remaining_principal_cents >= 0);
    assert.equal(row.extra_cents, 0);
    assert.equal(row.interest_saved_cents, 0);
  }

  const summary = run(['--amount', '570000', '--rate', '7', '--years', '30']);
  assert.equal(summary.status, 0);
  assert.match(summary.stdout, /Monthly payment: 3,792\.22/);
  assert.match(summary.stdout, /Total interest: 795,200\.72/);
  assert.doesNotMatch(summary.stdout, /"schedule"/);

  const csv = run(['--amount', '570000', '--rate', '7', '--years', '30', '--schedule']);
  assert.equal(csv.status, 0);
  const lines = csv.stdout.trim().split('\n');
  assert.equal(
    lines[0],
    'month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved',
  );
  assert.equal(lines.length, 361);
  assert.equal(lines[1].split(',')[1], '3325.00');
  assert.equal(lines[1].split(',')[5], '0.00');
  assert.equal(lines[1].split(',')[6], '0.00');
});

test('AC5 no arguments exit non-zero and do not run the gist loan', () => {
  const result = run([]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /missing required argument/);
  assert.doesNotMatch(result.stdout, /855,?000/);
  assert.doesNotMatch(result.stderr, /855,?000/);

  const gist = jsonRun(['--amount', '855000', '--rate', '6.99', '--years', '30', '--json']);
  assert.equal(gist.monthly_payment_cents, 568260);
  assert.equal(gist.amount_cents, 85500000);
  assert.equal(gist.rate_percent, 6.99);
  assert.equal(gist.years, 30);
  assert.equal(gist.months, 360);
});

test('loan-recast AC1 $200,000 at 6% for 15 years and 180 months', () => {
  const yearsRun = jsonRun(['--amount', '200000', '--rate', '6', '--years', '15', '--json']);
  assert.equal(yearsRun.monthly_payment_cents, 168771);
  assert.equal(yearsRun.payoff_month, 180);
  assert.equal(yearsRun.interest_cents, 10378846);
  assert.equal(yearsRun.years, 15);
  assert.equal(yearsRun.months, 180);

  const monthsRun = jsonRun(['--amount', '200000', '--rate', '6', '--months', '180', '--json']);
  assert.equal(monthsRun.monthly_payment_cents, 168771);
  assert.equal(monthsRun.payoff_month, 180);
  assert.equal(monthsRun.interest_cents, 10378846);
  assert.equal(monthsRun.months, 180);
  assert.equal('years' in monthsRun, false);
});

test('loan-recast AC2 $200,000 at 6% for 13 months', () => {
  const report = jsonRun(['--amount', '200000', '--rate', '6', '--months', '13', '--json']);
  assert.equal(report.monthly_payment_cents, 1592845);
  assert.equal(report.payoff_month, 13);
  assert.equal(report.interest_cents, 706982);
  assert.equal(report.months, 13);
  assert.equal('years' in report, false);
});

test('loan-recast AC3 term flag validation', () => {
  const both = run(['--amount', '200000', '--rate', '6', '--years', '15', '--months', '180']);
  assert.notEqual(both.status, 0);
  assert.match(both.stderr, /exactly one of --years or --months is required/);

  const neither = run(['--amount', '200000', '--rate', '6']);
  assert.notEqual(neither.status, 0);
  assert.match(neither.stderr, /exactly one of --years or --months is required/);

  for (const args of [
    ['--months', '0'],
    ['--months', '01'],
    ['--months', '13.0'],
    ['--years', '30.0'],
  ]) {
    const result = run(['--amount', '200000', '--rate', '6', ...args]);
    assert.notEqual(result.status, 0, args.join(' '));
  }
});

test('loan-recast AC4 extra month 14 on a 13-month loan fails; month 13 is accepted', () => {
  withCsv('month,extra\n14,100\n', (file) => {
    const result = run(['--amount', '200000', '--rate', '6', '--months', '13', '--extra', file]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /1 through 13/);
  });
  withCsv('month,extra\n13,100\n', (file) => {
    const report = jsonRun(['--amount', '200000', '--rate', '6', '--months', '13', '--extra', file, '--json']);
    assert.equal(report.extra_applied_cents, 10000);
  });
});

function buildRecastSampleExtraCsv() {
  const lines = ['month,extra'];
  for (let month = 1; month <= 360; month += 1) {
    lines.push(`${month},2400`);
  }
  for (let month = 5; month <= 360; month += 12) {
    lines.push(`${month},20000`);
  }
  return `${lines.join('\n')}\n`;
}

test('loan-recast AC5 sample first run month 24 and second run payment', () => {
  withCsv(buildRecastSampleExtraCsv(), (file) => {
    const first = jsonRun([
      '--amount', '570000', '--rate', '7.375', '--years', '30', '--extra', file, '--json', '--schedule',
    ]);
    const month24 = scheduleRow(first.schedule, 24);
    assert.equal(month24.remaining_principal_cents, 45361449);

    const second = jsonRun([
      '--amount', '453614.49', '--rate', '7.375', '--months', '336', '--json',
    ]);
    assert.equal(second.amount_cents, 45361449);
    assert.equal(second.monthly_payment_cents, 319568);
    assert.equal(second.interest_cents, 62013361);
    assert.equal(second.payoff_month, 336);

    const oneLess = jsonRun([
      '--amount', '453614.49', '--rate', '7.375', '--months', '335', '--json',
    ]);
    assert.equal(oneLess.monthly_payment_cents, 319855);
  });
});

test('invalid loan arguments exit non-zero', () => {
  const fourDecimals = run(['--amount', '570000', '--rate', '6.9999', '--years', '30']);
  assert.notEqual(fourDecimals.status, 0);
  assert.equal(fourDecimals.stdout, '');
  assert.match(fourDecimals.stderr, /--rate/);

  const zeroAmount = run(['--amount', '0', '--rate', '7', '--years', '30']);
  assert.notEqual(zeroAmount.status, 0);
  assert.match(zeroAmount.stderr, /--amount/);

  const fractionalYears = run(['--amount', '570000', '--rate', '7', '--years', '30.0']);
  assert.notEqual(fractionalYears.status, 0);
  assert.match(fractionalYears.stderr, /--years/);

  const unknown = run(['--amount', '570000', '--rate', '7', '--years', '30', '--bogus']);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /unknown argument/);
});

const loan = ['--amount', '570000', '--rate', '7', '--years', '30'];

test('AC3 and AC4 first-year $100 extra saves 813770 cents and ends at a zero balance', () => {
  const report = jsonRun([...loan, '--extra', firstYear, '--json']);
  assert.equal(report.interest_cents, 78706302);
  assert.equal(report.interest_saved_cents, 813770);
  assert.equal(report.payoff_month, 358);
  assert.ok(report.payoff_month <= 360);
  assert.equal(report.months_saved, 2);
  assert.equal(report.extra_applied_cents, 120000);
  assert.equal(report.extra_unapplied_cents, 0);
  assert.equal(report.baseline.interest_cents, 79520072);
  assert.equal(report.baseline.payoff_month, 360);
  assert.equal(report.monthly_payment_cents, 379222);
  assert.equal('schedule' in report, false);

  const scheduled = jsonRun([...loan, '--extra', firstYear, '--json', '--schedule']);
  assert.equal(scheduled.schedule.length, 360);
  const payoff = scheduleRow(scheduled.schedule, scheduled.payoff_month);
  assert.equal(payoff.remaining_principal_cents, 0);
  for (const row of scheduled.schedule) {
    assert.ok(row.remaining_principal_cents >= 0);
  }
});

test('AC8 schedule rows for the first-year $100 extra', () => {
  const report = jsonRun([...loan, '--extra', firstYear, '--json', '--schedule']);
  assert.equal(report.schedule.length, 360);
  const month1 = scheduleRow(report.schedule, 1);
  assert.equal(month1.interest_cents, 332500);
  assert.equal(month1.extra_cents, 10000);
  assert.equal(month1.interest_saved_cents, 0);
  const month12 = scheduleRow(report.schedule, 12);
  assert.equal(month12.extra_cents, 10000);
  assert.equal(month12.interest_saved_cents, 3926);
  const month358 = scheduleRow(report.schedule, 358);
  assert.equal(month358.interest_cents, 1183);
  assert.equal(month358.principal_cents, 202715);
  assert.equal(month358.extra_cents, 0);
  assert.equal(month358.remaining_principal_cents, 0);
  const month360 = scheduleRow(report.schedule, 360);
  assert.equal(month360.interest_saved_cents, 813770);
  assert.equal(month360.interest_saved_cents, report.interest_saved_cents);
  assert.equal(month360.interest_cents, 0);
  assert.equal(month360.principal_cents, 0);
  assert.equal(month360.extra_cents, 0);
  assert.equal(month360.remaining_principal_cents, 0);
  assert.equal(month360.remaining_interest_cents, 0);

  const csv = run([...loan, '--extra', firstYear, '--schedule']);
  assert.equal(csv.status, 0, csv.stderr);
  assert.equal(csv.stderr, '');
  const lines = csv.stdout.trim().split('\n');
  assert.equal(
    lines[0],
    'month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved',
  );
  assert.equal(lines.length, 361);
  const cells = (line) => line.split(',');
  assert.equal(cells(lines[1])[1], '3325.00');
  assert.equal(cells(lines[1])[5], '100.00');
  assert.equal(cells(lines[1])[6], '0.00');
  assert.equal(cells(lines[12])[6], '39.26');
  assert.equal(cells(lines[358])[1], '11.83');
  assert.equal(cells(lines[358])[2], '2027.15');
  assert.equal(cells(lines[358])[3], '0.00');
  assert.equal(cells(lines[358])[5], '0.00');
  assert.equal(cells(lines[360])[1], '0.00');
  assert.equal(cells(lines[360])[2], '0.00');
  assert.equal(cells(lines[360])[3], '0.00');
  assert.equal(cells(lines[360])[4], '0.00');
  assert.equal(cells(lines[360])[5], '0.00');
  assert.equal(cells(lines[360])[6], '8137.70');
});

test('AC6 extra months outside the term exit non-zero and duplicate months sum', () => {
  withCsv('month,extra\n361,100\n', (file) => {
    const result = run([...loan, '--extra', file, '--json']);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /month/);
  });
  withCsv('month,extra\n0,100\n', (file) => {
    const result = run([...loan, '--extra', file]);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
  });
  withCsv('month,extra\n13,100\n', (file) => {
    const result = run(['--amount', '200000', '--rate', '6', '--years', '1', '--extra', file]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /1 through 12/);
  });
  withCsv('month,extra\r\n6,100\r\n6,50\r\n', (file) => {
    const report = jsonRun([...loan, '--extra', file, '--json', '--schedule']);
    assert.equal(report.extra_applied_cents, 15000);
    assert.equal(scheduleRow(report.schedule, 6).extra_cents, 15000);
  });
});

test('extra CSV rejects a bad header, a negative amount, and a missing column', () => {
  withCsv('month,amount\n1,100\n', (file) => {
    const result = run([...loan, '--extra', file]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /header/);
    assert.equal(result.stdout, '');
  });
  withCsv('month,extra\n1,-100\n', (file) => {
    const result = run([...loan, '--extra', file]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /positive/);
  });
  withCsv('month,extra\n1\n', (file) => {
    const result = run([...loan, '--extra', file]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /columns/);
  });
  withCsv('month,extra\n', (file) => {
    const report = jsonRun([...loan, '--extra', file, '--json']);
    assert.equal(report.interest_cents, 79520072);
    assert.equal(report.extra_applied_cents, 0);
    assert.equal(report.interest_saved_cents, 0);
    assert.equal(report.payoff_month, 360);
  });
  const missing = run([...loan, '--extra', path.join(os.tmpdir(), 'compound-missing-extra.csv')]);
  assert.notEqual(missing.status, 0);
  assert.equal(missing.stdout, '');
  assert.match(missing.stderr, /cannot read --extra file/);
});

test('extra after payoff is unapplied and does not reduce that month\'s interest', () => {
  const later = fs.readFileSync(firstYear, 'utf8').trimEnd() + '\n359,25\n360,25\n';
  withCsv(later, (file) => {
    const report = jsonRun([...loan, '--extra', file, '--json', '--schedule']);
    assert.equal(report.interest_cents, 78706302);
    assert.equal(report.extra_applied_cents, 120000);
    assert.equal(report.extra_unapplied_cents, 5000);
    assert.equal(report.payoff_month, 358);
    assert.equal(scheduleRow(report.schedule, 1).interest_cents, 332500);
    assert.equal(scheduleRow(report.schedule, 359).extra_cents, 0);
    assert.equal(scheduleRow(report.schedule, 359).interest_cents, 0);
  });

  withCsv('month,extra\n1,1000000\n', (file) => {
    const report = jsonRun([
      '--amount', '200000', '--rate', '6', '--years', '30', '--extra', file, '--json', '--schedule',
    ]);
    assert.equal(report.payoff_month, 1);
    assert.equal(report.interest_cents, 100000);
    assert.equal(report.extra_applied_cents, 20000000);
    assert.equal(report.extra_unapplied_cents, 80000000);
    assert.equal(report.months_saved, 359);
    const month1 = scheduleRow(report.schedule, 1);
    assert.equal(month1.interest_cents, 100000);
    assert.equal(month1.interest_saved_cents, 0);
    assert.equal(month1.principal_cents, 0);
    assert.equal(month1.extra_cents, 20000000);
    assert.equal(month1.remaining_principal_cents, 0);
    assert.equal(scheduleRow(report.schedule, 2).interest_cents, 0);
    assert.equal(report.schedule.at(-1).interest_saved_cents, report.interest_saved_cents);
    assert.equal(report.schedule.length, 360);
  });
});

test('AC7 skill states the ask rule, the CSV, and which flags to run', () => {
  const skillPath = path.join(__dirname, '.agents', 'skills', 'mortgage-loan-calculator', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');
  const phrases = [
    'does not call it a skill',
    'no extras',
    'no amount',
    'no period',
    'month,extra',
    'the first year',
    'every month',
    'price minus down payment',
    'note rate',
    'adjustable',
    'interest-only',
    'recast',
    'scripts/compound_interest_monthly.js',
    'interest_saved_cents',
    '--json` alone',
    'month or savings-so-far',
    '--json --schedule',
    'Do not recompute the amortization',
  ];
  for (const phrase of phrases) {
    assert.ok(skill.includes(phrase), `missing: ${phrase}`);
  }
  assert.doesNotMatch(skill, /disable-model-invocation:\s*true/);
  const fromSkill = path.join(path.dirname(skillPath), 'scripts', 'compound_interest_monthly.js');
  assert.equal(fs.realpathSync(fromSkill), fs.realpathSync(script));
});

test('amortization AC2 pure walk matches the 30-year fixture and stays free of Node APIs', () => {
  const source = fs.readFileSync(path.join(__dirname, 'amortize.js'), 'utf8');
  for (const token of ['require', 'import', 'process', 'fs']) {
    assert.equal(source.includes(token), false, `amortize.js contains ${token}`);
  }
  const { buildReport, formatGroupedCents } = require('./amortize.js');
  const report = buildReport(570000, 7, 360, new Map(), 30);
  assert.equal(report.monthly_payment_cents, 379222);
  assert.equal(report.interest_cents, 79520072);
  assert.equal(report.payoff_month, 360);
  assert.equal(report.months, 360);
  assert.equal(report.years, 30);
  assert.equal(report.schedule[0].interest_cents, 332500);
  assert.equal(report.schedule[0].principal_cents, 46722);
  assert.equal(report.schedule[156].remaining_principal_cents, 45048005);
  assert.equal(report.schedule[156].remaining_interest_cents, 31934147);
  assert.equal(report.schedule[359].remaining_principal_cents, 0);
  assert.equal(formatGroupedCents(379222), '3,792.22');
  assert.equal(formatGroupedCents(report.monthly_payment_cents), '3,792.22');
});

test('loan-recast AC6 skill recast procedure and term flags', () => {
  const skillPath = path.join(__dirname, '.agents', 'skills', 'mortgage-loan-calculator', 'SKILL.md');
  const skill = fs.readFileSync(skillPath, 'utf8');
  const phrases = [
    'Servicer recast',
    'two runs',
    'remaining_principal_cents',
    'amount_cents',
    'monthly_payment_cents',
    'interest_cents',
    '--months TERM_MONTHS',
    '--years TERM_YEARS',
    'Exactly one of `--years` or `--months` is required',
    'no positive remaining term',
    'already paid off',
    'first payment month',
    'closing month or the first payment month',
    'differ by about a cent',
    'years or months',
    'recast month',
  ];
  for (const phrase of phrases) {
    assert.ok(skill.includes(phrase), `missing: ${phrase}`);
  }
  assert.match(skill, /G5/);
  assert.match(skill, /G6/);
});

const indexFixture = path.join(__dirname, 'fixtures', 'index-4.42-first-reset.csv');
const feArgs = [
  '--amount', '570000', '--rate', '5.875', '--years', '30',
  '--fixed-years', '7', '--adjust-months', '12',
  '--margin', '2.5', '--caps', '5/2/5', '--floor', '2.5',
];

function feWith(flag, value) {
  const copy = [...feArgs];
  const at = copy.indexOf(flag);
  if (at === -1) return [...copy, flag, value];
  copy[at + 1] = value;
  return copy;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function failure(args) {
  const result = run(args);
  assert.notEqual(result.status, 0, `expected failure for ${args.join(' ')}`);
  assert.equal(result.stdout, '');
  return result.stderr;
}

test('arm-loan AC1 the fixed-rate summary, JSON, and CSV are byte-identical', () => {
  const base = ['--amount', '570000', '--rate', '7', '--years', '30'];
  const summary = run(base);
  assert.equal(summary.status, 0);
  assert.equal(summary.stdout, [
    'Monthly payment: 3,792.22',
    'Payoff month: 360',
    'Total interest: 795,200.72',
    'Extra applied: 0.00',
    'Extra unapplied: 0.00',
    'Interest saved: 0.00',
    'Months saved: 0',
    '',
  ].join('\n'));
  assert.equal(sha256(summary.stdout), 'adc8f5d8b2e6695d469ad69923bc4ef46ef2b4677a58c89fc57fd02c8d540ad5');

  const csv = run([...base, '--schedule']);
  assert.equal(csv.status, 0);
  assert.equal(csv.stdout.split('\n')[0],
    'month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved');
  assert.equal(sha256(csv.stdout), 'd3129f7e97827934a05d350a599c3b375c2296a604ca0ec076ff2c3920cea620');

  const json = run([...base, '--json', '--schedule']);
  assert.equal(json.status, 0);
  assert.equal(sha256(json.stdout), '8a214dc5815a70c16721113f23c186b90340d7ec633c017209f1915860819292');
  const parsed = JSON.parse(json.stdout);
  assert.equal('arm' in parsed, false);
  assert.equal('rate_percent' in parsed.schedule[0], false);
});

test('arm-loan AC6 the FE summary ends with the four ARM lines', () => {
  const result = run(feArgs);
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trimEnd().split('\n');
  assert.equal(lines.length, 11);
  assert.equal(lines[0], 'Monthly payment: 3,371.77');
  assert.deepEqual(lines.slice(-4), [
    'Initial rate: 5.875%',
    'Highest rate: 10.875% (from month 85)',
    'Highest payment: 5,037.71 (from month 85)',
    'Adjustments: 23',
  ]);
});

test('arm-loan AC6 --json reports the arm object and --schedule rows', () => {
  const report = jsonRun([...feArgs, '--json']);
  assert.equal(report.arm.adjustments.length, 23);
  assert.equal(report.arm.max_payment_cents, 503771);
  assert.equal(report.interest_cents, 110363633);
  assert.equal(report.rate_percent, 5.875);
  assert.equal(report.monthly_payment_cents, 337177);
  assert.equal('schedule' in report, false);

  const withSchedule = jsonRun([...feArgs, '--json', '--schedule']);
  const row85 = scheduleRow(withSchedule.schedule, 85);
  assert.equal(row85.rate_percent, 10.875);
  assert.equal(row85.payment_cents, 503771);
  assert.equal(row85.index_percent, null);
  assert.equal(scheduleRow(withSchedule.schedule, 84).rate_percent, 5.875);
});

test('arm-loan AC6 --schedule prints the ten-column header and formatted columns', () => {
  const result = run([...feArgs, '--schedule']);
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trimEnd().split('\n');
  assert.equal(lines.length, 361);
  assert.equal(lines[0],
    'month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved,rate,payment,index');
  assert.equal(lines[84], '84,2500.14,871.62,509796.12,880611.93,0.00,0.00,5.875,3371.77,');
  assert.equal(lines[85], '85,4620.03,417.68,509378.44,875991.90,0.00,0.00,10.875,5037.71,');

  const indexed = run([...feArgs, '--index', indexFixture, '--schedule']);
  assert.equal(indexed.status, 0, indexed.stderr);
  const row = indexed.stdout.trimEnd().split('\n')[85];
  assert.match(row, /,6\.92,3695\.72,4\.42$/);
});

test('arm-loan AC6 the index fixture reproduces F5', () => {
  assert.equal(fs.readFileSync(indexFixture, 'utf8'), 'month,index\n85,4.42\n');
  const report = jsonRun([...feArgs, '--index', indexFixture, '--json']);
  assert.equal(report.arm.adjustments[0].rate_percent, 6.92);
  assert.equal(report.arm.adjustments[0].payment_cents, 369572);
  assert.equal(report.arm.adjustments[0].index_percent, 4.42);
  assert.equal(report.interest_cents, 106408179);
});

test('arm-loan --fixed-months, --round-eighth, --initial-floor, and extras reach the walk', () => {
  const tenOne = jsonRun([
    '--amount', '570000', '--rate', '5.875', '--years', '30',
    '--fixed-months', '120', '--adjust-months', '12', '--margin', '2.5',
    '--caps', '5/2/5', '--floor', '2.5', '--json',
  ]);
  assert.equal(tenOne.arm.adjustments[0].month, 121);
  assert.equal(tenOne.interest_cents, 100262267);

  const rounded = jsonRun([...feArgs, '--index', indexFixture, '--round-eighth', '--json']);
  assert.equal(rounded.arm.round_eighth, true);
  assert.equal(rounded.arm.adjustments[0].rate_percent, 6.875);
  assert.equal(rounded.interest_cents, 106345915);

  const floor = jsonRun([...feArgs, '--initial-floor', '3', '--json']);
  assert.equal(floor.arm.initial_floor_percent, 3);
  assert.equal(floor.arm.floor_percent, 2.5);

  const extra = jsonRun([...feArgs, '--extra', firstYear, '--json']);
  assert.equal(extra.interest_saved_cents, 357936);
  assert.equal(extra.months_saved, 0);
  assert.equal(extra.arm.adjustments[0].payment_cents, 502039);

  const zeroCaps = jsonRun([...feWith('--floor', '5.875').map((v, i, a) => (a[i - 1] === '--caps' ? '0/0/0' : a[i - 1] === '--margin' ? '0' : v)), '--json']);
  assert.equal(zeroCaps.arm.ceiling_percent, 5.875);
  assert.equal(zeroCaps.arm.max_rate_percent, 5.875);
});

test('arm-loan AC6 conflicting and missing ARM flags exit non-zero and name the flags', () => {
  const base = ['--amount', '570000', '--rate', '5.875', '--years', '30'];
  const both = failure([...feArgs, '--fixed-months', '84']);
  assert.match(both, /--fixed-years/);
  assert.match(both, /--fixed-months/);

  const noCaps = failure([...base, '--fixed-years', '7']);
  assert.match(noCaps, /--adjust-months/);
  assert.match(noCaps, /--margin/);
  assert.match(noCaps, /--caps/);
  assert.match(noCaps, /--floor/);

  const missingFixed = failure([
    ...base, '--adjust-months', '12', '--margin', '2.5', '--caps', '5/2/5', '--floor', '2.5',
  ]);
  assert.match(missingFixed, /--fixed-years or --fixed-months/);

  for (const flags of [
    ['--index', indexFixture],
    ['--initial-floor', '2.5'],
    ['--round-eighth'],
  ]) {
    const message = failure([...base, ...flags]);
    assert.match(message, /missing required ARM argument/);
    assert.match(message, /--caps/);
  }
});

test('arm-loan AC5 the CLI prints the library message for a rejected term', () => {
  const fixedEqualsTerm = failure(feWith('--fixed-years', '30'));
  assert.match(fixedEqualsTerm, /^ARM fixed period \(fixedMonths\) must be at least 1 month and shorter than the 360-month term\n$/);

  const floorAbove = failure(feWith('--floor', '11'));
  assert.match(floorAbove, /^ARM lifetime floor \(floorThousandths\) must not be above the ceiling/);

  const floorZero = failure(feWith('--floor', '0'));
  assert.match(floorZero, /^ARM lifetime floor \(floorThousandths\) must be greater than zero\n$/);

  withCsv('month,index\n86,4.42\n', (file) => {
    const message = failure([...feArgs, '--index', file]);
    assert.equal(message, 'ARM index month 86 is not an adjustment month\n');
  });
  withCsv('month,index\n84,4.42\n', (file) => {
    assert.match(failure([...feArgs, '--index', file]), /month 84 is not an adjustment month/);
  });
  withCsv('month,index\n361,4.42\n', (file) => {
    assert.match(failure([...feArgs, '--index', file]), /month 361 is not an adjustment month/);
  });
});

test('arm-loan AC5 the CLI rejects a duplicate index month and a negative cap at parse time', () => {
  withCsv('month,index\n85,4.42\n85,4.00\n', (file) => {
    const message = failure([...feArgs, '--index', file]);
    assert.match(message, /invalid --index: month 85 on row 3 is a duplicate/);
  });
  const caps = failure(feWith('--caps', '5/-2/5'));
  assert.match(caps, /invalid --caps/);
  assert.match(failure(feWith('--caps', '5/2')), /invalid --caps/);
  assert.match(failure(feWith('--caps', '5/2/5/1')), /invalid --caps/);
});

test('arm-loan ARM flag grammar', () => {
  const base = ['--amount', '570000', '--rate', '5.875', '--years', '30'];
  const arm = ['--fixed-years', '7', '--adjust-months', '12', '--margin', '2.5', '--caps', '5/2/5', '--floor', '2.5'];
  function swap(flag, value) {
    const copy = [...arm];
    copy[copy.indexOf(flag) + 1] = value;
    return [...base, ...copy];
  }
  assert.match(failure(swap('--margin', '2.5001')), /invalid --margin/);
  assert.match(failure(swap('--margin', '-1')), /missing value for --margin|invalid --margin/);
  assert.match(failure(swap('--margin', 'abc')), /invalid --margin/);
  assert.match(failure(swap('--floor', '2.5001')), /invalid --floor/);
  assert.match(failure(swap('--fixed-years', '0')), /invalid --fixed-years/);
  assert.match(failure(swap('--fixed-years', '7.5')), /invalid --fixed-years/);
  assert.match(failure(swap('--adjust-months', '0')), /invalid --adjust-months/);
  assert.match(failure(swap('--caps', '5/2/5x')), /invalid --caps/);
  assert.match(failure([...base, ...arm, '--initial-floor', 'x']), /invalid --initial-floor/);
  assert.match(failure([...base, ...arm, '--round-eighth', '--round-eighth']), /duplicate argument: --round-eighth/);
  assert.match(failure([...base, ...arm, '--index', '/nonexistent/index.csv']), /cannot read --index file: ENOENT/);
  const zero = run(swap('--margin', '0'));
  assert.equal(zero.status, 0, zero.stderr);
  assert.match(failure(swap('--fixed-years', '30')), /fixed period/);
});

test('arm-loan --index CSV rules mirror --extra', () => {
  withCsv('month,rate\n85,4.42\n', (file) => {
    assert.match(failure([...feArgs, '--index', file]), /header must be month,index/);
  });
  withCsv('month,index\n85\n', (file) => {
    assert.match(failure([...feArgs, '--index', file]), /must have columns month and index/);
  });
  withCsv('month,index\n85,-1\n', (file) => {
    assert.match(failure([...feArgs, '--index', file]), /invalid --index: index on row 2/);
  });
  withCsv('month,index\n85,4.4201\n', (file) => {
    assert.match(failure([...feArgs, '--index', file]), /invalid --index: index on row 2/);
  });
  withCsv('month,index\n\n85,4.42\n', (file) => {
    assert.match(failure([...feArgs, '--index', file]), /row 2 is empty/);
  });
  withCsv('\ufeffmonth,index\r\n85,4.42\r\n', (file) => {
    const report = jsonRun([...feArgs, '--index', file, '--json']);
    assert.equal(report.interest_cents, 106408179);
  });
  withCsv('month,index\n', (file) => {
    const report = jsonRun([...feArgs, '--index', file, '--json']);
    assert.equal(report.interest_cents, 110363633);
  });
  withCsv('month,index\n85,0\n', (file) => {
    const report = jsonRun([...feArgs, '--index', file, '--json']);
    assert.equal(report.arm.adjustments[0].rate_percent, 2.5);
  });
});
