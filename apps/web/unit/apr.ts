import { describe, expect, test } from "vitest";
import {
  loanAprSummary,
  parseLoan,
  prepaidFinanceChargeCentsForApr,
} from "../src/loan";
import {
  buildPicture,
  closingInterestDays,
  conventionalPmi,
  defaultPicture,
  parsePicture,
  pmiPercentInputFromThousandths,
  percentThousandths,
} from "../src/picture";

function ac8Lines(overrides: {
  start?: string;
  closingDay?: string;
  lenderFees?: string;
  title?: string;
  interestBasis?: "360" | "365";
} = {}) {
  const start = overrides.start ?? "2013-04";
  const parsed = parseLoan({
    price: "200000",
    down: "20",
    termUnit: "years",
    years: "30",
    months: "",
    rate: "6.75",
    start,
  });
  if (!parsed.ok) throw new Error("loan must parse");
  const downTh = percentThousandths("20");
  if (downTh === null) throw new Error("down must parse");
  const pmi = conventionalPmi(downTh);
  let picture = defaultPicture();
  picture = {
    ...picture,
    lenderFees: overrides.lenderFees ?? "3000",
    points: "0",
    closingDay: overrides.closingDay ?? "15",
    interestBasis: overrides.interestBasis ?? "360",
    title: overrides.title ?? "0.75",
    pmi: pmiPercentInputFromThousandths(pmi.thousandths),
  };
  const parsedPicture = parsePicture(picture, start);
  if (!parsedPicture.ok) throw new Error("picture must parse");
  const lines = buildPicture(parsed.loan, "6.75", "20", start, parsedPicture.values);
  return { loan: parsed.loan, lines, pictureValues: parsedPicture.values };
}

function aprPrepaid(lines: ReturnType<typeof ac8Lines>["lines"], pictureValues: ReturnType<typeof ac8Lines>["pictureValues"]) {
  return prepaidFinanceChargeCentsForApr({
    pointsCents: lines.pointsCents,
    lenderFeesCents: lines.lenderFeesCents,
    prepaidInterestCents: lines.prepaidInterestCents,
    lenderCreditCents: pictureValues.lenderCreditCents,
  });
}

function aprText(overrides: Parameters<typeof ac8Lines>[0] = {}) {
  const { loan, lines, pictureValues } = ac8Lines(overrides);
  const summary = loanAprSummary({
    financedCents: lines.financedCents,
    ratePercent: loan.ratePercent,
    monthCount: loan.monthCount,
    termYears: loan.termYears,
    prepaidFinanceChargeCents: aprPrepaid(lines, pictureValues),
    pmiMonthlyCents: lines.pmiCents,
    originalValueCents: loan.priceCents,
    armEnabled: false,
    armValues: null,
    currentIndexThousandths: null,
  });
  if (summary.kind !== "percent") throw new Error("expected APR percent");
  return summary.text;
}

describe("AC8 Regulation Z APR on the page inputs", () => {
  test("April 2013 closing day 15 with lender fees shows 6.966%", () => {
    const { lines, pictureValues } = ac8Lines();
    expect(lines.prepaidInterestCents).toBe(48000);
    expect(aprText()).toBe("6.966%");
    expect(closingInterestDays("2013-04", 15)).toBe(16);
    expect(aprPrepaid(lines, pictureValues)).toBe(348000);
  });

  test("raising the title percentage leaves 6.966%", () => {
    expect(aprText({ title: "1.00" })).toBe("6.966%");
  });

  test("zero lender fees changes the APR", () => {
    expect(aprText({ lenderFees: "0" })).toBe("6.779%");
    expect(aprText({ lenderFees: "0" })).not.toBe("6.966%");
  });

  test("October 2013 closing day 1 with lender fees restored changes the APR", () => {
    expect(aprText({ start: "2013-10", closingDay: "1" })).toBe("6.994%");
  });
});

describe("ARM blank current index", () => {
  test("prompts for the consummation index", () => {
    const { loan, lines, pictureValues } = ac8Lines();
    const summary = loanAprSummary({
      financedCents: lines.financedCents,
      ratePercent: loan.ratePercent,
      monthCount: loan.monthCount,
      termYears: loan.termYears,
      prepaidFinanceChargeCents: aprPrepaid(lines, pictureValues),
      pmiMonthlyCents: lines.pmiCents,
      originalValueCents: loan.priceCents,
      armEnabled: true,
      armValues: {
        fixedMonths: 84,
        adjustMonths: 12,
        marginThousandths: 2500,
        initialCapThousandths: 5000,
        periodicCapThousandths: 2000,
        lifetimeCapThousandths: 5000,
        floorThousandths: 2500,
        initialFloorThousandths: 2500,
        roundEighth: false,
      },
      currentIndexThousandths: null,
    });
    expect(summary).toEqual({ kind: "prompt" });
  });
});
