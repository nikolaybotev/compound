import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import {
  ARM_FIELD_LABELS,
  armLabel,
  currentIndexFieldInvalid,
  dropIndexBeyond,
  formatPercentThousandths,
  formatTeaserHint,
  parseArm,
  resetMonths,
  retainedCurrentIndexThousandths,
  teaserGapFromRetained,
  type ArmDraft,
  type ArmField,
} from "./arm";
import { Chart, type ChartBar } from "./chart";
import { Disclosure } from "./disclosure";
import { KNOWLEDGE_ENTRIES, KNOWLEDGE_SHEET_QUERY, type KnowledgeEntry, type KnowledgeFrame } from "./knowledge";
import { KnowledgePanel } from "./knowledge-panel";
import { MonthPicker } from "./month-picker";
import { KnowledgeOpen, TermButton } from "./term";
import { ScenarioBar } from "./scenarios";
import {
  MONTH_NAMES,
  THOUSANDS_MESSAGE,
  anyExtraEdited,
  bands,
  buildPrefillMap,
  defaultScenario,
  indexCommitChanges,
  levelArmExtras,
  dollarsToThousandsText,
  dropExtrasBeyond,
  extraInputValue,
  firstPaymentYear,
  formatAdjustmentChange,
  formatMoney,
  groupByYear,
  isTrailingDotThousands,
  loadStored,
  loanReport,
  loanStartMonthNumber,
  longDate,
  monthsSavedText,
  parseDollarField,
  parseIndexField,
  parseLoan,
  parseStoredSet,
  paymentDate,
  saveStored,
  scenarioFigures,
  scenarioLabelText,
  serializeStoredSet,
  type StoredSet,
  shortDate,
  thousandsToDollarString,
  withIndex,
  type Loan,
  type LoanDraft,
  type Prefill,
  type Scenario,
  recastFixed,
  centsToDollars,
  formatPayoffDate,
  formatDueOnFirst,
  armTimelineLines,
  movingInCopy,
  PAYOFF_DATE_FOOTNOTE,
} from "./loan";
import {
  FICO_RANGES,
  TITLE_PRESET_RATES,
  buildPicture,
  centsToProrationField,
  clampClosingDay,
  closingInterestDays,
  closingMonthParts,
  defaultProrationCents,
  ficoBand,
  ficoRangeScore,
  filingStatusOrDefault,
  movingFieldOrDefault,
  optionalDollarOrDefault,
  parseClosingDay,
  parseFicoScore,
  parseGraceDays,
  parseLateChargePercent,
  parseOptionalDollars,
  parsePicture,
  parseWholeCount,
  percentThousandths,
  pmiDraftForLoan,
  sellerCreditWarning,
  titlePercentHundredThousandths,
  type FilingStatus,
  type PictureDraft,
  type PictureInputField,
  type PictureValues,
} from "./picture";
import {
  buildTaxTable,
  FILING_STATUS_OPTIONS,
  insuranceNotDeductibleLine,
  TAX_ACQUISITION,
  TAX_BOX5,
  TAX_DOLLAR_LABELS,
  TAX_FIELD_NOTE,
  TAX_MI_SERVICER,
  TAX_MI_UNVERIFIED,
  TAX_NOT_ADVICE,
  TAX_OVERALL_LIMIT,
  TAX_POINTS_NOTE,
  TAX_PROPERTY_NOTE,
  TAX_SALT_CAP,
  TAX_SALT_LESSER,
  TAX_STATE,
  taxDollarMessage,
  type TaxDollarField,
  type TaxTable,
} from "./tax";
import { PrevailingBar } from "./prevailing-bar";
import { Schedule } from "./schedule";
import { dollarsToCents, formatGroupedCents } from "../../../amortize.js";

const MONTHLY_AMOUNT = "Additional amount to monthly payment";
const YEARLY_AMOUNT = "Additional yearly payment";
const PROPERTY_TAX_NOTE = "Nashua: 1.683%; Brentwood: 1.32%.";

function readInitial(): {
  stored: StoredSet;
  scenario: Scenario;
  loan: Loan;
  pictureValues: PictureValues;
} {
  const stored = loadStored(typeof localStorage === "undefined" ? undefined : localStorage);
  const scenario = stored.scenarios[stored.active];
  const parsed = parseLoan(scenario.draft);
  if (!parsed.ok) throw new Error(parsed.message);
  const picture = parsePicture(scenario.picture, scenario.draft.start);
  if (!picture.ok) throw new Error(picture.message);
  return { stored, scenario, loan: parsed.loan, pictureValues: picture.values };
}

export function App() {
  const [initial] = useState(() => readInitial());
  const [loanSet, setLoanSet] = useState(initial.stored);
  const [saveError, setSaveError] = useState(false);
  const [importError, setImportError] = useState(false);
  const [dialogReset, setDialogReset] = useState(0);
  const [startPickerClose, setStartPickerClose] = useState(0);
  const [draft, setDraft] = useState(initial.scenario.draft);
  const [validText, setValidText] = useState({
    down: initial.scenario.draft.down,
    rate: initial.scenario.draft.rate,
    fico: initial.scenario.draft.fico,
  });
  const [loan, setLoan] = useState(initial.loan);
  const [priceText, setPriceText] = useState(() => dollarsToThousandsText(initial.scenario.draft.price));
  const [extras, setExtras] = useState(initial.scenario.extras);
  const [applied, setApplied] = useState(initial.scenario.applied);
  const [prefill, setPrefill] = useState(initial.scenario.prefill);
  const [pictureDraft, setPictureDraft] = useState(initial.scenario.picture);
  const [pictureSaved, setPictureSaved] = useState(initial.scenario.picture);
  const [pictureValues, setPictureValues] = useState(initial.pictureValues);
  const [prorationStored, setProrationStored] = useState(initial.scenario.prorationStored);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [pictureInvalid, setPictureInvalid] = useState<PictureInputField | null>(null);
  const [movingError, setMovingError] = useState<string | null>(null);
  const [movingInvalid, setMovingInvalid] = useState<
    "graceDays" | "lateChargePercent" | "signingDate" | "lastRent" | null
  >(null);
  const [taxError, setTaxError] = useState<string | null>(null);
  const [taxInvalid, setTaxInvalid] = useState<TaxDollarField | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [openYears, setOpenYears] = useState<Set<number>>(() =>
    initial.scenario.openYears
      ? new Set(initial.scenario.openYears)
      : new Set([firstPaymentYear(initial.loan)]),
  );
  const [armDraft, setArmDraft] = useState(initial.scenario.arm);
  const [armSaved, setArmSaved] = useState(initial.scenario.arm);
  const [evenYearlyCents, setEvenYearlyCents] = useState(() => {
    const parsed = parseDollarField(initial.scenario.arm.evenYearly);
    return parsed.ok ? dollarsToCents(parsed.dollars) : 0;
  });
  const [evenYearlyError, setEvenYearlyError] = useState(false);
  const [currentIndexValidThousandths, setCurrentIndexValidThousandths] = useState(() =>
    retainedCurrentIndexThousandths(initial.scenario.arm.currentIndex),
  );
  const [currentIndexError, setCurrentIndexError] = useState(() =>
    currentIndexFieldInvalid(initial.scenario.arm.currentIndex),
  );
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingIndexMonth, setEditingIndexMonth] = useState<number | null>(null);
  const [editingIndexValue, setEditingIndexValue] = useState("");
  const [recastOpen, setRecastOpen] = useState(false);
  const [recastMonth, setRecastMonth] = useState(initial.scenario.recastMonth);
  const [recastError, setRecastError] = useState<string | null>(null);
  const [recastInvalid, setRecastInvalid] = useState(false);
  const [knowledgeStack, setKnowledgeStack] = useState<KnowledgeFrame[] | null>(null);
  const knowledgeOpener = useRef<HTMLElement | null>(null);
  const [knowledgeSheet, setKnowledgeSheet] = useState(
    () => typeof window !== "undefined" && window.matchMedia(KNOWLEDGE_SHEET_QUERY).matches,
  );
  const snapshot = useRef<Scenario>({
    draft: initial.scenario.draft,
    extras: initial.scenario.extras,
    applied: initial.scenario.applied,
    prefill: initial.scenario.prefill,
    openYears: initial.scenario.openYears ?? [firstPaymentYear(initial.loan)],
    picture: initial.scenario.picture,
    arm: initial.scenario.arm,
    armStored: initial.scenario.armStored,
    prorationStored: initial.scenario.prorationStored,
    recastMonth: initial.scenario.recastMonth,
  });

  useEffect(() => {
    const media = window.matchMedia(KNOWLEDGE_SHEET_QUERY);
    const apply = () => setKnowledgeSheet(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const openKnowledge = useCallback((id: string, anchor?: string) => {
    knowledgeOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setKnowledgeStack(id === "readme" ? [{ id: "readme" }] : [{ id: "readme" }, { id, anchor }]);
  }, []);

  const pushKnowledge = useCallback((id: string, anchor?: string) => {
    setKnowledgeStack((current) => {
      if (!current || current.length === 0) return [{ id, anchor }];
      const top = current[current.length - 1];
      if (top && top.id === id) {
        const next = current.slice();
        next[next.length - 1] = { id, anchor };
        return next;
      }
      return [...current, { id, anchor }];
    });
  }, []);

  const backKnowledge = useCallback(() => {
    setKnowledgeStack((current) => {
      if (!current || current.length <= 1) return current;
      return current.slice(0, -1);
    });
  }, []);

  const closeKnowledge = useCallback(() => {
    setKnowledgeStack(null);
    const opener = knowledgeOpener.current;
    knowledgeOpener.current = null;
    requestAnimationFrame(() => opener?.focus());
  }, []);

  function reseedFromScenario(scenario: Scenario) {
    const parsed = parseLoan(scenario.draft);
    if (!parsed.ok) throw new Error(parsed.message);
    const picture = parsePicture(scenario.picture, scenario.draft.start);
    if (!picture.ok) throw new Error(picture.message);
    setDraft(scenario.draft);
    setValidText({ down: scenario.draft.down, rate: scenario.draft.rate, fico: scenario.draft.fico });
    setLoan(parsed.loan);
    setPriceText(dollarsToThousandsText(scenario.draft.price));
    setExtras(scenario.extras);
    setApplied(scenario.applied);
    setPrefill(scenario.prefill);
    setPictureDraft(scenario.picture);
    setPictureSaved(scenario.picture);
    setPictureValues(picture.values);
    setProrationStored(scenario.prorationStored);
    setOpenYears(
      scenario.openYears
        ? new Set(scenario.openYears)
        : new Set([firstPaymentYear(parsed.loan)]),
    );
    setArmDraft(scenario.arm);
    setArmSaved(scenario.arm);
    const yearlyParsed = parseDollarField(scenario.arm.evenYearly);
    setEvenYearlyCents(yearlyParsed.ok ? dollarsToCents(yearlyParsed.dollars) : 0);
    setEvenYearlyError(false);
    setCurrentIndexValidThousandths(retainedCurrentIndexThousandths(scenario.arm.currentIndex));
    setCurrentIndexError(currentIndexFieldInvalid(scenario.arm.currentIndex));
    setError(null);
    setInvalidField(null);
    setPictureError(null);
    setPictureInvalid(null);
    setMovingError(null);
    setMovingInvalid(null);
    setTaxError(null);
    setTaxInvalid(null);
    setApplyError(null);
    setEditingMonth(null);
    setEditingIndexMonth(null);
    setRecastMonth(scenario.recastMonth);
    setRecastError(null);
    setRecastInvalid(false);
    snapshot.current = {
      draft: scenario.draft,
      extras: scenario.extras,
      applied: scenario.applied,
      prefill: scenario.prefill,
      openYears: scenario.openYears ?? [firstPaymentYear(parsed.loan)],
      picture: scenario.picture,
      arm: scenario.arm,
      armStored: scenario.armStored,
      prorationStored: scenario.prorationStored,
      recastMonth: scenario.recastMonth,
    };
  }

  function commitStoredSet(nextSet: StoredSet, reseed: boolean): boolean {
    const previous = loanSet;
    if (!saveStored(localStorage, nextSet)) {
      setSaveError(true);
      reseedFromScenario(previous.scenarios[previous.active]);
      setLoanSet(previous);
      return false;
    }
    setSaveError(false);
    setLoanSet(nextSet);
    if (reseed) {
      reseedFromScenario(nextSet.scenarios[nextSet.active]);
      setStartPickerClose((value) => value + 1);
      setDialogReset((value) => value + 1);
    }
    return true;
  }

  function persist(patch: Partial<Scenario>) {
    const next: Scenario = {
      draft: patch.draft ?? snapshot.current.draft,
      extras: patch.extras ?? snapshot.current.extras,
      applied: patch.applied ?? snapshot.current.applied,
      prefill: patch.prefill ?? snapshot.current.prefill,
      openYears: patch.openYears === undefined ? snapshot.current.openYears : patch.openYears,
      picture: patch.picture ?? snapshot.current.picture,
      prorationStored: patch.prorationStored ?? snapshot.current.prorationStored,
      arm: patch.arm ?? snapshot.current.arm,
      armStored: patch.armStored ?? snapshot.current.armStored,
      recastMonth: patch.recastMonth ?? snapshot.current.recastMonth,
    };
    snapshot.current = next;
    const scenarios = [...loanSet.scenarios];
    scenarios[loanSet.active] = next;
    const updated: StoredSet = { active: loanSet.active, scenarios };
    if (saveStored(localStorage, updated)) {
      setSaveError(false);
      setLoanSet(updated);
    } else {
      setSaveError(true);
    }
  }

  const scenarioRows = useMemo(
    () =>
      loanSet.scenarios.map((scenario) => {
        const figures = scenarioFigures(scenario);
        return {
          label: figures ? scenarioLabelText(scenario, figures) : "",
          figures,
        };
      }),
    [loanSet],
  );
  const scenarioLabels = useMemo(() => scenarioRows.map((row) => row.label), [scenarioRows]);

  function selectScenario(index: number) {
    if (index === loanSet.active) return;
    const nextSet: StoredSet = { active: index, scenarios: loanSet.scenarios };
    commitStoredSet(nextSet, true);
  }

  function addScenario() {
    const fresh = defaultScenario(new Date());
    const scenarios = [...loanSet.scenarios, fresh];
    const nextSet: StoredSet = { active: scenarios.length - 1, scenarios };
    commitStoredSet(nextSet, true);
  }

  function removeScenario(index: number) {
    if (loanSet.scenarios.length <= 1) return;
    const scenarios = loanSet.scenarios.filter((_, row) => row !== index);
    let active = loanSet.active;
    const removedActive = index === loanSet.active;
    if (index < active) active -= 1;
    else if (removedActive) active = Math.min(active, scenarios.length - 1);
    const nextSet: StoredSet = { active, scenarios };
    commitStoredSet(nextSet, removedActive);
  }

  function exportScenarios() {
    const blob = new Blob([serializeStoredSet(loanSet)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "compound-loan-scenarios.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importScenarios(file: File) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportError(true);
      return;
    }
    const parsed = parseStoredSet(text);
    if (!parsed.ok) {
      setImportError(true);
      return;
    }
    setImportError(false);
    if (!commitStoredSet(parsed.set, true)) return;
  }

  const lines = useMemo(
    () => buildPicture(loan, validText.rate, validText.down, draft.start, pictureValues),
    [loan, validText, draft.start, pictureValues],
  );
  const closingMonthLabel = useMemo(() => {
    const { year, month } = closingMonthParts(draft.start);
    return longDate(year, month);
  }, [draft.start]);
  const closingDayCount = useMemo(
    () => closingInterestDays(draft.start, pictureValues.closingDay),
    [draft.start, pictureValues.closingDay],
  );
  const closingDayCountText =
    closingDayCount === 1 ? "1 day" : `${closingDayCount} days`;
  const moving = useMemo(
    () =>
      movingInCopy({
        startMonth: draft.start,
        closingDay: pictureValues.closingDay,
        prepaidDays: lines.prepaidInterestDays,
        prepaidCents: lines.prepaidInterestCents,
        basis: pictureValues.interestBasis,
        principalAndInterestCents: lines.principalAndInterestCents,
        taxCents: lines.taxCents,
        insuranceCents: lines.insuranceCents,
        pmiCents: lines.pmiCents,
        graceDays: parseGraceDays(pictureSaved.graceDays) ?? 15,
        lateChargeHundredths: parseLateChargePercent(pictureSaved.lateChargePercent) ?? 500,
        signingDate: pictureSaved.signingDate,
        lastRent: pictureSaved.lastRent,
      }),
    [draft.start, pictureValues, lines, pictureSaved],
  );
  const titlePresetValue = useMemo(() => {
    const units = titlePercentHundredThousandths(pictureDraft.title);
    if (units === null) return "";
    const match = TITLE_PRESET_RATES.find((preset) => preset.units === units);
    return match?.label ?? "";
  }, [pictureDraft.title]);
  const sellerCreditNote = useMemo(() => {
    const downTh = percentThousandths(validText.down.trim());
    if (downTh === null) return null;
    return sellerCreditWarning(downTh, pictureValues.sellerCreditCents, loan.priceCents);
  }, [validText.down, pictureValues.sellerCreditCents, loan.priceCents]);
  const activeFigures = useMemo(
    () => scenarioFigures(loanSet.scenarios[loanSet.active]),
    [loanSet],
  );
  const rateThousandths = Math.round(loan.ratePercent * 1000);
  const armParsed = useMemo(
    () => parseArm(armSaved, loan.monthCount, rateThousandths),
    [armSaved, loan.monthCount, rateThousandths],
  );
  const armOn = armSaved.enabled && armParsed.ok;
  const teaserShown = useMemo(() => {
    if (!armSaved.enabled || !armParsed.ok) return null;
    return teaserGapFromRetained(
      currentIndexValidThousandths,
      armParsed.values.marginThousandths,
      rateThousandths,
    );
  }, [armSaved.enabled, armParsed, currentIndexValidThousandths, rateThousandths]);
  const reportLoan = useMemo<Loan>(
    () =>
      armSaved.enabled && armParsed.ok
        ? { ...loan, arm: { enabled: true, values: armParsed.values, index: armSaved.index } }
        : loan,
    [loan, armSaved, armParsed],
  );
  const scheduleAdjustmentStats = useMemo(() => {
    if (!armOn) return undefined;
    if (evenYearlyCents <= 0) return {};
    return {
      yearlyExtraCents: evenYearlyCents,
      yearlyMonth: armSaved.evenMonth,
      startMonth: loanStartMonthNumber(loan.startMonth),
    };
  }, [armOn, evenYearlyCents, armSaved.evenMonth, loan.startMonth]);
  const report = useMemo(
    () => loanReport(reportLoan, extras, lines.financedCents, scheduleAdjustmentStats),
    [reportLoan, extras, lines.financedCents, scheduleAdjustmentStats],
  );
  const recastDisplay = useMemo(() => {
    if (armOn) return null;
    const trimmed = recastMonth.trim();
    if (trimmed === "") return null;
    if (!/^[1-9]\d*$/.test(trimmed)) return null;
    const month = Number(trimmed);
    if (month < 1 || month >= loan.monthCount) return null;
    try {
      const result = recastFixed(
        centsToDollars(lines.financedCents),
        loan.ratePercent,
        loan.monthCount,
        applied,
        month,
      );
      return result;
    } catch {
      return null;
    }
  }, [armOn, recastMonth, loan, lines.financedCents, applied]);
  const recastPaidOff = useMemo(() => {
    if (armOn) return false;
    const trimmed = recastMonth.trim();
    if (trimmed === "" || !/^[1-9]\d*$/.test(trimmed)) return false;
    const month = Number(trimmed);
    if (month < 1 || month >= loan.monthCount) return false;
    try {
      recastFixed(
        centsToDollars(lines.financedCents),
        loan.ratePercent,
        loan.monthCount,
        applied,
        month,
      );
      return false;
    } catch (error) {
      return error instanceof Error && error.message === "loan is already paid off at the recast month";
    }
  }, [armOn, recastMonth, loan, lines.financedCents, applied]);
  const taxTable = useMemo(() => {
    const agi = parseOptionalDollars(pictureSaved.agi);
    const magi = parseOptionalDollars(pictureSaved.magi);
    const otherSalt = parseOptionalDollars(pictureSaved.otherSalt);
    const otherItemized = parseOptionalDollars(pictureSaved.otherItemized);
    const standardOverride = parseOptionalDollars(pictureSaved.standardOverride);
    const appraisal = parseOptionalDollars(pictureSaved.appraisal);
    const status: FilingStatus = filingStatusOrDefault(pictureSaved.filingStatus, "single");
    return buildTaxTable({
      loan: reportLoan,
      financedCents: lines.financedCents,
      schedule: report,
      appliedExtras: applied,
      priceCents: loan.priceCents,
      prepaidInterestCents: lines.prepaidInterestCents,
      pointsCents: lines.pointsCents,
      pmiMonthlyCents: lines.pmiCents,
      propertyTaxMonthlyCents: lines.taxCents,
      prorationCents: lines.prorationCents,
      insuranceAnnualCents: lines.homeownersInsuranceCents,
      filingStatus: status,
      agiCents: !agi || agi.empty ? null : agi.cents,
      magiCents: !magi || magi.empty ? null : magi.cents,
      otherSaltCents: !otherSalt || otherSalt.empty ? 0 : otherSalt.cents,
      otherItemizedCents: !otherItemized || otherItemized.empty ? 0 : otherItemized.cents,
      standardOverrideCents: !standardOverride || standardOverride.empty ? null : standardOverride.cents,
      appraisalCents: !appraisal || appraisal.empty ? null : appraisal.cents,
    });
  }, [reportLoan, lines, report, applied, loan.priceCents, pictureSaved]);
  const years = useMemo(
    () => groupByYear(reportLoan, report, extras, lines.financedCents, applied),
    [reportLoan, report, extras, lines.financedCents, applied],
  );
  const bars: ChartBar[] = report.schedule.slice(0, report.payoff_month).map((row) => {
    const date = paymentDate(loan.startMonth, row.month);
    const split = bands(report, row);
    const requested = extras.get(row.month) ?? 0;
    return {
      month: row.month,
      dateLabel: shortDate(date.year, date.month),
      paymentPrincipal: row.principal_cents,
      paymentInterest: row.interest_cents,
      paymentExtra: requested > 0 ? dollarsToCents(requested) : 0,
      total: report.amount_cents + report.interest_cents,
      ...split,
    };
  });

  function updateRecastMonth(value: string) {
    setRecastMonth(value);
    const trimmed = value.trim();
    if (trimmed === "") {
      setRecastError(null);
      setRecastInvalid(false);
      persist({ recastMonth: "" });
      return;
    }
    if (!/^[1-9]\d*$/.test(trimmed)) {
      setRecastError(
        `Recast month must be a payment number from 1 through ${loan.monthCount - 1}.`,
      );
      setRecastInvalid(true);
      return;
    }
    const month = Number(trimmed);
    if (month < 1 || month >= loan.monthCount) {
      setRecastError(
        `Recast month must be a payment number from 1 through ${loan.monthCount - 1}.`,
      );
      setRecastInvalid(true);
      return;
    }
    try {
      recastFixed(
        centsToDollars(lines.financedCents),
        loan.ratePercent,
        loan.monthCount,
        applied,
        month,
      );
      setRecastError(null);
      setRecastInvalid(false);
      persist({ recastMonth: trimmed });
    } catch (error) {
      if (error instanceof Error && error.message === "loan is already paid off at the recast month") {
        setRecastError("The loan is already paid off.");
        setRecastInvalid(false);
        persist({ recastMonth: trimmed });
        return;
      }
      setRecastError(
        `Recast month must be a payment number from 1 through ${loan.monthCount - 1}.`,
      );
      setRecastInvalid(true);
    }
  }

  function update(field: keyof LoanDraft, value: string) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    const parsed = parseLoan(next);
    if (!parsed.ok) {
      const priceProblem = field === "price" && (parsed.field === "price" || parsed.field === "loan");
      setError(priceProblem ? THOUSANDS_MESSAGE : parsed.message);
      setInvalidField(priceProblem ? "price" : parsed.field);
      return;
    }
    let nextArm = armSaved;
    if (armSaved.enabled) {
      const armResult = parseArm(armSaved, parsed.loan.monthCount, Math.round(parsed.loan.ratePercent * 1000));
      if (!armResult.ok) {
        setError(armResult.message);
        setInvalidField(armResult.field);
        return;
      }
      const index = dropIndexBeyond(
        armSaved.index,
        resetMonths(armResult.values.fixedMonths, armResult.values.adjustMonths, parsed.loan.monthCount),
      );
      if (index !== armSaved.index) nextArm = { ...armSaved, index };
    }
    const kept = dropExtrasBeyond(extras, parsed.loan.monthCount);
    const keptApplied = dropExtrasBeyond(applied, parsed.loan.monthCount);
    setValidText({ down: next.down, rate: next.rate, fico: validText.fico });
    setLoan(parsed.loan);
    setExtras(kept);
    setApplied(keptApplied);
    if (nextArm !== armSaved) {
      setArmSaved(nextArm);
      setArmDraft({ ...armDraft, index: nextArm.index });
    }
    setError(null);
    setInvalidField(null);
    let pictureNext: typeof pictureDraft | undefined;
    if (field === "down") {
      pictureNext = pmiDraftForLoan(pictureDraft, next.down, validText.fico);
    } else if (field === "start") {
      const day = parseClosingDay(pictureDraft.closingDay) ?? 1;
      pictureNext = { ...pictureDraft, closingDay: String(clampClosingDay(day, next.start)) };
    }
    if (!prorationStored && (field === "price" || field === "down" || field === "start")) {
      const taxTh = percentThousandths(pictureDraft.tax.trim());
      if (taxTh !== null) {
        const base = pictureNext ?? pictureDraft;
        pictureNext = {
          ...base,
          proration: centsToProrationField(defaultProrationCents(parsed.loan.priceCents, taxTh)),
        };
      }
    }
    let pictureToStore: PictureDraft | undefined;
    if (pictureNext) {
      pictureToStore = withDisclosureFlags(pictureNext);
      const pictureParsed = parsePicture(pictureNext, next.start);
      if (pictureParsed.ok) {
        setPictureDraft(pictureNext);
        setPictureSaved(pictureToStore);
        setPictureValues(pictureParsed.values);
      }
    }
    persist(
      nextArm === armSaved
        ? {
            draft: next,
            extras: kept,
            applied: keptApplied,
            ...(pictureToStore ? { picture: pictureToStore } : {}),
          }
        : {
            draft: next,
            extras: kept,
            applied: keptApplied,
            arm: nextArm,
            ...(pictureToStore ? { picture: pictureToStore } : {}),
          },
    );
  }

  function chooseFicoBand(score: number) {
    const previousScore = parseFicoScore(validText.fico) ?? 780;
    const next = { ...draft, fico: String(score) };
    setDraft(next);
    setValidText((current) => ({ ...current, fico: String(score) }));
    setError(null);
    setInvalidField(null);
    let pictureNext: typeof pictureDraft | undefined;
    if (ficoBand(score) !== ficoBand(previousScore)) {
      pictureNext = pmiDraftForLoan(pictureDraft, validText.down, String(score));
      const pictureParsed = parsePicture(pictureNext, draft.start);
      if (pictureParsed.ok) {
        const saved = withDisclosureFlags(pictureNext);
        setPictureDraft(pictureNext);
        setPictureSaved(saved);
        setPictureValues(pictureParsed.values);
        persist({ draft: next, picture: saved });
        return;
      }
    }
    persist({ draft: next });
  }

  function commitArm(next: ArmDraft) {
    setArmSaved(next);
    setArmDraft(next);
    persist({ arm: next, armStored: true });
  }

  function chooseProduct(select: HTMLSelectElement) {
    if (select.value === "fixed") {
      if (armFieldInvalid(invalidField)) {
        setError(null);
        setInvalidField(null);
      }
      commitArm({ ...armSaved, enabled: false });
      return;
    }
    const candidate: ArmDraft = {
      ...armSaved,
      enabled: true,
      open: snapshot.current.armStored ? armSaved.open : true,
    };
    const result = parseArm(candidate, loan.monthCount, rateThousandths);
    if (!result.ok) {
      select.value = "fixed";
      setError(result.message);
      setInvalidField(result.field);
      return;
    }
    const index = dropIndexBeyond(
      candidate.index,
      resetMonths(result.values.fixedMonths, result.values.adjustMonths, loan.monthCount),
    );
    setError(null);
    setInvalidField(null);
    commitArm({ ...candidate, index });
  }

  function updateArm(field: ArmField, value: string) {
    const next = { ...armDraft, [field]: value };
    setArmDraft(next);
    const parsed = parseArm(next, loan.monthCount, rateThousandths);
    if (!parsed.ok) {
      setError(parsed.message);
      setInvalidField(parsed.field);
      return;
    }
    const index = dropIndexBeyond(
      armSaved.index,
      resetMonths(parsed.values.fixedMonths, parsed.values.adjustMonths, loan.monthCount),
    );
    if (armFieldInvalid(invalidField)) {
      setError(null);
      setInvalidField(null);
    }
    commitArm({ ...next, enabled: true, open: armSaved.open, index });
  }

  function commitIndex(month: number) {
    if (editingIndexMonth !== month) return;
    const parsed = parseIndexField(editingIndexValue);
    setEditingIndexMonth(null);
    if (!parsed.ok) return;
    if (!indexCommitChanges(armSaved.index, month, parsed.percent)) return;
    const index = withIndex(armSaved.index, month, parsed.percent);
    const next = { ...armSaved, index };
    setArmSaved(next);
    setArmDraft({ ...armDraft, index });
    const loanWithIndex: Loan =
      armParsed.ok
        ? { ...loan, arm: { enabled: true, values: armParsed.values, index } }
        : loan;
    let nextExtras = extras;
    let nextApplied = applied;
    if (
      prefill.appliedLevel &&
      !anyExtraEdited(extras, applied) &&
      armParsed.ok &&
      loanWithIndex.arm
    ) {
      const kept = new Map<number, number>();
      for (const [entryMonth, amount] of extras) {
        if (entryMonth < month) kept.set(entryMonth, amount);
      }
      const monthly = parseDollarField(prefill.appliedMonthly ?? "");
      const yearly = parseDollarField(prefill.appliedYearly ?? "");
      if (monthly.ok && yearly.ok) {
        const levelMap = levelArmExtras(
          loanWithIndex,
          lines.financedCents,
          monthly.dollars,
          yearly.dollars,
          prefill.appliedMonth ?? prefill.month,
          month,
          kept,
        );
        nextExtras = levelMap;
        nextApplied = levelMap;
      }
    }
    setExtras(nextExtras);
    setApplied(nextApplied);
    persist({
      arm: next,
      armStored: true,
      extras: nextExtras,
      applied: nextApplied,
    });
  }

  function setRoundEighth(roundEighth: boolean) {
    commitArm({ ...armSaved, roundEighth });
  }

  function setArmOpen(open: boolean) {
    commitArm({ ...armSaved, open });
  }

  function persistEvenArm(nextArm: ArmDraft) {
    setArmSaved(nextArm);
    setArmDraft(nextArm);
    persist({ arm: nextArm, armStored: true });
  }

  function updateEvenYearly(value: string) {
    const nextArm = { ...armSaved, evenYearly: value };
    setArmDraft({ ...armDraft, evenYearly: value });
    setArmSaved(nextArm);
    persist({ arm: nextArm, armStored: true });
    if (value.trim() === "") {
      setEvenYearlyError(false);
      setEvenYearlyCents(0);
      return;
    }
    const parsed = parseDollarField(value);
    if (!parsed.ok) {
      setEvenYearlyError(true);
      return;
    }
    setEvenYearlyError(false);
    setEvenYearlyCents(dollarsToCents(parsed.dollars));
  }

  function updateEvenMonth(month: number) {
    persistEvenArm({ ...armSaved, evenMonth: month });
  }

  function updateCurrentIndex(value: string) {
    const nextArm = { ...armSaved, currentIndex: value };
    setArmDraft({ ...armDraft, currentIndex: value });
    setArmSaved(nextArm);
    persist({ arm: nextArm, armStored: true });
    const trimmed = value.trim();
    if (trimmed === "") {
      setCurrentIndexValidThousandths(null);
      setCurrentIndexError(false);
      return;
    }
    const thousandths = retainedCurrentIndexThousandths(value);
    if (thousandths === null) {
      setCurrentIndexError(true);
      return;
    }
    setCurrentIndexError(false);
    setCurrentIndexValidThousandths(thousandths);
  }

  function onPriceInput(value: string) {
    setPriceText(value);
    const trimmed = value.trim();
    if (isTrailingDotThousands(trimmed)) {
      if (invalidField === "price") {
        setError(null);
        setInvalidField(null);
      }
      return;
    }
    const dollars = thousandsToDollarString(trimmed);
    if (dollars === null) {
      setError(THOUSANDS_MESSAGE);
      setInvalidField("price");
      return;
    }
    update("price", dollars);
  }

  function onPriceBlur() {
    setPriceText(dollarsToThousandsText(draft.price));
    if (invalidField === "price") {
      setError(null);
      setInvalidField(null);
    }
  }

  function rememberYears(next: Set<number>) {
    persist({ openYears: [...next] });
    return next;
  }

  function toggleYear(year: number) {
    setOpenYears((current) => {
      const next = new Set(current);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return rememberYears(next);
    });
  }

  function toggleAll() {
    setOpenYears((current) => {
      const every = years.every((year) => current.has(year.year));
      const next = every ? new Set<number>() : new Set(years.map((year) => year.year));
      return rememberYears(next);
    });
  }

  function changePrefill(patch: Partial<Prefill>) {
    const next = { ...prefill, ...patch };
    setPrefill(next);
    persist({ prefill: next });
  }

  function updatePicture(field: PictureInputField, value: string) {
    let next = { ...pictureDraft, [field]: value };
    if (field === "closingDay") {
      const parsedDay = parseClosingDay(value);
      if (parsedDay !== null) {
        next = { ...next, closingDay: String(clampClosingDay(parsedDay, draft.start)) };
      }
    }
    if (field === "tax" && !prorationStored) {
      const taxTh = percentThousandths(value.trim());
      if (taxTh !== null) {
        next = {
          ...next,
          proration: centsToProrationField(defaultProrationCents(loan.priceCents, taxTh)),
        };
      }
    }
    setPictureDraft(next);
    const parsed = parsePicture(next, draft.start);
    if (!parsed.ok) {
      setPictureError(parsed.message);
      setPictureInvalid(parsed.field);
      return;
    }
    const saved = withDisclosureFlags(next);
    setPictureValues(parsed.values);
    setPictureSaved(saved);
    setPictureError(null);
    setPictureInvalid(null);
    const patch: Partial<Scenario> = { picture: saved };
    if (field === "proration") {
      setProrationStored(true);
      patch.prorationStored = true;
    }
    persist(patch);
  }

  function updateTitlePreset(label: string) {
    const preset = TITLE_PRESET_RATES.find((entry) => entry.label === label);
    if (!preset) return;
    const text = preset.units === 100_000 ? "1" : preset.units === 75_000 ? "0.75" : "0.40";
    updatePicture("title", text);
  }

  function updatePictureBasis(value: string) {
    const next = { ...pictureDraft, interestBasis: value };
    setPictureDraft(next);
    const parsed = parsePicture(next, draft.start);
    if (!parsed.ok) return;
    const saved = withDisclosureFlags(next);
    setPictureValues(parsed.values);
    setPictureSaved(saved);
    persist({ picture: saved });
  }

  function withDisclosureFlags(picture: PictureDraft): PictureDraft {
    return {
      ...picture,
      graceDays: movingFieldOrDefault("graceDays", picture.graceDays, pictureSaved.graceDays),
      lateChargePercent: movingFieldOrDefault(
        "lateChargePercent",
        picture.lateChargePercent,
        pictureSaved.lateChargePercent,
      ),
      signingDate: movingFieldOrDefault("signingDate", picture.signingDate, pictureSaved.signingDate),
      lastRent: movingFieldOrDefault("lastRent", picture.lastRent, pictureSaved.lastRent),
      filingStatus: filingStatusOrDefault(picture.filingStatus, pictureSaved.filingStatus),
      agi: optionalDollarOrDefault(picture.agi, pictureSaved.agi),
      magi: optionalDollarOrDefault(picture.magi, pictureSaved.magi),
      otherSalt: optionalDollarOrDefault(picture.otherSalt, pictureSaved.otherSalt),
      otherItemized: optionalDollarOrDefault(picture.otherItemized, pictureSaved.otherItemized),
      standardOverride: optionalDollarOrDefault(picture.standardOverride, pictureSaved.standardOverride),
      appraisal: optionalDollarOrDefault(picture.appraisal, pictureSaved.appraisal),
    };
  }

  function setTaxesOpen(open: boolean) {
    const saved = withDisclosureFlags({ ...pictureSaved, open });
    setPictureSaved(saved);
    setPictureDraft({ ...pictureDraft, open });
    persist({ picture: saved });
  }

  function setClosingOpen(open: boolean) {
    const saved = withDisclosureFlags({ ...pictureSaved, closingOpen: open });
    setPictureSaved(saved);
    setPictureDraft({ ...pictureDraft, closingOpen: open });
    persist({ picture: saved });
  }

  function setMovingOpen(open: boolean) {
    const saved = withDisclosureFlags({ ...pictureSaved, movingOpen: open });
    setPictureSaved(saved);
    setPictureDraft({ ...pictureDraft, movingOpen: open });
    persist({ picture: saved });
  }

  function setTaxOpen(open: boolean) {
    const saved = withDisclosureFlags({ ...pictureSaved, taxOpen: open });
    setPictureSaved(saved);
    setPictureDraft({ ...pictureDraft, taxOpen: open });
    persist({ picture: saved });
  }

  function commitFilingStatus(value: string) {
    const kept = filingStatusOrDefault(value, pictureSaved.filingStatus);
    const saved = withDisclosureFlags({ ...pictureSaved, filingStatus: kept });
    setPictureSaved(saved);
    setPictureDraft(saved);
    setTaxError(null);
    setTaxInvalid(null);
    persist({ picture: saved });
  }

  function commitTaxDollar(field: TaxDollarField, value: string) {
    const kept = optionalDollarOrDefault(value, pictureSaved[field]);
    if (kept !== value.trim()) {
      setPictureDraft({ ...pictureDraft, [field]: value });
      setTaxError(taxDollarMessage(field));
      setTaxInvalid(field);
      return;
    }
    setPictureDraft({ ...pictureDraft, [field]: kept });
    const saved = withDisclosureFlags({ ...pictureSaved, [field]: kept });
    setPictureSaved(saved);
    setTaxError(null);
    setTaxInvalid(null);
    persist({ picture: saved });
  }

  function commitMovingField(
    field: "graceDays" | "lateChargePercent" | "signingDate" | "lastRent",
    value: string,
    message: string,
  ) {
    const kept = movingFieldOrDefault(field, value, pictureSaved[field]);
    const trimmed = value.trim();
    const valid =
      field === "signingDate" || field === "lastRent" ? trimmed === "" || kept === trimmed : kept === trimmed;
    if (!valid) {
      setPictureDraft({ ...pictureDraft, [field]: value });
      setMovingError(message);
      setMovingInvalid(field);
      return;
    }
    setPictureDraft({ ...pictureDraft, [field]: kept });
    const saved = withDisclosureFlags({ ...pictureSaved, [field]: kept });
    setPictureSaved(saved);
    setMovingError(null);
    setMovingInvalid(null);
    persist({ picture: saved });
  }

  function applyPrefill() {
    const monthly = parseDollarField(prefill.monthly);
    if (!monthly.ok) {
      setApplyError(
        `${MONTHLY_AMOUNT} must be a dollar amount with at most two decimal places, or empty.`,
      );
      return;
    }
    const yearly = parseDollarField(prefill.yearly);
    if (!yearly.ok) {
      setApplyError(
        `${YEARLY_AMOUNT} must be a dollar amount with at most two decimal places, or empty.`,
      );
      return;
    }
    setApplyError(null);
    const monthCount = loan.monthCount;
    const useLevel = armOn && prefill.level === true;
    const next = useLevel
      ? levelArmExtras(
          reportLoan,
          lines.financedCents,
          monthly.dollars,
          yearly.dollars,
          prefill.month,
          1,
          new Map(),
        )
      : buildPrefillMap(
          monthCount,
          loan.startMonth,
          monthly.dollars,
          yearly.dollars,
          prefill.month,
        );
    setExtras(next);
    setApplied(next);
    setEditingMonth(null);
    const nextPrefill = {
      ...prefill,
      appliedMonthly: prefill.monthly,
      appliedYearly: prefill.yearly,
      appliedMonth: prefill.month,
      appliedLevel: useLevel,
    };
    setPrefill(nextPrefill);
    persist({ extras: next, applied: next, prefill: nextPrefill });
  }

  const extraMonthlyEdited = prefill.monthly !== prefill.appliedMonthly;
  const extraYearlyEdited = prefill.yearly !== prefill.appliedYearly;
  const extraMonthEdited = prefill.month !== prefill.appliedMonth;

  function commitExtra(month: number) {
    if (editingMonth !== month) return;
    const parsed = parseDollarField(editingValue);
    setEditingMonth(null);
    if (!parsed.ok) return;
    const next = new Map(extras);
    if (parsed.dollars === 0) next.delete(month);
    else next.set(month, parsed.dollars);
    setExtras(next);
    persist({ extras: next });
  }

  return (
    <KnowledgeOpen.Provider value={openKnowledge}>
    <main class="column" inert={knowledgeStack && knowledgeSheet ? true : undefined}>
      <div class="title-row">
        <h1>
          Compound
          <span class="title-tagline">A mortgage amortization calculator</span>
        </h1>
        <button type="button" class="knowledge-open" onClick={() => openKnowledge("readme")}>
          Knowledge
        </button>
      </div>
      <ScenarioBar
        labels={scenarioLabels}
        figures={scenarioRows.map((row) => row.figures)}
        active={loanSet.active}
        saveError={saveError}
        importError={importError}
        dialogReset={dialogReset}
        onSelect={selectScenario}
        onNew={addScenario}
        onRemove={removeScenario}
        onExport={exportScenarios}
        onImport={importScenarios}
      />
      <p class="heading-line">
        <input
          id="price"
          aria-label="Purchase price (thousands)"
          inputMode="decimal"
          autoComplete="off"
          value={priceText}
          aria-invalid={invalidField === "price"}
          style={{ width: `${Math.max(priceText.length, 1) + 1}ch` }}
          onInput={(event) => onPriceInput(event.currentTarget.value)}
          onBlur={onPriceBlur}
        />
        <span>K | </span>
        <input
          id="down"
          aria-label="Down payment"
          inputMode="decimal"
          autoComplete="off"
          value={draft.down}
          aria-invalid={invalidField === "down" || invalidField === "loan"}
          style={{ width: `${Math.max(draft.down.length, 1) + 1}ch` }}
          onInput={(event) => update("down", event.currentTarget.value)}
        />
        <span>% down | </span>
        <input
          id="rate"
          aria-label="Interest"
          inputMode="decimal"
          autoComplete="off"
          value={draft.rate}
          aria-invalid={invalidField === "rate"}
          style={{ width: `${Math.max(draft.rate.length, 1) + 1}ch` }}
          onInput={(event) => update("rate", event.currentTarget.value)}
        />
        <span>% </span>
        {teaserShown ? (
          <button
            type="button"
            id="teaser"
            class="teaser-hint"
            onClick={() => openKnowledge("arm-rate", "teaser")}
          >
            {`teaser ${formatTeaserHint(teaserShown.gapThousandths, teaserShown.fullyThousandths)}`}
          </button>
        ) : null}
        <input
          id={draft.termUnit === "months" ? "months" : "years"}
          aria-label="Term"
          inputMode="numeric"
          autoComplete="off"
          value={draft.termUnit === "months" ? draft.months : draft.years}
          aria-invalid={
            invalidField === "years" || invalidField === "months" ? true : undefined
          }
          style={{
            width: `${
              Math.max(
                (draft.termUnit === "months" ? draft.months : draft.years).length,
                1,
              ) + 1
            }ch`,
          }}
          onInput={(event) =>
            update(draft.termUnit === "months" ? "months" : "years", event.currentTarget.value)
          }
        />
        <span>-</span>
        <select
          id="term-unit"
          aria-label="Term unit"
          class="term-unit"
          value={draft.termUnit}
          onChange={(event) => {
            const unit = event.currentTarget.value === "months" ? "months" : "years";
            update("termUnit", unit);
          }}
        >
          <option value="years">year</option>
          <option value="months">month</option>
        </select>
        {armOn && armParsed.ok ? (
          <>
            {" "}
            <TermButton entry={KNOWLEDGE_ENTRIES.types.id}>
              <span class="arm-label" data-testid="arm-label">
                {armLabel(armParsed.values.fixedMonths, armParsed.values.adjustMonths)}
              </span>
            </TermButton>
            {" "}
          </>
        ) : (
          <span> </span>
        )}
        <select
          id="product"
          class="product"
          aria-label="Loan product"
          value={armSaved.enabled ? "arm" : "fixed"}
          onChange={(event) => chooseProduct(event.currentTarget)}
        >
          <option value="fixed">fixed</option>
          <option value="arm">ARM</option>
        </select>
        <span> | </span>
        <select
          id="fico"
          aria-label="FICO range"
          value={String(ficoRangeScore(parseFicoScore(validText.fico) ?? 780))}
          onChange={(event) => chooseFicoBand(Number(event.currentTarget.value))}
        >
          {FICO_RANGES.map((range) => (
            <option key={range.score} value={String(range.score)}>
              {range.label}
            </option>
          ))}
        </select>
        <span> | starting </span>
        <MonthPicker
          id="start"
          value={draft.start}
          closeSignal={startPickerClose}
          onChange={(value) => update("start", value)}
        />
      </p>
      {error ? (
        <p class="error" role="alert">
          {error}
        </p>
      ) : null}
      {armOn && armParsed.ok ? (
        <Disclosure className="arm" title="ARM terms" open={armSaved.open} onToggle={setArmOpen}>
          <div class="inputs">
            <div class="field">
              <label for="arm-fixed-unit">Initial period unit</label>
              <select
                id="arm-fixed-unit"
                aria-label="Initial period unit"
                value={armDraft.fixedUnit}
                onChange={(event) => {
                  const fixedUnit = event.currentTarget.value === "months" ? "months" : "years";
                  const next = { ...armDraft, fixedUnit };
                  setArmDraft(next);
                  const parsed = parseArm(next, loan.monthCount, rateThousandths);
                  if (!parsed.ok) {
                    setError(parsed.message);
                    setInvalidField(parsed.field);
                    return;
                  }
                  const index = dropIndexBeyond(
                    armSaved.index,
                    resetMonths(parsed.values.fixedMonths, parsed.values.adjustMonths, loan.monthCount),
                  );
                  if (armFieldInvalid(invalidField)) {
                    setError(null);
                    setInvalidField(null);
                  }
                  commitArm({ ...next, enabled: true, open: armSaved.open, index });
                }}
              >
                <option value="years">years</option>
                <option value="months">months</option>
              </select>
            </div>
            {armDraft.fixedUnit === "months" ? (
              <Field
                id="arm-fixed-months"
                label={ARM_FIELD_LABELS.initialMonths}
                term={KNOWLEDGE_ENTRIES.initialPeriod}
                value={armDraft.initialMonths}
                suffix="months"
                invalid={invalidField === "initialMonths"}
                onInput={(value) => updateArm("initialMonths", value)}
              />
            ) : (
              <Field
                id="arm-fixed-years"
                label={ARM_FIELD_LABELS.fixedYears}
                term={KNOWLEDGE_ENTRIES.initialPeriod}
                value={armDraft.fixedYears}
                suffix="years"
                invalid={invalidField === "fixedYears"}
                onInput={(value) => updateArm("fixedYears", value)}
              />
            )}
            <Field
              id="arm-adjust-months"
              label={ARM_FIELD_LABELS.adjustMonths}
              term={KNOWLEDGE_ENTRIES.initialPeriod}
              value={armDraft.adjustMonths}
              suffix="months"
              invalid={invalidField === "adjustMonths"}
              onInput={(value) => updateArm("adjustMonths", value)}
            />
            <Field
              id="arm-margin"
              label={ARM_FIELD_LABELS.margin}
              term={KNOWLEDGE_ENTRIES.noteRate}
              value={armDraft.margin}
              suffix="%"
              invalid={invalidField === "margin"}
              onInput={(value) => updateArm("margin", value)}
            />
            <Field
              id="arm-current-index"
              label="Current index"
              term={KNOWLEDGE_ENTRIES.noteRate}
              value={armDraft.currentIndex}
              suffix="%"
              invalid={currentIndexError}
              onInput={(value) => updateCurrentIndex(value)}
            />
            <Field
              id="arm-initial-cap"
              label={ARM_FIELD_LABELS.initialCap}
              term={KNOWLEDGE_ENTRIES.caps}
              value={armDraft.initialCap}
              suffix="%"
              invalid={invalidField === "initialCap"}
              onInput={(value) => updateArm("initialCap", value)}
            />
            <Field
              id="arm-periodic-cap"
              label={ARM_FIELD_LABELS.periodicCap}
              term={KNOWLEDGE_ENTRIES.caps}
              value={armDraft.periodicCap}
              suffix="%"
              invalid={invalidField === "periodicCap"}
              onInput={(value) => updateArm("periodicCap", value)}
            />
            <Field
              id="arm-lifetime-cap"
              label={ARM_FIELD_LABELS.lifetimeCap}
              term={KNOWLEDGE_ENTRIES.caps}
              value={armDraft.lifetimeCap}
              suffix="%"
              invalid={invalidField === "lifetimeCap"}
              onInput={(value) => updateArm("lifetimeCap", value)}
            />
            <Field
              id="arm-floor"
              label={ARM_FIELD_LABELS.floor}
              term={KNOWLEDGE_ENTRIES.caps}
              value={armDraft.floor}
              suffix="%"
              invalid={invalidField === "floor"}
              onInput={(value) => updateArm("floor", value)}
            />
            <Field
              id="arm-initial-floor"
              label={ARM_FIELD_LABELS.initialFloor}
              term={KNOWLEDGE_ENTRIES.caps}
              value={armDraft.initialFloor}
              suffix="%"
              invalid={invalidField === "initialFloor"}
              onInput={(value) => updateArm("initialFloor", value)}
            />
          </div>
          {currentIndexError ? (
            <p class="error" role="alert">
              Current index must be a percent with at most three decimal places.
            </p>
          ) : null}
          <CheckTerm
            id="arm-round-eighth"
            checked={armSaved.roundEighth}
            entry={KNOWLEDGE_ENTRIES.noteRate.id}
            anchor={KNOWLEDGE_ENTRIES.noteRate.anchor}
            onChange={setRoundEighth}
          >
            Round to nearest 1/8 point
          </CheckTerm>
          {report.arm?.first_adjustment ? (
            <>
              <p class="arm-computed" data-line="arm-ceiling">
                <TermButton entry={KNOWLEDGE_ENTRIES.caps.id} anchor={KNOWLEDGE_ENTRIES.caps.anchor}>Ceiling</TermButton>
                {` ${report.arm.ceiling_percent}% · `}
                <TermButton entry={KNOWLEDGE_ENTRIES.caps.id} anchor={KNOWLEDGE_ENTRIES.caps.anchor}>Floor</TermButton>
                {` ${report.arm.floor_percent}%`}
              </p>
              <p class="arm-computed" data-line="arm-first-adjustment">
                <TermButton entry={KNOWLEDGE_ENTRIES.initialPeriod.id} anchor={KNOWLEDGE_ENTRIES.initialPeriod.anchor}>First adjustment</TermButton>
                {` ${armDateLabel(loan, report.arm.first_adjustment.month)} (payment ${report.arm.first_adjustment.month}) · ${formatAdjustmentChange(report.arm.first_adjustment.min_change_cents)} to ${formatAdjustmentChange(report.arm.first_adjustment.max_change_cents)} · new payment first due ${formatDueOnFirst(loan.startMonth, report.arm.first_adjustment.month)}`}
              </p>
              <p class="arm-computed" data-line="arm-even-out">
                {`Even-out extra ${formatMoney(report.arm.even_out_cents ?? 0)}`}
              </p>
              <div class="inputs arm-even-inputs">
                <Field
                  id="arm-even-yearly"
                  label="Yearly extra"
                  value={armDraft.evenYearly}
                  invalid={evenYearlyError}
                  onInput={updateEvenYearly}
                />
                <div class="field">
                  <label for="arm-even-month">Yearly extra month</label>
                  <select
                    id="arm-even-month"
                    value={String(armSaved.evenMonth)}
                    onChange={(event) => updateEvenMonth(Number(event.currentTarget.value))}
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {evenYearlyError ? (
                <p class="error" role="alert">
                  Yearly extra must be a dollar amount greater than or equal to zero, with at most two decimal places.
                </p>
              ) : null}
              <p class="arm-computed" data-line="arm-monthly-extra">
                {`Monthly extra ${formatMoney(report.arm.monthly_extra_cents ?? 0)}`}
              </p>
              <ArmTimeline
                startMonth={loan.startMonth}
                firstAdjustmentPayment={report.arm.first_adjustment.month}
                adjustMonths={armParsed.values.adjustMonths}
              />
            </>
          ) : (
            <>
              <p class="arm-computed" data-line="arm-ceiling">
                <TermButton entry={KNOWLEDGE_ENTRIES.caps.id} anchor={KNOWLEDGE_ENTRIES.caps.anchor}>Ceiling</TermButton>
                {` ${formatPercentThousandths(rateThousandths + armParsed.values.lifetimeCapThousandths)}%`}
              </p>
              <p class="arm-computed" data-line="arm-first-adjustment">
                <TermButton entry={KNOWLEDGE_ENTRIES.initialPeriod.id} anchor={KNOWLEDGE_ENTRIES.initialPeriod.anchor}>First adjustment</TermButton>
                {` ${armDateLabel(loan, armParsed.values.fixedMonths + 1)} (payment ${armParsed.values.fixedMonths + 1}) · new payment first due ${formatDueOnFirst(loan.startMonth, armParsed.values.fixedMonths + 1)}`}
              </p>
              <ArmTimeline
                startMonth={loan.startMonth}
                firstAdjustmentPayment={armParsed.values.fixedMonths + 1}
                adjustMonths={armParsed.values.adjustMonths}
              />
            </>
          )}
        </Disclosure>
      ) : null}
      <Disclosure
        className="picture"
        title="Taxes and Insurance"
        open={pictureDraft.open}
        onToggle={setTaxesOpen}
      >
        <table class="picture-table">
          <tbody>
            <MoneyRow
              line="property-tax"
              label="Property tax"
              note={PROPERTY_TAX_NOTE}
              amount={lines.taxCents}
              rate={
                <PictureInput
                  id="picture-tax"
                  label="Property tax"
                  value={pictureDraft.tax}
                  invalid={pictureInvalid === "tax"}
                  suffix="%"
                  onInput={(value) => updatePicture("tax", value)}
                />
              }
            />
            <MoneyRow
              line="insurance"
              label="Home insurance"
              amount={lines.insuranceCents}
              rate={
                <PictureInput
                  id="picture-insurance"
                  label="Home insurance"
                  value={pictureDraft.insurance}
                  invalid={pictureInvalid === "insurance"}
                  suffix="%"
                  onInput={(value) => updatePicture("insurance", value)}
                />
              }
            />
            <MoneyRow
              line="pmi"
              label={
                <TermButton entry={KNOWLEDGE_ENTRIES.pmi.id} anchor={KNOWLEDGE_ENTRIES.pmi.anchor}>
                  Conventional PMI
                </TermButton>
              }
              amount={lines.pmiCents}
              rate={
                <PictureInput
                  id="picture-pmi"
                  label="Conventional PMI"
                  value={pictureDraft.pmi}
                  invalid={pictureInvalid === "pmi"}
                  suffix="%"
                  alignEnd
                  onInput={(value) => updatePicture("pmi", value)}
                />
              }
            />
            <MoneyRow
              line="subtotal"
              label="Subtotal"
              amount={lines.taxCents + lines.insuranceCents + lines.pmiCents}
            />
          </tbody>
        </table>
        {pictureError ? (
          <p class="error" role="alert">
            {pictureError}
          </p>
        ) : null}
      </Disclosure>
      <Disclosure
        className="prefill"
        title="Extra Payments"
        open={prefill.open}
        onToggle={(open) => changePrefill({ open })}
      >
        <div class="prefill-panel">
          <div class="inputs">
            <Field
              id="extra-monthly"
              label={MONTHLY_AMOUNT}
              value={prefill.monthly}
              invalid={false}
              edited={extraMonthlyEdited}
              onInput={(value) => changePrefill({ monthly: value })}
            />
            <Field
              id="extra-yearly"
              label={YEARLY_AMOUNT}
              value={prefill.yearly}
              invalid={false}
              edited={extraYearlyEdited}
              onInput={(value) => changePrefill({ yearly: value })}
            />
            <div class="field">
              <label for="extra-yearly-month">Month of year</label>
              <select
                id="extra-yearly-month"
                data-edited={extraMonthEdited ? "true" : undefined}
                value={String(prefill.month)}
                onChange={(event) => changePrefill({ month: Number(event.currentTarget.value) })}
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {armOn ? (
            <CheckTerm
              id="extra-level"
              checked={prefill.level === true}
              entry={KNOWLEDGE_ENTRIES.initialPeriod.id}
              anchor={KNOWLEDGE_ENTRIES.initialPeriod.anchor}
              onChange={(checked) => changePrefill({ level: checked })}
            >
              Match the initial-period total after each reset
            </CheckTerm>
          ) : null}
          <div class="apply-row">
            <button type="button" onClick={applyPrefill}>
              Apply
            </button>
            <p class="note">Apply rewrites all extra-payment column values.</p>
          </div>
          {applyError ? (
            <p class="error" role="alert">
              {applyError}
            </p>
          ) : null}
        </div>
      </Disclosure>
      <section class="summary" aria-label="Loan summary">
        <div class="payment-block" role="region" aria-label="Monthly payment">
          <h2>Monthly payment</h2>
          <div class="summary-payment-line">
            <p class="money payment">
              {activeFigures ? formatMoney(activeFigures.totalCents) : formatMoney(report.monthly_payment_cents)}
            </p>
            {activeFigures ? (
              <PrevailingBar
                variant="summary"
                modalCents={activeFigures.modalPaymentCents}
                taxCents={activeFigures.taxCents}
                insuranceCents={activeFigures.insuranceCents}
                pmiCents={activeFigures.pmiCents}
                prevailingExtraCents={activeFigures.prevailingExtraCents}
              />
            ) : null}
          </div>
        </div>
        <dl>
          <div role="region" aria-label="Loan amount">
            <dt>Loan amount</dt>
            <dd class="money">{formatMoney(report.amount_cents)}</dd>
          </div>
          <div role="region" aria-label="Total interest paid">
            <dt>Total interest paid</dt>
            <dd class="money">{formatMoney(report.interest_cents)}</dd>
          </div>
          <div role="region" aria-label="Total cost of loan">
            <dt>Total cost of loan</dt>
            <dd class="money">{formatMoney(report.amount_cents + report.interest_cents)}</dd>
          </div>
          <div role="region" aria-label="Payoff date">
            <dt>Payoff date</dt>
            <dd class="money">{formatPayoffDate(loan.startMonth, report.payoff_month)}</dd>
            <p class="note">{PAYOFF_DATE_FOOTNOTE}</p>
          </div>
          {report.arm ? (
            <div role="region" aria-label="Highest rate">
              <dt>Highest rate</dt>
              <dd class="money">
                {`${report.arm.max_rate_percent}% from ${armDateLabel(loan, report.arm.max_rate_month)}`}
              </dd>
            </div>
          ) : null}
          {report.arm ? (
            <div role="region" aria-label="Highest payment">
              <dt>Highest payment</dt>
              <dd class="money">
                {`${formatMoney(report.arm.max_payment_cents)} from ${armDateLabel(loan, report.arm.max_payment_month)} · first due ${formatDueOnFirst(loan.startMonth, report.arm.max_payment_month)}`}
              </dd>
            </div>
          ) : null}
          <div role="region" aria-label="Extra principal paid">
            <dt>
              <TermButton entry={KNOWLEDGE_ENTRIES.extraPrincipal.id} anchor={KNOWLEDGE_ENTRIES.extraPrincipal.anchor}>
                Extra principal paid
              </TermButton>
            </dt>
            <dd class="money">{formatMoney(report.extra_applied_cents)}</dd>
          </div>
          <div role="region" aria-label="Interest saved">
            <dt>Interest saved</dt>
            <dd class="money">{formatMoney(report.interest_saved_cents)}</dd>
          </div>
          <div role="region" aria-label="Months saved">
            <dt>Months saved</dt>
            <dd class="money">{monthsSavedText(report.months_saved)}</dd>
          </div>
        </dl>
      </section>
      <Chart bars={bars} />
      <Disclosure
        className="picture-closing"
        title="Closing Costs"
        open={pictureDraft.closingOpen}
        onToggle={setClosingOpen}
      >
        <table class="picture-table">
          <tbody>
            <MoneyRow
              line="lender-fees"
              label="Lender fees"
              amount={lines.lenderFeesCents}
              rate={
                <PictureInput
                  id="picture-lender-fees"
                  label="Lender fees"
                  value={pictureDraft.lenderFees}
                  invalid={pictureInvalid === "lenderFees"}
                  prefix="$"
                  onInput={(value) => updatePicture("lenderFees", value)}
                />
              }
            />
            <MoneyRow
              line="title"
              label="Title, escrow, and recording"
              amount={lines.titleCents}
              rate={
                <span class="picture-title-row">
                  <div class="field">
                    <select
                      id="picture-title-preset"
                      aria-label="Title, escrow, and recording preset"
                      value={titlePresetValue}
                      onChange={(event) => updateTitlePreset(event.currentTarget.value)}
                    >
                      <option value=""> </option>
                      {TITLE_PRESET_RATES.map((preset) => (
                        <option key={preset.label} value={preset.label}>{preset.label}</option>
                      ))}
                    </select>
                  </div>
                  <PictureInput
                    id="picture-title"
                    label="Title, escrow, and recording"
                    value={pictureDraft.title}
                    invalid={pictureInvalid === "title"}
                    suffix="%"
                    onInput={(value) => updatePicture("title", value)}
                  />
                </span>
              }
            />
            <MoneyRow
              line="prepaid-interest"
              label="Prepaid interest"
              amount={lines.prepaidInterestCents}
              rate={
                <span class="picture-interest-row">
                  <span class="picture-closing-month">{closingMonthLabel}</span>
                  <PictureInput
                    id="picture-closing-day"
                    label="Closing day"
                    value={pictureDraft.closingDay}
                    invalid={pictureInvalid === "closingDay"}
                    onInput={(value) => updatePicture("closingDay", value)}
                  />
                  <span class="picture-affix">{closingDayCountText}</span>
                  <select
                    id="picture-interest-basis"
                    aria-label="Interest day-count basis"
                    value={pictureDraft.interestBasis}
                    onChange={(event) => updatePictureBasis(event.currentTarget.value)}
                  >
                    <option value="360">360</option>
                    <option value="365">365</option>
                  </select>
                </span>
              }
            />
            <MoneyRow
              line="homeowners-insurance"
              label="Homeowners insurance"
              amount={lines.homeownersInsuranceCents}
              rate={<span class="picture-affix">12 months</span>}
            />
            <MoneyRow
              line="tax-impound"
              label="Property tax impound"
              amount={lines.taxImpoundCents}
              rate={
                <PictureInput
                  id="picture-tax-impound-months"
                  label="Property tax impound months"
                  value={pictureDraft.taxImpoundMonths}
                  invalid={pictureInvalid === "taxImpoundMonths"}
                  onInput={(value) => updatePicture("taxImpoundMonths", value)}
                />
              }
            />
            <MoneyRow
              line="insurance-impound"
              label="Insurance impound"
              amount={lines.insuranceImpoundCents}
              rate={
                <PictureInput
                  id="picture-insurance-impound-months"
                  label="Insurance impound months"
                  value={pictureDraft.insuranceImpoundMonths}
                  invalid={pictureInvalid === "insuranceImpoundMonths"}
                  onInput={(value) => updatePicture("insuranceImpoundMonths", value)}
                />
              }
            />
            <MoneyRow
              line="mi-impound"
              label="Mortgage insurance impound"
              amount={lines.miImpoundCents}
              rate={
                <PictureInput
                  id="picture-mi-impound-months"
                  label="Mortgage insurance impound months"
                  value={pictureDraft.miImpoundMonths}
                  invalid={pictureInvalid === "miImpoundMonths"}
                  onInput={(value) => updatePicture("miImpoundMonths", value)}
                />
              }
            />
            <MoneyRow
              line="proration"
              label="Property-tax proration"
              amount={lines.prorationCents}
              rate={
                <PictureInput
                  id="picture-proration"
                  label="Property-tax proration"
                  value={pictureDraft.proration}
                  invalid={pictureInvalid === "proration"}
                  onInput={(value) => updatePicture("proration", value)}
                />
              }
            />
            <MoneyRow line="closing" label="Closing costs" amount={lines.closingCents} />
            <MoneyRow
              line="points"
              label={
                <TermButton entry={KNOWLEDGE_ENTRIES.points.id} anchor={KNOWLEDGE_ENTRIES.points.anchor}>
                  Points
                </TermButton>
              }
              amount={lines.pointsCents}
              rate={
                <PictureInput
                  id="picture-points"
                  label="Points"
                  value={pictureDraft.points}
                  invalid={pictureInvalid === "points"}
                  suffix="%"
                  onInput={(value) => updatePicture("points", value)}
                />
              }
            />
            <MoneyRow line="closing-and-points" label="Closing costs and points" amount={lines.closingAndPointsCents} />
            <MoneyRow
              line="seller-credit"
              label="Seller credit"
              amount={pictureValues.sellerCreditCents}
              rate={
                <PictureInput
                  id="picture-seller-credit"
                  label="Seller credit"
                  value={pictureDraft.sellerCredit}
                  invalid={pictureInvalid === "sellerCredit"}
                  prefix="$"
                  onInput={(value) => updatePicture("sellerCredit", value)}
                />
              }
            />
            <MoneyRow
              line="lender-credit"
              label={
                <TermButton entry={KNOWLEDGE_ENTRIES.points.id} anchor={KNOWLEDGE_ENTRIES.points.anchor}>
                  Lender credit
                </TermButton>
              }
              amount={pictureValues.lenderCreditCents}
              rate={
                <PictureInput
                  id="picture-lender-credit"
                  label="Lender credit"
                  value={pictureDraft.lenderCredit}
                  invalid={pictureInvalid === "lenderCredit"}
                  prefix="$"
                  onInput={(value) => updatePicture("lenderCredit", value)}
                />
              }
            />
            <MoneyRow line="cash-to-close" label="Cash to close" amount={lines.cashToCloseCents} />
            <MoneyRow
              line="earnest"
              label="Earnest money already paid"
              amount={pictureValues.earnestCents}
              rate={
                <PictureInput
                  id="picture-earnest"
                  label="Earnest money already paid"
                  value={pictureDraft.earnest}
                  invalid={pictureInvalid === "earnest"}
                  prefix="$"
                  onInput={(value) => updatePicture("earnest", value)}
                />
              }
            />
            <MoneyRow line="due-at-closing" label="Due at closing" amount={lines.dueAtClosingCents} />
          </tbody>
        </table>
        {sellerCreditNote ? <p class="note">{sellerCreditNote}</p> : null}
        {pictureError ? (
          <p class="error" role="alert">
            {pictureError}
          </p>
        ) : null}
      </Disclosure>
      <Disclosure
        className="moving-in"
        title="Moving in"
        open={pictureDraft.movingOpen}
        onToggle={setMovingOpen}
      >
        <div class="moving-copy">
          <p>{moving.funding}</p>
          <p>{moving.prepaid}</p>
          <p>{moving.noPayment}</p>
          <p>{moving.firstPayment}</p>
          <p>{moving.grace}</p>
          <div class="inputs">
            <Field
              id="moving-grace-days"
              label="Grace days"
              term={KNOWLEDGE_ENTRIES.acceleration}
              value={pictureDraft.graceDays}
              invalid={movingInvalid === "graceDays"}
              onInput={(value) =>
                commitMovingField(
                  "graceDays",
                  value,
                  "Grace days must be a whole number from 0 through 31.",
                )
              }
            />
            <Field
              id="moving-late-charge"
              label="Late charge"
              term={KNOWLEDGE_ENTRIES.acceleration}
              value={pictureDraft.lateChargePercent}
              suffix="%"
              invalid={movingInvalid === "lateChargePercent"}
              onInput={(value) =>
                commitMovingField(
                  "lateChargePercent",
                  value,
                  "Late charge must be a percent from 0 through 100, with at most two decimal places.",
                )
              }
            />
          </div>
          <p>
            <ClosingDisclosureSentence text={moving.closingDisclosure} />
          </p>
          <div class="inputs">
            <div class="field">
              <label for="moving-signing-date">Signing date</label>
              <input
                id="moving-signing-date"
                type="date"
                autoComplete="off"
                value={pictureDraft.signingDate}
                aria-invalid={movingInvalid === "signingDate"}
                onInput={(event) =>
                  commitMovingField(
                    "signingDate",
                    event.currentTarget.value,
                    "Signing date must be a calendar date.",
                  )
                }
              />
            </div>
            <div class="field">
              <label for="moving-last-rent">Last rent</label>
              <input
                id="moving-last-rent"
                type="date"
                autoComplete="off"
                value={pictureDraft.lastRent}
                aria-invalid={movingInvalid === "lastRent"}
                onInput={(event) =>
                  commitMovingField(
                    "lastRent",
                    event.currentTarget.value,
                    "Last rent must be a calendar date.",
                  )
                }
              />
            </div>
          </div>
          {moving.lastRent ? <p>{moving.lastRent}</p> : null}
          <p>{moving.statement}</p>
          <p>{moving.interestCredit}</p>
          {movingError ? (
            <p class="error" role="alert">
              {movingError}
            </p>
          ) : null}
        </div>
      </Disclosure>
      {!armOn ? (
        <Disclosure className="recast" title="Recast" open={recastOpen} onToggle={setRecastOpen}>
          <div class="inputs">
            <Field
              id="recast-month"
              label="Recast month"
              value={recastMonth}
              suffix=""
              invalid={recastInvalid}
              onInput={(value) => updateRecastMonth(value)}
            />
          </div>
          {recastPaidOff ? (
            <p class="note">The loan is already paid off.</p>
          ) : recastDisplay ? (
            <dl class="recast-figures">
              <div>
                <dt>Unpaid principal</dt>
                <dd class="money">{formatMoney(recastDisplay.remaining_principal_cents)}</dd>
              </div>
              <div>
                <dt>Recast payment</dt>
                <dd class="money">{formatMoney(recastDisplay.monthly_payment_cents)}</dd>
              </div>
              <div>
                <dt>Remaining months</dt>
                <dd>{recastDisplay.months}</dd>
              </div>
              <div>
                <dt>Recast interest</dt>
                <dd class="money">{formatMoney(recastDisplay.interest_cents)}</dd>
              </div>
            </dl>
          ) : null}
          {recastError && !recastPaidOff ? (
            <p class="error" role="alert">
              {recastError}
            </p>
          ) : null}
        </Disclosure>
      ) : null}
      <Schedule
        years={years}
        openYears={openYears}
        editingMonth={editingMonth}
        editingValue={editingValue}
        arm={armOn}
        editingIndexMonth={editingIndexMonth}
        editingIndexValue={editingIndexValue}
        onToggleYear={toggleYear}
        onToggleAll={toggleAll}
        onEdit={(month, value) => {
          setEditingMonth(month);
          setEditingValue(value);
        }}
        onCommit={commitExtra}
        onIndexEdit={(month, value) => {
          setEditingIndexMonth(month);
          setEditingIndexValue(value);
        }}
        onIndexCommit={commitIndex}
      />
      <TaxTableSection
        table={taxTable}
        draft={pictureDraft}
        open={pictureDraft.taxOpen}
        error={taxError}
        invalid={taxInvalid}
        onToggle={setTaxOpen}
        onStatus={commitFilingStatus}
        onDollar={commitTaxDollar}
      />
    </main>
    {knowledgeStack ? (
      <>
        {knowledgeSheet ? (
          <button type="button" class="knowledge-scrim" tabIndex={-1} aria-hidden="true" onClick={closeKnowledge} />
        ) : null}
        <KnowledgePanel
          stack={knowledgeStack}
          sheet={knowledgeSheet}
          onPush={pushKnowledge}
          onBack={backKnowledge}
          onClose={closeKnowledge}
        />
      </>
    ) : null}
    </KnowledgeOpen.Provider>
  );
}

const ARM_FIELDS: readonly string[] = [
  "fixedYears",
  "adjustMonths",
  "margin",
  "initialCap",
  "periodicCap",
  "lifetimeCap",
  "floor",
  "initialFloor",
];

function armFieldInvalid(field: string | null): boolean {
  return field !== null && ARM_FIELDS.includes(field);
}

function ArmTimeline(props: {
  startMonth: string;
  firstAdjustmentPayment: number;
  adjustMonths: number;
}) {
  const lines = armTimelineLines(
    props.startMonth,
    props.firstAdjustmentPayment,
    props.adjustMonths,
  );
  return (
    <ul class="arm-timeline">
      {lines.map((line) => (
        <li key={line}>
          <TimelineLine line={line} />
        </li>
      ))}
    </ul>
  );
}

const TIMELINE_TERMS: { prefix: string; entry: KnowledgeEntry }[] = [
  { prefix: "Change date", entry: KNOWLEDGE_ENTRIES.initialPeriod },
  { prefix: "Index", entry: KNOWLEDGE_ENTRIES.noteRate },
  { prefix: "Initial notice", entry: KNOWLEDGE_ENTRIES.notices },
  { prefix: "Later notice", entry: KNOWLEDGE_ENTRIES.notices },
];

function TimelineLine(props: { line: string }) {
  const term = TIMELINE_TERMS.find(
    (item) => props.line === item.prefix || props.line.startsWith(`${item.prefix} `),
  );
  if (!term) return <>{props.line}</>;
  return (
    <>
      <TermButton entry={term.entry.id} anchor={term.entry.anchor}>{term.prefix}</TermButton>
      {props.line.slice(term.prefix.length)}
    </>
  );
}

function armDateLabel(loan: Loan, paymentNumber: number): string {
  const date = paymentDate(loan.startMonth, paymentNumber);
  return longDate(date.year, date.month);
}

function ClosingDisclosureSentence(props: { text: string }) {
  const needle = "Closing Disclosure";
  const at = props.text.indexOf(needle);
  if (at < 0) return <>{props.text}</>;
  return (
    <>
      {props.text.slice(0, at)}
      <TermButton entry={KNOWLEDGE_ENTRIES.closingDisclosure.id} anchor={KNOWLEDGE_ENTRIES.closingDisclosure.anchor}>
        {needle}
      </TermButton>
      {props.text.slice(at + needle.length)}
    </>
  );
}

function CheckTerm(props: {
  id: string;
  checked: boolean;
  entry: string;
  anchor?: string;
  onChange: (checked: boolean) => void;
  children: ComponentChildren;
}) {
  return (
    <div class="arm-check">
      <input
        id={props.id}
        type="checkbox"
        checked={props.checked}
        aria-labelledby={`${props.id}-term`}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <TermButton id={`${props.id}-term`} entry={props.entry} anchor={props.anchor}>
        {props.children}
      </TermButton>
    </div>
  );
}

function MoneyRow(props: {
  line: string;
  label: ComponentChildren;
  amount: number;
  note?: string;
  rate?: ComponentChildren;
}) {
  return (
    <tr data-line={props.line}>
      <th scope="row">
        {props.label}
        {props.note ? <span class="picture-note">{props.note}</span> : null}
      </th>
      <td>{props.rate}</td>
      <td class="money">{formatMoney(props.amount)}</td>
    </tr>
  );
}

function PictureInput(props: {
  id: string;
  label: string;
  value: string;
  invalid: boolean;
  prefix?: string;
  suffix?: string;
  alignEnd?: boolean;
  onInput: (value: string) => void;
}) {
  const wrapClass = props.alignEnd ? "picture-input-wrap picture-input-wrap--end" : "picture-input-wrap";
  return (
    <span class={wrapClass}>
      {props.prefix ? <span class="picture-affix">{props.prefix}</span> : null}
      <input
        id={props.id}
        class="picture-input"
        aria-label={props.label}
        inputMode="decimal"
        autoComplete="off"
        value={props.value}
        aria-invalid={props.invalid}
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
      {props.suffix ? <span class="picture-affix">{props.suffix}</span> : null}
    </span>
  );
}

function TaxTableSection(props: {
  table: TaxTable;
  draft: PictureDraft;
  open: boolean;
  error: string | null;
  invalid: TaxDollarField | null;
  onToggle: (open: boolean) => void;
  onStatus: (value: string) => void;
  onDollar: (field: TaxDollarField, value: string) => void;
}) {
  const dollars: TaxDollarField[] = [
    "agi",
    "magi",
    "otherSalt",
    "otherItemized",
    "standardOverride",
    "appraisal",
  ];
  return (
    <Disclosure className="tax-table" title="Tax table" open={props.open} onToggle={props.onToggle}>
      <div class="tax-copy">
        <p>{TAX_NOT_ADVICE}</p>
        <p>{TAX_STATE}</p>
        <p>{TAX_OVERALL_LIMIT}</p>
        <p>{insuranceNotDeductibleLine(props.table.insuranceAnnualCents)}</p>
        <p>{TAX_MI_UNVERIFIED}</p>
        <p>{TAX_BOX5}</p>
        <p>{TAX_SALT_CAP}</p>
        <p>{TAX_ACQUISITION}</p>
        <p class="tax-interest">{props.table.fundingInterestLine}</p>
        <ul class="tax-pmi">
          {props.table.pmiLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div class="inputs">
          <div class="field">
            <label for="tax-filing-status">Filing status</label>
            <select
              id="tax-filing-status"
              value={props.draft.filingStatus}
              onChange={(event) => props.onStatus(event.currentTarget.value)}
            >
              {FILING_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {dollars.map((field) => (
            <Field
              key={field}
              id={`tax-${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`}
              label={TAX_DOLLAR_LABELS[field]}
              value={props.draft[field]}
              invalid={props.invalid === field}
              onInput={(value) => props.onDollar(field, value)}
            />
          ))}
        </div>
        <p class="note">{TAX_FIELD_NOTE}</p>
        {props.error ? (
          <p class="error" role="alert">
            {props.error}
          </p>
        ) : null}
        {props.open ? (
        <div class="tax-scroll">
          <table class="tax-grid">
            <thead>
              <tr>
                <th scope="col">Tax year</th>
                <th scope="col">Mortgage interest paid</th>
                <th scope="col">Points</th>
                <th scope="col">MI paid</th>
                <th scope="col">MI deductible</th>
                <th scope="col">Property tax</th>
                <th scope="col">Other SALT</th>
                <th scope="col">SALT allowed</th>
                <th scope="col">Housing items</th>
                <th scope="col">Standard deduction</th>
                <th scope="col">Comparison</th>
              </tr>
            </thead>
            <tbody>
              {props.table.rows.map((row) => (
                <tr key={row.year} data-tax-year={row.year}>
                  <th scope="row">{row.year}</th>
                  <td>{formatMoney(row.mortgageInterestCents)}</td>
                  <td>{formatMoney(row.pointsCents)}</td>
                  <td>{formatMoney(row.miPaidCents)}</td>
                  <td>
                    {formatMoney(row.miDeductibleCents)}
                    {row.miPhaseoutNote ? <span class="tax-label">{row.miPhaseoutNote}</span> : null}
                  </td>
                  <td>{formatMoney(row.propertyTaxCents)}</td>
                  <td>{formatMoney(row.otherSaltCents)}</td>
                  <td>
                    {formatMoney(row.saltAllowedCents)}
                    {row.saltPhaseDownNote ? <span class="tax-label">{row.saltPhaseDownNote}</span> : null}
                  </td>
                  <td>{formatMoney(row.housingItemsCents)}</td>
                  <td>
                    {formatMoney(row.standardCents)}
                    {row.standardLabel ? <span class="tax-label">{row.standardLabel}</span> : null}
                  </td>
                  <td class="tax-compare">{row.comparison}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : null}
        <p class="note">{TAX_POINTS_NOTE}</p>
        <p class="note">{TAX_MI_SERVICER}</p>
        <p class="note">{TAX_PROPERTY_NOTE}</p>
        <p class="note">{TAX_SALT_LESSER}</p>
      </div>
    </Disclosure>
  );
}

function Field(props: {
  id: string;
  label: string;
  term?: KnowledgeEntry;
  value: string;
  suffix?: string;
  invalid: boolean;
  edited?: boolean;
  onInput: (value: string) => void;
}) {
  const termId = `${props.id}-term`;
  return (
    <div class="field">
      {props.term ? (
        <TermButton id={termId} entry={props.term.id} anchor={props.term.anchor}>
          {props.label}
        </TermButton>
      ) : (
        <label for={props.id}>{props.label}</label>
      )}
      <div class="control">
        <input
          id={props.id}
          inputMode="decimal"
          autoComplete="off"
          value={props.value}
          aria-invalid={props.invalid}
          aria-labelledby={props.term ? termId : undefined}
          data-edited={props.edited ? "true" : undefined}
          onInput={(event) => props.onInput(event.currentTarget.value)}
          onChange={(event) => props.onInput(event.currentTarget.value)}
        />
        {props.suffix ? <span aria-hidden="true">{props.suffix}</span> : null}
      </div>
    </div>
  );
}
