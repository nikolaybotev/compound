import { describe, expect, test } from "vitest";
import { defaultDraft, defaultScenario, loanReport, parseLoan, parseStoredSet, serializeStoredSet, type Loan, type LoanDraft } from "../src/loan";
import {
  defaultPicture,
  optionalDollarOrDefault,
  pictureFromStorage,
  prepaidInterestCents360,
} from "../src/picture";
import {
  buildTaxTable,
  miPhaseoutPercent,
  TAX_MI_ENTER_AGI,
  TAX_SALT_CAP,
  TAX_SALT_ENTER_AGI,
  TAX_STANDARD_LABEL,
  type TaxTable,
  type TaxTableInput,
} from "../src/tax";

function fixedLoan(draft: LoanDraft): Loan {
  const parsed = parseLoan(draft);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.loan;
}

function tableFor(loan: Loan, patch: Partial<TaxTableInput> = {}): TaxTable {
  const schedule = patch.schedule ?? loanReport(loan, patch.appliedExtras ?? new Map(), loan.loanCents);
  return buildTaxTable({
    loan,
    financedCents: loan.loanCents,
    schedule,
    appliedExtras: new Map(),
    priceCents: loan.priceCents,
    prepaidInterestCents: 0,
    pointsCents: 0,
    pmiMonthlyCents: 0,
    propertyTaxMonthlyCents: 0,
    prorationCents: 0,
    insuranceAnnualCents: 0,
    filingStatus: "single",
    agiCents: null,
    magiCents: null,
    otherSaltCents: 0,
    otherItemizedCents: 0,
    standardOverrideCents: null,
    appraisalCents: null,
    ...patch,
    schedule,
  });
}

function portion(cents: number, loanCents: number, capCents: number): number {
  const numerator = cents * capCents;
  const quotient = Math.trunc(numerator / loanCents);
  const remainder = numerator % loanCents;
  if (remainder * 2 >= loanCents) return quotient + 1;
  return quotient;
}

describe("tax table", () => {
  const caseLoan = fixedLoan({
    price: "525000",
    down: "5",
    years: "30",
    rate: "7",
    start: "2026-11",
    fico: "780",
  });

  test("case-study interest paid, PMI payments, and insurance stay out of housing", () => {
    expect(caseLoan.loanCents).toBe(49_875_000);
    expect(caseLoan.priceCents).toBe(52_500_000);
    const prepaid = prepaidInterestCents360(caseLoan.loanCents, 7000, 15);
    expect(prepaid).toBe(145469);
    const table = tableFor(caseLoan, {
      prepaidInterestCents: prepaid,
      insuranceAnnualCents: 123_456,
      pmiMonthlyCents: 10_000,
      schedule: loanReport(caseLoan, new Map(), caseLoan.loanCents),
    });
    const row = (year: number) => {
      const found = table.rows.find((entry) => entry.year === year);
      if (!found) throw new Error(`missing ${year}`);
      return found;
    };
    expect(row(2026).interestPaidCents).toBe(145469);
    expect(row(2026).mortgageInterestCents).toBe(145469);
    expect(row(2027).interestPaidCents).toBe(3_475_200);
    expect(row(2028).interestPaidCents).toBe(3_438_574);
    expect(table.fundingInterestLine).toBe("Interest paid in 2026: $1,454.69.");
    expect(table.scheduled80Payment).toBe(130);
    expect(table.automatic78Payment).toBe(142);
    expect(table.midpointPayment).toBe(180);
    expect(table.terminationPayment).toBe(142);
    expect(table.extra80Payment).toBeNull();
    expect(table.pmiLines).toContain("Scheduled 80% request: October 1, 2037.");
    expect(table.pmiLines).toContain("Automatic 78%: October 1, 2038.");
    expect(table.pmiLines).toContain("Midpoint backstop (this page's reading): December 1, 2041.");
    expect(table.pmiLines.some((line) => line.startsWith("With extra principal"))).toBe(false);
    expect(row(2027).miPaidCents).toBe(120_000);
    expect(row(2027).miDeductibleCents).toBe(120_000);
    expect(row(2027).miPhaseoutNote).toBe(TAX_MI_ENTER_AGI);
    expect(table.insuranceAnnualCents).toBe(123_456);
    for (const entry of table.rows) {
      expect(entry.housingItemsCents).toBe(
        entry.mortgageInterestCents + entry.pointsCents + entry.miDeductibleCents + entry.saltAllowedCents,
      );
    }
  });

  test("extra principal moves only the 80% date", () => {
    const table = tableFor(caseLoan, { appliedExtras: new Map([[1, 100_000]]) });
    expect(table.scheduled80Payment).toBe(130);
    expect(table.extra80Payment).not.toBeNull();
    expect(table.extra80Payment!).toBeLessThan(130);
    expect(table.automatic78Payment).toBe(142);
    expect(table.midpointPayment).toBe(180);
    expect(table.pmiLines.some((line) => line.startsWith("With extra principal"))).toBe(true);
    expect(table.pmiLines).toContain("Scheduled 80% request: October 1, 2037.");
  });

  test("a loan over $750,000 prorates interest, and separate uses $375,000", () => {
    const large = fixedLoan({
      price: "800000",
      down: "0",
      years: "30",
      rate: "7",
      start: "2026-11",
      fico: "780",
    });
    const table = tableFor(large, { prepaidInterestCents: 0 });
    const year = table.rows.find((entry) => entry.year === 2027)!;
    expect(year.interestPaidCents).toBeGreaterThan(0);
    expect(year.mortgageInterestCents).toBe(portion(year.interestPaidCents, large.loanCents, 75_000_000));
    expect(year.mortgageInterestCents).toBeLessThan(year.interestPaidCents);

    const mid = fixedLoan({
      price: "400000",
      down: "0",
      years: "30",
      rate: "7",
      start: "2026-11",
      fico: "780",
    });
    const single = tableFor(mid);
    const separate = tableFor(mid, { filingStatus: "separate" });
    const singleYear = single.rows.find((entry) => entry.year === 2027)!;
    const separateYear = separate.rows.find((entry) => entry.year === 2027)!;
    expect(singleYear.mortgageInterestCents).toBe(singleYear.interestPaidCents);
    expect(separateYear.mortgageInterestCents).toBe(
      portion(separateYear.interestPaidCents, mid.loanCents, 37_500_000),
    );
    expect(separateYear.mortgageInterestCents).toBeLessThan(separateYear.interestPaidCents);
  });

  test("empty AGI skips the MI phaseout and the SALT phase-down", () => {
    expect(miPhaseoutPercent(10_000_000, false)).toBe(100);
    expect(miPhaseoutPercent(10_000_001, false)).toBe(90);
    expect(miPhaseoutPercent(10_900_000, false)).toBe(10);
    expect(miPhaseoutPercent(10_900_001, false)).toBe(0);
    expect(miPhaseoutPercent(5_000_000, true)).toBe(100);
    expect(miPhaseoutPercent(5_450_000, true)).toBe(50);
    expect(miPhaseoutPercent(5_450_001, true)).toBe(0);

    const open = tableFor(caseLoan, {
      pmiMonthlyCents: 10_000,
      otherSaltCents: 10_000_000,
      magiCents: 200_000_000,
      agiCents: null,
    });
    const year = open.rows.find((entry) => entry.year === 2026)!;
    const openNext = open.rows.find((entry) => entry.year === 2027)!;
    expect(year.miDeductibleCents).toBe(year.miPaidCents);
    expect(openNext.miPaidCents).toBe(120_000);
    expect(openNext.miDeductibleCents).toBe(120_000);
    expect(year.miPhaseoutNote).toBe(TAX_MI_ENTER_AGI);
    expect(year.saltAllowedCents).toBe(4_040_000);
    expect(year.saltPhaseDownNote).toBe(TAX_SALT_ENTER_AGI);

    const closed = tableFor(caseLoan, {
      pmiMonthlyCents: 10_000,
      otherSaltCents: 10_000_000,
      agiCents: 200_000_000,
      magiCents: 200_000_000,
    });
    const phased = closed.rows.find((entry) => entry.year === 2026)!;
    expect(closed.rows.find((entry) => entry.year === 2027)!.miDeductibleCents).toBe(0);
    expect(phased.miDeductibleCents).toBe(0);
    expect(phased.miPhaseoutNote).toBeNull();
    expect(phased.saltAllowedCents).toBe(1_000_000);
    expect(phased.saltPhaseDownNote).toBeNull();
  });

  test("SALT caps, the 1% steps, and the lesser of taxes paid", () => {
    expect(TAX_SALT_CAP).toContain("$40,400 ($20,200 if married filing separately)");
    expect(TAX_SALT_CAP).toContain("$10,000 ($5,000 if married filing separately)");
    expect(TAX_SALT_CAP).toContain("this page's 1% steps");
    const huge = { otherSaltCents: 10_000_000 };
    const single = tableFor(caseLoan, huge);
    expect(single.rows.find((entry) => entry.year === 2026)!.saltAllowedCents).toBe(4_040_000);
    expect(single.rows.find((entry) => entry.year === 2027)!.saltAllowedCents).toBe(4_080_400);
    expect(single.rows.find((entry) => entry.year === 2028)!.saltAllowedCents).toBe(4_121_200);
    expect(single.rows.find((entry) => entry.year === 2029)!.saltAllowedCents).toBe(4_162_400);
    expect(single.rows.find((entry) => entry.year === 2030)!.saltAllowedCents).toBe(1_000_000);
    const separate = tableFor(caseLoan, { ...huge, filingStatus: "separate" });
    expect(separate.rows.find((entry) => entry.year === 2026)!.saltAllowedCents).toBe(2_020_000);
    expect(separate.rows.find((entry) => entry.year === 2030)!.saltAllowedCents).toBe(500_000);

    const under = tableFor(caseLoan, { otherSaltCents: 100_000, propertyTaxMonthlyCents: 0, prorationCents: 0 });
    expect(under.rows.find((entry) => entry.year === 2026)!.saltAllowedCents).toBe(100_000);

    const atThreshold = tableFor(caseLoan, { ...huge, agiCents: 51_515_100, magiCents: 51_515_100 });
    expect(atThreshold.rows.find((entry) => entry.year === 2028)!.saltAllowedCents).toBe(4_121_200);
    const overThreshold = tableFor(caseLoan, { ...huge, agiCents: 51_515_200, magiCents: 51_515_200 });
    expect(overThreshold.rows.find((entry) => entry.year === 2028)!.saltAllowedCents).toBe(4_121_170);

    const oneDollar = tableFor(caseLoan, { ...huge, agiCents: 50_500_100, magiCents: 50_500_100 });
    expect(oneDollar.rows.find((entry) => entry.year === 2026)!.saltAllowedCents).toBe(4_039_970);

    const property = tableFor(caseLoan, { prorationCents: 1_000, propertyTaxMonthlyCents: 500 });
    expect(property.rows.find((entry) => entry.year === 2026)!.propertyTaxCents).toBe(1_000);
    expect(property.rows.find((entry) => entry.year === 2027)!.propertyTaxCents).toBe(6_000);
    const credit = tableFor(caseLoan, { prorationCents: -100, propertyTaxMonthlyCents: 500 });
    expect(credit.rows.find((entry) => entry.year === 2026)!.propertyTaxCents).toBe(0);
  });

  test("points, standard deduction, and the comparison leave other itemized out of housing", () => {
    const table = tableFor(caseLoan, { pointsCents: 25_000, prepaidInterestCents: 145_469 });
    const first = table.rows.find((entry) => entry.year === 2026)!;
    const next = table.rows.find((entry) => entry.year === 2027)!;
    expect(first.pointsCents).toBe(25_000);
    expect(next.pointsCents).toBe(0);
    expect(first.standardCents).toBe(1_610_000);
    expect(first.standardLabel).toBeNull();
    expect(next.standardCents).toBe(1_610_000);
    expect(next.standardLabel).toBe(TAX_STANDARD_LABEL);
    expect(tableFor(caseLoan, { filingStatus: "joint" }).rows[0]!.standardCents).toBe(3_220_000);
    expect(tableFor(caseLoan, { filingStatus: "head" }).rows[0]!.standardCents).toBe(2_415_000);
    expect(tableFor(caseLoan, { filingStatus: "separate" }).rows[0]!.standardCents).toBe(1_610_000);

    const overridden = tableFor(caseLoan, { standardOverrideCents: 100 });
    expect(overridden.rows.find((entry) => entry.year === 2026)!.standardCents).toBe(1_610_000);
    expect(overridden.rows.find((entry) => entry.year === 2027)!.standardCents).toBe(100);
    expect(overridden.rows.find((entry) => entry.year === 2027)!.standardLabel).toBeNull();

    const housing = first.mortgageInterestCents;
    expect(tableFor(caseLoan, { prepaidInterestCents: 145_469 }).rows[0]!.comparison).toBe(
      "Housing items are below the standard deduction",
    );
    const gap = 1_610_000 - housing;
    expect(
      tableFor(caseLoan, { prepaidInterestCents: 145_469, otherItemizedCents: gap }).rows[0]!.comparison,
    ).toBe("Housing items equal the standard deduction");
    const above = tableFor(caseLoan, { prepaidInterestCents: 145_469, otherItemizedCents: gap + 1 }).rows[0]!;
    expect(above.comparison).toBe("Housing items are above the standard deduction");
    expect(above.housingItemsCents).toBe(housing);
  });

  test("an October start includes the December payment in the funding year", () => {
    const loan = fixedLoan({
      price: "600000",
      down: "5",
      years: "30",
      rate: "7.375",
      start: "2026-10",
      fico: "780",
    });
    const schedule = loanReport(loan, new Map(), loan.loanCents);
    const prepaid = prepaidInterestCents360(loan.loanCents, 7375, 31);
    const table = tableFor(loan, { prepaidInterestCents: prepaid, schedule });
    expect(table.rows[0]!.interestPaidCents).toBe(prepaid + schedule.schedule[0]!.interest_cents);
    expect(table.fundingInterestLine).toBe("Interest paid in 2026: $7,123.03.");
    expect(table.pmiLines).toContain("Midpoint backstop (this page's reading): November 1, 2041.");
  });

  test("an appraisal replaces the purchase price", () => {
    const appraised = tableFor(caseLoan, { appraisalCents: 100 });
    expect(appraised.scheduled80Payment).not.toBe(130);
  });

  test("the fresh visit stays the Conventional loan and missing keys load defaults", () => {
    const now = new Date("2026-10-15T12:00:00Z");
    expect(defaultDraft(now)).toEqual({
      price: "600000",
      down: "5",
      years: "30",
      rate: "7.375",
      start: "2026-10",
      fico: "780",
    });
    const picture = defaultPicture();
    expect(picture.filingStatus).toBe("single");
    expect(picture.agi).toBe("");
    expect(picture.magi).toBe("");
    expect(picture.otherSalt).toBe("");
    expect(picture.otherItemized).toBe("");
    expect(picture.standardOverride).toBe("");
    expect(picture.appraisal).toBe("");
    expect(picture.taxOpen).toBe(false);
    expect(JSON.stringify(picture)).not.toContain("525000");
    expect(JSON.stringify(picture)).not.toContain("498750");
    expect(optionalDollarOrDefault("nope", "")).toBe("");
    expect(optionalDollarOrDefault("10.5", "")).toBe("10.5");
    expect(optionalDollarOrDefault("", "4")).toBe("");
    expect(optionalDollarOrDefault("10.555", "4")).toBe("4");

    const loan = fixedLoan({
      price: "600000",
      down: "5",
      years: "30",
      rate: "7.375",
      start: "2026-10",
      fico: "780",
    });
    const missing = pictureFromStorage({ lenderFees: "3000" }, loan.loanCents, "2026-10", "5", "780", loan.priceCents);
    expect(missing.filingStatus).toBe("single");
    expect(missing.agi).toBe("");
    expect(missing.appraisal).toBe("");
    expect(missing.taxOpen).toBe(false);
    const rejected = pictureFromStorage(
      { filingStatus: "nope", agi: "12.345", taxOpen: "yes" },
      loan.loanCents,
      "2026-10",
    );
    expect(rejected.filingStatus).toBe("single");
    expect(rejected.agi).toBe("");
    expect(rejected.taxOpen).toBe(false);
    const kept = pictureFromStorage(
      { filingStatus: "joint", agi: "100000", appraisal: "0", taxOpen: true },
      loan.loanCents,
      "2026-10",
    );
    expect(kept.filingStatus).toBe("joint");
    expect(kept.agi).toBe("100000");
    expect(kept.appraisal).toBe("0");
    expect(kept.taxOpen).toBe(true);

    const stored = parseStoredSet(
      JSON.stringify({
        version: 2,
        active: 0,
        scenarios: [
          {
            price: "600000",
            down: "5",
            years: "30",
            rate: "7.375",
            start: "2026-10",
            fico: "780",
            extras: [],
            applied: [],
            picture: { lenderFees: "3000", tax: "1.15" },
          },
        ],
      }),
      now,
    );
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    expect(stored.set.scenarios[0]!.draft.price).toBe("600000");
    expect(stored.set.scenarios[0]!.draft.rate).toBe("7.375");
    expect(stored.set.scenarios[0]!.picture.filingStatus).toBe("single");
    expect(stored.set.scenarios[0]!.picture.taxOpen).toBe(false);
    const roundTrip = JSON.parse(
      serializeStoredSet({ active: 0, scenarios: [defaultScenario(now)] }),
    ) as { version: number };
    expect(roundTrip.version).toBe(2);
  });
});
