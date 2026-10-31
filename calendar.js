'use strict';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function paymentDate(startMonth, paymentNumber) {
  const startYear = Number(startMonth.slice(0, 4));
  const startIndex = Number(startMonth.slice(5, 7)) - 1;
  const index = startYear * 12 + startIndex + paymentNumber;
  return {
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  };
}

function dueDate(startMonth, paymentNumber) {
  return paymentDate(startMonth, paymentNumber + 1);
}

function yearsAndMonths(months) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (rest > 0 || years === 0) parts.push(`${rest} ${rest === 1 ? 'month' : 'months'}`);
  return parts.join(' ');
}

function formatPayoffDate(startMonth, payoffMonth) {
  const due = dueDate(startMonth, payoffMonth);
  return `${MONTH_NAMES[due.month - 1]} 1, ${due.year} (${yearsAndMonths(payoffMonth)})`;
}

module.exports = {
  paymentDate,
  dueDate,
  yearsAndMonths,
  formatPayoffDate,
};
