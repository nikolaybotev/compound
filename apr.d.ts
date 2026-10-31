import type { Arm } from './amortize.js';

export type ChargeKind =
  | 'points'
  | 'lender-fee'
  | 'prepaid-interest'
  | 'mortgage-insurance-premium'
  | 'application-fee'
  | 'appraisal'
  | 'credit-report'
  | 'flood'
  | 'tax-service'
  | 'title'
  | 'survey'
  | 'document-preparation'
  | 'notary'
  | 'recording'
  | 'transfer-tax'
  | 'property-insurance'
  | 'property-tax'
  | 'escrow'
  | 'pest'
  | 'owners-title'
  | 'lender-credit';

export type Charge = {
  cents: number;
  kind: ChargeKind | string;
};

export type ClassifiedCharges = {
  prepaid_finance_charge_cents: number;
  excluded_cents: number;
};

export type ActuarialApr = {
  apr_thousandths: number;
  irregular: boolean;
  tolerance_thousandths: number;
};

export type AprReport = {
  amount_cents: number;
  amount_financed_cents: number;
  prepaid_finance_charge_cents: number;
  interest_cents: number;
  mortgage_insurance_cents: number;
  finance_charge_cents: number;
  apr_thousandths: number;
  irregular: boolean;
  tolerance_thousandths: number;
  mi_months: number;
  odd_days: number;
};

export type BuildAprReportOptions = {
  originalValueCents?: number;
  miMonths?: number;
  oddDays?: number;
  arm?: Arm;
  currentIndexThousandths?: number;
  yearsForJson?: number;
};

export function classifyCharges(charges: Charge[]): ClassifiedCharges;

export function actuarialAprThousandths(
  amountFinancedCents: number,
  paymentCents: number[],
  oddDays: number,
): ActuarialApr;

export function buildAprReport(
  principal: number,
  ratePercent: number,
  monthCount: number,
  prepaidFinanceChargeCents: number,
  monthlyInsuranceCents: number,
  options?: BuildAprReportOptions,
): AprReport;

export function withinTolerance(
  computedThousandths: number,
  disclosedThousandths: number,
  toleranceThousandths: number,
): boolean;

export function disclosedAprThousandths(percentText: string): number;

export function formatAprPercent(aprThousandths: number): string;

export function halfUpQuotient(numerator: number, denominator: number): number;
