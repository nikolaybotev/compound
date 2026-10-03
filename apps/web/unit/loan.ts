import { describe, expect, test } from "vitest";
import { buildReport } from "../../../amortize.js";
import {
  bands,
  centsToDollars,
  defaultDraft,
  downPaymentCents,
  formatMoney,
  loadDraft,
  parseLoan,
  paymentDate,
  percentThousandths,
  saveDraft,
  shortDate,
  STORAGE_KEY,
} from "../src/loan";

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

describe("saved loan inputs", () => {
  test("a value that does not parse is ignored", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{");
    const now = new Date("2026-10-15T12:00:00Z");
    expect(loadDraft(storage, now)).toEqual(defaultDraft(now));
  });

  test("a valid loan is restored", () => {
    const storage = memoryStorage();
    const draft = {
      price: "712500",
      down: "20",
      years: "15",
      rate: "6.5",
      start: "2024-03",
    };
    saveDraft(storage, draft);
    expect(loadDraft(storage, new Date("2026-10-15T12:00:00Z"))).toEqual(draft);
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
