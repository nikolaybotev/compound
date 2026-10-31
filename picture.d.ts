export function percentOfCents(cents: number, thousandths: number, parts?: number): number;

export function titleCentsFromPrice(priceCents: number, hundredThousandths: number): number;

export function prepaidInterestCents360(
  baseCents: number,
  rateThousandths: number,
  days: number,
): number;

export function prepaidInterestCents365(
  baseCents: number,
  rateThousandths: number,
  days: number,
): number;

export function prepaidInterestPerDiem365Cents(baseCents: number, rateThousandths: number): number;

export function prepaidInterestCents(
  baseCents: number,
  rateThousandths: number,
  days: number,
  basis: '360' | '365',
): number;

export function closingInterestDays(startMonth: string, closingDay: number): number;

export function daysInMonth(year: number, month: number): number;

export function isLeapYear(year: number): boolean;

export function clampClosingDay(day: number, startMonth: string): number;

export function closingMonthParts(startMonth: string): { year: number; month: number };

export function pmiThousandthsForScore(downThousandths: number, fico: number): number;

export type PictureLineInput = {
  priceCents: number;
  financedCents: number;
  ratePercent: number;
  monthCount: number;
  yearsForJson?: number;
  rateThousandths: number;
  taxThousandths: number;
  insuranceThousandths: number;
  pmiThousandths: number;
  titleHundredThousandths: number;
  lenderFeesCents: number;
  closingDay: number;
  startMonth: string;
  interestBasis: '360' | '365';
  homeownersInsuranceAnnualCents?: number;
  taxImpoundMonths: number;
  insuranceImpoundMonths: number;
  miImpoundMonths: number;
  prorationCents: number;
  pointsThousandths: number;
  sellerCreditCents: number;
  lenderCreditCents: number;
  earnestCents: number;
};

export type PictureLineResult = {
  priceCents: number;
  downCents: number;
  baseCents: number;
  financedCents: number;
  principalAndInterestCents: number;
  taxCents: number;
  insuranceCents: number;
  pmiCents: number;
  totalMonthlyCents: number;
  lenderFeesCents: number;
  titleCents: number;
  prepaidInterestCents: number;
  prepaidInterestDays: number;
  homeownersInsuranceCents: number;
  taxImpoundCents: number;
  insuranceImpoundCents: number;
  miImpoundCents: number;
  prorationCents: number;
  closingCents: number;
  pointsCents: number;
  closingAndPointsCents: number;
  cashToCloseCents: number;
  dueAtClosingCents: number;
};

export function buildPictureLines(input: PictureLineInput): PictureLineResult;
