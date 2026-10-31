'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  percentOfCents,
  buildPictureLines,
  closingInterestDays,
} = require('./picture.js');

test('percentOfCents property tax monthly', () => {
  assert.equal(percentOfCents(60_000_000, 1150, 12), 57_500);
});

test('buildPictureLines reference fixture closing cents', () => {
  const lines = buildPictureLines({
    priceCents: 60_000_000,
    financedCents: 57_000_000,
    ratePercent: 7.25,
    monthCount: 360,
    yearsForJson: 30,
    rateThousandths: 7250,
    taxThousandths: 1250,
    insuranceThousandths: 0,
    pmiThousandths: 210,
    titleHundredThousandths: 64925,
    lenderFeesCents: 261_800,
    closingDay: 6,
    startMonth: '2026-11',
    interestBasis: '365',
    homeownersInsuranceAnnualCents: 197_200,
    taxImpoundMonths: 6,
    insuranceImpoundMonths: 3,
    miImpoundMonths: 2,
    prorationCents: 81_392,
    pointsThousandths: 250,
    sellerCreditCents: 1_000_000,
    lenderCreditCents: 0,
    earnestCents: 1_800_000,
  });
  assert.equal(lines.closingCents, 1_657_241);
  assert.equal(lines.prepaidInterestCents, 283_050);
  assert.equal(lines.insuranceImpoundCents, 49_299);
});

test('closingInterestDays November day 6', () => {
  assert.equal(closingInterestDays('2026-11', 6), 25);
});
