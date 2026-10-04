import { buildReport, dollarsToCents } from "../../../amortize.js";
import { centsToDollars, percentThousandths, type Loan } from "./loan";

export const PICTURE_PERCENT_FIELDS = [
  "tax",
  "insurance",
  "upfrontMip",
  "origination",
  "title",
] as const;

export const PICTURE_DOLLAR_FIELDS = ["processing", "appraisal", "recording"] as const;

export type PicturePercentField = (typeof PICTURE_PERCENT_FIELDS)[number];
export type PictureDollarField = (typeof PICTURE_DOLLAR_FIELDS)[number];
export type PictureInputField = PicturePercentField | PictureDollarField;

export type PictureDraft = {
  tax: string;
  insurance: string;
  upfrontMip: string;
  origination: string;
  title: string;
  processing: string;
  appraisal: string;
  recording: string;
  open: boolean;
};

export type PictureValues = {
  taxThousandths: number;
  insuranceThousandths: number;
  upfrontMipThousandths: number;
  originationThousandths: number;
  titleThousandths: number;
  processingCents: number;
  appraisalCents: number;
  recordingCents: number;
};

export type PictureLines = {
  priceCents: number;
  downCents: number;
  baseCents: number;
  upfrontMipCents: number;
  financedCents: number;
  principalAndInterestCents: number;
  taxCents: number;
  insuranceCents: number;
  fhaMipCents: number;
  fhaMipRateText: "0%";
  pmiCents: number;
  pmiRateText: PmiRateText;
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
  upfrontMip: "FHA upfront MIP",
  origination: "Lender origination",
  title: "Title and escrow",
};

const DOLLAR_LABELS: Record<PictureDollarField, string> = {
  processing: "Lender processing fee",
  appraisal: "Conventional appraisal",
  recording: "Recording and taxes",
};

export function defaultPicture(): PictureDraft {
  return {
    tax: "1.15",
    insurance: "0.35",
    upfrontMip: "0",
    origination: "1",
    title: "0.75",
    processing: "1200",
    appraisal: "500",
    recording: "800",
    open: false,
  };
}

export function pictureFieldMessage(field: PictureInputField): string {
  if (field in PERCENT_LABELS) {
    const name = PERCENT_LABELS[field as PicturePercentField];
    return `${name} must be a percent greater than or equal to zero and less than 100, with at most three decimal places.`;
  }
  const name = DOLLAR_LABELS[field as PictureDollarField];
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

export function parsePicture(draft: PictureDraft): PictureParseResult {
  const values = {} as PictureValues;
  const percentKeys = {
    tax: "taxThousandths",
    insurance: "insuranceThousandths",
    upfrontMip: "upfrontMipThousandths",
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
  } as const;
  for (const field of PICTURE_DOLLAR_FIELDS) {
    const cents = parsePictureDollars(draft[field]);
    if (cents === null) {
      return { ok: false, field, message: pictureFieldMessage(field) };
    }
    values[dollarKeys[field]] = cents;
  }
  return { ok: true, values };
}

function storedText(value: unknown, accept: (text: string) => boolean, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return accept(trimmed) ? trimmed : fallback;
}

export function pictureFromStorage(value: unknown): PictureDraft {
  const fallback = defaultPicture();
  if (value === undefined) return fallback;
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  const draft = defaultPicture();
  for (const field of PICTURE_PERCENT_FIELDS) {
    draft[field] = storedText(record[field], (text) => parsePicturePercent(text) !== null, fallback[field]);
  }
  for (const field of PICTURE_DOLLAR_FIELDS) {
    draft[field] = storedText(record[field], (text) => parsePictureDollars(text) !== null, fallback[field]);
  }
  draft.open = typeof record.open === "boolean" ? record.open : false;
  return draft;
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
  if (downThousandths >= 20_000) return { thousandths: 0, text: "0%" };
  if (downThousandths >= 10_000) return { thousandths: 200, text: "0.2%" };
  if (downThousandths >= 5_000) return { thousandths: 350, text: "0.35%" };
  return { thousandths: 450, text: "0.45%" };
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

function prepaidInterestCents(baseCents: number, rateThousandths: number): number {
  if (!Number.isSafeInteger(baseCents) || !Number.isSafeInteger(rateThousandths)) {
    throw new Error("picture amount is too large");
  }
  const numerator = baseCents * rateThousandths * 15;
  if (!Number.isSafeInteger(numerator)) throw new Error("picture amount is too large");
  return halfUpQuotient(numerator, 100_000 * 360);
}

export function buildPicture(
  loan: Loan,
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
  const upfrontMipCents = percentOfCents(baseCents, values.upfrontMipThousandths);
  const financedCents = baseCents + upfrontMipCents;
  if (!Number.isSafeInteger(financedCents)) throw new Error("picture amount is too large");
  const principalAndInterestCents = buildReport(
    centsToDollars(financedCents),
    loan.ratePercent,
    loan.years * 12,
    new Map(),
  ).monthly_payment_cents;
  const taxCents = percentOfCents(priceCents, values.taxThousandths, 12);
  const insuranceCents = percentOfCents(priceCents, values.insuranceThousandths, 12);
  const fha = conventionalFha();
  const fhaMipCents = percentOfCents(financedCents, fha.thousandths, 12);
  const pmi = conventionalPmi(downThousandths);
  const pmiCents = percentOfCents(financedCents, pmi.thousandths, 12);
  const totalMonthlyCents =
    principalAndInterestCents + taxCents + insuranceCents + fhaMipCents + pmiCents;
  const originationCents = percentOfCents(baseCents, values.originationThousandths);
  const titleCents = percentOfCents(priceCents, values.titleThousandths);
  const prepaidInsurance = insuranceCents * 12;
  const prepaidInterest = prepaidInterestCents(baseCents, rateThousandths);
  const prepaidTax = taxCents * 4;
  const cushionCents = (taxCents + insuranceCents + fhaMipCents) * 2;
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
    upfrontMipCents,
    financedCents,
    principalAndInterestCents,
    taxCents,
    insuranceCents,
    fhaMipCents,
    fhaMipRateText: fha.text,
    pmiCents,
    pmiRateText: pmi.text,
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

function conventionalFha(): { thousandths: 0; text: "0%" } {
  return { thousandths: 0, text: "0%" };
}
