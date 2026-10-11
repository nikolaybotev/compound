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

function centsToDollars(cents: number): number {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  const dollars = Number(`${whole}.${frac}`);
  return negative ? -dollars : dollars;
}

export const PICTURE_PERCENT_FIELDS = ["tax", "insurance", "pmi", "origination", "title"] as const;

export const PICTURE_DOLLAR_FIELDS = ["processing", "appraisal", "recording", "cushion"] as const;

export const PICTURE_COUNT_FIELDS = ["insuranceMonths", "taxMonths", "interestDays"] as const;

export type PicturePercentField = (typeof PICTURE_PERCENT_FIELDS)[number];
export type PictureDollarField = (typeof PICTURE_DOLLAR_FIELDS)[number];
export type PictureCountField = (typeof PICTURE_COUNT_FIELDS)[number];
export type PictureInputField = PicturePercentField | PictureDollarField | PictureCountField;

export type PictureDraft = {
  tax: string;
  insurance: string;
  pmi: string;
  origination: string;
  title: string;
  processing: string;
  appraisal: string;
  recording: string;
  insuranceMonths: string;
  taxMonths: string;
  interestDays: string;
  interestBasis: string;
  cushion: string;
  open: boolean;
  closingOpen: boolean;
};

export type PictureValues = {
  taxThousandths: number;
  insuranceThousandths: number;
  pmiThousandths: number;
  originationThousandths: number;
  titleThousandths: number;
  processingCents: number;
  appraisalCents: number;
  recordingCents: number;
  insuranceMonths: number;
  taxMonths: number;
  interestDays: number;
  interestBasis: "360" | "365";
  cushionCents: number;
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
  originationCents: number;
  processingCents: number;
  appraisalCents: number;
  titleCents: number;
  recordingCents: number;
  prepaidInsuranceCents: number;
  prepaidInterestCents: number;
  prepaidTaxCents: number;
  cushionCents: number;
  closingCents: number;
  cashToCloseCents: number;
};

export type PmiRateText = "0%" | "0.2%" | "0.35%" | "0.45%";

export type PictureParseResult =
  | { ok: true; values: PictureValues }
  | { ok: false; field: PictureInputField; message: string };

const PERCENT_LABELS: Record<PicturePercentField, string> = {
  tax: "Property tax",
  insurance: "Home insurance",
  pmi: "Conventional PMI",
  origination: "Lender origination",
  title: "Title and escrow",
};

const DOLLAR_LABELS: Record<PictureDollarField, string> = {
  processing: "Lender processing fee",
  appraisal: "Conventional appraisal",
  recording: "Recording and taxes",
  cushion: "Escrow cushion",
};

const COUNT_LABELS: Record<PictureCountField, string> = {
  insuranceMonths: "Prepaid home insurance months",
  taxMonths: "Prepaid property tax months",
  interestDays: "Prepaid interest days",
};

export function defaultPicture(): PictureDraft {
  return {
    tax: "1.15",
    insurance: "0.35",
    pmi: "0.35",
    origination: "1",
    title: "0.75",
    processing: "1200",
    appraisal: "500",
    recording: "800",
    insuranceMonths: "12",
    taxMonths: "4",
    interestDays: "15",
    interestBasis: "360",
    cushion: "1500",
    open: false,
    closingOpen: false,
  };
}

export function pictureFieldMessage(field: PictureInputField): string {
  if (field in PERCENT_LABELS) {
    const name = PERCENT_LABELS[field as PicturePercentField];
    return `${name} must be a percent greater than or equal to zero and less than 100, with at most three decimal places.`;
  }
  if (field in DOLLAR_LABELS) {
    const name = DOLLAR_LABELS[field as PictureDollarField];
    return `${name} must be a dollar amount greater than or equal to zero, with at most two decimal places.`;
  }
  const name = COUNT_LABELS[field as PictureCountField];
  return `${name} must be a whole number from 0 through 999.`;
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

export type PictureCounts = {
  insuranceMonths: number;
  taxMonths: number;
  interestDays: number;
};

export function parsePicture(draft: PictureDraft, counts: PictureCounts): PictureParseResult {
  const values = {} as PictureValues;
  const percentKeys = {
    tax: "taxThousandths",
    insurance: "insuranceThousandths",
    pmi: "pmiThousandths",
    origination: "originationThousandths",
    title: "titleThousandths",
  } as const;
  for (const field of PICTURE_PERCENT_FIELDS) {
    const thousandths = parsePicturePercent(draft[field]);
    if (thousandths === null) {
      return { ok: false, field, message: pictureFieldMessage(field) };
    }
    values[percentKeys[field]] = thousandths;
  }
  const dollarKeys = {
    processing: "processingCents",
    appraisal: "appraisalCents",
    recording: "recordingCents",
    cushion: "cushionCents",
  } as const;
  for (const field of PICTURE_DOLLAR_FIELDS) {
    const cents = parsePictureDollars(draft[field]);
    if (cents === null) {
      return { ok: false, field, message: pictureFieldMessage(field) };
    }
    values[dollarKeys[field]] = cents;
  }
  values.insuranceMonths = counts.insuranceMonths;
  values.taxMonths = counts.taxMonths;
  values.interestDays = counts.interestDays;
  values.interestBasis = loadStoredInterestBasis(draft.interestBasis);
  return { ok: true, values };
}

function storedText(value: unknown, accept: (text: string) => boolean, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return accept(trimmed) ? trimmed : fallback;
}

export function pictureFromStorage(value: unknown, downText?: string, ficoText?: string): PictureDraft {
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
  for (const field of PICTURE_DOLLAR_FIELDS) {
    draft[field] = storedText(record[field], (text) => parsePictureDollars(text) !== null, fallback[field]);
  }
  draft.insuranceMonths = String(loadStoredCount(record.insuranceMonths, 12));
  draft.taxMonths = String(loadStoredCount(record.taxMonths, 4));
  draft.interestDays = String(loadStoredCount(record.interestDays, 15));
  draft.interestBasis = loadStoredInterestBasis(record.interestBasis);
  draft.cushion = storedText(record.cushion, (text) => parsePictureDollars(text) !== null, fallback.cushion);
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
  const originationCents = percentOfCents(baseCents, values.originationThousandths);
  const titleCents = percentOfCents(priceCents, values.titleThousandths);
  const prepaidInsurance = insuranceCents * values.insuranceMonths;
  const prepaidInterest = prepaidInterestCents(
    baseCents,
    rateThousandths,
    values.interestDays,
    values.interestBasis,
  );
  const prepaidTax = taxCents * values.taxMonths;
  const cushionCents = values.cushionCents;
  const closingCents =
    originationCents +
    values.processingCents +
    values.appraisalCents +
    titleCents +
    values.recordingCents +
    prepaidInsurance +
    prepaidInterest +
    prepaidTax +
    cushionCents;
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
    originationCents,
    processingCents: values.processingCents,
    appraisalCents: values.appraisalCents,
    titleCents,
    recordingCents: values.recordingCents,
    prepaidInsuranceCents: prepaidInsurance,
    prepaidInterestCents: prepaidInterest,
    prepaidTaxCents: prepaidTax,
    cushionCents,
    closingCents,
    cashToCloseCents: downCents + closingCents,
  };
}
