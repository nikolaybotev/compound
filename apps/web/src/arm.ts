import type { Arm } from "../../../amortize.js";
import { percentThousandths } from "./picture";

export type ArmField =
  | "fixedYears"
  | "initialMonths"
  | "adjustMonths"
  | "margin"
  | "initialCap"
  | "periodicCap"
  | "lifetimeCap"
  | "floor"
  | "initialFloor";

export type ArmIndexEntry = [month: number, percent: number];

export type ArmFixedUnit = "years" | "months";

export type ArmDraft = {
  enabled: boolean;
  open: boolean;
  fixedUnit: ArmFixedUnit;
  fixedYears: string;
  initialMonths: string;
  adjustMonths: string;
  margin: string;
  initialCap: string;
  periodicCap: string;
  lifetimeCap: string;
  floor: string;
  initialFloor: string;
  roundEighth: boolean;
  index: ArmIndexEntry[];
  evenYearly: string;
  evenMonth: number;
  currentIndex: string;
};

export type ArmValues = {
  fixedMonths: number;
  adjustMonths: number;
  marginThousandths: number;
  initialCapThousandths: number;
  periodicCapThousandths: number;
  lifetimeCapThousandths: number;
  floorThousandths: number;
  initialFloorThousandths: number;
  roundEighth: boolean;
};

export type LoanArm = {
  enabled: boolean;
  values: ArmValues;
  index: ArmIndexEntry[];
};

export type ArmParseResult =
  | { ok: true; values: ArmValues }
  | { ok: false; field: ArmField; message: string };

export const ARM_FIELD_LABELS: Record<ArmField, string> = {
  fixedYears: "Initial period",
  initialMonths: "Initial period",
  adjustMonths: "Adjusts every",
  margin: "Margin",
  initialCap: "Initial cap",
  periodicCap: "Periodic cap",
  lifetimeCap: "Lifetime cap",
  floor: "Lifetime floor",
  initialFloor: "First adjustment floor",
};

export function defaultArm(): ArmDraft {
  return {
    enabled: false,
    open: false,
    fixedUnit: "years",
    fixedYears: "7",
    initialMonths: "",
    adjustMonths: "12",
    margin: "2.5",
    initialCap: "5",
    periodicCap: "2",
    lifetimeCap: "5",
    floor: "2.5",
    initialFloor: "2.5",
    roundEighth: false,
    index: [],
    evenYearly: "",
    evenMonth: 1,
    currentIndex: "",
  };
}

export function formatPercentThousandths(thousandths: number): string {
  return String(thousandths / 1000);
}

export function teaserGap(
  currentIndexText: string,
  marginThousandths: number,
  rateThousandths: number,
): { gapThousandths: number; fullyThousandths: number } | null {
  const trimmed = currentIndexText.trim();
  if (trimmed === "") return null;
  const indexThousandths = percentThousandths(trimmed);
  if (indexThousandths === null) return null;
  const fullyThousandths = indexThousandths + marginThousandths;
  if (!Number.isSafeInteger(fullyThousandths)) return null;
  if (fullyThousandths <= rateThousandths) return null;
  return {
    gapThousandths: fullyThousandths - rateThousandths,
    fullyThousandths,
  };
}

export function teaserGapFromRetained(
  currentIndexThousandths: number | null,
  marginThousandths: number,
  rateThousandths: number,
): { gapThousandths: number; fullyThousandths: number } | null {
  if (currentIndexThousandths === null) return null;
  const fullyThousandths = currentIndexThousandths + marginThousandths;
  if (!Number.isSafeInteger(fullyThousandths)) return null;
  if (fullyThousandths <= rateThousandths) return null;
  return {
    gapThousandths: fullyThousandths - rateThousandths,
    fullyThousandths,
  };
}

export function formatTeaserHint(gapThousandths: number, fullyThousandths: number): string {
  const gap = formatPercentThousandths(gapThousandths);
  const fully = formatPercentThousandths(fullyThousandths);
  const pointWord = gapThousandths === 1000 ? "point" : "points";
  return `${gap} ${pointWord} below the fully indexed rate of ${fully}%`;
}

export function retainedCurrentIndexThousandths(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  return percentThousandths(trimmed);
}

export function currentIndexFieldInvalid(text: string): boolean {
  const trimmed = text.trim();
  return trimmed !== "" && percentThousandths(trimmed) === null;
}

export function armLabel(fixedMonths: number, adjustMonths: number): string {
  if (fixedMonths % 12 === 0) {
    const years = fixedMonths / 12;
    if (adjustMonths === 12) return `${years}/1`;
    if (adjustMonths === 6) return `${years}/6`;
    return `${years}/${adjustMonths}mo`;
  }
  return `${fixedMonths}mo/${adjustMonths}mo`;
}

export function resetMonths(
  fixedMonths: number,
  adjustMonths: number,
  monthCount: number,
): number[] {
  const months: number[] = [];
  for (let month = fixedMonths + 1; month <= monthCount; month += adjustMonths) {
    months.push(month);
  }
  return months;
}

export function dropIndexBeyond(
  index: ArmIndexEntry[],
  resets: number[],
): ArmIndexEntry[] {
  const allowed = new Set(resets);
  const kept = index.filter(([month]) => allowed.has(month));
  return kept.length === index.length ? index : kept;
}

function parsePercentField(
  text: string,
  field: ArmField,
): { ok: true; thousandths: number } | { ok: false; field: ArmField; message: string } {
  const thousandths = percentThousandths(text.trim());
  if (thousandths === null) {
    return {
      ok: false,
      field,
      message: `${ARM_FIELD_LABELS[field]} must be a percent with at most three decimal places.`,
    };
  }
  return { ok: true, thousandths };
}

function parseWholeField(
  text: string,
  field: ArmField,
  unit: string,
): { ok: true; value: number } | { ok: false; field: ArmField; message: string } {
  const trimmed = text.trim();
  const value = Number(trimmed);
  if (!/^[1-9]\d*$/.test(trimmed) || !Number.isSafeInteger(value) || value * 12 > Number.MAX_SAFE_INTEGER) {
    return {
      ok: false,
      field,
      message: `${ARM_FIELD_LABELS[field]} must be a positive whole number of ${unit}.`,
    };
  }
  return { ok: true, value };
}

function parseInitialPeriodMonths(
  draft: ArmDraft,
): { ok: true; fixedMonths: number } | { ok: false; field: ArmField; message: string } {
  if (draft.fixedUnit === "months") {
    const months = parseWholeField(draft.initialMonths, "initialMonths", "months");
    if (!months.ok) return months;
    return { ok: true, fixedMonths: months.value };
  }
  const fixedYears = parseWholeField(draft.fixedYears, "fixedYears", "years");
  if (!fixedYears.ok) return fixedYears;
  return { ok: true, fixedMonths: fixedYears.value * 12 };
}

export function parseArm(
  draft: ArmDraft,
  termMonthCount: number,
  rateThousandths: number,
): ArmParseResult {
  const initial = parseInitialPeriodMonths(draft);
  if (!initial.ok) return initial;
  if (initial.fixedMonths >= termMonthCount) {
    return {
      ok: false,
      field: draft.fixedUnit === "months" ? "initialMonths" : "fixedYears",
      message: "Initial period must be shorter than the term.",
    };
  }
  const adjustMonths = parseWholeField(draft.adjustMonths, "adjustMonths", "months");
  if (!adjustMonths.ok) return adjustMonths;
  const margin = parsePercentField(draft.margin, "margin");
  if (!margin.ok) return margin;
  const initialCap = parsePercentField(draft.initialCap, "initialCap");
  if (!initialCap.ok) return initialCap;
  const periodicCap = parsePercentField(draft.periodicCap, "periodicCap");
  if (!periodicCap.ok) return periodicCap;
  const lifetimeCap = parsePercentField(draft.lifetimeCap, "lifetimeCap");
  if (!lifetimeCap.ok) return lifetimeCap;
  const floor = parsePercentField(draft.floor, "floor");
  if (!floor.ok) return floor;
  const initialFloor = parsePercentField(draft.initialFloor, "initialFloor");
  if (!initialFloor.ok) return initialFloor;

  const ceiling = rateThousandths + lifetimeCap.thousandths;
  for (const [field, thousandths] of [
    ["floor", floor.thousandths],
    ["initialFloor", initialFloor.thousandths],
  ] as const) {
    if (thousandths <= 0 || thousandths > ceiling) {
      return {
        ok: false,
        field,
        message: `${ARM_FIELD_LABELS[field]} must be greater than zero and not above the ceiling of ${formatPercentThousandths(ceiling)}%.`,
      };
    }
  }

  return {
    ok: true,
    values: {
      fixedMonths: initial.fixedMonths,
      adjustMonths: adjustMonths.value,
      marginThousandths: margin.thousandths,
      initialCapThousandths: initialCap.thousandths,
      periodicCapThousandths: periodicCap.thousandths,
      lifetimeCapThousandths: lifetimeCap.thousandths,
      floorThousandths: floor.thousandths,
      initialFloorThousandths: initialFloor.thousandths,
      roundEighth: draft.roundEighth,
    },
  };
}

export function toBuildReportArm(values: ArmValues, index: ArmIndexEntry[]): Arm {
  const indexByMonth = new Map<number, number>();
  for (const [month, percent] of index) {
    indexByMonth.set(month, Math.round(percent * 1000));
  }
  return {
    fixedMonths: values.fixedMonths,
    adjustMonths: values.adjustMonths,
    marginThousandths: values.marginThousandths,
    initialCapThousandths: values.initialCapThousandths,
    periodicCapThousandths: values.periodicCapThousandths,
    lifetimeCapThousandths: values.lifetimeCapThousandths,
    floorThousandths: values.floorThousandths,
    initialFloorThousandths: values.initialFloorThousandths,
    roundEighth: values.roundEighth,
    indexByMonth,
  };
}

const TEXT_FIELDS = [
  "fixedYears",
  "initialMonths",
  "adjustMonths",
  "margin",
  "initialCap",
  "periodicCap",
  "lifetimeCap",
  "floor",
  "initialFloor",
] as const;

function parseIndexEntries(value: unknown): ArmIndexEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries: ArmIndexEntry[] = [];
  const seen = new Set<number>();
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [month, percent] = entry;
    if (typeof month !== "number" || !Number.isInteger(month) || month < 1) return null;
    if (typeof percent !== "number" || !Number.isFinite(percent) || percent < 0) return null;
    if (Math.round(percent * 1000) / 1000 !== percent) return null;
    if (seen.has(month)) return null;
    seen.add(month);
    entries.push([month, percent]);
  }
  return entries;
}

export function armFromStorage(value: unknown): { arm: ArmDraft; stored: boolean } {
  const fallback = { arm: defaultArm(), stored: false };
  if (value === undefined) return fallback;
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  if (typeof record.enabled !== "boolean" || typeof record.open !== "boolean") return fallback;
  if (typeof record.roundEighth !== "boolean") return fallback;
  const draft = defaultArm();
  const fixedUnit = record.fixedUnit;
  if (fixedUnit === "years" || fixedUnit === "months") draft.fixedUnit = fixedUnit;
  for (const field of TEXT_FIELDS) {
    const text = record[field];
    if (typeof text !== "string") return fallback;
    draft[field] = text;
  }
  const index = parseIndexEntries(record.index);
  if (!index) return fallback;
  draft.enabled = record.enabled;
  draft.open = record.open;
  draft.roundEighth = record.roundEighth;
  draft.index = index;
  draft.evenYearly = typeof record.evenYearly === "string" ? record.evenYearly : "";
  draft.currentIndex = typeof record.currentIndex === "string" ? record.currentIndex : "";
  const evenMonth = record.evenMonth;
  draft.evenMonth =
    typeof evenMonth === "number" && Number.isInteger(evenMonth) && evenMonth >= 1 && evenMonth <= 12
      ? evenMonth
      : 1;
  return { arm: draft, stored: true };
}

export function armToStorage(arm: ArmDraft): ArmDraft {
  return {
    enabled: arm.enabled,
    open: arm.open,
    fixedUnit: arm.fixedUnit,
    fixedYears: arm.fixedYears,
    initialMonths: arm.initialMonths,
    adjustMonths: arm.adjustMonths,
    margin: arm.margin,
    initialCap: arm.initialCap,
    periodicCap: arm.periodicCap,
    lifetimeCap: arm.lifetimeCap,
    floor: arm.floor,
    initialFloor: arm.initialFloor,
    roundEighth: arm.roundEighth,
    index: arm.index.map(([month, percent]) => [month, percent]),
    evenYearly: arm.evenYearly,
    evenMonth: arm.evenMonth,
    currentIndex: arm.currentIndex,
  };
}
