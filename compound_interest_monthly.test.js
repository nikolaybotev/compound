'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const { dollarsToCents } = require('./compound_interest_monthly.js');

const script = path.join(__dirname, 'compound_interest_monthly.js');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
}

function jsonRun(args) {
  const result = run(args);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
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

  const unknown = run(['--amount', '570000', '--rate', '7', '--years', '30', '--extra', 'x.csv']);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /unknown argument/);
});
