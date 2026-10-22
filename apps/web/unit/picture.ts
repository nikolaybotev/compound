import { describe, expect, test } from "vitest";
import { buildReport } from "../../../amortize.js";
import { downPaymentCents, formatMoney, parseLoan, paymentDate } from "../src/loan";
import {
  buildPicture,
  centsToProrationField,
  clampClosingDay,
  closingInterestDays,
  conventionalPmi,
  defaultPicture,
  defaultProrationCents,
  daysInMonth,
  isLeapYear,
  pmiPercentInputFromThousandths,
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
  ficoRangeScore,
  pmiThousandthsForScore,
  sellerCreditWarning,
  titleCentsFromPrice,
  titlePercentHundredThousandths,
  type PictureLines,
  type PictureValues,
} from "../src/picture";

const START = "2026-10";

function linesFor(draft: {
  price?: string;
  down?: string;
  years?: string;
  rate?: string;
  start?: string;
  picture?: ReturnType<typeof defaultPicture>;
  values?: Partial<PictureValues>;
}): PictureLines {
  const price = draft.price ?? "600000";
  const down = draft.down ?? "5";
  const years = draft.years ?? "30";
  const rate = draft.rate ?? "7.375";
  const start = draft.start ?? START;
  const parsed = parseLoan({ price, down, years, rate, start });
  if (!parsed.ok) throw new Error("loan must parse");
  let pictureDraft = draft.picture ?? defaultPicture();
  if (draft.down !== undefined && draft.picture === undefined) {
    const downTh = percentThousandths(down);
    if (downTh !== null) {
      const pmi = conventionalPmi(downTh);
      pictureDraft = { ...pictureDraft, pmi: pmiPercentInputFromThousandths(pmi.thousandths) };
    }
  }
  const picture = parsePicture(pictureDraft, start);
  if (!picture.ok) throw new Error("picture must parse");
  const values = { ...picture.values, ...draft.values };
  return buildPicture(parsed.loan, rate, down, start, values);
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
    expect(lines.lenderFeesCents).toBe(300_000);
    expect(lines.titleCents).toBe(450_000);
    expect(lines.prepaidInterestCents).toBe(361_990);
    expect(lines.prepaidInterestDays).toBe(31);
    expect(lines.homeownersInsuranceCents).toBe(210_000);
    expect(lines.taxImpoundCents).toBe(345_000);
    expect(lines.insuranceImpoundCents).toBe(52_500);
    expect(lines.miImpoundCents).toBe(33_250);
    expect(lines.prorationCents).toBe(57_500);
    expect(lines.closingCents).toBe(1_810_240);
    expect(lines.pointsCents).toBe(0);
    expect(lines.closingAndPointsCents).toBe(1_810_240);
    expect(lines.cashToCloseCents).toBe(4_810_240);
    expect(lines.dueAtClosingCents).toBe(4_810_240);
    expect(lines.closingCents).toBeGreaterThan(1_657_241);
  });

  test("percent-of-money uses the same half-up division as down payment", () => {
    expect(percentOfCents(39_999_900, 3500)).toBe(downPaymentCents(39_999_900, 3500));
    expect(percentOfCents(57_000_000, 1750)).toBe(997_500);
  });
});

describe("AC1 reference fixture", () => {
  test("clean closing costs, points outside, prepaid interest and impounds", () => {
    const picture = defaultPicture();
    picture.lenderFees = "2618";
    picture.title = "0.64925";
    picture.closingDay = "6";
    picture.interestBasis = "365";
    picture.taxImpoundMonths = "6";
    picture.insuranceImpoundMonths = "3";
    picture.miImpoundMonths = "2";
    picture.proration = "813.92";
    picture.points = "0.25";
    picture.sellerCredit = "10000";
    picture.earnest = "18000";
    picture.tax = "1.25";
    picture.pmi = "0.21";
    const lines = linesFor({
      price: "600000",
      down: "5",
      rate: "7.25",
      start: "2026-11",
      picture,
      values: {
        homeownersInsuranceAnnualCents: 197_200,
      },
    });
    expect(percentOfCents(60_000_000, 1250, 12)).toBe(62_500);
    expect(lines.lenderFeesCents).toBe(261_800);
    expect(lines.titleCents).toBe(389_550);
    expect(titleCentsFromPrice(60_000_000, 65_000)).toBe(390_000);
    const interest = prepaidInterestCents365(57_000_000, 7250, 25);
    expect(interest).toBe(283_050);
    expect(lines.prepaidInterestCents).toBe(283_050);
    expect(283_048).not.toBe(lines.prepaidInterestCents);
    expect(lines.homeownersInsuranceCents).toBe(197_200);
    expect(lines.insuranceImpoundCents).toBe(49_299);
    expect(lines.miImpoundCents).toBe(19_950);
    expect(lines.taxImpoundCents).toBe(375_000);
    expect(lines.prorationCents).toBe(81_392);
    expect(lines.closingCents).toBe(1_657_241);
    expect(lines.pointsCents).toBe(142_500);
    expect(lines.closingAndPointsCents).toBe(1_799_741);
    expect(lines.cashToCloseCents).toBe(3_799_741);
    expect(lines.dueAtClosingCents).toBe(1_999_741);
  });
});

describe("AC2 fresh visit, calendar, proration, formatMoney", () => {
  test("fresh visit totals and 365 basis switch", () => {
    const lines = linesFor({});
    expect(lines.closingCents).toBe(1_810_240);
    expect(lines.closingCents).toBeGreaterThan(1_657_241);

    const picture365 = defaultPicture();
    picture365.interestBasis = "365";
    const parsed365 = parsePicture(picture365, START);
    if (!parsed365.ok) throw new Error("picture");
    const loanParsed = parseLoan({ price: "600000", down: "5", years: "30", rate: "7.375", start: START });
    if (!loanParsed.ok) throw new Error("loan");
    const lines365 = buildPicture(loanParsed.loan, "7.375", "5", START, parsed365.values);
    expect(lines365.prepaidInterestCents).toBe(357_027);
    expect(lines365.closingCents).toBe(1_805_277);
    expect(lines365.cashToCloseCents).toBe(4_805_277);
  });

  test("20% down zeroes mortgage-insurance impound", () => {
    const lines = linesFor({ down: "20" });
    expect(lines.miImpoundCents).toBe(0);
    expect(lines.pmiCents).toBe(0);
  });

  test("closing month day counts and clamps", () => {
    expect(closingInterestDays("2026-10", 1)).toBe(31);
    expect(closingInterestDays("2026-11", 6)).toBe(25);
    expect(clampClosingDay(31, "2026-11")).toBe(30);
    expect(closingInterestDays("2026-11", 31)).toBe(1);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(paymentDate("2026-11", 1)).toEqual({ year: 2026, month: 12 });
  });

  test("negative proration and formatMoney minus placement", () => {
    const zeroProration = linesFor({ values: { prorationCents: 0 } });
    const negative = linesFor({ values: { prorationCents: -10_000 } });
    expect(negative.closingCents).toBe(zeroProration.closingCents - 10_000);
    expect(formatMoney(-81_392)).toBe("-$813.92");
  });
});

describe("AC3 storage migration", () => {
  test("maps legacy origination and processing, keeps lenderFees, defaults", () => {
    const loanParsed = parseLoan({ price: "600000", down: "5", years: "30", rate: "7.375", start: START });
    if (!loanParsed.ok) throw new Error("loan");
    const migrated = pictureFromStorage(
      {
        origination: "1",
        processing: "1200",
        title: "0.5",
        appraisal: "500",
        recording: "800",
        interestDays: "15",
        taxMonths: "4",
        cushion: "1500",
      },
      loanParsed.loan.loanCents,
      START,
      "5",
      "780",
      loanParsed.loan.priceCents,
    );
    expect(migrated.lenderFees).toBe("6900");
    expect(migrated.title).toBe("0.5");
    expect(migrated.closingDay).toBe("1");
    expect(migrated.taxImpoundMonths).toBe("6");
    expect(migrated.proration).toBe("575");
    expect(migrated.points).toBe("0");
    expect("origination" in migrated).toBe(false);

    const kept = pictureFromStorage(
      { lenderFees: "2618", origination: "1" },
      loanParsed.loan.loanCents,
      START,
    );
    expect(kept.lenderFees).toBe("2618");

    const missing = pictureFromStorage(undefined, loanParsed.loan.loanCents, START);
    expect(missing.lenderFees).toBe("3000");
    expect(missing.title).toBe("0.75");

    const precise = pictureFromStorage({ title: "0.64925" }, loanParsed.loan.loanCents, START);
    expect(precise.title).toBe("0.64925");

    expect(loadStoredInterestBasis("366")).toBe("360");
  });

  test("an empty closing field is invalid", () => {
    const picture = defaultPicture();
    picture.lenderFees = "";
    const parsed = parsePicture(picture, START);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.field).toBe("lenderFees");
  });
});

describe("AC4 seller credit warning", () => {
  test("boundaries and message text", () => {
    const message =
      "The usual conventional cap is 3% of the lower of price or appraisal. This check uses price because there is no appraisal.";
    expect(sellerCreditWarning(5_000, 1_800_001, 60_000_000)).toBe(message);
    expect(sellerCreditWarning(5_000, 1_800_000, 60_000_000)).toBeNull();
    expect(sellerCreditWarning(10_000, 10_000_000_000, 60_000_000)).toBeNull();
  });
});

describe("PMI brackets", () => {
  test("thousandths cuts and rate text have no bracket sentence", () => {
    expect(conventionalPmi(20_000)).toEqual({ thousandths: 0, text: "0%" });
    expect(linesFor({ down: "20" }).pmiCents).toBe(0);
    expect(linesFor({ down: "10" }).pmiCents).toBe(9_000);
    expect(linesFor({ down: "4" }).pmiCents).toBe(21_600);
  });

  test("a 15-year term changes principal and interest and leaves prepaid interest days", () => {
    const lines = linesFor({ years: "15" });
    expect(lines.principalAndInterestCents).toBe(
      buildReport(570000, 7.375, 180, new Map()).monthly_payment_cents,
    );
    expect(lines.prepaidInterestDays).toBe(31);
  });
});

describe("AC1 PMI ladder by FICO", () => {
  test("thousandths and fresh-loan PMI cents", () => {
    expect(pmiThousandthsForScore(5_000, 780)).toBe(350);
    expect(ficoRangeScore(800)).toBe(780);
    expect(linesFor({ down: "5", picture: { ...defaultPicture(), pmi: "0.35" } }).pmiCents).toBe(16_625);
  });
});

describe("prepaid interest helpers", () => {
  test("360 and 365 charges on reference loans", () => {
    expect(prepaidInterestCents360(57_000_000, 7375, 31)).toBe(361_990);
    expect(prepaidInterestPerDiem365Cents(57_000_000, 7500)).toBe(11_712);
    expect(prepaidInterestCents365(57_000_000, 7500, 15)).toBe(175_680);
    expect(prepaidInterestCents(57_000_000, 7375, 0, "360")).toBe(0);
  });

  test("parseWholeCount accepts 0 through 999 only", () => {
    expect(parseWholeCount("0")).toBe(0);
    expect(parseWholeCount("1000")).toBeNull();
  });

  test("title five-decimal grammar", () => {
    expect(titlePercentHundredThousandths("0.64925")).toBe(64_925);
    expect(titlePercentHundredThousandths("0.649256")).toBeNull();
  });
});
