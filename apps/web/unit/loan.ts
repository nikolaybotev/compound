import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { buildReport } from "../../../amortize.js";
import {
  bands,
  buildPrefillMap,
  centsToDollars,
  defaultScenario,
  dollarsToThousandsText,
  downPaymentCents,
  dropExtrasBeyond,
  formatMoney,
  groupByYear,
  isEditedExtra,
  isTrailingDotThousands,
  loadScenario,
  loanReport,
  parseLoan,
  paymentDate,
  percentThousandths,
  savedByExtraCents,
  saveScenario,
  shortDate,
  STORAGE_KEY,
  thousandsToDollarString,
  yearsAndMonths,
  monthsSavedText,
} from "../src/loan";
import { defaultPicture as pictureDefaults } from "../src/picture";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("down payment cents", () => {
  test("$712,500 at 20% is a $570,000 loan", () => {
    const parsed = parseLoan({
      price: "712500",
      down: "20",
      years: "30",
      rate: "7",
      start: "2026-10",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.loan.loanCents).toBe(57_000_000);
    expect(centsToDollars(parsed.loan.loanCents)).toBe(570000);
  });

  test("$399,999.00 at 3.5% is a $385,999.03 loan", () => {
    const priceCents = 39_999_900;
    const thousandths = percentThousandths("3.5");
    expect(thousandths).toBe(3500);
    expect(downPaymentCents(priceCents, thousandths ?? 0)).toBe(1_399_997);
    const parsed = parseLoan({
      price: "399999.00",
      down: "3.5",
      years: "30",
      rate: "7",
      start: "2026-10",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.loan.loanCents).toBe(38_599_903);
  });
});

describe("payment dates", () => {
  test("October 2026 start maps payment 1, 3, 157, and 360", () => {
    expect(paymentDate("2026-10", 1)).toEqual({ year: 2026, month: 11 });
    expect(shortDate(2026, 11)).toBe("Nov 2026");
    expect(paymentDate("2026-10", 3)).toEqual({ year: 2027, month: 1 });
    expect(paymentDate("2026-10", 157)).toEqual({ year: 2039, month: 11 });
    expect(shortDate(2039, 11)).toBe("Nov 2039");
    expect(paymentDate("2026-10", 360)).toEqual({ year: 2056, month: 10 });
  });
});

describe("chart bands", () => {
  test("month 157 bands come from buildReport and add up to the total cost", () => {
    const report = buildReport(570000, 7, 360, new Map(), 30);
    const row = report.schedule[156];
    expect(row?.month).toBe(157);
    const split = bands(report, row!);
    expect(split).toEqual({
      principalPaid: 11_951_995,
      interestPaid: 47_585_925,
      loanBalance: 45_048_005,
      interestRemaining: 31_934_147,
    });
    expect(
      split.principalPaid + split.interestPaid + split.loanBalance + split.interestRemaining,
    ).toBe(report.amount_cents + report.interest_cents);
    expect(formatMoney(split.principalPaid)).toBe("$119,519.95");
    expect(formatMoney(report.monthly_payment_cents)).toBe("$3,792.22");
  });
});

describe("extra prefill", () => {
  test("$100 a month fills months 1 through 360 and omits zeros", () => {
    const extras = buildPrefillMap(360, "2026-10", 100, 0, 1);
    expect(extras.size).toBe(360);
    expect(extras.get(1)).toBe(100);
    expect(extras.get(360)).toBe(100);
  });

  test("$1,000 every January lands on month 3 and not month 1", () => {
    const extras = buildPrefillMap(360, "2026-10", 0, 1000, 1);
    expect(extras.get(1)).toBeUndefined();
    expect(extras.get(3)).toBe(1000);
    expect(extras.get(2)).toBeUndefined();
  });

  test("January also adds the yearly amount on top of the monthly amount", () => {
    const extras = buildPrefillMap(360, "2026-10", 100, 1000, 1);
    expect(extras.get(1)).toBe(100);
    expect(extras.get(3)).toBe(1100);
  });

  test("a shorter term drops month 181 and does not keep it for later", () => {
    const full = buildPrefillMap(360, "2026-10", 100, 0, 1);
    const shortened = dropExtrasBeyond(full, 15 * 12);
    expect(shortened.has(181)).toBe(false);
    expect(shortened.get(180)).toBe(100);
    expect(dropExtrasBeyond(shortened, 360).has(181)).toBe(false);
  });
});

describe("saved by extra", () => {
  const parsed = parseLoan({
    price: "570000",
    down: "0",
    years: "30",
    rate: "7",
    start: "2026-10",
  });
  if (!parsed.ok) throw new Error("example loan must parse");
  const loan = parsed.loan;

  function extrasFor(months: number[]): Map<number, number> {
    const map = new Map<number, number>();
    for (const month of months) map.set(month, 100);
    return map;
  }

  function marginal(month: number, months: number[]): number {
    const map = extrasFor(months);
    const full = buildReport(570000, 7, 360, map, 30);
    const without = new Map(map);
    without.delete(month);
    const counterfactual = buildReport(570000, 7, 360, without, 30);
    return counterfactual.interest_cents - full.interest_cents;
  }

  test("AC1 marginal savings match buildReport counterfactuals", () => {
    expect(marginal(1, [1])).toBe(70_694);
    expect(marginal(12, [12])).toBe(65_693);
    expect(marginal(180, [180])).toBe(18_489);

    const firstYear = extrasFor([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const full = loanReport(loan, firstYear);
    expect(savedByExtraCents(loan, firstYear, 1, full.interest_cents)).toBe(69_761);
    expect(savedByExtraCents(loan, firstYear, 12, full.interest_cents)).toBe(64_818);
    expect(savedByExtraCents(loan, firstYear, 13, full.interest_cents)).toBe(0);

    let sum = 0;
    for (let month = 1; month <= 12; month += 1) {
      sum += savedByExtraCents(loan, firstYear, month, full.interest_cents);
    }
    expect(sum).not.toBe(813_770);
  });
});

describe("CLI contract", () => {
  test("AC5 json schedule keys and CSV header are unchanged", () => {
    const json = JSON.parse(
      execSync(
        "node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 --json --schedule",
        { cwd: repoRoot, encoding: "utf8" },
      ),
    ) as { schedule: Record<string, unknown>[] };
    expect(Object.keys(json.schedule[0]).sort()).toEqual([
      "extra_cents",
      "interest_cents",
      "interest_saved_cents",
      "month",
      "principal_cents",
      "remaining_interest_cents",
      "remaining_principal_cents",
    ]);
    const csv = execSync(
      "node compound_interest_monthly.js --amount 570000 --rate 7 --years 30 --schedule",
      { cwd: repoRoot, encoding: "utf8" },
    );
    expect(csv.trim().split("\n")[0]).toBe(
      "month,interest,principal,remaining_principal,remaining_interest,extra,interest_saved",
    );
  });
});

describe("thousands price", () => {
  test("digit-shifts a purchase price into dollars and back", () => {
    expect(thousandsToDollarString("600")).toBe("600000");
    expect(thousandsToDollarString("570")).toBe("570000");
    expect(thousandsToDollarString("712.5")).toBe("712500");
    expect(thousandsToDollarString("399.999")).toBe("399999");
    expect(thousandsToDollarString("0.00001")).toBe("0.01");
    expect(thousandsToDollarString("1200")).toBe("1200000");
    expect(thousandsToDollarString("0")).toBeNull();
    expect(thousandsToDollarString("600.123456")).toBeNull();
    expect(dollarsToThousandsText("570000")).toBe("570");
    expect(dollarsToThousandsText("712500")).toBe("712.5");
    expect(dollarsToThousandsText("399999.00")).toBe("399.999");
    expect(dollarsToThousandsText("0.01")).toBe("0.00001");
    expect(dollarsToThousandsText("1200000")).toBe("1200");
    expect(isTrailingDotThousands("600.")).toBe(true);
    expect(isTrailingDotThousands("600.1")).toBe(false);
  });
});

describe("financed principal", () => {
  test("loanReport uses financed cents and leaves the base on the loan", () => {
    const parsed = parseLoan({
      price: "600000",
      down: "5",
      years: "30",
      rate: "7.375",
      start: "2026-10",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.loan.loanCents).toBe(57_000_000);
    const report = loanReport(parsed.loan, new Map(), 57_997_500);
    expect(report.amount_cents).toBe(57_997_500);
    expect(report.monthly_payment_cents).toBe(
      buildReport(579975, 7.375, 360, new Map()).monthly_payment_cents,
    );
  });
});

describe("year subtotals and edited cells", () => {
  const parsed = parseLoan({ price: "570000", down: "0", years: "30", rate: "7", start: "2026-10" });
  if (!parsed.ok) throw new Error("example loan must parse");
  const loan = parsed.loan;

  test("AC1 the Saved by extra year subtotal is the sum of its cells", () => {
    const extras = new Map<number, number>();
    for (let month = 1; month <= 12; month += 1) extras.set(month, 100);
    const report = loanReport(loan, extras);
    const years = groupByYear(loan, report, extras);
    expect(years[0].year).toBe(2026);
    expect(years[0].savedByExtraCents).toBe(139_060);
    expect(years[1].savedByExtraCents).toBe(668_128);
    expect(years.slice(2).every((year) => year.savedByExtraCents === 0)).toBe(true);
    const sum = years.reduce((total, year) => total + year.savedByExtraCents, 0);
    expect(sum).toBe(807_188);
    expect(report.interest_saved_cents).toBe(813_770);
    for (const year of years) {
      expect(year.savedByExtraCents).toBe(
        year.rows.reduce((total, row) => total + row.savedByExtraCents, 0),
      );
    }
  });

  test("a year with no extra subtotals to zero", () => {
    const report = loanReport(loan, new Map());
    expect(groupByYear(loan, report, new Map())[0].savedByExtraCents).toBe(0);
  });

  test("AC1 the edited predicate compares one month against the applied map", () => {
    const extras = new Map([
      [1, 100],
      [2, 50],
    ]);
    const applied = new Map([
      [2, 50],
      [3, 100],
    ]);
    expect(isEditedExtra(extras, applied, 1)).toBe(true);
    expect(isEditedExtra(extras, applied, 3)).toBe(true);
    expect(isEditedExtra(extras, applied, 2)).toBe(false);
    expect(isEditedExtra(extras, applied, 4)).toBe(false);
    expect(isEditedExtra(new Map([[2, 75]]), applied, 2)).toBe(true);
  });

  test("groupByYear marks only the months that differ from the applied map", () => {
    const applied = new Map([[1, 100]]);
    const extras = new Map([
      [1, 100],
      [2, 40],
    ]);
    const report = loanReport(loan, extras);
    const rows = groupByYear(loan, report, extras, loan.loanCents, applied)[0].rows;
    expect(rows[0].edited).toBe(false);
    expect(rows[1].edited).toBe(true);
  });
});

describe("applied map in storage", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  const base = {
    version: 1,
    price: "570000",
    down: "0",
    years: "30",
    rate: "7",
    start: "2026-10",
  };

  test("AC1 a payload without applied equals the loaded extras", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...base, extras: [[1, 100]] }));
    const loaded = loadScenario(storage, now);
    expect(loaded.extras).toEqual(new Map([[1, 100]]));
    expect(loaded.applied).toEqual(loaded.extras);
    expect(loaded.applied).not.toBe(loaded.extras);
  });

  test("AC1 a malformed applied keeps the loan and equals the extras", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...base, extras: [[1, 100]], applied: "x" }));
    const loaded = loadScenario(storage, now);
    expect(loaded.draft.price).toBe("570000");
    expect(loaded.extras).toEqual(new Map([[1, 100]]));
    expect(loaded.applied).toEqual(new Map([[1, 100]]));
  });

  test("AC1 saveScenario writes applied as month and dollars pairs", () => {
    const storage = memoryStorage();
    const scenario = defaultScenario(now);
    scenario.extras = new Map([[3, 250]]);
    scenario.applied = new Map([[3, 100]]);
    scenario.openYears = [2026];
    saveScenario(storage, scenario);
    const stored = JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.version).toBe(1);
    expect(stored.applied).toEqual([[3, 100]]);
    expect(loadScenario(storage, now).applied).toEqual(new Map([[3, 100]]));
  });

  test("AC1 a fresh scenario has an empty applied map", () => {
    expect(defaultScenario(now).applied.size).toBe(0);
    expect(loadScenario(memoryStorage(), now).applied.size).toBe(0);
  });
});

describe("saved loan inputs", () => {
  test("a value that does not parse is ignored", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{");
    const now = new Date("2026-10-15T12:00:00Z");
    expect(loadScenario(storage, now)).toEqual(defaultScenario(now));
  });

  test("a valid loan is restored", () => {
    const storage = memoryStorage();
    const now = new Date("2026-10-15T12:00:00Z");
    const scenario = defaultScenario(now);
    scenario.draft = {
      price: "712500",
      down: "20",
      years: "15",
      rate: "6.5",
      start: "2024-03",
    };
    scenario.extras = new Map([[1, 100]]);
    scenario.prefill = { monthly: "100", yearly: "", month: 1, open: true };
    scenario.openYears = [2024, 2025];
    saveScenario(storage, scenario);
    expect(loadScenario(storage, now)).toEqual(scenario);
  });

  test("a version-1 loan without a picture keeps that loan and the picture defaults", () => {
    const storage = memoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        price: "570000",
        down: "0",
        years: "30",
        rate: "7",
        start: "2026-10",
        extras: [[1, 100]],
        prefill: { monthly: "100", yearly: "", month: 1, open: true },
        openYears: [2026],
      }),
    );
    const loaded = loadScenario(storage, new Date("2026-10-15T12:00:00Z"));
    expect(loaded.draft).toEqual({
      price: "570000",
      down: "0",
      years: "30",
      rate: "7",
      start: "2026-10",
    });
    expect(loaded.extras).toEqual(new Map([[1, 100]]));
    expect(loaded.prefill.open).toBe(true);
    expect(loaded.openYears).toEqual([2026]);
    expect(loaded.picture).toEqual(pictureDefaults());
    expect(loaded.picture.open).toBe(false);
  });

  test("a saved picture open flag and a partial picture keep the loan", () => {
    const storage = memoryStorage();
    const now = new Date("2026-10-15T12:00:00Z");
    const scenario = defaultScenario(now);
    scenario.draft = { ...scenario.draft, price: "100000", down: "0", rate: "7" };
    scenario.openYears = [2026];
    scenario.picture = { ...pictureDefaults(), tax: "2", open: true };
    saveScenario(storage, scenario);
    const loaded = loadScenario(storage, now);
    expect(loaded.draft.price).toBe("100000");
    expect(loaded.picture).toEqual(scenario.picture);

    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        price: "570000",
        down: "0",
        years: "30",
        rate: "7",
        start: "2026-10",
        picture: { tax: "2" },
      }),
    );
    const partial = loadScenario(storage, now);
    expect(partial.draft.price).toBe("570000");
    expect(partial.picture.tax).toBe("2");
    expect(partial.picture.insurance).toBe("0.35");
    expect(partial.picture.open).toBe(false);
  });

  test("a malformed picture does not discard the saved loan", () => {
    const storage = memoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        price: "570000",
        down: "0",
        years: "30",
        rate: "7",
        start: "2026-10",
        picture: "nope",
      }),
    );
    const loaded = loadScenario(storage, new Date("2026-10-15T12:00:00Z"));
    expect(loaded.draft.price).toBe("570000");
    expect(loaded.picture).toEqual(pictureDefaults());
  });
});

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("yearsAndMonths", () => {
  test.each([
    [0, "0 months"],
    [1, "1 month"],
    [7, "7 months"],
    [11, "11 months"],
    [12, "1 year"],
    [13, "1 year 1 month"],
    [24, "2 years"],
    [28, "2 years 4 months"],
    [181, "15 years 1 month"],
    [332, "27 years 8 months"],
    [336, "28 years"],
    [360, "30 years"],
  ])("%i months is %s", (months, text) => {
    expect(yearsAndMonths(months)).toBe(text);
  });

  test("months saved is a bare count under twelve", () => {
    expect(monthsSavedText(0)).toBe("0");
    expect(monthsSavedText(11)).toBe("11");
    expect(monthsSavedText(12)).toBe("1 year");
    expect(monthsSavedText(28)).toBe("2 years 4 months");
    expect(monthsSavedText(179)).toBe("14 years 11 months");
  });
});
