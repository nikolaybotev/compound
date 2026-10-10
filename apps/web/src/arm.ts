import type { Arm } from "../../../amortize.js";
import { percentThousandths } from "./picture";

export type ArmField =
  | "fixedYears"
  | "adjustMonths"
  | "margin"
  | "initialCap"
  | "periodicCap"
  | "lifetimeCap"
  | "floor"
  | "initialFloor";

export type ArmIndexEntry = [month: number, percent: number];

export type ArmDraft = {
  enabled: boolean;
  open: boolean;
  fixedYears: string;
  adjustMonths: string;
  margin: string;
  initialCap: string;
  periodicCap: string;
  lifetimeCap: string;
  floor: string;
  initialFloor: string;
  roundEighth: boolean;
  index: ArmIndexEntry[];
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
  fixedYears: "Fixed period",
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
    fixedYears: "7",
    adjustMonths: "12",
    margin: "2.5",
    initialCap: "5",
    periodicCap: "2",
    lifetimeCap: "5",
    floor: "2.5",
    initialFloor: "2.5",
    roundEighth: false,
    index: [],
  };
}

export function formatPercentThousandths(thousandths: number): string {
  return String(thousandths / 1000);
}

export function armLabel(fixedYears: number, adjustMonths: number): string {
  if (adjustMonths === 12) return `${fixedYears}/1`;
  if (adjustMonths === 6) return `${fixedYears}/6`;
  return `${fixedYears}/${adjustMonths}mo`;
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

export function parseArm(
  draft: ArmDraft,
  years: number,
  rateThousandths: number,
): ArmParseResult {
  const fixedYears = parseWholeField(draft.fixedYears, "fixedYears", "years");
  if (!fixedYears.ok) return fixedYears;
  if (fixedYears.value >= years) {
    return {
      ok: false,
      field: "fixedYears",
      message: "Fixed period must be shorter than the term.",
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
      fixedMonths: fixedYears.value * 12,
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
  return { arm: draft, stored: true };
}

export function armToStorage(arm: ArmDraft): ArmDraft {
  return {
    enabled: arm.enabled,
    open: arm.open,
    fixedYears: arm.fixedYears,
    adjustMonths: arm.adjustMonths,
    margin: arm.margin,
    initialCap: arm.initialCap,
    periodicCap: arm.periodicCap,
    lifetimeCap: arm.lifetimeCap,
    floor: arm.floor,
    initialFloor: arm.initialFloor,
    roundEighth: arm.roundEighth,
    index: arm.index.map(([month, percent]) => [month, percent]),
  };
}
