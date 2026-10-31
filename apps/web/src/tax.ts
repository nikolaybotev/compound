import type { Report } from "../../../amortize.js";
import { dueDate, formatDueOnFirst, formatMoney, loanReport, type Loan } from "./loan";
import type { FilingStatus } from "./picture";

export const TAX_NOT_ADVICE =
  "This is not tax advice. It applies the figures named here to this loan. It does not prepare a return.";
export const TAX_STATE = "State returns are not shown.";
export const TAX_OVERALL_LIMIT =
  "An overall limit on itemized deductions (§70111) begins in 2026. Who it affects is not verified here, and this table does not apply it.";
export const TAX_NOT_DEDUCTIBLE =
  "Homeowners insurance, principal, and the escrow cushion are not deductible.";
export const TAX_MI_UNVERIFIED =
  "Unverified. The 2026 Publication 936 is an IRS draft. The reduction is shown as 10 percentage points per $1,000 of AGI, or part of $1,000, over $100,000 ($50,000 if married filing separately), and none above $109,000 ($54,500 if married filing separately).";
export const TAX_BOX5 = "Form 1098 box 5 reporting of mortgage insurance is not verified here.";
export const TAX_SALT_CAP =
  "The 2026 cap is $40,400 ($20,200 if married filing separately). Later caps through 2029 are this page's 1% steps, rounded half up to the dollar, not a figure copied from a published table. The cap shown for 2030 and after is $10,000 ($5,000 if married filing separately).";
export const TAX_ACQUISITION =
  "The acquisition-debt limit is $750,000 ($375,000 if married filing separately). Interest and points on a larger loan are prorated. Debt from before December 16, 2017 is not modeled.";
export const TAX_POINTS_NOTE =
  "This treats points as paid on a purchase. Refinance points are spread over the loan term, which this table does not do.";
export const TAX_MI_SERVICER =
  "Which payment is the last one that includes mortgage insurance is servicer practice and is not verified. This column includes the automatic-termination payment.";
export const TAX_PROPERTY_NOTE =
  "This is not the escrow disbursement calendar. Supplemental bills are not estimated.";
export const TAX_SALT_LESSER =
  "SALT allowed is the lesser of property tax plus other SALT and that year's cap.";
export const TAX_STANDARD_LABEL = "2026 figure; later years are not published here";
export const TAX_MI_ENTER_AGI = "Enter AGI to apply the phaseout.";
export const TAX_SALT_ENTER_AGI = "Enter AGI to apply the phase-down.";
export const TAX_FIELD_NOTE =
  "Empty MAGI uses AGI. Empty appraisal uses the purchase price as original value. A standard-deduction override replaces the 2026 figure in later years only.";

export const FILING_STATUS_OPTIONS: ReadonlyArray<{ value: FilingStatus; label: string }> = [
  { value: "single", label: "Single" },
  { value: "joint", label: "Married filing jointly" },
  { value: "separate", label: "Married filing separately" },
  { value: "head", label: "Head of household" },
];

export const TAX_DOLLAR_LABELS = {
  agi: "AGI",
  magi: "MAGI",
  otherSalt: "Other SALT",
  otherItemized: "Other itemized deductions",
  standardOverride: "Standard deduction override",
  appraisal: "Appraisal",
} as const;

export type TaxDollarField = keyof typeof TAX_DOLLAR_LABELS;

const STANDARD_2026: Record<FilingStatus, number> = {
  single: 1_610_000,
  joint: 3_220_000,
  separate: 1_610_000,
  head: 2_415_000,
};

const SALT_CAP_2026 = 40_400;
const SALT_CAP_2026_SEPARATE = 20_200;
const SALT_THRESHOLD_2026 = 505_000;
const SALT_THRESHOLD_2026_SEPARATE = 252_500;
const SALT_FLOOR = 10_000;
const SALT_FLOOR_SEPARATE = 5_000;
const ACQUISITION_CAP_CENTS = 75_000_000;
const ACQUISITION_CAP_SEPARATE_CENTS = 37_500_000;

export type TaxYearRow = {
  year: number;
  interestPaidCents: number;
  mortgageInterestCents: number;
  pointsCents: number;
  miPaidCents: number;
  miDeductibleCents: number;
  miPhaseoutNote: string | null;
  propertyTaxCents: number;
  otherSaltCents: number;
  saltAllowedCents: number;
  saltPhaseDownNote: string | null;
  housingItemsCents: number;
  standardCents: number;
  standardLabel: string | null;
  comparison: string;
};

export type TaxTable = {
  fundingYear: number;
  fundingInterestCents: number;
  fundingInterestLine: string;
  insuranceAnnualCents: number;
  rows: TaxYearRow[];
  pmiLines: string[];
  scheduled80Payment: number | null;
  automatic78Payment: number | null;
  midpointPayment: number;
  extra80Payment: number | null;
  terminationPayment: number;
};

export type TaxTableInput = {
  loan: Loan;
  financedCents: number;
  schedule: Report;
  appliedExtras: Map<number, number>;
  priceCents: number;
  prepaidInterestCents: number;
  pointsCents: number;
  pmiMonthlyCents: number;
  propertyTaxMonthlyCents: number;
  prorationCents: number;
  insuranceAnnualCents: number;
  filingStatus: FilingStatus;
  /** Null when the field is empty. Zero is an entered AGI of zero. */
  agiCents: number | null;
  /** Null when the field is empty, which means use AGI. */
  magiCents: number | null;
  otherSaltCents: number;
  otherItemizedCents: number;
  standardOverrideCents: number | null;
  appraisalCents: number | null;
};

export function insuranceNotDeductibleLine(annualCents: number): string {
  return `${TAX_NOT_DEDUCTIBLE} Homeowners insurance on this loan is ${formatMoney(annualCents)} a year.`;
}

export function taxDollarMessage(field: TaxDollarField): string {
  return `${TAX_DOLLAR_LABELS[field]} must be a dollar amount greater than or equal to zero, with at most two decimal places, or empty.`;
}

function halfUpQuotient(numerator: number, divisor: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new Error("tax amount is too large");
  }
  const quotient = Math.trunc(numerator / divisor);
  const remainder = numerator % divisor;
  if (remainder * 2 >= divisor) return quotient + 1;
  return quotient;
}

function percentOfCents(cents: number, percent: number): number {
  return halfUpQuotient(cents * percent, 100);
}

function acquisitionCapCents(status: FilingStatus): number {
  return status === "separate" ? ACQUISITION_CAP_SEPARATE_CENTS : ACQUISITION_CAP_CENTS;
}

function deductiblePortion(cents: number, loanCents: number, capCents: number): number {
  if (cents === 0 || loanCents <= 0 || loanCents <= capCents) return cents;
  return halfUpQuotient(cents * capCents, loanCents);
}

/** 100 at or under the threshold, minus 10 points per $1,000 or part, and 0 above the elimination amount. */
export function miPhaseoutPercent(agiCents: number, separate: boolean): number {
  const threshold = separate ? 5_000_000 : 10_000_000;
  const elimination = separate ? 5_450_000 : 10_900_000;
  if (agiCents > elimination) return 0;
  if (agiCents <= threshold) return 100;
  const excess = agiCents - threshold;
  const steps = Math.trunc(excess / 100_000) + (excess % 100_000 === 0 ? 0 : 1);
  const factor = 100 - 10 * steps;
  return factor > 0 ? factor : 0;
}

function applyPhaseout(cents: number, percent: number): number {
  if (percent >= 100) return cents;
  if (percent <= 0) return 0;
  return halfUpQuotient(cents * percent, 100);
}

type SaltRule = { capDollars: number; thresholdDollars: number; phaseDown: boolean };

function saltRule(year: number, separate: boolean): SaltRule {
  const floor = separate ? SALT_FLOOR_SEPARATE : SALT_FLOOR;
  if (year < 2026 || year >= 2030) {
    return { capDollars: floor, thresholdDollars: 0, phaseDown: false };
  }
  let cap = separate ? SALT_CAP_2026_SEPARATE : SALT_CAP_2026;
  let threshold = separate ? SALT_THRESHOLD_2026_SEPARATE : SALT_THRESHOLD_2026;
  for (let step = 2027; step <= year; step += 1) {
    cap = halfUpQuotient(cap * 101, 100);
    threshold = halfUpQuotient(threshold * 101, 100);
  }
  return { capDollars: cap, thresholdDollars: threshold, phaseDown: true };
}

function saltCeilingCents(year: number, separate: boolean, agiEmpty: boolean, magiCents: number): number {
  const rule = saltRule(year, separate);
  const capCents = rule.capDollars * 100;
  if (!rule.phaseDown || agiEmpty) return capCents;
  const floorCents = (separate ? SALT_FLOOR_SEPARATE : SALT_FLOOR) * 100;
  const thresholdCents = rule.thresholdDollars * 100;
  if (magiCents <= thresholdCents) return capCents;
  const reduction = halfUpQuotient((magiCents - thresholdCents) * 30, 100);
  const reduced = capCents - reduction;
  return reduced > floorCents ? reduced : floorCents;
}

function firstAtOrUnder(report: Report, thresholdCents: number): number | null {
  for (const row of report.schedule) {
    if (row.remaining_principal_cents <= thresholdCents) return row.month;
  }
  return null;
}

function midpointPayment(termMonths: number): number {
  if (termMonths % 2 === 0) return termMonths / 2;
  return Math.ceil(termMonths / 2);
}

function pmiDropoff(input: TaxTableInput): {
  lines: string[];
  scheduled80Payment: number | null;
  automatic78Payment: number | null;
  midpointPayment: number;
  extra80Payment: number | null;
  terminationPayment: number;
} {
  const original = input.appraisalCents === null ? input.priceCents : input.appraisalCents;
  const threshold80 = percentOfCents(original, 80);
  const threshold78 = percentOfCents(original, 78);
  const noExtra = loanReport(input.loan, new Map(), input.financedCents);
  const scheduled80 = firstAtOrUnder(noExtra, threshold80);
  const scheduled78 = firstAtOrUnder(noExtra, threshold78);
  const termMonths = input.loan.years * 12;
  const midpoint = midpointPayment(termMonths);
  let extra80: number | null = null;
  if (input.appliedExtras.size > 0) {
    const withExtra = loanReport(input.loan, input.appliedExtras, input.financedCents);
    const found = firstAtOrUnder(withExtra, threshold80);
    if (found !== null && (scheduled80 === null || found < scheduled80)) extra80 = found;
  }
  const termination = scheduled78 === null ? midpoint : Math.min(scheduled78, midpoint);
  const start = input.loan.startMonth;
  const lines = [
    scheduled80 === null
      ? "Scheduled 80% request: the balance does not reach 80% of original value."
      : `Scheduled 80% request: ${formatDueOnFirst(start, scheduled80)}.`,
  ];
  if (extra80 !== null) {
    lines.push(`With extra principal: ${formatDueOnFirst(start, extra80)}.`);
  }
  lines.push(
    scheduled78 === null
      ? "Automatic 78%: the balance does not reach 78% of original value on the scheduled amortization."
      : `Automatic 78%: ${formatDueOnFirst(start, scheduled78)}.`,
  );
  lines.push(`Midpoint backstop (this page's reading): ${formatDueOnFirst(start, midpoint)}.`);
  return {
    lines,
    scheduled80Payment: scheduled80,
    automatic78Payment: scheduled78,
    midpointPayment: midpoint,
    extra80Payment: extra80,
    terminationPayment: termination,
  };
}

function interestPaidByYear(
  startMonth: string,
  schedule: Report,
  prepaidCents: number,
  firstYear: number,
  lastYear: number,
): Map<number, number> {
  const paid = new Map<number, number>();
  for (let year = firstYear; year <= lastYear; year += 1) paid.set(year, 0);
  const fundingYear = Number(startMonth.slice(0, 4));
  if (paid.has(fundingYear)) paid.set(fundingYear, prepaidCents);
  for (const row of schedule.schedule) {
    const due = dueDate(startMonth, row.month);
    if (!paid.has(due.year)) continue;
    paid.set(due.year, (paid.get(due.year) ?? 0) + row.interest_cents);
  }
  return paid;
}

function miCountByYear(
  startMonth: string,
  terminationPayment: number,
  firstYear: number,
  lastYear: number,
): Map<number, number> {
  const counts = new Map<number, number>();
  for (let year = firstYear; year <= lastYear; year += 1) counts.set(year, 0);
  for (let payment = 1; payment <= terminationPayment; payment += 1) {
    const due = dueDate(startMonth, payment);
    if (!counts.has(due.year)) continue;
    counts.set(due.year, (counts.get(due.year) ?? 0) + 1);
  }
  return counts;
}

function standardFor(
  year: number,
  status: FilingStatus,
  overrideCents: number | null,
): { cents: number; label: string | null } {
  if (year === 2026) return { cents: STANDARD_2026[status], label: null };
  if (year > 2026 && overrideCents !== null) return { cents: overrideCents, label: null };
  return { cents: STANDARD_2026[status], label: TAX_STANDARD_LABEL };
}

function comparisonSentence(housingCents: number, otherItemizedCents: number, standardCents: number): string {
  const total = housingCents + otherItemizedCents;
  if (total > standardCents) return "Housing items are above the standard deduction";
  if (total < standardCents) return "Housing items are below the standard deduction";
  return "Housing items equal the standard deduction";
}

export function buildTaxTable(input: TaxTableInput): TaxTable {
  const start = input.loan.startMonth;
  const fundingYear = Number(start.slice(0, 4));
  const payoffDue = dueDate(start, input.schedule.payoff_month);
  const lastYear = Math.max(fundingYear, payoffDue.year);
  const dropoff = pmiDropoff(input);
  const interest = interestPaidByYear(start, input.schedule, input.prepaidInterestCents, fundingYear, lastYear);
  const miCounts = miCountByYear(start, dropoff.terminationPayment, fundingYear, lastYear);
  const separate = input.filingStatus === "separate";
  const capCents = acquisitionCapCents(input.filingStatus);
  const loanCents = input.loan.loanCents;
  const agiEmpty = input.agiCents === null;
  const magiCents = input.magiCents === null ? (input.agiCents ?? 0) : input.magiCents;
  const phasePercent = agiEmpty || input.agiCents === null ? 100 : miPhaseoutPercent(input.agiCents, separate);
  const rows: TaxYearRow[] = [];
  for (let year = fundingYear; year <= lastYear; year += 1) {
    const interestPaidCents = interest.get(year) ?? 0;
    const mortgageInterestCents = deductiblePortion(interestPaidCents, loanCents, capCents);
    const pointsCents =
      year === fundingYear ? deductiblePortion(input.pointsCents, loanCents, capCents) : 0;
    const miPaidCents = input.pmiMonthlyCents * (miCounts.get(year) ?? 0);
    const miDeductibleCents = agiEmpty ? miPaidCents : applyPhaseout(miPaidCents, phasePercent);
    const propertyTaxCents =
      year === fundingYear
        ? input.prorationCents > 0
          ? input.prorationCents
          : 0
        : input.propertyTaxMonthlyCents * 12;
    const rule = saltRule(year, separate);
    const ceiling = saltCeilingCents(year, separate, agiEmpty, magiCents);
    const saltPaid = propertyTaxCents + input.otherSaltCents;
    const saltAllowedCents = saltPaid < ceiling ? saltPaid : ceiling;
    const housingItemsCents = mortgageInterestCents + pointsCents + miDeductibleCents + saltAllowedCents;
    const standard = standardFor(year, input.filingStatus, input.standardOverrideCents);
    rows.push({
      year,
      interestPaidCents,
      mortgageInterestCents,
      pointsCents,
      miPaidCents,
      miDeductibleCents,
      miPhaseoutNote: agiEmpty ? TAX_MI_ENTER_AGI : null,
      propertyTaxCents,
      otherSaltCents: input.otherSaltCents,
      saltAllowedCents,
      saltPhaseDownNote: rule.phaseDown && agiEmpty ? TAX_SALT_ENTER_AGI : null,
      housingItemsCents,
      standardCents: standard.cents,
      standardLabel: standard.label,
      comparison: comparisonSentence(housingItemsCents, input.otherItemizedCents, standard.cents),
    });
  }
  const fundingInterestCents = interest.get(fundingYear) ?? 0;
  return {
    fundingYear,
    fundingInterestCents,
    fundingInterestLine: `Interest paid in ${fundingYear}: ${formatMoney(fundingInterestCents)}.`,
    insuranceAnnualCents: input.insuranceAnnualCents,
    rows,
    pmiLines: dropoff.lines,
    scheduled80Payment: dropoff.scheduled80Payment,
    automatic78Payment: dropoff.automatic78Payment,
    midpointPayment: dropoff.midpointPayment,
    extra80Payment: dropoff.extra80Payment,
    terminationPayment: dropoff.terminationPayment,
  };
}
