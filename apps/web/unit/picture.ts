import { describe, expect, test } from "vitest";
import { buildReport } from "../../../amortize.js";
import { downPaymentCents, parseLoan } from "../src/loan";
import {
  buildPicture,
  conventionalPmi,
  defaultPicture,
  pmiPercentInputFromThousandths,
  loadStoredCount,
  loadStoredInterestBasis,
  parsePicture,
  parseWholeCount,
  percentOfCents,
  pictureFromStorage,
  prepaidInterestCents,
  prepaidInterestCents360,
  prepaidInterestCents365,
  prepaidInterestPerDiem365Cents,
  percentThousandths,
  pmiThousandthsForScore,
  type PictureLines,
} from "../src/picture";

function countsFromDraft(draft: ReturnType<typeof defaultPicture>) {
  return {
    insuranceMonths: loadStoredCount(draft.insuranceMonths, 12),
    taxMonths: loadStoredCount(draft.taxMonths, 4),
    interestDays: loadStoredCount(draft.interestDays, 15),
  };
}

function linesFor(draft: {
  price?: string;
  down?: string;
  years?: string;
  rate?: string;
  picture?: ReturnType<typeof defaultPicture>;
}): PictureLines {
  const price = draft.price ?? "600000";
  const down = draft.down ?? "5";
  const years = draft.years ?? "30";
  const rate = draft.rate ?? "7.375";
  const parsed = parseLoan({ price, down, years, rate, start: "2026-10" });
  if (!parsed.ok) throw new Error("loan must parse");
  let pictureDraft = draft.picture ?? defaultPicture();
  if (draft.down !== undefined && draft.picture === undefined) {
    const downTh = percentThousandths(down);
    if (downTh !== null) {
      const pmi = conventionalPmi(downTh);
      pictureDraft = { ...pictureDraft, pmi: pmiPercentInputFromThousandths(pmi.thousandths) };
    }
  }
  const picture = parsePicture(pictureDraft, countsFromDraft(pictureDraft));
  if (!picture.ok) throw new Error("picture must parse");
  return buildPicture(parsed.loan, rate, down, picture.values);
}

describe("default Conventional picture", () => {
  test("fresh loan cents match the sheet and buildReport", () => {
    const lines = linesFor({});
    const payment = buildReport(570000, 7.375, 360, new Map()).monthly_payment_cents;
    expect(lines.baseCents).toBe(57_000_000);
    expect(lines.financedCents).toBe(57_000_000);
    expect(lines.principalAndInterestCents).toBe(393_685);
    expect(lines.principalAndInterestCents).toBe(payment);
    expect(lines.taxCents).toBe(57_500);
    expect(lines.insuranceCents).toBe(17_500);
    expect(lines.pmiCents).toBe(16_625);
    expect(lines.pmiRateText).toBe("0.35%");
    expect(lines.totalMonthlyCents).toBe(485_310);
    expect(lines.headingDollars).toBe(4853);
    expect(lines.originationCents).toBe(570_000);
    expect(lines.processingCents).toBe(120_000);
    expect(lines.appraisalCents).toBe(50_000);
    expect(lines.titleCents).toBe(450_000);
    expect(lines.recordingCents).toBe(80_000);
    expect(lines.prepaidInsuranceCents).toBe(210_000);
    expect(lines.prepaidInterestCents).toBe(175_156);
    expect(lines.prepaidTaxCents).toBe(230_000);
    expect(lines.cushionCents).toBe(150_000);
    expect(lines.closingCents).toBe(2_035_156);
    expect(lines.cashToCloseCents).toBe(5_035_156);
  });

  test("percent-of-money uses the same half-up division as down payment", () => {
    expect(percentOfCents(39_999_900, 3500)).toBe(downPaymentCents(39_999_900, 3500));
    expect(percentOfCents(57_000_000, 1750)).toBe(997_500);
  });
});

describe("PMI brackets", () => {
  test("thousandths cuts and rate text have no bracket sentence", () => {
    expect(conventionalPmi(20_000)).toEqual({ thousandths: 0, text: "0%" });
    expect(conventionalPmi(19_999)).toEqual({ thousandths: 200, text: "0.2%" });
    expect(conventionalPmi(10_000)).toEqual({ thousandths: 200, text: "0.2%" });
    expect(conventionalPmi(9_999)).toEqual({ thousandths: 350, text: "0.35%" });
    expect(conventionalPmi(5_000)).toEqual({ thousandths: 350, text: "0.35%" });
    expect(conventionalPmi(4_999)).toEqual({ thousandths: 450, text: "0.45%" });
    for (const cut of [conventionalPmi(20_000), conventionalPmi(10_000), conventionalPmi(5_000), conventionalPmi(0)]) {
      expect(cut.text).not.toMatch(/[()]/);
      expect(cut.text).not.toMatch(/down|between|bracket/i);
    }

    expect(linesFor({ down: "20" }).pmiCents).toBe(0);
    expect(linesFor({ down: "20" }).pmiRateText).toBe("0%");
    expect(linesFor({ down: "10" }).pmiCents).toBe(9_000);
    expect(linesFor({ down: "10" }).pmiRateText).toBe("0.2%");
    expect(linesFor({ down: "4" }).pmiCents).toBe(21_600);
    expect(linesFor({ down: "4" }).pmiRateText).toBe("0.45%");
  });

  test("a 15-year term changes principal and interest and leaves prepaid interest", () => {
    const lines = linesFor({ years: "15" });
    expect(lines.principalAndInterestCents).toBe(
      buildReport(570000, 7.375, 180, new Map()).monthly_payment_cents,
    );
    expect(lines.prepaidInterestCents).toBe(175_156);
    expect(lines.financedCents).toBe(57_000_000);
  });
});

describe("AC2 prepaid interest and storage loads", () => {
  test("360 and 365 charges on reference loans", () => {
    const fresh = linesFor({});
    expect(fresh.prepaidInterestCents).toBe(175_156);
    expect(prepaidInterestCents360(57_000_000, 7375, 15)).toBe(175_156);

    const rate75 = 7500;
    const base570 = 57_000_000;
    expect(prepaidInterestPerDiem365Cents(base570, rate75)).toBe(11_712);
    expect(prepaidInterestCents365(base570, rate75, 15)).toBe(175_680);
    expect(prepaidInterestCents360(base570, rate75, 15)).toBe(178_125);

    const twenty = linesFor({ down: "20" });
    expect(twenty.prepaidInterestCents).toBe(147_500);
    expect(twenty.closingCents).toBe(1_917_500);
    expect(twenty.cashToCloseCents).toBe(13_917_500);

    const picture365 = defaultPicture();
    picture365.interestBasis = "365";
    const parsed365 = parsePicture(picture365, countsFromDraft(picture365));
    if (!parsed365.ok) throw new Error("picture");
    const loanParsed = parseLoan({ price: "600000", down: "20", years: "30", rate: "7.375", start: "2026-10" });
    if (!loanParsed.ok) throw new Error("loan");
    const lines365 = buildPicture(loanParsed.loan, "7.375", "20", parsed365.values);
    expect(lines365.prepaidInterestCents).toBe(145_485);

    expect(prepaidInterestCents(57_000_000, 7375, 0, "360")).toBe(0);
    expect(prepaidInterestCents(57_000_000, 7375, 0, "365")).toBe(0);
  });

  test("stored basis and count fields load with defaults", () => {
    expect(loadStoredInterestBasis(undefined)).toBe("360");
    expect(loadStoredInterestBasis("360")).toBe("360");
    expect(loadStoredInterestBasis("365")).toBe("365");
    expect(loadStoredInterestBasis("366")).toBe("360");

    expect(loadStoredCount("1000", 15)).toBe(15);
    expect(loadStoredCount("1.5", 15)).toBe(15);
    expect(loadStoredCount("-1", 12)).toBe(12);
    expect(loadStoredCount("15.5", 4)).toBe(4);
    expect(loadStoredCount("abc", 4)).toBe(4);
    expect(loadStoredCount("", 15)).toBe(15);

    const fromStorage = pictureFromStorage({ interestDays: "1000", insuranceMonths: "-1", taxMonths: "abc" });
    expect(fromStorage.interestDays).toBe("15");
    expect(fromStorage.insuranceMonths).toBe("12");
    expect(fromStorage.taxMonths).toBe("4");
  });

  test("parseWholeCount accepts 0 through 999 only", () => {
    expect(parseWholeCount("0")).toBe(0);
    expect(parseWholeCount("999")).toBe(999);
    expect(parseWholeCount("1000")).toBeNull();
    expect(parseWholeCount("1.5")).toBeNull();
  });
});

describe("AC1 PMI ladder by FICO", () => {
  test("thousandths and fresh-loan PMI cents", () => {
    expect(pmiThousandthsForScore(5_000, 780)).toBe(350);
    expect(pmiThousandthsForScore(10_000, 780)).toBe(200);
    expect(pmiThousandthsForScore(5_000, 740)).toBe(530);
    expect(pmiThousandthsForScore(5_000, 600)).toBe(1990);
    expect(pmiThousandthsForScore(20_000, 600)).toBe(0);
    expect(pmiThousandthsForScore(20_000, 780)).toBe(0);

    expect(linesFor({ down: "5", picture: { ...defaultPicture(), pmi: "0.35" } }).pmiCents).toBe(16_625);
    const draft740 = defaultPicture();
    draft740.pmi = "0.53";
    expect(linesFor({ down: "5", picture: draft740 }).pmiCents).toBe(25_175);
  });
});

describe("picture inputs", () => {
  test("an empty field is invalid and does not use the extra-payment empty rule", () => {
    const picture = defaultPicture();
    picture.processing = "";
    const parsed = parsePicture(picture, countsFromDraft(picture));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.field).toBe("processing");
    expect(parsed.message).toContain("Lender processing fee");
  });
});
