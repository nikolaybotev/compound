import {
  buildReport,
  dollarsToCents,
  formatGroupedCents,
  type Report,
} from "../../../amortize.js";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const STORAGE_KEY = "compound-amortization-v1";

export type LoanDraft = {
  price: string;
  down: string;
  years: string;
  rate: string;
  start: string;
};

export type LoanField = keyof LoanDraft | "loan";

export type Loan = {
  priceCents: number;
  loanCents: number;
  years: number;
  ratePercent: number;
  startMonth: string;
};

export type ParseResult =
  | { ok: true; loan: Loan }
  | { ok: false; field: LoanField; message: string };

export type BandAmounts = {
  principalPaid: number;
  interestPaid: number;
  loanBalance: number;
  interestRemaining: number;
};

export type ScheduleMonth = {
  month: number;
  dateLabel: string;
  principalCents: number;
  interestCents: number;
  extraCents: number;
  principalBalanceCents: number;
  interestBalanceCents: number;
};

export type ScheduleYear = {
  year: number;
  rows: ScheduleMonth[];
  principalCents: number;
  interestCents: number;
  extraCents: number;
  principalBalanceCents: number;
  interestBalanceCents: number;
};

const PRICE_MESSAGE =
  "Purchase price must be a number of dollars greater than zero, with at most two decimal places.";
const DOWN_MESSAGE =
  "Down payment must be a percent greater than or equal to zero and less than 100, with at most three decimal places.";
const TERM_MESSAGE = "Term must be a positive whole number of years.";
const RATE_MESSAGE =
  "Interest must be a percent greater than zero, with at most three decimal places.";
const START_MESSAGE = "Start month must be a month and a year.";
const LOAN_MESSAGE = "Loan amount must be greater than zero.";

export function currentStartMonth(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function defaultDraft(now = new Date()): LoanDraft {
  return {
    price: "570000",
    down: "0",
    years: "30",
    rate: "7",
    start: currentStartMonth(now),
  };
}

export function formatMoney(cents: number): string {
  return `$${formatGroupedCents(cents)}`;
}

export function centsToDollars(cents: number): number {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  const dollars = Number(`${whole}.${frac}`);
  return negative ? -dollars : dollars;
}

export function percentThousandths(text: string): number | null {
  if (!/^(?:\d+)(?:\.\d{1,3})?$/.test(text)) return null;
  const [whole, frac = ""] = text.split(".");
  const padded = `${frac}000`.slice(0, 3);
  const thousandths = Number(whole) * 1000 + Number(padded);
  if (!Number.isSafeInteger(thousandths)) return null;
  return thousandths;
}

export function downPaymentCents(priceCents: number, thousandths: number): number {
  const numerator = priceCents * thousandths;
  if (!Number.isSafeInteger(numerator)) {
    throw new Error("down payment is too large");
  }
  const divisor = 100_000;
  const quotient = Math.trunc(numerator / divisor);
  const remainder = numerator % divisor;
  if (remainder * 2 >= divisor) return quotient + 1;
  return quotient;
}

export function parseLoan(draft: LoanDraft): ParseResult {
  const price = draft.price.trim();
  const down = draft.down.trim();
  const yearsText = draft.years.trim();
  const rateText = draft.rate.trim();
  const start = draft.start.trim();

  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(price)) {
    return { ok: false, field: "price", message: PRICE_MESSAGE };
  }
  let priceCents: number;
  try {
    priceCents = dollarsToCents(Number(price));
  } catch {
    return { ok: false, field: "price", message: PRICE_MESSAGE };
  }
  if (!(priceCents > 0)) {
    return { ok: false, field: "price", message: PRICE_MESSAGE };
  }

  const thousandths = percentThousandths(down);
  if (thousandths === null || thousandths >= 100_000) {
    return { ok: false, field: "down", message: DOWN_MESSAGE };
  }

  if (!/^[1-9]\d*$/.test(yearsText)) {
    return { ok: false, field: "years", message: TERM_MESSAGE };
  }
  const years = Number(yearsText);
  if (!Number.isSafeInteger(years) || years * 12 > Number.MAX_SAFE_INTEGER) {
    return { ok: false, field: "years", message: TERM_MESSAGE };
  }

  if (!/^(?:\d+)(?:\.\d{1,3})?$/.test(rateText)) {
    return { ok: false, field: "rate", message: RATE_MESSAGE };
  }
  const ratePercent = Number(rateText);
  if (!(ratePercent > 0)) {
    return { ok: false, field: "rate", message: RATE_MESSAGE };
  }

  if (!/^\d{4}-\d{2}$/.test(start)) {
    return { ok: false, field: "start", message: START_MESSAGE };
  }
  const monthNumber = Number(start.slice(5, 7));
  if (monthNumber < 1 || monthNumber > 12) {
    return { ok: false, field: "start", message: START_MESSAGE };
  }

  let downCents: number;
  try {
    downCents = downPaymentCents(priceCents, thousandths);
  } catch {
    return { ok: false, field: "down", message: DOWN_MESSAGE };
  }
  const loanCents = priceCents - downCents;
  if (!Number.isSafeInteger(loanCents) || loanCents <= 0) {
    return { ok: false, field: "loan", message: LOAN_MESSAGE };
  }

  return {
    ok: true,
    loan: {
      priceCents,
      loanCents,
      years,
      ratePercent,
      startMonth: start,
    },
  };
}

export function loanReport(loan: Loan, extras: Map<number, number> = new Map()): Report {
  return buildReport(
    centsToDollars(loan.loanCents),
    loan.ratePercent,
    loan.years * 12,
    extras,
    loan.years,
  );
}

export function paymentDate(
  startMonth: string,
  paymentNumber: number,
): { year: number; month: number } {
  const startYear = Number(startMonth.slice(0, 4));
  const startIndex = Number(startMonth.slice(5, 7)) - 1;
  const index = startYear * 12 + startIndex + paymentNumber;
  return {
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  };
}

export function shortDate(year: number, month: number): string {
  return `${SHORT_MONTHS[month - 1]} ${year}`;
}

export function longDate(year: number, month: number): string {
  return `${LONG_MONTHS[month - 1]} ${year}`;
}

export function bands(
  report: Pick<Report, "amount_cents" | "interest_cents">,
  row: Pick<Report["schedule"][number], "remaining_principal_cents" | "remaining_interest_cents">,
): BandAmounts {
  return {
    principalPaid: report.amount_cents - row.remaining_principal_cents,
    interestPaid: report.interest_cents - row.remaining_interest_cents,
    loanBalance: row.remaining_principal_cents,
    interestRemaining: row.remaining_interest_cents,
  };
}

export function groupByYear(report: Report, startMonth: string): ScheduleYear[] {
  const groups: ScheduleYear[] = [];
  const rows = report.schedule.slice(0, report.payoff_month);
  for (const row of rows) {
    const date = paymentDate(startMonth, row.month);
    let group = groups[groups.length - 1];
    if (!group || group.year !== date.year) {
      group = {
        year: date.year,
        rows: [],
        principalCents: 0,
        interestCents: 0,
        extraCents: 0,
        principalBalanceCents: 0,
        interestBalanceCents: 0,
      };
      groups.push(group);
    }
    group.rows.push({
      month: row.month,
      dateLabel: shortDate(date.year, date.month),
      principalCents: row.principal_cents,
      interestCents: row.interest_cents,
      extraCents: 0,
      principalBalanceCents: row.remaining_principal_cents,
      interestBalanceCents: row.remaining_interest_cents,
    });
    group.principalCents += row.principal_cents;
    group.interestCents += row.interest_cents;
    group.principalBalanceCents = row.remaining_principal_cents;
    group.interestBalanceCents = row.remaining_interest_cents;
  }
  return groups;
}

export function firstPaymentYear(loan: Loan): number {
  return paymentDate(loan.startMonth, 1).year;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadDraft(storage: StorageLike | undefined, now = new Date()): LoanDraft {
  const fallback = defaultDraft(now);
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const record = parsed as Record<string, unknown>;
    if (record.version !== 1) return fallback;
    const draft: LoanDraft = {
      price: typeof record.price === "string" ? record.price : "",
      down: typeof record.down === "string" ? record.down : "",
      years: typeof record.years === "string" ? record.years : "",
      rate: typeof record.rate === "string" ? record.rate : "",
      start: typeof record.start === "string" ? record.start : "",
    };
    if (!parseLoan(draft).ok) return fallback;
    return draft;
  } catch {
    return fallback;
  }
}

export function saveDraft(storage: StorageLike | undefined, draft: LoanDraft): void {
  if (!storage) return;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        price: draft.price,
        down: draft.down,
        years: draft.years,
        rate: draft.rate,
        start: draft.start,
      }),
    );
  } catch {
    // A full or blocked store leaves the page usable for this visit.
  }
}
