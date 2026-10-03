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
  downPaymentCents,
  dropExtrasBeyond,
  formatMoney,
  loadScenario,
  loanReport,
  parseLoan,
  paymentDate,
  percentThousandths,
  savedByExtraCents,
  saveScenario,
  shortDate,
  STORAGE_KEY,
} from "../src/loan";

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
