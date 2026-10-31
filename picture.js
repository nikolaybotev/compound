'use strict';

const { buildReport, dollarsToCents } = require('./amortize.js');

function halfUpQuotient(numerator, divisor) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new Error('picture amount is too large');
  }
  const quotient = Math.trunc(numerator / divisor);
  const remainder = numerator % divisor;
  if (remainder * 2 >= divisor) return quotient + 1;
  return quotient;
}

function centsToDollars(cents) {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const dollars = Number(`${whole}.${frac}`);
  return negative ? -dollars : dollars;
}

function percentOfCents(cents, thousandths, parts = 1) {
  if (!Number.isSafeInteger(cents) || !Number.isSafeInteger(thousandths) || !Number.isSafeInteger(parts)) {
    throw new Error('picture amount is too large');
  }
  const numerator = cents * thousandths;
  if (!Number.isSafeInteger(numerator)) throw new Error('picture amount is too large');
  const divisor = 100_000 * parts;
  if (!Number.isSafeInteger(divisor)) throw new Error('picture amount is too large');
  return halfUpQuotient(numerator, divisor);
}

function titleCentsFromPrice(priceCents, hundredThousandths) {
  if (!Number.isSafeInteger(priceCents) || !Number.isSafeInteger(hundredThousandths)) {
    throw new Error('picture amount is too large');
  }
  const numerator = priceCents * hundredThousandths;
  if (!Number.isSafeInteger(numerator)) throw new Error('picture amount is too large');
  return halfUpQuotient(numerator, 10_000_000);
}

function isLeapYear(year) {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

function closingMonthParts(startMonth) {
  const year = Number(startMonth.slice(0, 4));
  const month = Number(startMonth.slice(5, 7));
  return { year, month };
}

function clampClosingDay(day, startMonth) {
  const { year, month } = closingMonthParts(startMonth);
  const max = daysInMonth(year, month);
  return Math.min(Math.max(day, 1), max);
}

function closingInterestDays(startMonth, closingDay) {
  const { year, month } = closingMonthParts(startMonth);
  const clamped = Math.min(Math.max(closingDay, 1), daysInMonth(year, month));
  return daysInMonth(year, month) - clamped + 1;
}

function prepaidInterestCents360(baseCents, rateThousandths, days) {
  if (!Number.isSafeInteger(baseCents) || !Number.isSafeInteger(rateThousandths) || !Number.isSafeInteger(days)) {
    throw new Error('picture amount is too large');
  }
  if (days === 0) return 0;
  const numerator = baseCents * rateThousandths * days;
  if (!Number.isSafeInteger(numerator)) throw new Error('picture amount is too large');
  return halfUpQuotient(numerator, 100_000 * 360);
}

function prepaidInterestPerDiem365Cents(baseCents, rateThousandths) {
  if (!Number.isSafeInteger(baseCents) || !Number.isSafeInteger(rateThousandths)) {
    throw new Error('picture amount is too large');
  }
  const numerator = baseCents * rateThousandths;
  if (!Number.isSafeInteger(numerator)) throw new Error('picture amount is too large');
  return halfUpQuotient(numerator, 100_000 * 365);
}

function prepaidInterestCents365(baseCents, rateThousandths, days) {
  if (days === 0) return 0;
  return prepaidInterestPerDiem365Cents(baseCents, rateThousandths) * days;
}

function prepaidInterestCents(baseCents, rateThousandths, days, basis) {
  return basis === '365'
    ? prepaidInterestCents365(baseCents, rateThousandths, days)
    : prepaidInterestCents360(baseCents, rateThousandths, days);
}

function ficoBand(score) {
  if (score >= 780) return '780+';
  if (score >= 740) return '740-779';
  if (score >= 700) return '700-739';
  if (score >= 660) return '660-699';
  if (score >= 620) return '620-659';
  return 'below620';
}

const ARCH_PMI = {
  '740-779': [380, 530, 700],
  '700-739': [550, 780, 990],
  '660-699': [900, 1280, 1540],
  '620-659': [940, 1420, 1860],
  below620: [1320, 1990, 2600],
};

function pmiThousandthsForScore(downThousandths, fico) {
  if (downThousandths >= 20_000) return 0;
  const rungIndex = downThousandths >= 10_000 ? 0 : downThousandths >= 5_000 ? 1 : 2;
  if (fico >= 780) {
    return [200, 350, 450][rungIndex];
  }
  const band = ficoBand(fico);
  const row = ARCH_PMI[band];
  return row[rungIndex];
}

function buildPictureLines(input) {
  const {
    priceCents,
    financedCents,
    ratePercent,
    monthCount,
    yearsForJson,
    rateThousandths,
    taxThousandths,
    insuranceThousandths,
    pmiThousandths,
    titleHundredThousandths,
    lenderFeesCents,
    closingDay,
    startMonth,
    interestBasis,
    homeownersInsuranceAnnualCents,
    taxImpoundMonths,
    insuranceImpoundMonths,
    miImpoundMonths,
    prorationCents,
    pointsThousandths,
    sellerCreditCents,
    lenderCreditCents,
    earnestCents,
  } = input;

  const downCents = priceCents - financedCents;
  const principalAndInterestCents = buildReport(
    centsToDollars(financedCents),
    ratePercent,
    monthCount,
    new Map(),
    yearsForJson,
  ).monthly_payment_cents;
  const taxCents = percentOfCents(priceCents, taxThousandths, 12);
  const insuranceCents = percentOfCents(priceCents, insuranceThousandths, 12);
  const pmiCents = percentOfCents(financedCents, pmiThousandths, 12);
  const totalMonthlyCents = principalAndInterestCents + taxCents + insuranceCents + pmiCents;
  const titleCents = titleCentsFromPrice(priceCents, titleHundredThousandths);
  const interestDays = closingInterestDays(startMonth, closingDay);
  const prepaidInterest = prepaidInterestCents(
    financedCents,
    rateThousandths,
    interestDays,
    interestBasis,
  );
  const homeownersInsuranceCents = homeownersInsuranceAnnualCents !== undefined
    ? homeownersInsuranceAnnualCents
    : percentOfCents(priceCents, insuranceThousandths);
  const insuranceMonthlyForImpound = homeownersInsuranceAnnualCents !== undefined
    ? halfUpQuotient(homeownersInsuranceAnnualCents, 12)
    : insuranceCents;
  const taxImpoundCents = taxCents * taxImpoundMonths;
  const insuranceImpoundCents = insuranceMonthlyForImpound * insuranceImpoundMonths;
  const miImpoundCents = pmiCents === 0 ? 0 : pmiCents * miImpoundMonths;
  const closingCents = lenderFeesCents
    + titleCents
    + prepaidInterest
    + homeownersInsuranceCents
    + taxImpoundCents
    + insuranceImpoundCents
    + miImpoundCents
    + prorationCents;
  const pointsCents = percentOfCents(financedCents, pointsThousandths);
  const closingAndPointsCents = closingCents + pointsCents;
  const cashToCloseCents = downCents + closingAndPointsCents - sellerCreditCents - lenderCreditCents;
  const dueAtClosingCents = cashToCloseCents - earnestCents;

  return {
    priceCents,
    downCents,
    baseCents: financedCents,
    financedCents,
    principalAndInterestCents,
    taxCents,
    insuranceCents,
    pmiCents,
    totalMonthlyCents,
    lenderFeesCents,
    titleCents,
    prepaidInterestCents: prepaidInterest,
    prepaidInterestDays: interestDays,
    homeownersInsuranceCents,
    taxImpoundCents,
    insuranceImpoundCents,
    miImpoundCents,
    prorationCents,
    closingCents,
    pointsCents,
    closingAndPointsCents,
    cashToCloseCents,
    dueAtClosingCents,
  };
}

module.exports = {
  percentOfCents,
  titleCentsFromPrice,
  prepaidInterestCents360,
  prepaidInterestCents365,
  prepaidInterestPerDiem365Cents,
  prepaidInterestCents,
  closingInterestDays,
  daysInMonth,
  isLeapYear,
  clampClosingDay,
  closingMonthParts,
  pmiThousandthsForScore,
  buildPictureLines,
};
