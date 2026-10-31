'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  paymentDate,
  dueDate,
  yearsAndMonths,
  formatPayoffDate,
} = require('./calendar.js');

test('formatPayoffDate sample', () => {
  assert.equal(formatPayoffDate('2026-10', 360), 'November 1, 2056 (30 years)');
});

test('paymentDate first payment', () => {
  assert.deepEqual(paymentDate('2026-10', 1), { year: 2026, month: 11 });
});

test('yearsAndMonths thirteen', () => {
  assert.equal(yearsAndMonths(13), '1 year 1 month');
});

test('dueDate is next month after accrual', () => {
  const accrual = paymentDate('2026-10', 1);
  const due = dueDate('2026-10', 1);
  assert.equal(due.month, accrual.month === 12 ? 1 : accrual.month + 1);
});
