'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const script = path.join(__dirname, 'origination_fees.js');

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
}

function jsonRun(args) {
  const result = run(args);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

test('$600,000 at 6.75% note and 7.21% APR for 30 years', () => {
  const report = jsonRun([
    '--amount', '600000', '--rate', '6.75', '--apr', '7.21', '--years', '30', '--json',
  ]);
  assert.equal(report.amount_cents, 60000000);
  assert.equal(report.rate_percent, 6.75);
  assert.equal(report.apr_percent, 7.21);
  assert.equal(report.years, 30);
  assert.equal(report.months, 360);
  assert.equal(report.monthly_payment_cents, 389159);
  assert.equal(report.amount_financed_cents, 57274280);
  assert.equal(report.finance_charge_cents, 2725720);
  assert.equal(report.points_thousandths, 4543);
  assert.equal(
    report.amount_cents,
    report.amount_financed_cents + report.finance_charge_cents,
  );
  assert.equal('price_cents' in report, false);
  assert.equal('down_payment_cents' in report, false);
  assert.equal('down_percent' in report, false);

  const summary = run([
    '--amount', '600000', '--rate', '6.75', '--apr', '7.21', '--years', '30',
  ]);
  assert.equal(summary.status, 0, summary.stderr);
  assert.equal(
    summary.stdout,
    [
      'Loan amount: 600,000.00',
      'Note rate: 6.75%',
      'APR: 7.21%',
      'Months: 360',
      'Years: 30',
      'Monthly payment: 3,891.59',
      'Amount financed: 572,742.80',
      'Prepaid finance charge: 27,257.20',
      'Points: 4.543%',
      '',
    ].join('\n'),
  );
});

test('$599,446.72 at 6.75% note and 7.21% APR pays 388800 cents', () => {
  const report = jsonRun([
    '--amount', '599446.72', '--rate', '6.75', '--apr', '7.21', '--years', '30', '--json',
  ]);
  assert.equal(report.amount_cents, 59944672);
  assert.equal(report.monthly_payment_cents, 388800);
  assert.equal(report.amount_financed_cents, 57221466);
  assert.equal(report.finance_charge_cents, 2723206);
  assert.equal(report.points_thousandths, 4543);
});

test('the same 30-year loan passed as 360 months omits years', () => {
  const report = jsonRun([
    '--amount', '600000', '--rate', '6.75', '--apr', '7.21', '--months', '360', '--json',
  ]);
  assert.equal(report.months, 360);
  assert.equal('years' in report, false);
  assert.equal(report.finance_charge_cents, 2725720);
  assert.equal(report.monthly_payment_cents, 389159);
});

test('a 15-year term is not the 30-year charge', () => {
  const report = jsonRun([
    '--amount', '600000', '--rate', '6.75', '--apr', '7.21', '--years', '15', '--json',
  ]);
  assert.equal(report.years, 15);
  assert.equal(report.months, 180);
  assert.equal(report.monthly_payment_cents, 530946);
  assert.equal(report.amount_financed_cents, 58306620);
  assert.equal(report.finance_charge_cents, 1693380);
});

test('equal note rate and APR is a zero finance charge', () => {
  const report = jsonRun([
    '--amount', '600000', '--rate', '6.75', '--apr', '6.75', '--years', '30', '--json',
  ]);
  assert.equal(report.finance_charge_cents, 0);
  assert.equal(report.points_thousandths, 0);
  assert.equal(report.amount_financed_cents, 60000000);
  assert.equal(report.monthly_payment_cents, 389159);
});

test('an APR below the note rate is a lender credit', () => {
  const report = jsonRun([
    '--amount', '600000', '--rate', '6.75', '--apr', '6.5', '--years', '30', '--json',
  ]);
  assert.equal(report.monthly_payment_cents, 389159);
  assert.equal(report.amount_financed_cents, 61569142);
  assert.equal(report.finance_charge_cents, -1569142);
  assert.equal(report.points_thousandths, -2615);
  assert.equal(
    report.amount_cents,
    report.amount_financed_cents + report.finance_charge_cents,
  );

  const summary = run([
    '--amount', '600000', '--rate', '6.75', '--apr', '6.5', '--years', '30',
  ]);
  assert.equal(summary.status, 0, summary.stderr);
  assert.match(summary.stdout, /Lender credit: 15,691\.42/);
  assert.match(summary.stdout, /Points: -2\.615%/);
});

test('purchase price minus a dollar down payment is the loan amount', () => {
  const report = jsonRun([
    '--price', '750000', '--down', '150000', '--rate', '6.75', '--apr', '7.21',
    '--years', '30', '--json',
  ]);
  assert.equal(report.price_cents, 75000000);
  assert.equal(report.down_payment_cents, 15000000);
  assert.equal(report.amount_cents, 60000000);
  assert.equal(report.finance_charge_cents, 2725720);
  assert.equal('down_percent' in report, false);
});

test('a percent down payment is applied in cents before the fee', () => {
  const twenty = jsonRun([
    '--price', '750000', '--down-percent', '20', '--rate', '6.75', '--apr', '7.21',
    '--years', '30', '--json',
  ]);
  assert.equal(twenty.down_percent, 20);
  assert.equal(twenty.amount_cents, 60000000);
  assert.equal(twenty.finance_charge_cents, 2725720);
  assert.equal('down_payment_cents' in twenty, false);

  const fha = jsonRun([
    '--price', '500000', '--down-percent', '3.5', '--rate', '6.75', '--apr', '7.21',
    '--years', '30', '--json',
  ]);
  assert.equal(fha.amount_cents, 48250000);
  assert.equal(fha.down_percent, 3.5);

  const odd = jsonRun([
    '--price', '333333.33', '--down-percent', '3.5', '--rate', '6.75', '--apr', '7.21',
    '--years', '30', '--json',
  ]);
  assert.equal(odd.price_cents, 33333333);
  assert.equal(odd.amount_cents, 32166666);

  const none = jsonRun([
    '--price', '600000', '--down-percent', '0', '--rate', '6.75', '--apr', '7.21',
    '--years', '30', '--json',
  ]);
  assert.equal(none.amount_cents, 60000000);
  assert.equal(none.finance_charge_cents, 2725720);
});

test('$570,000 at 7% uses the amortization payment', () => {
  const report = jsonRun([
    '--amount', '570000', '--rate', '7', '--apr', '7.125', '--years', '30', '--json',
  ]);
  assert.equal(report.monthly_payment_cents, 379222);
  assert.equal(report.amount_financed_cents, 56287961);
  assert.equal(report.finance_charge_cents, 712039);
});

test('missing arguments name what is required and do not invent a loan', () => {
  const bare = run([]);
  assert.notEqual(bare.status, 0);
  assert.equal(bare.stdout, '');
  assert.match(bare.stderr, /--amount or --price/);
  assert.match(bare.stderr, /--rate/);
  assert.match(bare.stderr, /--apr/);
  assert.match(bare.stderr, /--years/);
  assert.match(bare.stderr, /--months/);
  assert.doesNotMatch(bare.stdout + bare.stderr, /600,?000/);
  assert.doesNotMatch(bare.stdout + bare.stderr, /855,?000/);

  const noApr = run(['--amount', '600000', '--rate', '6.75', '--years', '30']);
  assert.notEqual(noApr.status, 0);
  assert.match(noApr.stderr, /missing required argument: --apr/);

  const noTerm = run(['--amount', '600000', '--rate', '6.75', '--apr', '7.21']);
  assert.notEqual(noTerm.status, 0);
  assert.match(noTerm.stderr, /exactly one of --years or --months is required/);

  const bothTerms = run([
    '--amount', '600000', '--rate', '6.75', '--apr', '7.21', '--years', '30', '--months', '360',
  ]);
  assert.notEqual(bothTerms.status, 0);
  assert.match(bothTerms.stderr, /exactly one of --years or --months is required/);
});

test('loan-size flags cannot be mixed, and a down payment cannot consume the price', () => {
  const mixed = run([
    '--amount', '600000', '--price', '750000', '--down', '150000',
    '--rate', '6.75', '--apr', '7.21', '--years', '30',
  ]);
  assert.notEqual(mixed.status, 0);
  assert.match(mixed.stderr, /--amount cannot be combined/);

  const bothDowns = run([
    '--price', '750000', '--down', '150000', '--down-percent', '20',
    '--rate', '6.75', '--apr', '7.21', '--years', '30',
  ]);
  assert.notEqual(bothDowns.status, 0);
  assert.match(bothDowns.stderr, /exactly one of --down or --down-percent/);

  const downOnly = run(['--down', '150000', '--rate', '6.75', '--apr', '7.21', '--years', '30']);
  assert.notEqual(downOnly.status, 0);
  assert.match(downOnly.stderr, /--price is required/);

  const priceOnly = run(['--price', '750000', '--rate', '6.75', '--apr', '7.21', '--years', '30']);
  assert.notEqual(priceOnly.status, 0);
  assert.match(priceOnly.stderr, /--price requires --down or --down-percent/);

  const consumed = run([
    '--price', '100000', '--down', '100000', '--rate', '6.75', '--apr', '7.21', '--years', '30',
  ]);
  assert.notEqual(consumed.status, 0);
  assert.match(consumed.stderr, /down payment must be less than the purchase price/);

  const allDown = run([
    '--price', '100000', '--down-percent', '100', '--rate', '6.75', '--apr', '7.21', '--years', '30',
  ]);
  assert.notEqual(allDown.status, 0);
  assert.match(allDown.stderr, /less than 100/);
});

test('rates reject zero, a fourth decimal, and an unknown flag', () => {
  const zeroApr = run(['--amount', '600000', '--rate', '6.75', '--apr', '0', '--years', '30']);
  assert.notEqual(zeroApr.status, 0);
  assert.match(zeroApr.stderr, /invalid --apr/);

  const longApr = run(['--amount', '600000', '--rate', '6.75', '--apr', '7.2101', '--years', '30']);
  assert.notEqual(longApr.status, 0);
  assert.match(longApr.stderr, /at most three decimal places/);

  const unknown = run(['--amount', '600000', '--rate', '6.75', '--apr', '7.21', '--years', '30', '--schedule']);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /unknown argument: --schedule/);

  const duplicate = run([
    '--amount', '600000', '--rate', '6.75', '--apr', '7.21', '--apr', '7.22', '--years', '30',
  ]);
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /duplicate argument: --apr/);
});
