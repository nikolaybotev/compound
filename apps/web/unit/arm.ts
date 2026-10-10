import { describe, expect, test } from "vitest";
import { buildReport } from "../../../amortize.js";
import {
  armFromStorage,
  armLabel,
  defaultArm,
  dropIndexBeyond,
  formatPercentThousandths,
  parseArm,
  resetMonths,
  toBuildReportArm,
  type ArmDraft,
  type ArmValues,
} from "../src/arm";
import {
  defaultScenario,
  groupByYear,
  indexInputValue,
  loadScenario,
  loanReport,
  parseIndexField,
  parseLoan,
  saveScenario,
  savedByExtraCents,
  STORAGE_KEY,
  withIndex,
  type Loan,
} from "../src/loan";
import { defaultPicture } from "../src/picture";

function memoryStorage(initial?: string) {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(STORAGE_KEY, initial);
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    raw: () => store.get(STORAGE_KEY),
  };
}

function feLoan(): Loan {
  const parsed = parseLoan({ price: "712500", down: "20", years: "30", rate: "5.875", start: "2026-10" });
  if (!parsed.ok) throw new Error("loan must parse");
  return parsed.loan;
}

function feValues(overrides: Partial<ArmDraft> = {}): ArmValues {
  const parsed = parseArm({ ...defaultArm(), ...overrides }, 30, 5875);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.values;
}

function firstYear(): Map<number, number> {
  const extras = new Map<number, number>();
  for (let month = 1; month <= 12; month += 1) extras.set(month, 100);
  return extras;
}

describe("ARM terms", () => {
  test("defaults are the sheet's values", () => {
    expect(defaultArm()).toEqual({
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
    });
  });

  test("parseArm turns the sheet into thousandths", () => {
    expect(feValues()).toEqual({
      fixedMonths: 84,
      adjustMonths: 12,
      marginThousandths: 2500,
      initialCapThousandths: 5000,
      periodicCapThousandths: 2000,
      lifetimeCapThousandths: 5000,
      floorThousandths: 2500,
      initialFloorThousandths: 2500,
      roundEighth: false,
    });
  });

  test("margin and each cap may be zero", () => {
    const parsed = parseArm(
      { ...defaultArm(), margin: "0", initialCap: "0", periodicCap: "0", lifetimeCap: "0" },
      30,
      5875,
    );
    expect(parsed.ok).toBe(true);
  });

  test("a floor of 0 is reported on the floor field", () => {
    const parsed = parseArm({ ...defaultArm(), floor: "0" }, 30, 5875);
    expect(parsed).toMatchObject({ ok: false, field: "floor" });
    const first = parseArm({ ...defaultArm(), initialFloor: "0" }, 30, 5875);
    expect(first).toMatchObject({ ok: false, field: "initialFloor" });
  });

  test("a floor above the ceiling is reported on the floor field", () => {
    const parsed = parseArm({ ...defaultArm(), floor: "11" }, 30, 5875);
    expect(parsed).toMatchObject({ ok: false, field: "floor" });
    expect(parsed.ok ? "" : parsed.message).toContain("10.875%");
    expect(parseArm({ ...defaultArm(), floor: "10.875" }, 30, 5875).ok).toBe(true);
  });

  test("a rate edit that drops the ceiling under a floor reports the floor", () => {
    const parsed = parseArm({ ...defaultArm(), lifetimeCap: "1", floor: "7" }, 30, 5875);
    expect(parsed).toMatchObject({ ok: false, field: "floor" });
    expect(parseArm({ ...defaultArm(), floor: "7.5" }, 30, 2000)).toMatchObject({ ok: false, field: "floor" });
  });

  test("the fixed period must be shorter than the term", () => {
    expect(parseArm(defaultArm(), 7, 5875)).toMatchObject({ ok: false, field: "fixedYears" });
    expect(parseArm(defaultArm(), 8, 5875).ok).toBe(true);
    expect(parseArm({ ...defaultArm(), fixedYears: "0" }, 30, 5875)).toMatchObject({
      ok: false,
      field: "fixedYears",
    });
  });

  test("grammar errors name the field", () => {
    for (const [field, value] of [
      ["adjustMonths", "0"],
      ["adjustMonths", "1.5"],
      ["margin", "2.5001"],
      ["margin", "-1"],
      ["margin", ""],
      ["initialCap", "abc"],
      ["periodicCap", "1,5"],
      ["lifetimeCap", "5."],
      ["floor", "x"],
      ["initialFloor", ""],
    ] as const) {
      const parsed = parseArm({ ...defaultArm(), [field]: value }, 30, 5875);
      expect(parsed, `${field}=${value}`).toMatchObject({ ok: false, field });
    }
  });

  test("the structure label", () => {
    expect(armLabel(7, 12)).toBe("7/1");
    expect(armLabel(7, 6)).toBe("7/6");
    expect(armLabel(10, 12)).toBe("10/1");
    expect(armLabel(7, 1)).toBe("7/1mo");
    expect(armLabel(7, 1)).not.toBe("7/1");
    expect(armLabel(5, 3)).toBe("5/3mo");
  });

  test("percent thousandths print with trailing zeros removed", () => {
    expect(formatPercentThousandths(10875)).toBe("10.875");
    expect(formatPercentThousandths(12375)).toBe("12.375");
    expect(formatPercentThousandths(6920)).toBe("6.92");
    expect(formatPercentThousandths(2500)).toBe("2.5");
  });
});

describe("index entries", () => {
  test("reset months run from the first adjustment through the term", () => {
    const months = resetMonths(84, 12, 360);
    expect(months).toHaveLength(23);
    expect(months[0]).toBe(85);
    expect(months.at(-1)).toBe(349);
    expect(resetMonths(84, 6, 96)).toEqual([85, 91]);
  });

  test("fixed years 7 to 10 drops month 85 and keeps 121", () => {
    const index: [number, number][] = [
      [85, 4.42],
      [121, 4],
    ];
    const kept = dropIndexBeyond(index, resetMonths(120, 12, 360));
    expect(kept).toEqual([[121, 4]]);
    expect(dropIndexBeyond(index, resetMonths(84, 12, 360))).toBe(index);
  });

  test("a shorter term drops entries beyond the last reset", () => {
    const index: [number, number][] = [
      [85, 4.42],
      [349, 3],
    ];
    expect(dropIndexBeyond(index, resetMonths(84, 12, 240))).toEqual([[85, 4.42]]);
  });

  test("toBuildReportArm is the only place the index becomes thousandths", () => {
    const arm = toBuildReportArm(feValues(), [
      [85, 4.42],
      [97, 0],
      [109, 4.437],
    ]);
    expect([...arm.indexByMonth.entries()]).toEqual([
      [85, 4420],
      [97, 0],
      [109, 4437],
    ]);
    expect(arm.fixedMonths).toBe(84);
    expect(arm.roundEighth).toBe(false);
  });
});

describe("loanReport in ARM mode", () => {
  test("FE terms equal buildReport with the same arm object", () => {
    const values = feValues();
    const loan: Loan = { ...feLoan(), arm: { enabled: true, values, index: [] } };
    const report = loanReport(loan);
    const expected = buildReport(570000, 5.875, 360, new Map(), 30, toBuildReportArm(values, []));
    expect(report).toEqual(expected);
    expect(report.monthly_payment_cents).toBe(337177);
    expect(report.arm?.max_payment_cents).toBe(503771);
    expect(report.interest_cents).toBe(110363633);
    expect(report.arm?.adjustments).toHaveLength(23);
  });

  test("an index path reaches buildReport", () => {
    const values = feValues();
    const loan: Loan = { ...feLoan(), arm: { enabled: true, values, index: [[85, 4.42]] } };
    const report = loanReport(loan);
    expect(report.arm?.adjustments[0]).toMatchObject({ rate_percent: 6.92, payment_cents: 369572 });
    expect(report.interest_cents).toBe(106408179);
  });

  test("the product fixed with stored ARM terms is the fixed loan", () => {
    const values = feValues();
    const loan: Loan = { ...feLoan(), arm: { enabled: false, values, index: [[85, 4.42]] } };
    const report = loanReport(loan);
    expect(report).toEqual(buildReport(570000, 5.875, 360, new Map(), 30));
    expect("arm" in report).toBe(false);
    expect(report.interest_cents).toBe(64383549);
    expect(report.schedule[0]).not.toHaveProperty("rate_percent");
  });

  test("Saved by extra on an ARM uses the same arm on both runs", () => {
    const values = feValues();
    const loan: Loan = { ...feLoan(), arm: { enabled: true, values, index: [] } };
    const extras = firstYear();
    const full = loanReport(loan, extras);
    expect(full.interest_saved_cents).toBe(357936);
    expect(full.months_saved).toBe(0);
    expect(savedByExtraCents(loan, extras, 1, full.interest_cents)).toBe(30907);
    expect(savedByExtraCents(loan, extras, 13, full.interest_cents)).toBe(0);
  });
});

describe("ARM storage", () => {
  const now = new Date("2026-10-15T12:00:00Z");

  function scenarioWithArm(arm: unknown): string {
    return JSON.stringify({
      version: 1,
      price: "712500",
      down: "20",
      years: "30",
      rate: "5.875",
      start: "2026-10",
      extras: [[3, 25]],
      prefill: { monthly: "10", yearly: "", month: 4, open: true },
      openYears: [2027],
      picture: { ...defaultPicture(), tax: "1.5", open: true },
      ...(arm === undefined ? {} : { arm }),
    });
  }

  test("a saved scenario without arm loads as fixed with the defaults", () => {
    const loaded = loadScenario(memoryStorage(scenarioWithArm(undefined)), now);
    expect(loaded.arm).toEqual(defaultArm());
    expect(loaded.arm.enabled).toBe(false);
    expect(loaded.armStored).toBe(false);
  });

  test("a malformed arm loads as fixed with the defaults and keeps the loan", () => {
    const bad: unknown[] = [
      "nope",
      [],
      null,
      { ...defaultArm(), enabled: "yes" },
      { ...defaultArm(), enabled: true, fixedYears: 7 },
      { ...defaultArm(), enabled: true, index: [[85, "4.42"]] },
      { ...defaultArm(), enabled: true, index: [[85, 4.42], [85, 4]] },
      { ...defaultArm(), enabled: true, index: [[85.5, 4.42]] },
      { ...defaultArm(), enabled: true, index: [[85, -1]] },
      { ...defaultArm(), enabled: true, index: [[85, 4.4201]] },
      { ...defaultArm(), enabled: true, open: undefined },
      { ...defaultArm(), enabled: true, roundEighth: "no" },
      { ...defaultArm(), enabled: true, floor: "0" },
      { ...defaultArm(), enabled: true, fixedYears: "30" },
      { ...defaultArm(), enabled: true, floor: "11" },
    ];
    for (const arm of bad) {
      const loaded = loadScenario(memoryStorage(scenarioWithArm(arm)), now);
      expect(loaded.arm, JSON.stringify(arm)).toEqual(defaultArm());
      expect(loaded.armStored).toBe(false);
      expect(loaded.draft.rate).toBe("5.875");
      expect([...loaded.extras.entries()]).toEqual([[3, 25]]);
      expect(loaded.prefill).toEqual({ monthly: "10", yearly: "", month: 4, open: true });
      expect(loaded.picture.tax).toBe("1.5");
      expect(loaded.openYears).toEqual([2027]);
    }
  });

  test("a stored enabled arm loads and drops index entries that are not reset months", () => {
    const stored: ArmDraft = { ...defaultArm(), enabled: true, open: false, index: [[85, 4.42], [86, 4], [400, 3]] };
    const loaded = loadScenario(memoryStorage(scenarioWithArm(stored)), now);
    expect(loaded.arm.enabled).toBe(true);
    expect(loaded.arm.open).toBe(false);
    expect(loaded.arm.index).toEqual([[85, 4.42]]);
    expect(loaded.armStored).toBe(true);
  });

  test("the saved object carries the index as [[85, 4.42]]", () => {
    const storage = memoryStorage();
    const scenario = { ...defaultScenario(now), openYears: [2026] };
    scenario.arm = { ...defaultArm(), enabled: true, open: true, index: [[85, 4.42]] };
    scenario.armStored = true;
    saveScenario(storage, scenario);
    const saved = JSON.parse(storage.raw() ?? "{}");
    expect(saved.version).toBe(1);
    expect(saved.arm.index).toEqual([[85, 4.42]]);
    expect(saved.arm.enabled).toBe(true);
    expect(saved.arm.open).toBe(true);
    expect(Object.keys(saved.arm).sort()).toEqual(
      [
        "adjustMonths",
        "enabled",
        "fixedYears",
        "floor",
        "index",
        "initialCap",
        "initialFloor",
        "lifetimeCap",
        "margin",
        "open",
        "periodicCap",
        "roundEighth",
      ].sort(),
    );
    expect(loadScenario(storage, now)).toEqual(scenario);
  });

  test("the product fixed keeps the terms and the index in storage", () => {
    const storage = memoryStorage();
    const scenario = { ...defaultScenario(now), openYears: [2026] };
    scenario.arm = { ...defaultArm(), enabled: false, open: true, index: [[85, 4.42]] };
    scenario.armStored = true;
    saveScenario(storage, scenario);
    const saved = JSON.parse(storage.raw() ?? "{}");
    expect(saved.arm.enabled).toBe(false);
    expect(saved.arm.index).toEqual([[85, 4.42]]);
    const loaded = loadScenario(storage, now);
    expect(loaded.arm.enabled).toBe(false);
    expect(loaded.arm.index).toEqual([[85, 4.42]]);
  });

  test("a fixed-mode save of a scenario that never stored arm has no arm key", () => {
    const storage = memoryStorage();
    const scenario = { ...defaultScenario(now), openYears: [2026] };
    scenario.draft = { ...scenario.draft, rate: "5.875" };
    saveScenario(storage, scenario);
    expect("arm" in JSON.parse(storage.raw() ?? "{}")).toBe(false);
    const loaded = loadScenario(storage, now);
    expect(loaded.armStored).toBe(false);
    saveScenario(storage, loaded);
    expect("arm" in JSON.parse(storage.raw() ?? "{}")).toBe(false);
  });
});

describe("index cell", () => {
  test("parses the index grammar, not the dollar grammar", () => {
    expect(parseIndexField("")).toEqual({ ok: true, percent: null });
    expect(parseIndexField("  ")).toEqual({ ok: true, percent: null });
    expect(parseIndexField("0")).toEqual({ ok: true, percent: 0 });
    expect(parseIndexField("4.42")).toEqual({ ok: true, percent: 4.42 });
    expect(parseIndexField("4.437")).toEqual({ ok: true, percent: 4.437 });
    for (const bad of ["abc", "4.4371", "-1", "4,42", "4.", ".5", "1e2"]) {
      expect(parseIndexField(bad), bad).toEqual({ ok: false });
    }
  });

  test("an index edit replaces, adds, and deletes one entry", () => {
    const start: [number, number][] = [[97, 4]];
    expect(withIndex(start, 85, 4.42)).toEqual([
      [85, 4.42],
      [97, 4],
    ]);
    expect(withIndex(start, 97, 0)).toEqual([[97, 0]]);
    expect(withIndex(start, 97, null)).toEqual([]);
    expect(withIndex(start, 85, null)).toBe(start);
    expect(indexInputValue(0)).toBe("0");
    expect(indexInputValue(null)).toBe("");
    expect(indexInputValue(4.42)).toBe("4.42");
  });

  test("ARM rows carry the rate, payment, index, and reset flag; fixed rows do not", () => {
    const values = feValues();
    const arm: Loan = { ...feLoan(), arm: { enabled: true, values, index: [[85, 4.42]] } };
    const armYears = groupByYear(arm, loanReport(arm));
    const rows = armYears.flatMap((year) => year.rows);
    expect(rows).toHaveLength(360);
    expect(rows[83]).toMatchObject({ month: 84, ratePercent: 5.875, paymentCents: 337177, indexPercent: null, isReset: false });
    expect(rows[84]).toMatchObject({ month: 85, ratePercent: 6.92, paymentCents: 369572, indexPercent: 4.42, isReset: true });
    expect(rows[96]).toMatchObject({ month: 97, ratePercent: 8.92, indexPercent: null, isReset: true });
    expect(rows.filter((row) => row.isReset)).toHaveLength(23);
    const year2033 = armYears.find((year) => year.year === 2033);
    expect(year2033).toBeDefined();

    const fixed: Loan = { ...feLoan(), arm: { enabled: false, values, index: [[85, 4.42]] } };
    const fixedRows = groupByYear(fixed, loanReport(fixed)).flatMap((year) => year.rows);
    expect(fixedRows.every((row) => row.ratePercent === null && row.paymentCents === null)).toBe(true);
    expect(fixedRows.every((row) => row.indexPercent === null && !row.isReset)).toBe(true);
  });

  test("the table ends at the payoff month in ARM mode", () => {
    const values = feValues();
    const loan: Loan = { ...feLoan(), arm: { enabled: true, values, index: [] } };
    const extras = new Map<number, number>();
    for (let month = 1; month <= 360; month += 1) extras.set(month, 2400);
    const report = loanReport(loan, extras);
    const rows = groupByYear(loan, report, extras).flatMap((year) => year.rows);
    expect(report.payoff_month).toBe(181);
    expect(rows).toHaveLength(181);
    expect(rows.at(-1)).toMatchObject({ month: 181, isReset: true, paymentCents: 2657 });
  });
});
