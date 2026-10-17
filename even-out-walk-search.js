'use strict';

const { buildReport } = require('./amortize');

const EVEN_OUT_CAP_55 = {};
const EVEN_OUT_CAP_225 = { initialCapThousandths: 2000, periodicCapThousandths: 2000 };
const EVEN_OUT_CAP_115 = { initialCapThousandths: 1000, periodicCapThousandths: 1000 };

function defaultSheetArmTerms(overrides = {}) {
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

function centsToProbeDollars(cents) {
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

function calendarMonthForProbePayment(startMonth, paymentMonth) {
  return ((startMonth + paymentMonth - 1) % 12) + 1;
}

function yearlyMonthLandsInFixedProbe(arm, stats) {
  if (stats.yearlyExtraCents <= 0) {
    return false;
  }
  for (let month = 1; month <= arm.fixedMonths; month += 1) {
    if (calendarMonthForProbePayment(stats.startMonth, month) === stats.yearlyMonth) {
      return true;
    }
  }
  return false;
}

function buildEvenOutProbeExtras(monthlyExtraCents, arm, stats) {
  const map = new Map();
  for (let month = 1; month <= arm.fixedMonths; month += 1) {
    let cents = monthlyExtraCents;
    if (
      stats.yearlyExtraCents > 0
      && yearlyMonthLandsInFixedProbe(arm, stats)
      && calendarMonthForProbePayment(stats.startMonth, month) === stats.yearlyMonth
    ) {
      cents += stats.yearlyExtraCents;
    }
    const dollars = centsToProbeDollars(cents);
    if (dollars !== 0) {
      map.set(month, dollars);
    }
  }
  return map;
}

function scheduleRow(schedule, month) {
  const row = schedule.find((item) => item.month === month);
  if (!row) {
    throw new Error(`missing month ${month}`);
  }
  return row;
}

function firstAdjustmentPaymentCentsProbe(principal, ratePercent, monthCount, arm, extrasByMonth) {
  const report = buildReport(principal, ratePercent, monthCount, extrasByMonth, undefined, arm);
  const firstMonth = arm.fixedMonths + 1;
  if (report.payoff_month < firstMonth) {
    return 0;
  }
  return scheduleRow(report.schedule, firstMonth).payment_cents;
}

// Spec requirement 3: smallest cent E on [0, max_change_cents] where the walk's
// first-adjustment payment_cents is at or below monthly_payment_cents + E.
function evenOutCentsByBinarySearch(
  principal,
  ratePercent,
  monthCount,
  arm,
  initialPaymentCents,
  maxChangeCents,
  stats,
) {
  const firstMonth = arm.fixedMonths + 1;
  const noExtraReport = buildReport(principal, ratePercent, monthCount, new Map(), undefined, arm);
  if (noExtraReport.payoff_month < firstMonth) {
    return 0;
  }
  if (maxChangeCents <= 0) {
    return 0;
  }
  const passes = (candidate) => {
    const extras = buildEvenOutProbeExtras(candidate, arm, stats);
    const payment = firstAdjustmentPaymentCentsProbe(
      principal,
      ratePercent,
      monthCount,
      arm,
      extras,
    );
    return payment <= initialPaymentCents + candidate;
  };
  if (passes(0)) {
    return 0;
  }
  let lo = 0;
  let hi = maxChangeCents;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (passes(mid)) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}

function evenOutGrid48Loans() {
  const principals = [100_000, 570_000, 855_000];
  const rates = [3.25, 5.875, 6.99, 7.375];
  const fixedMonthsList = [36, 84];
  const capStyles = [
    { overrides: EVEN_OUT_CAP_55 },
    { overrides: EVEN_OUT_CAP_225 },
  ];
  const loans = [];
  for (const principal of principals) {
    for (const ratePercent of rates) {
      for (const fixedMonths of fixedMonthsList) {
        for (const capStyle of capStyles) {
          loans.push({
            principal,
            ratePercent,
            monthCount: 360,
            armOverrides: { fixedMonths, ...capStyle.overrides },
          });
        }
      }
    }
  }
  return loans;
}

function evenOutGrid432Loans() {
  const principals = [80_000, 250_000, 570_000, 855_000];
  const rates = [2.5, 3.625, 4.75, 5.875, 7, 8.125];
  const fixedMonthsList = [1, 2, 3, 6, 12, 24];
  const capStyles = [
    { overrides: EVEN_OUT_CAP_55 },
    { overrides: EVEN_OUT_CAP_225 },
    { overrides: EVEN_OUT_CAP_115 },
  ];
  const loans = [];
  for (const principal of principals) {
    for (const ratePercent of rates) {
      for (const fixedMonths of fixedMonthsList) {
        for (const capStyle of capStyles) {
          loans.push({
            principal,
            ratePercent,
            monthCount: 360,
            armOverrides: { fixedMonths, ...capStyle.overrides },
          });
        }
      }
    }
  }
  return loans;
}

function evenOutGrid480Loans() {
  return [...evenOutGrid48Loans(), ...evenOutGrid432Loans()];
}

function formulaEvenOutCents(loan) {
  const {
    principal,
    ratePercent,
    monthCount,
    armOverrides = {},
    adjustmentStats = {},
  } = loan;
  const arm = defaultSheetArmTerms(armOverrides);
  const report = buildReport(
    principal,
    ratePercent,
    monthCount,
    new Map(),
    undefined,
    { ...arm, adjustmentStats: adjustmentStats === undefined ? {} : adjustmentStats },
  );
  return report.arm.even_out_cents;
}

function recordedEvenOutCentsForGridLoan(loan) {
  const arm = defaultSheetArmTerms(loan.armOverrides);
  const report = buildReport(
    loan.principal,
    loan.ratePercent,
    loan.monthCount,
    new Map(),
    undefined,
    { ...arm, adjustmentStats: {} },
  );
  return evenOutCentsByBinarySearch(
    loan.principal,
    loan.ratePercent,
    loan.monthCount,
    arm,
    report.monthly_payment_cents,
    report.arm.first_adjustment.max_change_cents,
    { yearlyExtraCents: 0 },
  );
}

module.exports = {
  EVEN_OUT_CAP_55,
  EVEN_OUT_CAP_225,
  EVEN_OUT_CAP_115,
  defaultSheetArmTerms,
  evenOutCentsByBinarySearch,
  evenOutGrid48Loans,
  evenOutGrid432Loans,
  evenOutGrid480Loans,
  formulaEvenOutCents,
  recordedEvenOutCentsForGridLoan,
  buildEvenOutProbeExtras,
};
