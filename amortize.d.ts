export type ScheduleRow = {
  month: number;
  interest_cents: number;
  principal_cents: number;
  remaining_principal_cents: number;
  remaining_interest_cents: number;
  extra_cents: number;
  interest_saved_cents: number;
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
  schedule: ScheduleRow[];
};

export function buildReport(
  principal: number,
  ratePercent: number,
  monthCount: number,
  extrasByMonth: Map<number, number>,
  yearsForJson?: number,
): Report;

export function dollarsToCents(dollars: number): number;

export function formatGroupedCents(cents: number): string;

export function formatPlainCents(cents: number): string;
