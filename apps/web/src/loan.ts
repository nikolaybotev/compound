import {
  buildReport,
  dollarsToCents,
  formatGroupedCents,
  formatPlainCents,
  type Report,
} from "../../../amortize.js";
import {
  armFromStorage,
  armToStorage,
  defaultArm,
  parseArm,
  resetMonths,
  dropIndexBeyond,
  toBuildReportArm,
  type ArmDraft,
  type LoanArm,
  armLabel,
} from "./arm";
import {
  buildPicture,
  defaultPicture,
  formatWholeDollars,
  headingDollarsFromCents,
  parsePicture,
  percentThousandths,
  pictureFromStorage,
  type PictureDraft,
} from "./picture";

export { percentThousandths };

export const SHORT_MONTHS = [
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

export function storageSetKey(legacyKey: string = STORAGE_KEY): string {
  if (legacyKey.endsWith("-v1")) return `${legacyKey.slice(0, -3)}-v2`;
  return `${legacyKey}-scenarios`;
}

export type StoredSet = {
  active: number;
  scenarios: Scenario[];
};

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
  arm?: LoanArm;
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
  ratePercent: number | null;
  paymentCents: number | null;
  indexPercent: number | null;
  isReset: boolean;
  principalCents: number;
  interestCents: number;
  extraCents: number;
  extraDollars: number;
  edited: boolean;
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
  savedByExtraCents: number;
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
    armArgument(loan),
  );
}

function armArgument(loan: Loan) {
  if (!loan.arm || !loan.arm.enabled) return undefined;
  return toBuildReportArm(loan.arm.values, loan.arm.index);
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

export function yearsAndMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (rest > 0 || years === 0) parts.push(`${rest} ${rest === 1 ? "month" : "months"}`);
  return parts.join(" ");
}

export function monthsSavedText(months: number): string {
  return months < 12 ? String(months) : yearsAndMonths(months);
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
  applied: Map<number, number>;
  prefill: Prefill;
  openYears: number[] | null;
  picture: PictureDraft;
  arm: ArmDraft;
  armStored: boolean;
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

const INDEX_PATTERN = /^\d+(?:\.\d{1,3})?$/;

export function parseIndexField(
  text: string,
): { ok: true; percent: number | null } | { ok: false } {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, percent: null };
  if (!INDEX_PATTERN.test(trimmed)) return { ok: false };
  const percent = Number(trimmed);
  if (!Number.isFinite(percent) || percent < 0) return { ok: false };
  return { ok: true, percent };
}

export function indexInputValue(percent: number | null): string {
  return percent === null ? "" : String(percent);
}

export function withIndex(
  index: Array<[number, number]>,
  month: number,
  percent: number | null,
): Array<[number, number]> {
  const rest = index.filter(([entry]) => entry !== month);
  if (percent === null) return rest.length === index.length ? index : rest;
  return [...rest, [month, percent] as [number, number]].sort((a, b) => a[0] - b[0]);
}

export function isEditedExtra(
  extras: Map<number, number>,
  applied: Map<number, number>,
  month: number,
): boolean {
  return (extras.get(month) ?? 0) !== (applied.get(month) ?? 0);
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
  applied: Map<number, number> = extras,
): ScheduleYear[] {
  const startMonth = loan.startMonth;
  const fullInterestCents = report.interest_cents;
  const groups: ScheduleYear[] = [];
  const rows = report.schedule.slice(0, report.payoff_month);
  const resets =
    loan.arm && loan.arm.enabled
      ? new Set(resetMonths(loan.arm.values.fixedMonths, loan.arm.values.adjustMonths, loan.years * 12))
      : null;
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
        savedByExtraCents: 0,
        principalBalanceCents: 0,
        interestBalanceCents: 0,
      };
      groups.push(group);
    }
    const saved = savedByExtraCents(loan, extras, row.month, fullInterestCents, financedCents);
    group.rows.push({
      month: row.month,
      dateLabel: shortDate(date.year, date.month),
      ratePercent: resets ? (row.rate_percent ?? null) : null,
      paymentCents: resets ? (row.payment_cents ?? null) : null,
      indexPercent: resets ? (row.index_percent ?? null) : null,
      isReset: resets ? resets.has(row.month) : false,
      principalCents: row.principal_cents,
      interestCents: row.interest_cents,
      extraCents,
      extraDollars,
      edited: isEditedExtra(extras, applied, row.month),
      savedByExtraCents: saved,
      principalBalanceCents: row.remaining_principal_cents,
      interestBalanceCents: row.remaining_interest_cents,
    });
    group.principalCents += row.principal_cents;
    group.interestCents += row.interest_cents;
    group.extraCents += extraCents;
    group.savedByExtraCents += saved;
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
    applied: new Map(),
    prefill: defaultPrefill(),
    openYears: null,
    picture: defaultPicture(),
    arm: defaultArm(),
    armStored: false,
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
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return undefined;
  const years: number[] = [];
  for (const year of value) {
    if (typeof year !== "number" || !Number.isInteger(year)) return undefined;
    years.push(year);
  }
  return years;
}

function scenarioArm(
  value: unknown,
  loan: Loan,
): { arm: ArmDraft; armStored: boolean } {
  const loaded = armFromStorage(value);
  if (!loaded.stored) return { arm: loaded.arm, armStored: false };
  if (!loaded.arm.enabled) return { arm: loaded.arm, armStored: true };
  const parsed = parseArm(loaded.arm, loan.years, Math.round(loan.ratePercent * 1000));
  if (!parsed.ok) return { arm: defaultArm(), armStored: false };
  const index = dropIndexBeyond(
    loaded.arm.index,
    resetMonths(parsed.values.fixedMonths, parsed.values.adjustMonths, loan.years * 12),
  );
  return { arm: { ...loaded.arm, index }, armStored: true };
}

function mapsEqual(a: Map<number, number>, b: Map<number, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [month, amount] of a) {
    if (b.get(month) !== amount) return false;
  }
  return true;
}

function openYearsEqual(a: number[] | null, b: number[] | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function pictureDraftEqual(a: PictureDraft, b: PictureDraft): boolean {
  return (
    a.tax === b.tax &&
    a.insurance === b.insurance &&
    a.upfrontMip === b.upfrontMip &&
    a.origination === b.origination &&
    a.title === b.title &&
    a.processing === b.processing &&
    a.appraisal === b.appraisal &&
    a.recording === b.recording &&
    a.open === b.open
  );
}

function draftEqual(a: LoanDraft, b: LoanDraft): boolean {
  return (
    a.price === b.price &&
    a.down === b.down &&
    a.years === b.years &&
    a.rate === b.rate &&
    a.start === b.start
  );
}

function scenariosDiffer(legacy: Scenario, active: Scenario): boolean {
  if (!draftEqual(legacy.draft, active.draft)) return true;
  if (!mapsEqual(legacy.extras, active.extras)) return true;
  if (!mapsEqual(legacy.applied, active.applied)) return true;
  if (!openYearsEqual(legacy.openYears, active.openYears)) return true;
  if (!pictureDraftEqual(legacy.picture, active.picture)) return true;
  if (legacy.armStored !== active.armStored) return true;
  if (legacy.prefill.monthly !== active.prefill.monthly) return true;
  if (legacy.prefill.yearly !== active.prefill.yearly) return true;
  if (legacy.prefill.month !== active.prefill.month) return true;
  if (legacy.prefill.open !== active.prefill.open) return true;
  if (legacy.armStored) {
    return JSON.stringify(armToStorage(legacy.arm)) !== JSON.stringify(armToStorage(active.arm));
  }
  return false;
}

function parseScenarioRecord(record: Record<string, unknown>, now = new Date()): Scenario | null {
  const draft: LoanDraft = {
    price: typeof record.price === "string" ? record.price : "",
    down: typeof record.down === "string" ? record.down : "",
    years: typeof record.years === "string" ? record.years : "",
    rate: typeof record.rate === "string" ? record.rate : "",
    start: typeof record.start === "string" ? record.start : "",
  };
  const parsedLoan = parseLoan(draft);
  if (!parsedLoan.ok) return null;
  const extras = parseExtras(record.extras);
  const prefill = parsePrefill(record.prefill);
  const openYears = parseOpenYears(record.openYears);
  if (!extras || !prefill || openYears === undefined) return null;
  const { arm, armStored } = scenarioArm(record.arm, parsedLoan.loan);
  const applied = record.applied === undefined ? null : parseExtras(record.applied);
  return {
    draft,
    extras,
    applied: new Map(applied ?? extras),
    prefill,
    openYears,
    picture: pictureFromStorage(record.picture),
    arm,
    armStored,
  };
}

function scenarioToStorageObject(scenario: Scenario): Record<string, unknown> {
  return {
    price: scenario.draft.price,
    down: scenario.draft.down,
    years: scenario.draft.years,
    rate: scenario.draft.rate,
    start: scenario.draft.start,
    extras: [...scenario.extras.entries()],
    applied: [...scenario.applied.entries()],
    prefill: scenario.prefill,
    openYears: scenario.openYears,
    picture: scenario.picture,
    ...(scenario.armStored ? { arm: armToStorage(scenario.arm) } : {}),
  };
}

function parseStoredSetEnvelope(parsed: Record<string, unknown>, now = new Date()): StoredSet | null {
  if (parsed.version === 1) {
    const scenario = parseScenarioRecord(parsed, now);
    if (!scenario) return null;
    return { active: 0, scenarios: [scenario] };
  }
  if (parsed.version !== 2) return null;
  if (!Array.isArray(parsed.scenarios) || parsed.scenarios.length === 0) return null;
  const scenarios: Scenario[] = [];
  for (const entry of parsed.scenarios) {
    if (!entry || typeof entry !== "object") return null;
    const scenario = parseScenarioRecord(entry as Record<string, unknown>, now);
    if (!scenario) return null;
    scenarios.push(scenario);
  }
  let active = 0;
  if (typeof parsed.active === "number" && Number.isInteger(parsed.active)) {
    active = parsed.active;
  }
  if (active < 0 || active >= scenarios.length) active = 0;
  return { active, scenarios };
}

export function parseStoredSet(
  text: string,
  now = new Date(),
): { ok: true; set: StoredSet } | { ok: false } {
  const trimmed = text.replace(/^\uFEFF/, "");
  if (trimmed === "") return { ok: false };
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object") return { ok: false };
    const set = parseStoredSetEnvelope(parsed as Record<string, unknown>, now);
    if (!set) return { ok: false };
    return { ok: true, set };
  } catch {
    return { ok: false };
  }
}

function tryParseSetKey(raw: string | null, now: Date): StoredSet | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parseStoredSetEnvelope(parsed as Record<string, unknown>, now);
  } catch {
    return null;
  }
}

function tryParseLegacyScenario(raw: string | null, now: Date): Scenario | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (record.version !== 1) return null;
    return parseScenarioRecord(record, now);
  } catch {
    return null;
  }
}

export function loadStored(storage: StorageLike | undefined, now = new Date()): StoredSet {
  const fallback: StoredSet = { active: 0, scenarios: [defaultScenario(now)] };
  if (!storage) return fallback;
  const setKey = storageSetKey(STORAGE_KEY);
  const fromSet = tryParseSetKey(storage.getItem(setKey), now);
  const legacyScenario = tryParseLegacyScenario(storage.getItem(STORAGE_KEY), now);

  if (fromSet) {
    if (legacyScenario) {
      const activeScenario = fromSet.scenarios[fromSet.active];
      if (scenariosDiffer(legacyScenario, activeScenario)) {
        const scenarios = [...fromSet.scenarios];
        scenarios[fromSet.active] = legacyScenario;
        return { active: fromSet.active, scenarios };
      }
    }
    return fromSet;
  }

  if (legacyScenario) {
    return { active: 0, scenarios: [legacyScenario] };
  }

  return fallback;
}

type FullStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function restoreKey(storage: FullStorageLike, key: string, snapshot: string | null): void {
  if (snapshot === null) storage.removeItem(key);
  else storage.setItem(key, snapshot);
}

export function serializeStoredSet(set: StoredSet): string {
  return JSON.stringify({
    version: 2,
    active: set.active,
    scenarios: set.scenarios.map((scenario) => scenarioToStorageObject(scenario)),
  });
}

export function scenarioLabelText(scenario: Scenario, figures: ScenarioFigures): string {
  const dollars = formatWholeDollars(headingDollarsFromCents(figures.totalCents));
  const thousands = dollarsToThousandsText(scenario.draft.price);
  const parsed = parseLoan(scenario.draft);
  if (!parsed.ok) return dollars;
  const years = parsed.loan.years;
  const term = years === 1 ? "1 year" : `${years} years`;
  const rateThousandths = Math.round(parsed.loan.ratePercent * 1000);
  const armParsed = parseArm(scenario.arm, years, rateThousandths);
  const product =
    scenario.arm.enabled && armParsed.ok
      ? armLabel(armParsed.values.fixedMonths / 12, armParsed.values.adjustMonths)
      : "fixed";
  return `${dollars} - ${thousands}K | ${scenario.draft.down}% down | ${scenario.draft.rate}% | ${term} | ${product}`;
}

export function saveStored(storage: FullStorageLike | undefined, set: StoredSet): boolean {
  if (!storage) return true;
  const legacyKey = STORAGE_KEY;
  const setKey = storageSetKey(legacyKey);
  const legacySnapshot = storage.getItem(legacyKey);
  const setSnapshot = storage.getItem(setKey);
  const activeScenario = set.scenarios[set.active] ?? set.scenarios[0];
  const setPayload = JSON.stringify({
    version: 2,
    active: set.active,
    scenarios: set.scenarios.map((scenario) => scenarioToStorageObject(scenario)),
  });
  const legacyPayload = JSON.stringify({
    version: 1,
    ...scenarioToStorageObject(activeScenario),
  });
  try {
    storage.setItem(setKey, setPayload);
    storage.setItem(legacyKey, legacyPayload);
    return true;
  } catch {
    try {
      restoreKey(storage, legacyKey, legacySnapshot);
      restoreKey(storage, setKey, setSnapshot);
    } catch {
      // Restore failed; still report failure.
    }
    return false;
  }
}

export function prevailingExtraCents(report: Report, termMonths: number): number {
  const rows = report.schedule.slice(0, report.payoff_month);
  const counts = new Map<number, number>();
  for (const row of rows) {
    const extra = row.extra_cents;
    if (extra > 0) counts.set(extra, (counts.get(extra) ?? 0) + 1);
  }
  for (const [amount, count] of counts) {
    if (count * 5 >= termMonths * 4) return amount;
  }
  return 0;
}

export function modalPaymentCents(report: Report): number {
  const rows = report.schedule.slice(0, report.payoff_month);
  const counts = new Map<number, { count: number; firstMonth: number }>();
  for (const row of rows) {
    const payment = report.arm ? (row.payment_cents ?? 0) : report.monthly_payment_cents;
    const entry = counts.get(payment) ?? { count: 0, firstMonth: row.month };
    entry.count += 1;
    counts.set(payment, entry);
  }
  let bestPayment = 0;
  let bestCount = 0;
  let bestFirstMonth = Number.POSITIVE_INFINITY;
  for (const [payment, { count, firstMonth }] of counts) {
    if (count > bestCount || (count === bestCount && firstMonth < bestFirstMonth)) {
      bestCount = count;
      bestPayment = payment;
      bestFirstMonth = firstMonth;
    }
  }
  return bestPayment;
}

export function prevailingTotalCents(
  modalPaymentCents: number,
  taxCents: number,
  insuranceCents: number,
  fhaMipCents: number,
  pmiCents: number,
  prevailingExtraCents: number,
): number {
  return modalPaymentCents + taxCents + insuranceCents + fhaMipCents + pmiCents + prevailingExtraCents;
}

export type ScenarioFigures = {
  modalPaymentCents: number;
  prevailingExtraCents: number;
  taxCents: number;
  insuranceCents: number;
  fhaMipCents: number;
  pmiCents: number;
  totalCents: number;
};

export function scenarioFigures(scenario: Scenario): ScenarioFigures | null {
  const parsedLoan = parseLoan(scenario.draft);
  if (!parsedLoan.ok) return null;
  const pictureParsed = parsePicture(scenario.picture);
  if (!pictureParsed.ok) return null;
  const rateThousandths = Math.round(parsedLoan.loan.ratePercent * 1000);
  const armParsed = parseArm(scenario.arm, parsedLoan.loan.years, rateThousandths);
  const armOn = scenario.arm.enabled && armParsed.ok;
  const reportLoan: Loan = armOn
    ? {
        ...parsedLoan.loan,
        arm: { enabled: true, values: armParsed.values, index: scenario.arm.index },
      }
    : parsedLoan.loan;
  const lines = buildPicture(
    parsedLoan.loan,
    scenario.draft.rate,
    scenario.draft.down,
    pictureParsed.values,
  );
  const prevailingReport = loanReport(
    armOn ? reportLoan : parsedLoan.loan,
    scenario.applied,
    lines.financedCents,
  );
  const termMonths = parsedLoan.loan.years * 12;
  const modal = modalPaymentCents(prevailingReport);
  const extra = prevailingExtraCents(prevailingReport, termMonths);
  const total = prevailingTotalCents(
    modal,
    lines.taxCents,
    lines.insuranceCents,
    lines.fhaMipCents,
    lines.pmiCents,
    extra,
  );
  return {
    modalPaymentCents: modal,
    prevailingExtraCents: extra,
    taxCents: lines.taxCents,
    insuranceCents: lines.insuranceCents,
    fhaMipCents: lines.fhaMipCents,
    pmiCents: lines.pmiCents,
    totalCents: total,
  };
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
    return parseScenarioRecord(record, now) ?? fallback;
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
        applied: [...scenario.applied.entries()],
        prefill: scenario.prefill,
        openYears: scenario.openYears,
        picture: scenario.picture,
        ...(scenario.armStored ? { arm: armToStorage(scenario.arm) } : {}),
      }),
    );
  } catch {
    // A full or blocked store leaves the page usable for this visit.
  }
}
