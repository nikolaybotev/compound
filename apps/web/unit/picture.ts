import { describe, expect, test } from "vitest";
import { buildReport } from "../../../amortize.js";
import { downPaymentCents, parseLoan } from "../src/loan";
import {
  buildPicture,
  conventionalPmi,
  defaultPicture,
  parsePicture,
  percentOfCents,
  type PictureLines,
} from "../src/picture";

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
  const picture = parsePicture(draft.picture ?? defaultPicture());
  if (!picture.ok) throw new Error("picture must parse");
  return buildPicture(parsed.loan, rate, down, picture.values);
}

describe("default Conventional picture", () => {
  test("AC1 cents match the sheet and buildReport", () => {
    const lines = linesFor({});
    const payment = buildReport(570000, 7.375, 360, new Map()).monthly_payment_cents;
    expect(lines.baseCents).toBe(57_000_000);
    expect(lines.financedCents).toBe(57_000_000);
    expect(lines.principalAndInterestCents).toBe(393_685);
    expect(lines.principalAndInterestCents).toBe(payment);
    expect(lines.taxCents).toBe(57_500);
    expect(lines.insuranceCents).toBe(17_500);
    expect(lines.fhaMipCents).toBe(0);
    expect(lines.fhaMipRateText).toBe("0%");
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

  test("upfront MIP 1.75% finances 997500 cents on the default base", () => {
    const picture = defaultPicture();
    picture.upfrontMip = "1.75";
    const lines = linesFor({ picture });
    expect(lines.baseCents).toBe(57_000_000);
    expect(lines.upfrontMipCents).toBe(997_500);
    expect(lines.financedCents).toBe(57_997_500);
    expect(lines.principalAndInterestCents).toBe(
      buildReport(579975, 7.375, 360, new Map()).monthly_payment_cents,
    );
  });
});

describe("PMI brackets", () => {
  test("AC2 thousandths cuts and rate text have no bracket sentence", () => {
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

describe("picture inputs", () => {
  test("an empty field is invalid and does not use the extra-payment empty rule", () => {
    const picture = defaultPicture();
    picture.processing = "";
    const parsed = parsePicture(picture);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.field).toBe("processing");
    expect(parsed.message).toContain("Lender processing fee");
  });
});
