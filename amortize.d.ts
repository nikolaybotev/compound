export type ScheduleRow = {
  month: number;
  interest_cents: number;
  principal_cents: number;
  remaining_principal_cents: number;
  remaining_interest_cents: number;
  extra_cents: number;
  interest_saved_cents: number;
  rate_percent?: number;
  payment_cents?: number;
  index_percent?: number | null;
};

export type AdjustmentStats =
  | Record<string, never>
  | {
      yearlyExtraCents?: number;
      yearlyMonth?: number;
      startMonth?: number;
    };

export type Arm = {
  fixedMonths: number;
  adjustMonths: number;
  marginThousandths: number;
  initialCapThousandths: number;
  periodicCapThousandths: number;
  lifetimeCapThousandths: number;
  floorThousandths: number;
  initialFloorThousandths: number;
  roundEighth: boolean;
  indexByMonth: Map<number, number>;
  adjustmentStats?: AdjustmentStats;
};

export type FirstAdjustment = {
  month: number;
  min_rate_percent: number;
  max_rate_percent: number;
  min_payment_cents: number;
  max_payment_cents: number;
  min_change_cents: number;
  max_change_cents: number;
};

export type Adjustment = {
  month: number;
  index_percent: number | null;
  fully_indexed_percent: number | null;
  rate_percent: number;
  payment_cents: number;
};

export type ArmReport = {
  fixed_months: number;
  adjust_months: number;
  margin_percent: number;
  initial_cap_percent: number;
  periodic_cap_percent: number;
  lifetime_cap_percent: number;
  floor_percent: number;
  initial_floor_percent: number;
  ceiling_percent: number;
  round_eighth: boolean;
  max_rate_percent: number;
  max_rate_month: number;
  max_payment_cents: number;
  max_payment_month: number;
  adjustments: Adjustment[];
  first_adjustment?: FirstAdjustment;
  even_out_cents?: number;
  monthly_extra_cents?: number;
};

export type Report = {
  amount_cents: number;
  rate_percent: number;
  months: number;
  years?: number;
  monthly_payment_cents: number;
  payoff_month: number;
  interest_cents: number;
  extra_applied_cents: number;
  extra_unapplied_cents: number;
  baseline: {
    payoff_month: number;
    interest_cents: number;
  };
  interest_saved_cents: number;
  months_saved: number;
  arm?: ArmReport;
  schedule: ScheduleRow[];
};

export function buildReport(
  principal: number,
  ratePercent: number,
  monthCount: number,
  extrasByMonth: Map<number, number>,
  yearsForJson?: number,
  arm?: Arm,
): Report;

export function dollarsToCents(dollars: number): number;

export function formatGroupedCents(cents: number): string;

export function formatPlainCents(cents: number): string;

export function levelArmExtras(
  principalDollars: number,
  ratePercent: number,
  monthCount: number,
  arm: Arm | undefined,
  formExtrasByMonth: Map<number, number>,
  fromMonth: number,
  keptByMonth: Map<number, number>,
): Map<number, number>;

export type RecastResult = {
  recast_month: number;
  remaining_principal_cents: number;
  months: number;
  monthly_payment_cents: number;
  interest_cents: number;
  payoff_month: number;
  interest_through_cents: number;
  lifetime_interest_cents: number;
};

export function recastFixed(
  principalDollars: number,
  ratePercent: number,
  monthCount: number,
  extrasByMonth: Map<number, number>,
  recastMonth: number,
): RecastResult;

export function savedByExtraCents(
  principalDollars: number,
  ratePercent: number,
  monthCount: number,
  extrasByMonth: Map<number, number>,
  month: number,
  fullInterestCents: number,
  arm?: Arm,
): number;

export function savedByExtraByMonth(
  principalDollars: number,
  ratePercent: number,
  monthCount: number,
  extrasByMonth: Map<number, number>,
  arm?: Arm,
): number[];

export function modalPaymentCents(report: Report): number;

export function prevailingExtraCents(report: Report): number;
