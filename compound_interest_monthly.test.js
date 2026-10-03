'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
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
