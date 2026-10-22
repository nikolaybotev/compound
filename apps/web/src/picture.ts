import { buildReport, dollarsToCents } from "../../../amortize.js";

type AmortizedLoan = {
  priceCents: number;
  loanCents: number;
  ratePercent: number;
  years: number;
};

export function percentThousandths(text: string): number | null {
  if (!/^(?:\d+)(?:\.\d{1,3})?$/.test(text)) return null;
  const [whole, frac = ""] = text.split(".");
  const padded = `${frac}000`.slice(0, 3);
  const thousandths = Number(whole) * 1000 + Number(padded);
  if (!Number.isSafeInteger(thousandths)) return null;
  return thousandths;
}

/** Hundred-thousandths of a percent (five decimal places on the rate). */
export function titlePercentHundredThousandths(text: string): number | null {
  const trimmed = text.trim();
  if (!/^(?:\d+)(?:\.\d{1,5})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const padded = `${frac}00000`.slice(0, 5);
  const units = Number(whole) * 100_000 + Number(padded);
  if (!Number.isSafeInteger(units) || units >= 10_000_000) return null;
  return units;
}

export function titlePercentInputFromUnits(units: number): string {
  const whole = Math.floor(units / 100_000);
  const frac = units % 100_000;
  if (frac === 0) return String(whole);
  const fracText = String(frac).padStart(5, "0").replace(/0+$/, "");
  return whole === 0 ? `0.${fracText}` : `${whole}.${fracText}`;
}

export const TITLE_PRESET_RATES: ReadonlyArray<{ label: string; units: number }> = [
  { label: "50/50", units: 75_000 },
  { label: "Buyer pays all", units: 100_000 },
  { label: "Seller pays the owner's policy and escrow", units: 40_000 },
];

export const PICTURE_PERCENT_FIELDS = ["tax", "insurance", "pmi"] as const;

export type PicturePercentField = (typeof PICTURE_PERCENT_FIELDS)[number];

export type PictureInputField =
  | PicturePercentField
  | "title"
  | "lenderFees"
  | "closingDay"
  | "taxImpoundMonths"
  | "insuranceImpoundMonths"
  | "miImpoundMonths"
  | "proration"
  | "points"
  | "sellerCredit"
  | "lenderCredit"
  | "earnest";

export type PictureDraft = {
  tax: string;
  insurance: string;
  pmi: string;
  title: string;
  lenderFees: string;
  closingDay: string;
  taxImpoundMonths: string;
  insuranceImpoundMonths: string;
  miImpoundMonths: string;
  proration: string;
  points: string;
  sellerCredit: string;
  lenderCredit: string;
  earnest: string;
  interestBasis: string;
  open: boolean;
  closingOpen: boolean;
};

export type PictureValues = {
  taxThousandths: number;
  insuranceThousandths: number;
  pmiThousandths: number;
  titleHundredThousandths: number;
  lenderFeesCents: number;
  closingDay: number;
  taxImpoundMonths: number;
  insuranceImpoundMonths: number;
  miImpoundMonths: number;
  prorationCents: number;
  pointsThousandths: number;
  sellerCreditCents: number;
  lenderCreditCents: number;
  earnestCents: number;
  interestBasis: "360" | "365";
  /** When set, overrides the twelve-month insurance line (reference fixture). */
  homeownersInsuranceAnnualCents?: number;
};

export type PictureLines = {
  priceCents: number;
  downCents: number;
  baseCents: number;
  financedCents: number;
  principalAndInterestCents: number;
  taxCents: number;
  insuranceCents: number;
  pmiCents: number;
  pmiRateText: string;
  totalMonthlyCents: number;
  headingDollars: number;
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

export type PmiRateText = "0%" | "0.2%" | "0.35%" | "0.45%";

export type PictureParseResult =
  | { ok: true; values: PictureValues }
  | { ok: false; field: PictureInputField; message: string };

const PERCENT_LABELS: Record<PicturePercentField, string> = {
  tax: "Property tax",
  insurance: "Home insurance",
  pmi: "Conventional PMI",
};

const FIELD_LABELS: Record<PictureInputField, string> = {
  ...PERCENT_LABELS,
  title: "Title, escrow, and recording",
  lenderFees: "Lender fees",
  closingDay: "Closing day",
  taxImpoundMonths: "Property tax impound months",
  insuranceImpoundMonths: "Insurance impound months",
  miImpoundMonths: "Mortgage insurance impound months",
  proration: "Property-tax proration",
  points: "Points",
  sellerCredit: "Seller credit",
  lenderCredit: "Lender credit",
  earnest: "Earnest money already paid",
};

export function pictureFieldMessage(field: PictureInputField): string {
  if (field === "title") {
    return `${FIELD_LABELS.title} must be a percent greater than or equal to zero and less than 100, with at most five decimal places.`;
  }
  if (field === "points") {
    return `${FIELD_LABELS.points} must be a percent greater than or equal to zero and less than 100, with at most three decimal places.`;
  }
  if (field === "proration") {
    return `${FIELD_LABELS.proration} must be a dollar amount with at most two decimal places.`;
  }
  if (field === "closingDay") {
    return `${FIELD_LABELS.closingDay} must be a whole number from 1 through 31.`;
  }
  if (field === "taxImpoundMonths" || field === "insuranceImpoundMonths" || field === "miImpoundMonths") {
    return `${FIELD_LABELS[field]} must be a whole number from 0 through 999.`;
  }
  if (field in PERCENT_LABELS) {
    const name = PERCENT_LABELS[field as PicturePercentField];
    return `${name} must be a percent greater than or equal to zero and less than 100, with at most three decimal places.`;
  }
  const name = FIELD_LABELS[field];
  return `${name} must be a dollar amount greater than or equal to zero, with at most two decimal places.`;
}

function parsePicturePercent(text: string): number | null {
  const thousandths = percentThousandths(text.trim());
  if (thousandths === null || thousandths >= 100_000) return null;
  return thousandths;
}

function parsePictureDollars(text: string): number | null {
  const trimmed = text.trim();
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(trimmed)) return null;
  let cents: number;
  try {
    cents = dollarsToCents(Number(trimmed));
  } catch {
    return null;
  }
  if (cents < 0) return null;
  return cents;
}

export function parseProrationDollars(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-") return null;
  const negative = trimmed.startsWith("-");
  const body = negative ? trimmed.slice(1) : trimmed;
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(body)) return null;
  let cents: number;
  try {
    cents = dollarsToCents(Number(body));
  } catch {
    return null;
  }
  return negative ? -cents : cents;
}

export function parseClosingDay(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 1 || value > 31) return null;
  return value;
}

export function parseWholeCount(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0 || value > 999) return null;
  return value;
}

export function loadStoredCount(value: unknown, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = parseWholeCount(value);
  return parsed === null ? fallback : parsed;
}

export function loadStoredInterestBasis(value: unknown): "360" | "365" {
  return value === "365" ? "365" : "360";
}

export function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

export function closingMonthParts(startMonth: string): { year: number; month: number } {
  const year = Number(startMonth.slice(0, 4));
  const month = Number(startMonth.slice(5, 7));
  return { year, month };
}

export function clampClosingDay(day: number, startMonth: string): number {
  const { year, month } = closingMonthParts(startMonth);
  const max = daysInMonth(year, month);
  return Math.min(Math.max(day, 1), max);
}

export function closingInterestDays(startMonth: string, closingDay: number): number {
  const { year, month } = closingMonthParts(startMonth);
  const clamped = Math.min(Math.max(closingDay, 1), daysInMonth(year, month));
  return daysInMonth(year, month) - clamped + 1;
}

export function centsToProrationField(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = abs % 100;
  if (frac === 0) return negative ? `-${whole}` : String(whole);
  const fracText = String(frac).padStart(2, "0");
  return negative ? `-${whole}.${fracText}` : `${whole}.${fracText}`;
}

export function defaultProrationCents(priceCents: number, taxThousandths: number): number {
  return percentOfCents(priceCents, taxThousandths, 12);
}

export function pmiPercentInputFromThousandths(thousandths: number): string {
  if (thousandths === 0) return "0";
  const whole = Math.floor(thousandths / 1000);
  const frac = thousandths % 1000;
  if (frac === 0) return String(whole);
  const fracText = String(frac).padStart(3, "0").replace(/0+$/, "");
  return whole === 0 ? `0.${fracText}` : `${whole}.${fracText}`;
}

export function pmiRateTextFromThousandths(thousandths: number): string {
  return `${pmiPercentInputFromThousandths(thousandths)}%`;
}

export function parsePicture(draft: PictureDraft, startMonth: string): PictureParseResult {
  const values = {} as PictureValues;
  const percentKeys = {
    tax: "taxThousandths",
    insurance: "insuranceThousandths",
    pmi: "pmiThousandths",
  } as const;
  for (const field of PICTURE_PERCENT_FIELDS) {
    const thousandths = parsePicturePercent(draft[field]);
    if (thousandths === null) {
      return { ok: false, field, message: pictureFieldMessage(field) };
    }
    values[percentKeys[field]] = thousandths;
  }
  const titleUnits = titlePercentHundredThousandths(draft.title);
  if (titleUnits === null) {
    return { ok: false, field: "title", message: pictureFieldMessage("title") };
  }
  values.titleHundredThousandths = titleUnits;

  const lenderFees = parsePictureDollars(draft.lenderFees);
  if (lenderFees === null) {
    return { ok: false, field: "lenderFees", message: pictureFieldMessage("lenderFees") };
  }
  values.lenderFeesCents = lenderFees;

  const closingDayRaw = parseClosingDay(draft.closingDay);
  if (closingDayRaw === null) {
    return { ok: false, field: "closingDay", message: pictureFieldMessage("closingDay") };
  }
  values.closingDay = clampClosingDay(closingDayRaw, startMonth);

  const taxImpound = parseWholeCount(draft.taxImpoundMonths);
  if (taxImpound === null) {
    return { ok: false, field: "taxImpoundMonths", message: pictureFieldMessage("taxImpoundMonths") };
  }
  values.taxImpoundMonths = taxImpound;

  const insuranceImpound = parseWholeCount(draft.insuranceImpoundMonths);
  if (insuranceImpound === null) {
    return { ok: false, field: "insuranceImpoundMonths", message: pictureFieldMessage("insuranceImpoundMonths") };
  }
  values.insuranceImpoundMonths = insuranceImpound;

  const miImpound = parseWholeCount(draft.miImpoundMonths);
  if (miImpound === null) {
    return { ok: false, field: "miImpoundMonths", message: pictureFieldMessage("miImpoundMonths") };
  }
  values.miImpoundMonths = miImpound;

  const proration = parseProrationDollars(draft.proration);
  if (proration === null) {
    return { ok: false, field: "proration", message: pictureFieldMessage("proration") };
  }
  values.prorationCents = proration;

  const points = parsePicturePercent(draft.points);
  if (points === null) {
    return { ok: false, field: "points", message: pictureFieldMessage("points") };
  }
  values.pointsThousandths = points;

  const sellerCredit = parsePictureDollars(draft.sellerCredit);
  if (sellerCredit === null) {
    return { ok: false, field: "sellerCredit", message: pictureFieldMessage("sellerCredit") };
  }
  values.sellerCreditCents = sellerCredit;

  const lenderCredit = parsePictureDollars(draft.lenderCredit);
  if (lenderCredit === null) {
    return { ok: false, field: "lenderCredit", message: pictureFieldMessage("lenderCredit") };
  }
  values.lenderCreditCents = lenderCredit;

  const earnest = parsePictureDollars(draft.earnest);
  if (earnest === null) {
    return { ok: false, field: "earnest", message: pictureFieldMessage("earnest") };
  }
  values.earnestCents = earnest;

  values.interestBasis = loadStoredInterestBasis(draft.interestBasis);
  return { ok: true, values };
}

function storedText(value: unknown, accept: (text: string) => boolean, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return accept(trimmed) ? trimmed : fallback;
}

function migrateLenderFees(record: Record<string, unknown>, loanCents: number): string {
  const stored = storedText(record.lenderFees, (text) => parsePictureDollars(text) !== null, "");
  if (stored !== "") return stored;
  const origTh =
    typeof record.origination === "string" && parsePicturePercent(record.origination) !== null
      ? parsePicturePercent(record.origination)!
      : 1000;
  const proc =
    typeof record.processing === "string" && parsePictureDollars(record.processing) !== null
      ? parsePictureDollars(record.processing)!
      : 120_000;
  const totalCents = percentOfCents(loanCents, origTh) + proc;
  const whole = Math.trunc(totalCents / 100);
  const frac = totalCents % 100;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

function loadTitlePercent(record: Record<string, unknown>, fallback: string): string {
  if (typeof record.title === "string" && titlePercentHundredThousandths(record.title) !== null) {
    return record.title.trim();
  }
  return fallback;
}

export function pictureFromStorage(
  value: unknown,
  loanCents: number,
  startMonth: string,
  downText?: string,
  ficoText?: string,
  priceCents?: number,
): PictureDraft {
  const fallback = defaultPicture();
  if (value === undefined) return pmiDraftForLoan(fallback, downText, ficoText);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ensurePmiOnDraft(fallback, downText, ficoText);
  }
  const record = value as Record<string, unknown>;
  const draft = defaultPicture();
  for (const field of PICTURE_PERCENT_FIELDS) {
    draft[field] = storedText(record[field], (text) => parsePicturePercent(text) !== null, fallback[field]);
  }
  draft.title = loadTitlePercent(record, fallback.title);
  draft.lenderFees = migrateLenderFees(record, loanCents);
  const closingFallback = 1;
  const closingRaw = loadStoredCount(record.closingDay, closingFallback);
  draft.closingDay = String(clampClosingDay(closingRaw, startMonth));
  draft.taxImpoundMonths = String(loadStoredCount(record.taxImpoundMonths, 6));
  draft.insuranceImpoundMonths = String(loadStoredCount(record.insuranceImpoundMonths, 3));
  draft.miImpoundMonths = String(loadStoredCount(record.miImpoundMonths, 2));
  if (typeof record.proration === "string" && parseProrationDollars(record.proration) !== null) {
    draft.proration = record.proration.trim();
  } else if (priceCents !== undefined) {
    const taxTh = parsePicturePercent(draft.tax) ?? 1150;
    draft.proration = centsToProrationField(defaultProrationCents(priceCents, taxTh));
  } else {
    draft.proration = fallback.proration;
  }
  draft.points = storedText(record.points, (text) => parsePicturePercent(text) !== null, "0");
  draft.sellerCredit = storedText(record.sellerCredit, (text) => parsePictureDollars(text) !== null, "0");
  draft.lenderCredit = storedText(record.lenderCredit, (text) => parsePictureDollars(text) !== null, "0");
  draft.earnest = storedText(record.earnest, (text) => parsePictureDollars(text) !== null, "0");
  draft.interestBasis = loadStoredInterestBasis(record.interestBasis);
  draft.open = typeof record.open === "boolean" ? record.open : false;
  draft.closingOpen = typeof record.closingOpen === "boolean" ? record.closingOpen : false;
  if (record.pmi === undefined) {
    return pmiDraftForLoan(draft, downText, ficoText);
  }
  if (parsePicturePercent(draft.pmi) === null) {
    return ensurePmiOnDraft(draft, downText, ficoText);
  }
  return draft;
}

export function defaultPicture(): PictureDraft {
  return {
    tax: "1.15",
    insurance: "0.35",
    pmi: "0.35",
    title: "0.75",
    lenderFees: "3000",
    closingDay: "1",
    taxImpoundMonths: "6",
    insuranceImpoundMonths: "3",
    miImpoundMonths: "2",
    proration: "575",
    points: "0",
    sellerCredit: "0",
    lenderCredit: "0",
    earnest: "0",
    interestBasis: "360",
    open: false,
    closingOpen: false,
  };
}

export function sellerCreditWarning(
  downThousandths: number,
  sellerCreditCents: number,
  priceCents: number,
): string | null {
  if (downThousandths >= 10_000) return null;
  if (sellerCreditCents * 100 <= priceCents * 3) return null;
  return "The usual conventional cap is 3% of the lower of price or appraisal. This check uses price because there is no appraisal.";
}

export function pmiDraftForLoan(draft: PictureDraft, downText?: string, ficoText?: string): PictureDraft {
  const downThousandths = downText === undefined ? null : percentThousandths(downText.trim());
  const fico = ficoText === undefined ? 780 : parseFicoScore(ficoText) ?? 780;
  const thousandths = pmiThousandthsForScore(downThousandths ?? 5_000, fico);
  return { ...draft, pmi: pmiPercentInputFromThousandths(thousandths) };
}

export function ensurePmiOnDraft(draft: PictureDraft, downText?: string, ficoText?: string): PictureDraft {
  if (parsePicturePercent(draft.pmi) !== null) return draft;
  return pmiDraftForLoan(draft, downText, ficoText);
}

function centsToDollars(cents: number): number {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  const dollars = Number(`${whole}.${frac}`);
  return negative ? -dollars : dollars;
}

// Half up, same integer division as downPaymentCents: remainder * 2 >= divisor rounds away from zero.
function halfUpQuotient(numerator: number, divisor: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(divisor) || divisor <= 0) {
    throw new Error("picture amount is too large");
  }
  const quotient = Math.trunc(numerator / divisor);
  const remainder = numerator % divisor;
  if (remainder * 2 >= divisor) return quotient + 1;
  return quotient;
}

export function percentOfCents(cents: number, thousandths: number, parts = 1): number {
  if (!Number.isSafeInteger(cents) || !Number.isSafeInteger(thousandths) || !Number.isSafeInteger(parts)) {
    throw new Error("picture amount is too large");
  }
  const numerator = cents * thousandths;
  if (!Number.isSafeInteger(numerator)) throw new Error("picture amount is too large");
  const divisor = 100_000 * parts;
  if (!Number.isSafeInteger(divisor)) throw new Error("picture amount is too large");
  return halfUpQuotient(numerator, divisor);
}

export function titleCentsFromPrice(priceCents: number, hundredThousandths: number): number {
  if (!Number.isSafeInteger(priceCents) || !Number.isSafeInteger(hundredThousandths)) {
    throw new Error("picture amount is too large");
  }
  const numerator = priceCents * hundredThousandths;
  if (!Number.isSafeInteger(numerator)) throw new Error("picture amount is too large");
  return halfUpQuotient(numerator, 10_000_000);
}

export function conventionalPmi(downThousandths: number): { thousandths: number; text: PmiRateText } {
  const thousandths = pmiThousandthsForScore(downThousandths, 780);
  return { thousandths, text: pmiRateTextFromThousandths(thousandths) as PmiRateText };
}

export function parseFicoScore(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0 || value > 999) return null;
  return value;
}

export const FICO_RANGES: ReadonlyArray<{ score: number; label: string }> = [
  { score: 780, label: "780+" },
  { score: 740, label: "740–779" },
  { score: 700, label: "700–739" },
  { score: 660, label: "660–699" },
  { score: 620, label: "620–659" },
];

export function ficoRangeScore(score: number): number {
  for (const range of FICO_RANGES) {
    if (score >= range.score) return range.score;
  }
  return 620;
}

export function ficoBand(score: number): string {
  if (score >= 780) return "780+";
  if (score >= 740) return "740-779";
  if (score >= 700) return "700-739";
  if (score >= 660) return "660-699";
  if (score >= 620) return "620-659";
  return "below620";
}

const ARCH_PMI: Record<string, [number, number, number]> = {
  "740-779": [380, 530, 700],
  "700-739": [550, 780, 990],
  "660-699": [900, 1280, 1540],
  "620-659": [940, 1420, 1860],
  below620: [1320, 1990, 2600],
};

export function pmiThousandthsForScore(downThousandths: number, fico: number): number {
  if (downThousandths >= 20_000) return 0;
  const rungIndex = downThousandths >= 10_000 ? 0 : downThousandths >= 5_000 ? 1 : 2;
  if (fico >= 780) {
    return [200, 350, 450][rungIndex];
  }
  const band = ficoBand(fico);
  const row = ARCH_PMI[band];
  return row[rungIndex];
}

export function headingDollarsFromCents(cents: number): number {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  let dollars = Math.trunc(abs / 100);
  const remainder = abs % 100;
  if (remainder * 2 >= 100) dollars += 1;
  return negative ? -dollars : dollars;
}

export function formatWholeDollars(dollars: number): string {
  const negative = dollars < 0;
  const grouped = String(Math.abs(dollars)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}`;
}

export function prepaidInterestCents360(
  baseCents: number,
  rateThousandths: number,
  days: number,
): number {
  if (!Number.isSafeInteger(baseCents) || !Number.isSafeInteger(rateThousandths) || !Number.isSafeInteger(days)) {
    throw new Error("picture amount is too large");
  }
  if (days === 0) return 0;
  const numerator = baseCents * rateThousandths * days;
  if (!Number.isSafeInteger(numerator)) throw new Error("picture amount is too large");
  return halfUpQuotient(numerator, 100_000 * 360);
}

export function prepaidInterestPerDiem365Cents(baseCents: number, rateThousandths: number): number {
  if (!Number.isSafeInteger(baseCents) || !Number.isSafeInteger(rateThousandths)) {
    throw new Error("picture amount is too large");
  }
  const numerator = baseCents * rateThousandths;
  if (!Number.isSafeInteger(numerator)) throw new Error("picture amount is too large");
  return halfUpQuotient(numerator, 100_000 * 365);
}

export function prepaidInterestCents365(
  baseCents: number,
  rateThousandths: number,
  days: number,
): number {
  if (days === 0) return 0;
  return prepaidInterestPerDiem365Cents(baseCents, rateThousandths) * days;
}

export function prepaidInterestCents(
  baseCents: number,
  rateThousandths: number,
  days: number,
  basis: "360" | "365",
): number {
  return basis === "365"
    ? prepaidInterestCents365(baseCents, rateThousandths, days)
    : prepaidInterestCents360(baseCents, rateThousandths, days);
}

export function buildPicture(
  loan: AmortizedLoan,
  rateText: string,
  downText: string,
  startMonth: string,
  values: PictureValues,
): PictureLines {
  const rateThousandths = percentThousandths(rateText.trim());
  const downThousandths = percentThousandths(downText.trim());
  if (rateThousandths === null || downThousandths === null) {
    throw new Error("picture loan rate is not a percent");
  }
  const priceCents = loan.priceCents;
  const baseCents = loan.loanCents;
  const downCents = priceCents - baseCents;
  const financedCents = baseCents;
  const principalAndInterestCents = buildReport(
    centsToDollars(financedCents),
    loan.ratePercent,
    loan.years * 12,
    new Map(),
  ).monthly_payment_cents;
  const taxCents = percentOfCents(priceCents, values.taxThousandths, 12);
  const insuranceCents = percentOfCents(priceCents, values.insuranceThousandths, 12);
  const pmiCents = percentOfCents(financedCents, values.pmiThousandths, 12);
  const totalMonthlyCents = principalAndInterestCents + taxCents + insuranceCents + pmiCents;
  const lenderFeesCents = values.lenderFeesCents;
  const titleCents = titleCentsFromPrice(priceCents, values.titleHundredThousandths);
  const interestDays = closingInterestDays(startMonth, values.closingDay);
  const prepaidInterest = prepaidInterestCents(
    baseCents,
    rateThousandths,
    interestDays,
    values.interestBasis,
  );
  const homeownersInsuranceCents =
    values.homeownersInsuranceAnnualCents ??
    percentOfCents(priceCents, values.insuranceThousandths);
  const insuranceMonthlyForImpound =
    values.homeownersInsuranceAnnualCents !== undefined
      ? halfUpQuotient(values.homeownersInsuranceAnnualCents, 12)
      : insuranceCents;
  const taxImpoundCents = taxCents * values.taxImpoundMonths;
  const insuranceImpoundCents = insuranceMonthlyForImpound * values.insuranceImpoundMonths;
  const miImpoundCents = pmiCents === 0 ? 0 : pmiCents * values.miImpoundMonths;
  const prorationCents = values.prorationCents;
  const closingCents =
    lenderFeesCents +
    titleCents +
    prepaidInterest +
    homeownersInsuranceCents +
    taxImpoundCents +
    insuranceImpoundCents +
    miImpoundCents +
    prorationCents;
  const pointsCents = percentOfCents(baseCents, values.pointsThousandths);
  const closingAndPointsCents = closingCents + pointsCents;
  const cashToCloseCents =
    downCents + closingAndPointsCents - values.sellerCreditCents - values.lenderCreditCents;
  const dueAtClosingCents = cashToCloseCents - values.earnestCents;
  return {
    priceCents,
    downCents,
    baseCents,
    financedCents,
    principalAndInterestCents,
    taxCents,
    insuranceCents,
    pmiCents,
    pmiRateText: pmiRateTextFromThousandths(values.pmiThousandths),
    totalMonthlyCents,
    headingDollars: headingDollarsFromCents(totalMonthlyCents),
    lenderFeesCents,
    titleCents,
    prepaidInterestCents: prepaidInterest,
    prepaidInterestDays: interestDays,
    homeownersInsuranceCents,
    taxImpoundCents,
    insuranceImpoundCents,
    miImpoundCents,
    prorationCents,
    closingCents,
    pointsCents,
    closingAndPointsCents,
    cashToCloseCents,
    dueAtClosingCents,
  };
}
