'use strict';

// Fixed-rate and fixed-then-adjusting (ARM) mortgage amortization.
// The monthly rate is the note rate divided by 12 (30/360). The walk keeps the
// exact payment and exact interest. Extra principal is applied after that
// month's interest. Reported amounts are rounded half up to the cent once, at output.
// ARM rates, caps, floors, and index values are integer thousandths of a percent.

// Half up to the cent. Do not use Math.round(dollars * 100): Math.round(1.005 * 100) is 100.
function dollarsToCents(dollars) {
  if (!Number.isFinite(dollars)) {
    throw new Error('amount is not a finite number of dollars');
  }
  const negative = dollars < 0;
  const shifted = Number(`${Math.abs(dollars)}e2`);
  if (!Number.isFinite(shifted)) {
    throw new Error('amount could not be rounded to cents');
  }
  const cents = Math.round(shifted);
  if (!Number.isSafeInteger(cents)) {
    throw new Error('amount is too large to store in cents');
  }
  return negative ? -cents : cents;
}

function formatGroupedCents(cents) {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}.${frac}`;
}

function formatPlainCents(cents) {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

function walk(principal, annualPercent, n, extrasByMonth) {
  const r = (annualPercent / 100) / 12;
  const payment = principal * ((r * ((1 + r) ** n)) / (((1 + r) ** n) - 1));
  let balance = principal;
  let interestTotal = 0;
  let extraApplied = 0;
  let extraUnapplied = 0;
  let payoffMonth = n;
  let paidOff = false;
  const rows = [];

  for (let month = 1; month <= n; month += 1) {
    const requestedExtra = extrasByMonth.get(month) || 0;
    if (paidOff) {
      extraUnapplied += requestedExtra;
      rows.push({
        month,
        interest: 0,
        principalApplied: 0,
        remainingPrincipal: 0,
        extraApplied: 0,
        cumulativeInterest: interestTotal,
      });
      continue;
    }

    const interest = balance * r;
    const scheduledPrincipal = payment - interest;
    const finishes = scheduledPrincipal + requestedExtra >= balance || month === n;
    let principalApplied;
    let appliedExtra;
    if (finishes) {
      appliedExtra = Math.min(requestedExtra, balance);
      extraUnapplied += requestedExtra - appliedExtra;
      principalApplied = balance - appliedExtra;
      balance = 0;
      paidOff = true;
      payoffMonth = month;
    } else {
      appliedExtra = requestedExtra;
      principalApplied = scheduledPrincipal;
      balance -= scheduledPrincipal + requestedExtra;
    }
    interestTotal += interest;
    extraApplied += appliedExtra;
    rows.push({
      month,
      interest,
      principalApplied,
      remainingPrincipal: balance,
      extraApplied: appliedExtra,
      cumulativeInterest: interestTotal,
    });
  }

  for (const row of rows) {
    row.remainingInterest = interestTotal - row.cumulativeInterest;
  }

  return {
    payment,
    rows,
    interestTotal,
    extraApplied,
    extraUnapplied,
    payoffMonth,
  };
}

function scheduleRows(actual, baseline, interestSavedCents) {
  const through = baseline.payoffMonth;
  return actual.rows.slice(0, through).map((row, index, list) => {
    const base = baseline.rows[index];
    const last = index === list.length - 1;
    return {
      month: row.month,
      interest_cents: dollarsToCents(row.interest),
      principal_cents: dollarsToCents(row.principalApplied),
      remaining_principal_cents: dollarsToCents(row.remainingPrincipal),
      remaining_interest_cents: dollarsToCents(row.remainingInterest),
      extra_cents: dollarsToCents(row.extraApplied),
      interest_saved_cents: last
        ? interestSavedCents
        : dollarsToCents(base.cumulativeInterest - row.cumulativeInterest),
    };
  });
}

function paymentFor(balance, monthlyRate, payments) {
  const growth = (1 + monthlyRate) ** payments;
  return balance * ((monthlyRate * growth) / (growth - 1));
}

function isResetMonth(month, arm) {
  const first = arm.fixedMonths + 1;
  return month >= first && (month - first) % arm.adjustMonths === 0;
}

function validateArm(arm, ratePercent, monthCount) {
  if (arm === null || typeof arm !== 'object') {
    throw new Error('ARM terms must be an object');
  }
  const initialThousandths = Math.round(ratePercent * 1000);
  if (!Number.isSafeInteger(arm.fixedMonths) || arm.fixedMonths < 1 || arm.fixedMonths >= monthCount) {
    throw new Error(`ARM fixed period (fixedMonths) must be at least 1 month and shorter than the ${monthCount}-month term`);
  }
  if (!Number.isSafeInteger(arm.adjustMonths) || arm.adjustMonths < 1) {
    throw new Error('ARM adjustment interval (adjustMonths) must be at least 1 month');
  }
  const nonNegative = [
    ['margin (marginThousandths)', arm.marginThousandths],
    ['initial cap (initialCapThousandths)', arm.initialCapThousandths],
    ['periodic cap (periodicCapThousandths)', arm.periodicCapThousandths],
    ['lifetime cap (lifetimeCapThousandths)', arm.lifetimeCapThousandths],
  ];
  for (const [name, value] of nonNegative) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`ARM ${name} must not be negative`);
    }
  }
  const ceiling = initialThousandths + arm.lifetimeCapThousandths;
  const floors = [
    ['lifetime floor (floorThousandths)', arm.floorThousandths],
    ['first adjustment floor (initialFloorThousandths)', arm.initialFloorThousandths],
  ];
  for (const [name, value] of floors) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`ARM ${name} must be greater than zero`);
    }
    if (value > ceiling) {
      throw new Error(`ARM ${name} must not be above the ceiling (initial rate plus lifetime cap)`);
    }
  }
  const indexByMonth = arm.indexByMonth === undefined ? new Map() : arm.indexByMonth;
  if (!(indexByMonth instanceof Map)) {
    throw new Error('ARM index (indexByMonth) must be a Map from payment number to index thousandths');
  }
  for (const [month, index] of indexByMonth) {
    if (!Number.isSafeInteger(month) || month > monthCount || !isResetMonth(month, arm)) {
      throw new Error(`ARM index month ${month} is not an adjustment month`);
    }
    if (!Number.isSafeInteger(index) || index < 0) {
      throw new Error(`ARM index (indexByMonth) for month ${month} must not be negative`);
    }
  }
  return { initialThousandths, ceiling, indexByMonth };
}

function resetRate(current, resetNumber, arm, ceiling, indexThousandths) {
  const cap = resetNumber === 1 ? arm.initialCapThousandths : arm.periodicCapThousandths;
  const upper = Math.min(current + cap, ceiling);
  const lower = resetNumber === 1
    ? arm.initialFloorThousandths
    : Math.max(current - arm.periodicCapThousandths, arm.floorThousandths);
  let fullyIndexed = null;
  let target = upper;
  if (indexThousandths !== undefined) {
    fullyIndexed = indexThousandths + arm.marginThousandths;
    if (arm.roundEighth) {
      fullyIndexed = Math.floor((2 * fullyIndexed + 125) / 250) * 125;
    }
    target = fullyIndexed;
  }
  return { rate: Math.max(Math.min(target, upper), lower), fullyIndexed };
}

function walkArm(principal, initialThousandths, n, extrasByMonth, arm, ceiling, indexByMonth) {
  let rateThousandths = initialThousandths;
  let monthlyRate = initialThousandths / 100000 / 12;
  let payment = paymentFor(principal, monthlyRate, n);
  const initialPayment = payment;
  let balance = principal;
  let interestTotal = 0;
  let extraApplied = 0;
  let extraUnapplied = 0;
  let payoffMonth = n;
  let paidOff = false;
  let resets = 0;
  const rows = [];
  const adjustments = [];

  for (let month = 1; month <= n; month += 1) {
    const requestedExtra = extrasByMonth.get(month) || 0;
    if (paidOff) {
      extraUnapplied += requestedExtra;
      rows.push({
        month,
        interest: 0,
        principalApplied: 0,
        remainingPrincipal: 0,
        extraApplied: 0,
        cumulativeInterest: interestTotal,
        rateThousandths,
        payment: 0,
      });
      continue;
    }

    if (isResetMonth(month, arm)) {
      resets += 1;
      const index = indexByMonth.get(month);
      const chosen = resetRate(rateThousandths, resets, arm, ceiling, index);
      rateThousandths = chosen.rate;
      monthlyRate = rateThousandths / 100000 / 12;
      payment = paymentFor(balance, monthlyRate, n - month + 1);
      adjustments.push({
        month,
        index,
        fullyIndexed: chosen.fullyIndexed,
        rateThousandths,
        payment,
      });
    }

    const interest = balance * monthlyRate;
    const scheduledPrincipal = payment - interest;
    const finishes = scheduledPrincipal + requestedExtra >= balance || month === n;
    let principalApplied;
    let appliedExtra;
    if (finishes) {
      appliedExtra = Math.min(requestedExtra, balance);
      extraUnapplied += requestedExtra - appliedExtra;
      principalApplied = balance - appliedExtra;
      balance = 0;
      paidOff = true;
      payoffMonth = month;
    } else {
      appliedExtra = requestedExtra;
      principalApplied = scheduledPrincipal;
      balance -= scheduledPrincipal + requestedExtra;
    }
    interestTotal += interest;
    extraApplied += appliedExtra;
    rows.push({
      month,
      interest,
      principalApplied,
      remainingPrincipal: balance,
      extraApplied: appliedExtra,
      cumulativeInterest: interestTotal,
      rateThousandths,
      payment,
    });
  }

  for (const row of rows) {
    row.remainingInterest = interestTotal - row.cumulativeInterest;
  }

  return {
    payment: initialPayment,
    rows,
    interestTotal,
    extraApplied,
    extraUnapplied,
    payoffMonth,
    adjustments,
  };
}

function thousandthsToPercent(thousandths) {
  return thousandths / 1000;
}

function centsToMapDollars(cents) {
  if (cents === 0) {
    return 0;
  }
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const dollars = Number(`${whole}.${frac}`);
  return negative ? -dollars : dollars;
}

function calendarMonthForPayment(startMonth, paymentMonth) {
  return ((startMonth + paymentMonth - 1) % 12) + 1;
}

function validateAdjustmentStats(adjustmentStats) {
  if (adjustmentStats === undefined) {
    return null;
  }
  if (adjustmentStats === null || typeof adjustmentStats !== 'object') {
    throw new Error('adjustmentStats must be an object');
  }
  const yearlyExtraCents = adjustmentStats.yearlyExtraCents;
  if (yearlyExtraCents === undefined || yearlyExtraCents === 0) {
    return { yearlyExtraCents: 0 };
  }
  if (!Number.isSafeInteger(yearlyExtraCents) || yearlyExtraCents < 0) {
    throw new Error('yearlyExtraCents');
  }
  const yearlyMonth = adjustmentStats.yearlyMonth;
  if (!Number.isSafeInteger(yearlyMonth) || yearlyMonth < 1 || yearlyMonth > 12) {
    throw new Error('yearlyMonth');
  }
  const startMonth = adjustmentStats.startMonth;
  if (!Number.isSafeInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    throw new Error('startMonth');
  }
  return { yearlyExtraCents, yearlyMonth, startMonth };
}

function yearlyMonthLandsInFixedPeriod(arm, stats) {
  if (stats.yearlyExtraCents <= 0) {
    return false;
  }
  for (let month = 1; month <= arm.fixedMonths; month += 1) {
    if (calendarMonthForPayment(stats.startMonth, month) === stats.yearlyMonth) {
      return true;
    }
  }
  return false;
}

function buildProbeExtras(monthlyExtraCents, arm, stats) {
  const map = new Map();
  for (let month = 1; month <= arm.fixedMonths; month += 1) {
    let cents = monthlyExtraCents;
    if (
      stats.yearlyExtraCents > 0
      && yearlyMonthLandsInFixedPeriod(arm, stats)
      && calendarMonthForPayment(stats.startMonth, month) === stats.yearlyMonth
    ) {
      cents += stats.yearlyExtraCents;
    }
    const dollars = centsToMapDollars(cents);
    if (dollars !== 0) {
      map.set(month, dollars);
    }
  }
  return map;
}

function firstAdjustmentPaymentCents(
  principal,
  initialThousandths,
  monthCount,
  arm,
  ceiling,
  extrasByMonth,
  indexByMonth,
) {
  const walked = walkArm(
    principal,
    initialThousandths,
    monthCount,
    extrasByMonth,
    arm,
    ceiling,
    indexByMonth,
  );
  const firstMonth = arm.fixedMonths + 1;
  if (walked.payoffMonth < firstMonth) {
    return 0;
  }
  return dollarsToCents(walked.rows[firstMonth - 1].payment);
}

function firstAdjustmentRatePercent(
  principal,
  initialThousandths,
  monthCount,
  arm,
  ceiling,
  extrasByMonth,
  indexByMonth,
) {
  const walked = walkArm(
    principal,
    initialThousandths,
    monthCount,
    extrasByMonth,
    arm,
    ceiling,
    indexByMonth,
  );
  const firstMonth = arm.fixedMonths + 1;
  if (walked.payoffMonth < firstMonth) {
    return 0;
  }
  return thousandthsToPercent(walked.rows[firstMonth - 1].rateThousandths);
}

function remainingBalanceAfterFixedPeriod(
  principal,
  initialThousandths,
  monthCount,
  arm,
  ceiling,
  extrasByMonth,
) {
  const walked = walkArm(
    principal,
    initialThousandths,
    monthCount,
    extrasByMonth,
    arm,
    ceiling,
    new Map(),
  );
  const firstMonth = arm.fixedMonths + 1;
  if (walked.payoffMonth < firstMonth) {
    return null;
  }
  return walked.rows[arm.fixedMonths - 1].remainingPrincipal;
}

function maxRateThousandthsAtFirstAdjustment(initialThousandths, arm, ceiling) {
  return resetRate(initialThousandths, 1, arm, ceiling, undefined).rate;
}

function closedFormEvenOutDollars(
  principal,
  initialThousandths,
  monthCount,
  arm,
  ceiling,
  initialPaymentDollars,
  stats,
) {
  const extrasBase = buildProbeExtras(0, arm, stats);
  const balanceBase = remainingBalanceAfterFixedPeriod(
    principal,
    initialThousandths,
    monthCount,
    arm,
    ceiling,
    extrasBase,
  );
  if (balanceBase === null) {
    return 0;
  }
  const extrasOneDollar = buildProbeExtras(100, arm, stats);
  const balanceOneDollar = remainingBalanceAfterFixedPeriod(
    principal,
    initialThousandths,
    monthCount,
    arm,
    ceiling,
    extrasOneDollar,
  );
  if (balanceOneDollar === null) {
    return 0;
  }
  const slope = balanceBase - balanceOneDollar;
  const paymentsLeft = monthCount - arm.fixedMonths;
  const maxRateThousandths = maxRateThousandthsAtFirstAdjustment(initialThousandths, arm, ceiling);
  const monthlyRate = maxRateThousandths / 100000 / 12;
  const paymentPerDollar = paymentFor(1, monthlyRate, paymentsLeft);
  const numerator = balanceBase * paymentPerDollar - initialPaymentDollars;
  const denominator = slope * paymentPerDollar + 1;
  if (!(denominator > 0) || !(slope > 0)) {
    return 0;
  }
  let extra = numerator / denominator;
  if (!Number.isFinite(extra) || extra < 0) {
    return 0;
  }
  const maxExtra = balanceBase / slope;
  if (extra > maxExtra) {
    extra = maxExtra;
  }
  return extra;
}

function solveEvenOutCents(
  principal,
  initialThousandths,
  monthCount,
  arm,
  ceiling,
  initialPaymentCents,
  maxChangeCents,
  stats,
) {
  const firstMonth = arm.fixedMonths + 1;
  const noExtraWalk = walkArm(
    principal,
    initialThousandths,
    monthCount,
    new Map(),
    arm,
    ceiling,
    new Map(),
  );
  if (noExtraWalk.payoffMonth < firstMonth) {
    return 0;
  }
  if (maxChangeCents <= 0) {
    return 0;
  }
  const emptyIndex = new Map();
  const passes = (candidate) => {
    if (candidate < 0) return false;
    const extras = buildProbeExtras(candidate, arm, stats);
    const payment = firstAdjustmentPaymentCents(
      principal,
      initialThousandths,
      monthCount,
      arm,
      ceiling,
      extras,
      emptyIndex,
    );
    return payment <= initialPaymentCents + candidate;
  };
  if (passes(0)) {
    return 0;
  }
  const initialPaymentDollars = noExtraWalk.payment;
  const realDollars = closedFormEvenOutDollars(
    principal,
    initialThousandths,
    monthCount,
    arm,
    ceiling,
    initialPaymentDollars,
    stats,
  );
  const floorCents = Math.floor(realDollars * 100);
  const ceilCents = Math.ceil(realDollars * 100);
  const tryCandidate = (candidate) => {
    if (candidate < 0) return null;
    return passes(candidate) ? candidate : null;
  };
  let found = tryCandidate(floorCents);
  if (found !== null) {
    return found;
  }
  if (ceilCents !== floorCents) {
    found = tryCandidate(ceilCents);
    if (found !== null) {
      return found;
    }
  }
  for (let step = 1; step <= maxChangeCents + 1; step += 1) {
    found = tryCandidate(ceilCents + step);
    if (found !== null) {
      return found;
    }
    found = tryCandidate(floorCents - step);
    if (found !== null) {
      return found;
    }
  }
  return 0;
}

function computeAdjustmentStats(
  principal,
  initialThousandths,
  monthCount,
  arm,
  ceiling,
  initialPaymentCents,
  stats,
) {
  const firstMonth = arm.fixedMonths + 1;
  const emptyExtras = new Map();
  const emptyIndex = new Map();
  const indexZero = new Map([[firstMonth, 0]]);

  const maxPaymentCents = firstAdjustmentPaymentCents(
    principal,
    initialThousandths,
    monthCount,
    arm,
    ceiling,
    emptyExtras,
    emptyIndex,
  );
  const maxRatePercent = firstAdjustmentRatePercent(
    principal,
    initialThousandths,
    monthCount,
    arm,
    ceiling,
    emptyExtras,
    emptyIndex,
  );
  const minPaymentCents = firstAdjustmentPaymentCents(
    principal,
    initialThousandths,
    monthCount,
    arm,
    ceiling,
    emptyExtras,
    indexZero,
  );
  const minRatePercent = firstAdjustmentRatePercent(
    principal,
    initialThousandths,
    monthCount,
    arm,
    ceiling,
    emptyExtras,
    indexZero,
  );

  const maxChangeCents = maxPaymentCents - initialPaymentCents;
  const minChangeCents = minPaymentCents - initialPaymentCents;

  const evenOutCents = solveEvenOutCents(
    principal,
    initialThousandths,
    monthCount,
    arm,
    ceiling,
    initialPaymentCents,
    maxChangeCents,
    { yearlyExtraCents: 0 },
  );

  let monthlyExtraCents = evenOutCents;
  if (stats.yearlyExtraCents > 0 && yearlyMonthLandsInFixedPeriod(arm, stats)) {
    monthlyExtraCents = solveEvenOutCents(
      principal,
      initialThousandths,
      monthCount,
      arm,
      ceiling,
      initialPaymentCents,
      maxChangeCents,
      stats,
    );
  }

  return {
    first_adjustment: {
      month: firstMonth,
      min_rate_percent: minRatePercent,
      max_rate_percent: maxRatePercent,
      min_payment_cents: minPaymentCents,
      max_payment_cents: maxPaymentCents,
      min_change_cents: minChangeCents,
      max_change_cents: maxChangeCents,
    },
    even_out_cents: evenOutCents,
    monthly_extra_cents: monthlyExtraCents,
  };
}

function armSummary(arm, actual, indexByMonth, initialThousandths, ceiling) {
  let maxRate = initialThousandths;
  let maxRateMonth = 1;
  let maxPaymentCents = dollarsToCents(actual.payment);
  let maxPaymentMonth = 1;
  const adjustments = actual.adjustments.map((item) => {
    const paymentCents = dollarsToCents(item.payment);
    if (item.rateThousandths > maxRate) {
      maxRate = item.rateThousandths;
      maxRateMonth = item.month;
    }
    if (paymentCents > maxPaymentCents) {
      maxPaymentCents = paymentCents;
      maxPaymentMonth = item.month;
    }
    return {
      month: item.month,
      index_percent: item.index === undefined ? null : thousandthsToPercent(item.index),
      fully_indexed_percent: item.fullyIndexed === null ? null : thousandthsToPercent(item.fullyIndexed),
      rate_percent: thousandthsToPercent(item.rateThousandths),
      payment_cents: paymentCents,
    };
  });
  return {
    fixed_months: arm.fixedMonths,
    adjust_months: arm.adjustMonths,
    margin_percent: thousandthsToPercent(arm.marginThousandths),
    initial_cap_percent: thousandthsToPercent(arm.initialCapThousandths),
    periodic_cap_percent: thousandthsToPercent(arm.periodicCapThousandths),
    lifetime_cap_percent: thousandthsToPercent(arm.lifetimeCapThousandths),
    floor_percent: thousandthsToPercent(arm.floorThousandths),
    initial_floor_percent: thousandthsToPercent(arm.initialFloorThousandths),
    ceiling_percent: thousandthsToPercent(ceiling),
    round_eighth: Boolean(arm.roundEighth),
    max_rate_percent: thousandthsToPercent(maxRate),
    max_rate_month: maxRateMonth,
    max_payment_cents: maxPaymentCents,
    max_payment_month: maxPaymentMonth,
    adjustments,
  };
}

function buildArmReport(principal, ratePercent, monthCount, extrasByMonth, yearsForJson, arm) {
  const { initialThousandths, ceiling, indexByMonth } = validateArm(arm, ratePercent, monthCount);
  const actual = walkArm(principal, initialThousandths, monthCount, extrasByMonth, arm, ceiling, indexByMonth);
  const baseline = walkArm(principal, initialThousandths, monthCount, new Map(), arm, ceiling, indexByMonth);
  const interestCents = dollarsToCents(actual.interestTotal);
  const baselineInterestCents = dollarsToCents(baseline.interestTotal);
  const report = {
    amount_cents: dollarsToCents(principal),
    rate_percent: ratePercent,
    months: monthCount,
    monthly_payment_cents: dollarsToCents(actual.payment),
    payoff_month: actual.payoffMonth,
    interest_cents: interestCents,
    extra_applied_cents: dollarsToCents(actual.extraApplied),
    extra_unapplied_cents: dollarsToCents(actual.extraUnapplied),
    baseline: {
      payoff_month: baseline.payoffMonth,
      interest_cents: baselineInterestCents,
    },
    interest_saved_cents: baselineInterestCents - interestCents,
    months_saved: baseline.payoffMonth - actual.payoffMonth,
  };
  if (yearsForJson !== undefined) {
    report.years = yearsForJson;
  }
  report.arm = armSummary(arm, actual, indexByMonth, initialThousandths, ceiling);
  if (arm.adjustmentStats !== undefined) {
    const stats = validateAdjustmentStats(arm.adjustmentStats);
    const adjustment = computeAdjustmentStats(
      principal,
      initialThousandths,
      monthCount,
      arm,
      ceiling,
      report.monthly_payment_cents,
      stats,
    );
    report.arm.first_adjustment = adjustment.first_adjustment;
    report.arm.even_out_cents = adjustment.even_out_cents;
    report.arm.monthly_extra_cents = adjustment.monthly_extra_cents;
  }
  const schedule = scheduleRows(actual, baseline, report.interest_saved_cents);
  report.schedule = schedule.map((row, index) => {
    const source = actual.rows[index];
    const given = indexByMonth.get(row.month);
    return {
      ...row,
      rate_percent: thousandthsToPercent(source.rateThousandths),
      payment_cents: dollarsToCents(source.payment),
      index_percent: given === undefined ? null : thousandthsToPercent(given),
    };
  });
  return report;
}

function buildReport(principal, ratePercent, monthCount, extrasByMonth, yearsForJson, arm) {
  if (arm !== undefined) {
    return buildArmReport(principal, ratePercent, monthCount, extrasByMonth, yearsForJson, arm);
  }
  const actual = walk(principal, ratePercent, monthCount, extrasByMonth);
  const baseline = walk(principal, ratePercent, monthCount, new Map());
  const interestCents = dollarsToCents(actual.interestTotal);
  const baselineInterestCents = dollarsToCents(baseline.interestTotal);
  const report = {
    amount_cents: dollarsToCents(principal),
    rate_percent: ratePercent,
    months: monthCount,
    monthly_payment_cents: dollarsToCents(actual.payment),
    payoff_month: actual.payoffMonth,
    interest_cents: interestCents,
    extra_applied_cents: dollarsToCents(actual.extraApplied),
    extra_unapplied_cents: dollarsToCents(actual.extraUnapplied),
    baseline: {
      payoff_month: baseline.payoffMonth,
      interest_cents: baselineInterestCents,
    },
    interest_saved_cents: baselineInterestCents - interestCents,
    months_saved: baseline.payoffMonth - actual.payoffMonth,
  };
  if (yearsForJson !== undefined) {
    report.years = yearsForJson;
  }
  report.schedule = scheduleRows(actual, baseline, report.interest_saved_cents);
  return report;
}

module.exports = {
  buildReport,
  dollarsToCents,
  formatGroupedCents,
  formatPlainCents,
};
