import { describe, expect, test } from "vitest";
import { dollarsToCents } from "../../../amortize.js";
import { defaultArm, parseArm, type ArmIndexEntry } from "../src/arm";
import {
  anyExtraEdited,
  isEditedExtra,
  levelArmExtras,
  loanReport,
  parseLoan,
  type Loan,
} from "../src/loan";

function requirement8Loan(index: ArmIndexEntry[] = []): Loan {
  const parsed = parseLoan({
    price: "600000",
    down: "5",
    years: "30",
    rate: "5.875",
    start: "2026-10",
  });
  if (!parsed.ok) throw new Error("loan must parse");
  const armParsed = parseArm(defaultArm(), 30, 5875);
  if (!armParsed.ok) throw new Error("arm must parse");
  return {
    ...parsed.loan,
    arm: { enabled: true, values: armParsed.values, index },
  };
}

function mapFromRecord(record: Record<number, number>): Map<number, number> {
  return new Map(Object.entries(record).map(([month, dollars]) => [Number(month), dollars]));
}

function expectExtraCents(map: Map<number, number>, month: number, cents: number) {
  if (cents === 0) {
    expect(map.has(month)).toBe(false);
    return;
  }
  expect(dollarsToCents(map.get(month) ?? 0)).toBe(cents);
}

describe("levelArmExtras fixtures", () => {
  const loan = requirement8Loan();
  const financed = loan.loanCents;

  test("F2 Apply with checkbox on, no index", () => {
    const extras = levelArmExtras(loan, financed, 100, 250, 1, 1, new Map());
    expect(extras.get(1)).toBe(100);
    expect(extras.get(3)).toBe(350);
    expect(extras.get(84)).toBe(100);
    expect(extras.has(85)).toBe(false);
    expect(extras.has(87)).toBe(false);
    expect(extras.has(360)).toBe(false);
    const report = loanReport(loan, extras, financed);
    expect(report.interest_cents).toBe(107_954_472);
    expect(report.monthly_payment_cents).toBe(337_177);
  });

  test("F3 index 0 at month 85 after F2 matches Apply with index preset", () => {
    const f2 = levelArmExtras(loan, financed, 100, 250, 1, 1, new Map());
    const kept = new Map<number, number>();
    for (const [month, amount] of f2) {
      if (month < 85) kept.set(month, amount);
    }
    const loanWithIndex = requirement8Loan([[85, 0]]);
    const fromIndex = levelArmExtras(loanWithIndex, financed, 100, 250, 1, 85, kept);
    const fromApply = levelArmExtras(loanWithIndex, financed, 100, 250, 1, 1, new Map());
    expect([...fromIndex.entries()].sort((a, b) => a[0] - b[0])).toEqual(
      [...fromApply.entries()].sort((a, b) => a[0] - b[0]),
    );
    expectExtraCents(fromIndex, 85, 110_102);
    expectExtraCents(fromIndex, 87, 135_102);
    expectExtraCents(fromIndex, 97, 67_947);
    expectExtraCents(fromIndex, 109, 22_253);
    expect(fromIndex.get(84)).toBe(100);
    expectExtraCents(fromIndex, 97, 67_947);
    expect(dollarsToCents(fromIndex.get(97) ?? 0)).not.toBe(59_811);
    const report = loanReport(loanWithIndex, fromIndex, financed);
    expect(report.interest_cents).toBe(89_710_406);
  });

  test("F4 later index leaves earlier period and updates later periods", () => {
    const applied = levelArmExtras(loan, financed, 2000, 0, 1, 1, new Map());
    expectExtraCents(applied, 85, 238_149);
    const kept = new Map<number, number>();
    for (const [month, amount] of applied) {
      if (month < 97) kept.set(month, amount);
    }
    const loan97 = requirement8Loan([[97, 0]]);
    const after = levelArmExtras(loan97, financed, 2000, 0, 1, 97, kept);
    for (let month = 85; month <= 96; month += 1) {
      expectExtraCents(after, month, 238_149);
    }
    expectExtraCents(after, 97, 304_677);
    expectExtraCents(after, 109, 307_656);
    expect(dollarsToCents(after.get(109) ?? 0)).not.toBe(302_329);
    const report = loanReport(loan97, after, financed);
    expect(report.interest_cents).toBe(29_795_365);
    expect(report.payoff_month).toBe(162);
    expectExtraCents(applied, 168, 497_092);
    expect(applied.has(169)).toBe(false);
  });

  test("F5 yearly month keeps extra when ordinary months are zero", () => {
    const kept = levelArmExtras(loan, financed, 100, 250, 1, 1, new Map());
    const loanIndex4 = requirement8Loan([[85, 4]]);
    const after = levelArmExtras(loanIndex4, financed, 100, 250, 1, 85, kept);
    expect(after.has(85)).toBe(false);
    expect(after.has(86)).toBe(false);
    expect(after.has(96)).toBe(false);
    expectExtraCents(after, 87, 24_573);
  });

  test("F6 clearing index restores F2 map", () => {
    const f3Loan = requirement8Loan([[85, 0]]);
    const f3 = levelArmExtras(f3Loan, financed, 100, 250, 1, 1, new Map());
    const kept = new Map<number, number>();
    for (const [month, amount] of f3) {
      if (month < 85) kept.set(month, amount);
    }
    const clearedLoan = requirement8Loan([]);
    const f6 = levelArmExtras(clearedLoan, financed, 100, 250, 1, 85, kept);
    const f2 = levelArmExtras(loan, financed, 100, 250, 1, 1, new Map());
    expect([...f6.entries()].sort((a, b) => a[0] - b[0])).toEqual(
      [...f2.entries()].sort((a, b) => a[0] - b[0]),
    );
    expect(f6.get(84)).toBe(100);
    expect(f6.has(85)).toBe(false);
    expect(f6.has(87)).toBe(false);
  });
});

describe("anyExtraEdited", () => {
  test("false when maps match and true when one month differs", () => {
    const applied = mapFromRecord({ 1: 100, 2: 50 });
    const same = new Map(applied);
    expect(anyExtraEdited(same, applied)).toBe(false);
    expect(isEditedExtra(same, applied, 1)).toBe(false);
    const different = new Map(applied);
    different.set(1, 75);
    expect(anyExtraEdited(different, applied)).toBe(true);
  });
});
