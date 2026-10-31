'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildReport } = require('./amortize.js');
const {
  actuarialAprThousandths,
  buildAprReport,
  classifyCharges,
  disclosedAprThousandths,
  withinTolerance,
} = require('./apr.js');

const appendixJVaryingYearly = [
  291.81, 300.18, 308.78, 317.61, 326.65, 335.92, 345.42, 355.15, 365.12, 375.33,
  385.76, 385.42, 385.03, 384.62, 384.17, 383.67, 383.13, 382.54, 381.90, 381.20,
  380.43, 379.60, 378.68, 377.69, 376.60, 375.42, 374.13, 372.72, 371.18, 369.50,
];

function varyingMortgagePayments() {
  const payments = [];
  for (const dollars of appendixJVaryingYearly) {
    const cents = Math.round(dollars * 100);
    for (let i = 0; i < 12; i += 1) payments.push(cents);
  }
  return payments;
}

function loanEstimateCharges() {
  return [
    { cents: 40500, kind: 'points' },
    { cents: 30000, kind: 'application-fee' },
    { cents: 109700, kind: 'lender-fee' },
    { cents: 40500, kind: 'appraisal' },
    { cents: 3000, kind: 'credit-report' },
    { cents: 2000, kind: 'flood' },
    { cents: 3200, kind: 'flood' },
    { cents: 7500, kind: 'tax-service' },
    { cents: 11000, kind: 'tax-service' },
    { cents: 13500, kind: 'pest' },
    { cents: 6500, kind: 'survey' },
    { cents: 70000, kind: 'title' },
    { cents: 53500, kind: 'title' },
    { cents: 50200, kind: 'title' },
    { cents: 126100, kind: 'title' },
    { cents: 8500, kind: 'recording' },
    { cents: 26200, kind: 'prepaid-interest' },
    { cents: 60500, kind: 'property-insurance' },
    { cents: 41300, kind: 'escrow' },
    { cents: 101700, kind: 'owners-title' },
  ];
}

function feArm(overrides = {}) {
  return {
    fixedMonths: 84,
    adjustMonths: 12,
    marginThousandths: 2500,
    initialCapThousandths: 5000,
    periodicCapThousandths: 2000,
    lifetimeCapThousandths: 5000,
    floorThousandths: 2500,
    initialFloorThousandths: 2500,
    roundEighth: false,
    indexByMonth: new Map(),
    ...overrides,
  };
}

function filledIndexArm(currentIndexThousandths) {
  const arm = feArm();
  const indexByMonth = new Map();
  for (let month = 85; month <= 360; month += 12) {
    indexByMonth.set(month, currentIndexThousandths);
  }
  return { ...arm, indexByMonth };
}

test('AC1 Appendix J actuarial examples', () => {
  const regular = actuarialAprThousandths(500000, Array(24).fill(23000), 0);
  assert.equal(regular.apr_thousandths, 9686);
  assert.equal(regular.irregular, false);
  assert.equal(regular.tolerance_thousandths, 125);
  assert.equal(Math.round(regular.apr_thousandths / 10) / 100, 9.69);

  const odd = actuarialAprThousandths(600000, Array(36).fill(20000), 19);
  assert.equal(odd.apr_thousandths, 11817);
  assert.equal(odd.irregular, false);
  assert.equal(Math.round(odd.apr_thousandths / 10) / 100, 11.82);

  const varying = actuarialAprThousandths(3968856, varyingMortgagePayments(), 21);
  assert.equal(Math.round(varying.apr_thousandths / 10) / 100, 9.8);
  assert.equal(varying.irregular, true);
});

test('AC2 the published fixed-rate Closing Disclosure sample', () => {
  const report = buildAprReport(162000, 3.875, 360, 0, 8235, {
    originalValueCents: 18000000,
  });
  assert.equal(report.mi_months, 80);
  assert.equal(report.interest_cents, 11224227);
  assert.equal(report.mortgage_insurance_cents, 658800);
  assert.equal(report.finance_charge_cents, 11883027);
  assert.equal(report.amount_financed_cents, 16200000);
  assert.equal(report.apr_thousandths, 4174);
  assert.equal(report.irregular, true);
  assert.equal(report.tolerance_thousandths, 250);
  const walk = buildReport(162000, 3.875, 360, new Map(), 30);
  assert.equal(walk.monthly_payment_cents, 76178);
});

test('AC3 the published fixed-rate Loan Estimate sample', () => {
  const { prepaid_finance_charge_cents, excluded_cents } = classifyCharges(loanEstimateCharges());
  assert.equal(prepaid_finance_charge_cents, 176400);
  assert.ok(excluded_cents > 0);
  const report = buildAprReport(162000, 3.875, 360, prepaid_finance_charge_cents, 8235, {
    originalValueCents: 18000000,
  });
  assert.equal(report.amount_financed_cents, 16023600);
  assert.equal(report.finance_charge_cents, 12059427);
  assert.equal(report.apr_thousandths, 4269);
  assert.equal(
    withinTolerance(report.apr_thousandths, disclosedAprThousandths('4.274'), report.tolerance_thousandths),
    true,
  );
});

test('AC5 discounted ARM consummation index', () => {
  const arm = feArm();
  const high = buildAprReport(570000, 5.875, 360, 0, 0, {
    arm,
    currentIndexThousandths: 4000,
  });
  assert.equal(high.apr_thousandths, 6181);
  assert.equal(high.irregular, true);

  const level = buildAprReport(570000, 5.875, 360, 0, 0, {
    arm,
    currentIndexThousandths: 3375,
  });
  assert.equal(level.apr_thousandths, 5875);
  assert.equal(level.irregular, false);

  assert.throws(
    () => buildAprReport(570000, 5.875, 360, 0, 0, { arm }),
    /an ARM APR needs the index at consummation/,
  );

  const partialIndex = buildReport(
    570000,
    5.875,
    360,
    new Map(),
    undefined,
    { ...arm, indexByMonth: new Map([[85, 4000]]) },
  );
  const filled = buildAprReport(570000, 5.875, 360, 0, 0, {
    arm,
    currentIndexThousandths: 4000,
  });
  const fullWalk = buildReport(
    570000,
    5.875,
    360,
    new Map(),
    undefined,
    filledIndexArm(4000),
  );
  assert.equal(partialIndex.schedule.find((r) => r.month === 85).payment_cents, fullWalk.schedule.find((r) => r.month === 85).payment_cents);
  assert.notEqual(
    partialIndex.schedule.find((r) => r.month === 97).payment_cents,
    fullWalk.schedule.find((r) => r.month === 97).payment_cents,
  );
  assert.equal(fullWalk.schedule.find((r) => r.month === 85).payment_cents, 356380);
});

test('classifyCharges rejects unknown kinds', () => {
  assert.throws(
    () => classifyCharges([{ cents: 100, kind: 'mystery' }]),
    /unknown finance-charge kind/,
  );
});

test('lender credit cannot drive prepaid below zero', () => {
  const result = classifyCharges([
    { cents: 10000, kind: 'points' },
    { cents: 15000, kind: 'lender-credit' },
  ]);
  assert.equal(result.prepaid_finance_charge_cents, 0);
});
