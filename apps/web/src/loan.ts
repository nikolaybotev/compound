import {
  buildReport,
  dollarsToCents,
  formatGroupedCents,
  formatPlainCents,
  type Report,
} from "../../../amortize.js";
import {
  defaultPicture,
  percentThousandths,
  pictureFromStorage,
  type PictureDraft,
} from "./picture";

export { percentThousandths };

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

export const MONTH_NAMES = [
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

export const STORAGE_KEY =
  import.meta.env.VITE_STORAGE_KEY ?? "compound-amortization-v1";

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
  extraDollars: number;
  savedByExtraCents: number;
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
export const THOUSANDS_MESSAGE =
  "Purchase price must be thousands of dollars greater than zero, with at most five decimal places.";
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
    price: "600000",
    down: "5",
    years: "30",
    rate: "7.375",
    start: currentStartMonth(now),
  };
}

export function isTrailingDotThousands(text: string): boolean {
  return /^(?:\d+)\.$/.test(text.trim());
}

export function thousandsToDollarString(text: string): string | null {
  const trimmed = text.trim();
  if (!/^(?:\d+)(?:\.\d{1,5})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const moved = `${frac}000`.slice(0, 3);
  const rest = frac.length > 3 ? frac.slice(3) : "";
  const combined = `${whole}${moved}`.replace(/^0+(?=\d)/, "");
  const cents = rest.padEnd(2, "0");
  if (combined === "0" && /^0+$/.test(cents)) return null;
  if (rest.length > 0) return `${combined}.${rest}`;
  return combined;
}

export function dollarsToThousandsText(dollars: string): string {
  const trimmed = dollars.trim();
  const [whole, frac = ""] = trimmed.split(".");
  if (!/^\d+$/.test(whole)) return trimmed;
  const dec = frac.replace(/\D/g, "").slice(0, 2).padEnd(2, "0");
  const padded = whole.padStart(3, "0");
  const shifted = padded.slice(0, -3).replace(/^0+(?=\d)/, "");
  const nextWhole = shifted === "" ? "0" : shifted;
  const nextFrac = `${padded.slice(-3)}${dec}`.replace(/0+$/, "");
  if (nextFrac.length === 0) return nextWhole;
  return `${nextWhole}.${nextFrac}`;
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

export function loanReport(
  loan: Loan,
  extras: Map<number, number> = new Map(),
  financedCents: number = loan.loanCents,
): Report {
  return buildReport(
    centsToDollars(financedCents),
    loan.ratePercent,
    loan.years * 12,
    extras,
    loan.years,
  );
}

export function savedByExtraCents(
  loan: Loan,
  extras: Map<number, number>,
  month: number,
  fullInterestCents: number,
  financedCents: number = loan.loanCents,
): number {
  const requested = extras.get(month) ?? 0;
  if (requested <= 0) return 0;
  const without = new Map(extras);
  without.delete(month);
  const counterfactual = loanReport(loan, without, financedCents);
  return counterfactual.interest_cents - fullInterestCents;
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
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export type Prefill = {
  monthly: string;
  yearly: string;
  month: number;
  open: boolean;
};

export type Scenario = {
  draft: LoanDraft;
  extras: Map<number, number>;
  prefill: Prefill;
  openYears: number[] | null;
  picture: PictureDraft;
};

export function defaultPrefill(): Prefill {
  return { monthly: "", yearly: "", month: 1, open: false };
}

export function extraInputValue(dollars: number | undefined): string {
  if (!dollars) return "";
  return formatPlainCents(dollarsToCents(dollars));
}

export function parseDollarField(
  text: string,
): { ok: true; dollars: number } | { ok: false } {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, dollars: 0 };
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(trimmed)) return { ok: false };
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return { ok: false };
  return { ok: true, dollars };
}

export function buildPrefillMap(
  monthCount: number,
  startMonth: string,
  monthly: number,
  yearly: number,
  yearlyMonth: number,
): Map<number, number> {
  const extras = new Map<number, number>();
  for (let month = 1; month <= monthCount; month += 1) {
    const date = paymentDate(startMonth, month);
    const amount = monthly + (date.month === yearlyMonth ? yearly : 0);
    if (amount > 0) extras.set(month, amount);
  }
  return extras;
}

export function dropExtrasBeyond(
  extras: Map<number, number>,
  monthCount: number,
): Map<number, number> {
  const next = new Map<number, number>();
  for (const [month, amount] of extras) {
    if (month >= 1 && month <= monthCount && amount > 0) next.set(month, amount);
  }
  if (next.size === extras.size) return extras;
  return next;
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

export function groupByYear(
  loan: Loan,
  report: Report,
  extras: Map<number, number> = new Map(),
  financedCents: number = loan.loanCents,
): ScheduleYear[] {
  const startMonth = loan.startMonth;
  const fullInterestCents = report.interest_cents;
  const groups: ScheduleYear[] = [];
  const rows = report.schedule.slice(0, report.payoff_month);
  for (const row of rows) {
    const date = paymentDate(startMonth, row.month);
    const extraDollars = extras.get(row.month) ?? 0;
    const extraCents = extraDollars > 0 ? dollarsToCents(extraDollars) : 0;
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
      extraCents,
      extraDollars,
      savedByExtraCents: savedByExtraCents(
        loan,
        extras,
        row.month,
        fullInterestCents,
        financedCents,
      ),
      principalBalanceCents: row.remaining_principal_cents,
      interestBalanceCents: row.remaining_interest_cents,
    });
    group.principalCents += row.principal_cents;
    group.interestCents += row.interest_cents;
    group.extraCents += extraCents;
    group.principalBalanceCents = row.remaining_principal_cents;
    group.interestBalanceCents = row.remaining_interest_cents;
  }
  return groups;
}

export function firstPaymentYear(loan: Loan): number {
  return paymentDate(loan.startMonth, 1).year;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function defaultScenario(now = new Date()): Scenario {
  return {
    draft: defaultDraft(now),
    extras: new Map(),
    prefill: defaultPrefill(),
    openYears: null,
    picture: defaultPicture(),
  };
}

function parseExtras(value: unknown): Map<number, number> | null {
  if (value === undefined) return new Map();
  if (!Array.isArray(value)) return null;
  const extras = new Map<number, number>();
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [month, amount] = entry;
    if (typeof month !== "number" || !Number.isInteger(month) || month < 1) return null;
    if (typeof amount !== "number" || !Number.isFinite(amount) || !(amount > 0)) return null;
    extras.set(month, amount);
  }
  return extras;
}

function parsePrefill(value: unknown): Prefill | null {
  if (value === undefined) return defaultPrefill();
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.monthly !== "string" || typeof record.yearly !== "string") return null;
  if (typeof record.month !== "number" || !Number.isInteger(record.month)) return null;
  if (record.month < 1 || record.month > 12 || typeof record.open !== "boolean") return null;
  return {
    monthly: record.monthly,
    yearly: record.yearly,
    month: record.month,
    open: record.open,
  };
}

function parseOpenYears(value: unknown): number[] | null | undefined {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return undefined;
  const years: number[] = [];
  for (const year of value) {
    if (typeof year !== "number" || !Number.isInteger(year)) return undefined;
    years.push(year);
  }
  return years;
}

export function loadScenario(storage: StorageLike | undefined, now = new Date()): Scenario {
  const fallback = defaultScenario(now);
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
    const extras = parseExtras(record.extras);
    const prefill = parsePrefill(record.prefill);
    const openYears = parseOpenYears(record.openYears);
    if (!extras || !prefill || openYears === undefined) return fallback;
    return { draft, extras, prefill, openYears, picture: pictureFromStorage(record.picture) };
  } catch {
    return fallback;
  }
}

export function saveScenario(storage: StorageLike | undefined, scenario: Scenario): void {
  if (!storage) return;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        price: scenario.draft.price,
        down: scenario.draft.down,
        years: scenario.draft.years,
        rate: scenario.draft.rate,
        start: scenario.draft.start,
        extras: [...scenario.extras.entries()],
        prefill: scenario.prefill,
        openYears: scenario.openYears,
        picture: scenario.picture,
      }),
    );
  } catch {
    // A full or blocked store leaves the page usable for this visit.
  }
}
