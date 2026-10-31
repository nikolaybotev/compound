import { describe, expect, test } from "vitest";
import { buildReport } from "../../../amortize.js";
import {
  downPaymentCents,
  formatMoney,
  movingInCopy,
  MOVING_DISCLOSURE_RULE,
  MOVING_INTEREST_CREDIT_SENTENCE,
  MOVING_STATEMENT_SENTENCE,
  parseLoan,
  paymentDate,
} from "../src/loan";
import {
  buildPicture,
  centsToProrationField,
  clampClosingDay,
  closingDisclosureDeadline,
  closingInterestDays,
  conventionalPmi,
  defaultPicture,
  defaultProrationCents,
  daysInMonth,
  isClosingBusinessDay,
  isLeapYear,
  lateChargeCents,
  loadStoredInterestBasis,
  movingFieldOrDefault,
  parsePicture,
  parseWholeCount,
  percentOfCents,
  pictureFromStorage,
  pmiPercentInputFromThousandths,
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

describe("Moving in", () => {
  test("signing on 2026-11-12 is received by 2026-11-07", () => {
    expect(closingDisclosureDeadline("2026-11-12")).toBe("2026-11-07");
    expect(isClosingBusinessDay("2026-11-11")).toBe(false);
    expect(isClosingBusinessDay("2026-11-08")).toBe(false);
    expect(isClosingBusinessDay("2026-11-07")).toBe(true);
    expect(isClosingBusinessDay("2026-06-19")).toBe(false);
    expect(isClosingBusinessDay("2026-07-04")).toBe(false);
    expect(isClosingBusinessDay("2026-07-03")).toBe(false);
    expect(closingDisclosureDeadline("2022-01-03")).toBe("2021-12-28");
    expect(closingDisclosureDeadline("2022-12-27")).toBe("2022-12-22");
  });

  test("invalid grace, late charge, and dates keep the last valid value", () => {
    expect(movingFieldOrDefault("graceDays", "32", "15")).toBe("15");
    expect(movingFieldOrDefault("graceDays", "0", "15")).toBe("0");
    expect(movingFieldOrDefault("lateChargePercent", "100.01", "5")).toBe("5");
    expect(movingFieldOrDefault("lateChargePercent", "5.5", "5")).toBe("5.5");
    expect(movingFieldOrDefault("signingDate", "2026-02-31", "")).toBe("");
    expect(movingFieldOrDefault("signingDate", "", "2026-11-12")).toBe("");
    expect(movingFieldOrDefault("lastRent", "2026-10-15", "")).toBe("2026-10-15");
    expect(lateChargeCents(1, 5_000)).toBe(1);
    expect(lateChargeCents(393_685, 500)).toBe(19_684);
  });

  test("fresh October 2026 lines and a missing key do not change closing cents", () => {
    const lines = linesFor({});
    const copy = movingInCopy({
      startMonth: START,
      closingDay: 1,
      prepaidDays: lines.prepaidInterestDays,
      prepaidCents: lines.prepaidInterestCents,
      basis: "360",
      principalAndInterestCents: lines.principalAndInterestCents,
      taxCents: lines.taxCents,
      insuranceCents: lines.insuranceCents,
      pmiCents: lines.pmiCents,
      graceDays: 15,
      lateChargeHundredths: 500,
      signingDate: "",
      lastRent: "",
    });
    expect(copy.funding).toBe("Funding date Thursday, October 1, 2026. Interest starts this day.");
    expect(copy.prepaid).toBe(
      "Prepaid interest 31 days, $3,619.90, 360-day basis. These days are paid at closing, not on the schedule.",
    );
    expect(copy.noPayment).toBe(
      "No mortgage payment is due in November 2026. Payments are made in arrears: the December 1, 2026 payment covers November 2026.",
    );
    expect(copy.firstPayment).toBe(
      "First payment due December 1, 2026. Principal and interest is $3,936.85. Property tax, home insurance, and mortgage insurance are on top of that amount.",
    );
    expect(copy.grace).toContain("A late charge of 5% of principal and interest ($196.84 on the initial payment)");
    expect(copy.grace).toContain("end of day 15 after the due date");
    expect(copy.closingDisclosure).toBe(MOVING_DISCLOSURE_RULE);
    expect(copy.lastRent).toBeNull();
    expect(copy.statement).toBe(MOVING_STATEMENT_SENTENCE);
    expect(copy.interestCredit).toBe(MOVING_INTEREST_CREDIT_SENTENCE);
    expect(copy.interestCredit).toContain("This page uses the standard rule.");

    const signed = movingInCopy({
      startMonth: START,
      closingDay: 1,
      prepaidDays: 31,
      prepaidCents: lines.prepaidInterestCents,
      basis: "360",
      principalAndInterestCents: lines.principalAndInterestCents,
      taxCents: 0,
      insuranceCents: 0,
      pmiCents: 0,
      graceDays: 15,
      lateChargeHundredths: 500,
      signingDate: "2026-11-12",
      lastRent: "2026-10-01",
    });
    expect(signed.closingDisclosure).toBe(
      "For a signing on November 12, 2026, the Closing Disclosure has to be received by November 7, 2026.",
    );
    expect(signed.firstPayment).toBe(
      "First payment due December 1, 2026. Principal and interest is $3,936.85.",
    );
    expect(signed.lastRent).toBe(
      "Last rent October 1, 2026. Rent is paid in advance; the mortgage is paid in arrears. Those days are covered by both the rent and the prepaid interest.",
    );
    const laterRent = movingInCopy({
      startMonth: START,
      closingDay: 1,
      prepaidDays: 31,
      prepaidCents: 0,
      basis: "365",
      principalAndInterestCents: 0,
      taxCents: lines.taxCents,
      insuranceCents: 0,
      pmiCents: 0,
      graceDays: 15,
      lateChargeHundredths: 500,
      signingDate: "",
      lastRent: "2026-11-01",
    });
    expect(laterRent.prepaid).toContain("365-day basis");
    expect(laterRent.lastRent).toBe(
      "Last rent November 1, 2026. Rent is paid in advance; the mortgage is paid in arrears.",
    );
    expect(laterRent.firstPayment).toContain("Property tax is on top of that amount.");

    const loanParsed = parseLoan({ price: "600000", down: "5", years: "30", rate: "7.375", start: START });
    if (!loanParsed.ok) throw new Error("loan");
    const stored = pictureFromStorage(
      { lenderFees: "3000", tax: "1.15", insurance: "0.35", pmi: "0.35", title: "0.75" },
      loanParsed.loan.loanCents,
      START,
      "5",
      "780",
      loanParsed.loan.priceCents,
    );
    expect(stored.graceDays).toBe("15");
    expect(stored.lateChargePercent).toBe("5");
    expect(stored.signingDate).toBe("");
    expect(stored.lastRent).toBe("");
    expect(stored.movingOpen).toBe(false);
    expect(pictureFromStorage({ graceDays: "32", lateChargePercent: "nope", signingDate: "2026-02-31" }, loanParsed.loan.loanCents, START).graceDays).toBe("15");
    const withDefaults = linesFor({ picture: stored });
    expect(withDefaults.closingCents).toBe(lines.closingCents);
    expect(withDefaults.principalAndInterestCents).toBe(lines.principalAndInterestCents);
    expect(formatMoney(withDefaults.principalAndInterestCents)).toBe("$3,936.85");
  });
});
