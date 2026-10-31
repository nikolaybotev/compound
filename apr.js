'use strict';

const { buildReport, dollarsToCents } = require('./amortize.js');

const PREPAID_KINDS = new Set([
  'points',
  'lender-fee',
  'prepaid-interest',
  'mortgage-insurance-premium',
]);

function halfUpQuotient(numerator, denominator) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error('amount could not be rounded');
  }
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  if (remainder * 2 >= denominator) return quotient + 1;
  return quotient;
}

function classifyCharges(charges) {
  if (!Array.isArray(charges)) {
    throw new Error('charges must be an array');
  }
  let prepaid = 0;
  let excluded = 0;
  for (const item of charges) {
    if (item === null || typeof item !== 'object') {
      throw new Error('each charge must be an object');
    }
    const { cents, kind } = item;
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new Error('charge cents must be a non-negative safe integer');
    }
    if (kind === 'lender-credit') {
      prepaid = Math.max(0, prepaid - cents);
      continue;
    }
    if (PREPAID_KINDS.has(kind)) {
      prepaid += cents;
      continue;
    }
    const excludedKinds = new Set([
      'application-fee',
      'appraisal',
      'credit-report',
      'flood',
      'tax-service',
      'title',
      'survey',
      'document-preparation',
      'notary',
      'recording',
      'transfer-tax',
      'property-insurance',
      'property-tax',
      'escrow',
      'pest',
      'owners-title',
    ]);
    if (excludedKinds.has(kind)) {
      excluded += cents;
      continue;
    }
    throw new Error('unknown finance-charge kind');
  }
  return { prepaid_finance_charge_cents: prepaid, excluded_cents: excluded };
}

function isIrregularStream(paymentCents) {
  if (paymentCents.length < 2) return false;
  const last = paymentCents.length - 1;
  const reference = paymentCents[0];
  for (let i = 1; i < last; i += 1) {
    if (paymentCents[i] !== reference) return true;
  }
  return false;
}

function presentValueCents(monthlyRate, paymentCents, oddDays) {
  const f = oddDays;
  let total = 0;
  for (let k = 0; k < paymentCents.length; k += 1) {
    const payment = paymentCents[k] / 100;
    const period = k + 1;
    let factor;
    if (f === 0) {
      factor = (1 + monthlyRate) ** period;
    } else {
      factor = (1 + (f / 30) * monthlyRate) * ((1 + monthlyRate) ** period);
    }
    total += payment / factor;
  }
  return total * 100;
}

function aprThousandthsFromMonthlyRate(monthlyRate) {
  const scale = 1_000_000_000_000n;
  const scaled = BigInt(Math.round(monthlyRate * 12 * 100 * 1000 * Number(scale)));
  const numerator = scaled;
  const denominator = scale;
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder * 2n >= denominator) {
    return Number(quotient + 1n);
  }
  return Number(quotient);
}

function actuarialAprThousandths(amountFinancedCents, paymentCents, oddDays) {
  if (!Number.isSafeInteger(amountFinancedCents) || amountFinancedCents <= 0) {
    throw new Error('amount financed must be a positive safe integer');
  }
  if (!Array.isArray(paymentCents) || paymentCents.length === 0) {
    throw new Error('payment stream must be a non-empty array');
  }
  if (!Number.isSafeInteger(oddDays) || oddDays < 0 || oddDays > 29) {
    throw new Error('oddDays must be an integer from 0 through 29');
  }
  for (const payment of paymentCents) {
    if (!Number.isSafeInteger(payment) || payment < 0) {
      throw new Error('each payment must be a non-negative safe integer');
    }
  }

  const irregular = isIrregularStream(paymentCents);
  const tolerance_thousandths = irregular ? 250 : 125;

  let lo = 0;
  let hi = 0.01;
  while (presentValueCents(hi, paymentCents, oddDays) > amountFinancedCents) {
    hi *= 2;
    if (hi > 10) throw new Error('APR could not be solved');
  }
  while (hi - lo > 1e-15) {
    const mid = (lo + hi) / 2;
    const pv = presentValueCents(mid, paymentCents, oddDays);
    if (pv > amountFinancedCents) lo = mid;
    else hi = mid;
  }
  const monthlyRate = hi;
  const apr_thousandths = aprThousandthsFromMonthlyRate(monthlyRate);

  return { apr_thousandths, irregular, tolerance_thousandths };
}

function isResetMonth(month, arm) {
  const first = arm.fixedMonths + 1;
  return month >= first && (month - first) % arm.adjustMonths === 0;
}

function termMidpoint(monthCount) {
  if (monthCount % 2 === 0) return monthCount / 2;
  return Math.ceil(monthCount / 2);
}

function resolveMiMonths(schedule, monthCount, originalValueCents, explicitMiMonths) {
  if (explicitMiMonths !== undefined) {
    if (!Number.isSafeInteger(explicitMiMonths) || explicitMiMonths < 1 || explicitMiMonths > monthCount) {
      throw new Error('insurance month count must be from 1 through the term');
    }
    return explicitMiMonths;
  }
  const threshold = halfUpQuotient(originalValueCents * 78, 100);
  const midpoint = termMidpoint(monthCount);
  for (const row of schedule) {
    if (row.month > midpoint) break;
    if (row.remaining_principal_cents <= threshold) {
      return row.month;
    }
  }
  return midpoint;
}

function fillArmIndex(arm, monthCount, currentIndexThousandths) {
  if (currentIndexThousandths === undefined) {
    throw new Error('an ARM APR needs the index at consummation');
  }
  if (!Number.isSafeInteger(currentIndexThousandths) || currentIndexThousandths < 0) {
    throw new Error('current index must be a non-negative safe integer');
  }
  const indexByMonth = new Map();
  for (let month = 1; month <= monthCount; month += 1) {
    if (isResetMonth(month, arm)) {
      indexByMonth.set(month, currentIndexThousandths);
    }
  }
  return { ...arm, indexByMonth };
}

function buildAprReport(
  principal,
  ratePercent,
  monthCount,
  prepaidFinanceChargeCents,
  monthlyInsuranceCents,
  options = {},
) {
  const {
    originalValueCents: originalValueOpt,
    miMonths: miMonthsOpt,
    oddDays = 0,
    arm,
    currentIndexThousandths,
    yearsForJson,
  } = options;

  const amount_cents = dollarsToCents(principal);
  if (!Number.isSafeInteger(prepaidFinanceChargeCents) || prepaidFinanceChargeCents < 0) {
    throw new Error('prepaid finance charge must be a non-negative safe integer');
  }
  const amount_financed_cents = amount_cents - prepaidFinanceChargeCents;
  if (!Number.isSafeInteger(amount_financed_cents) || amount_financed_cents <= 0) {
    throw new Error('amount financed must be a positive safe integer');
  }
  if (!Number.isSafeInteger(monthlyInsuranceCents) || monthlyInsuranceCents < 0) {
    throw new Error('monthly insurance must be a non-negative safe integer');
  }
  if (!Number.isSafeInteger(oddDays) || oddDays < 0 || oddDays > 29) {
    throw new Error('oddDays must be an integer from 0 through 29');
  }

  const originalValueCents = originalValueOpt !== undefined ? originalValueOpt : amount_cents;

  let walkArm;
  if (arm !== undefined) {
    walkArm = fillArmIndex(arm, monthCount, currentIndexThousandths);
  }

  const walk = buildReport(
    principal,
    ratePercent,
    monthCount,
    new Map(),
    yearsForJson,
    walkArm,
  );

  const mi_months = monthlyInsuranceCents > 0
    ? resolveMiMonths(walk.schedule, monthCount, originalValueCents, miMonthsOpt)
    : 0;

  const paymentCents = [];
  for (const row of walk.schedule) {
    let payment = walkArm !== undefined ? row.payment_cents : walk.monthly_payment_cents;
    if (row.month <= mi_months) {
      payment += monthlyInsuranceCents;
    }
    paymentCents.push(payment);
  }

  const { apr_thousandths, irregular, tolerance_thousandths } = actuarialAprThousandths(
    amount_financed_cents,
    paymentCents,
    oddDays,
  );

  const interest_cents = walk.interest_cents;
  const mortgage_insurance_cents = monthlyInsuranceCents * mi_months;
  const finance_charge_cents = prepaidFinanceChargeCents + interest_cents + mortgage_insurance_cents;

  return {
    amount_cents,
    amount_financed_cents,
    prepaid_finance_charge_cents: prepaidFinanceChargeCents,
    interest_cents,
    mortgage_insurance_cents,
    finance_charge_cents,
    apr_thousandths,
    irregular,
    tolerance_thousandths,
    mi_months,
    odd_days: oddDays,
  };
}

function withinTolerance(computedThousandths, disclosedThousandths, toleranceThousandths) {
  return Math.abs(computedThousandths - disclosedThousandths) <= toleranceThousandths;
}

function disclosedAprThousandths(percentText) {
  const [whole, fraction = ''] = percentText.split('.');
  const frac = `${fraction}000`.slice(0, 3);
  return Number(whole) * 1000 + Number(frac);
}

function formatAprPercent(aprThousandths) {
  const whole = Math.trunc(aprThousandths / 1000);
  let fraction = String(aprThousandths % 1000).padStart(3, '0');
  fraction = fraction.replace(/0+$/, '');
  if (fraction.length === 0) return `${whole}%`;
  return `${whole}.${fraction}%`;
}

module.exports = {
  classifyCharges,
  actuarialAprThousandths,
  buildAprReport,
  withinTolerance,
  disclosedAprThousandths,
  formatAprPercent,
  halfUpQuotient,
};
