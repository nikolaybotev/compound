import { useMemo, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import {
  ARM_FIELD_LABELS,
  armLabel,
  dropIndexBeyond,
  formatPercentThousandths,
  parseArm,
  resetMonths,
  type ArmDraft,
  type ArmField,
} from "./arm";
import { Chart, type ChartBar } from "./chart";
import { Disclosure } from "./disclosure";
import { MonthPicker } from "./month-picker";
import { ScenarioBar } from "./scenarios";
import {
  MONTH_NAMES,
  THOUSANDS_MESSAGE,
  bands,
  buildPrefillMap,
  defaultScenario,
  dollarsToThousandsText,
  dropExtrasBeyond,
  extraInputValue,
  firstPaymentYear,
  formatMoney,
  groupByYear,
  isTrailingDotThousands,
  loadStored,
  loanReport,
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
  yearsAndMonths,
} from "./loan";
import {
  buildPicture,
  loadStoredCount,
  ficoBand,
  parseFicoScore,
  parsePicture,
  parseWholeCount,
  percentThousandths,
  pmiDraftForLoan,
  type PictureDraft,
  type PictureInputField,
  type PictureValues,
} from "./picture";
import { PrevailingBar } from "./prevailing-bar";
import { Schedule } from "./schedule";
import { dollarsToCents } from "../../../amortize.js";

const MONTHLY_AMOUNT = "Additional amount to monthly payment";
const YEARLY_AMOUNT = "Additional yearly payment";
const PROPERTY_TAX_NOTE = "Nashua: 1.683%; Brentwood: 1.32%.";

type PictureCounts = {
  insuranceMonths: number;
  taxMonths: number;
  interestDays: number;
};

function pictureCountsFromValues(values: PictureValues): PictureCounts {
  return {
    insuranceMonths: values.insuranceMonths,
    taxMonths: values.taxMonths,
    interestDays: values.interestDays,
  };
}

function pictureCountsFromDraft(draft: PictureDraft): PictureCounts {
  return {
    insuranceMonths: loadStoredCount(draft.insuranceMonths, 12),
    taxMonths: loadStoredCount(draft.taxMonths, 4),
    interestDays: loadStoredCount(draft.interestDays, 15),
  };
}

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
  const picture = parsePicture(scenario.picture, pictureCountsFromDraft(scenario.picture));
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
  const [ficoRangeValue, setFicoRangeValue] = useState("");
  const [loan, setLoan] = useState(initial.loan);
  const [priceText, setPriceText] = useState(() => dollarsToThousandsText(initial.scenario.draft.price));
  const [extras, setExtras] = useState(initial.scenario.extras);
  const [applied, setApplied] = useState(initial.scenario.applied);
  const [prefill, setPrefill] = useState(initial.scenario.prefill);
  const [pictureDraft, setPictureDraft] = useState(initial.scenario.picture);
  const [pictureSaved, setPictureSaved] = useState(initial.scenario.picture);
  const [pictureValues, setPictureValues] = useState(initial.pictureValues);
  const [pictureCounts, setPictureCounts] = useState(() => pictureCountsFromValues(initial.pictureValues));
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [pictureInvalid, setPictureInvalid] = useState<PictureInputField | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [openYears, setOpenYears] = useState<Set<number>>(() =>
    initial.scenario.openYears
      ? new Set(initial.scenario.openYears)
      : new Set([firstPaymentYear(initial.loan)]),
  );
  const [armDraft, setArmDraft] = useState(initial.scenario.arm);
  const [armSaved, setArmSaved] = useState(initial.scenario.arm);
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingIndexMonth, setEditingIndexMonth] = useState<number | null>(null);
  const [editingIndexValue, setEditingIndexValue] = useState("");
  const snapshot = useRef<Scenario>({
    draft: initial.scenario.draft,
    extras: initial.scenario.extras,
    applied: initial.scenario.applied,
    prefill: initial.scenario.prefill,
    openYears: initial.scenario.openYears ?? [firstPaymentYear(initial.loan)],
    picture: initial.scenario.picture,
    arm: initial.scenario.arm,
    armStored: initial.scenario.armStored,
  });

  function reseedFromScenario(scenario: Scenario) {
    const parsed = parseLoan(scenario.draft);
    if (!parsed.ok) throw new Error(parsed.message);
    const picture = parsePicture(scenario.picture, pictureCountsFromDraft(scenario.picture));
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
    setPictureCounts(pictureCountsFromValues(picture.values));
    setOpenYears(
      scenario.openYears
        ? new Set(scenario.openYears)
        : new Set([firstPaymentYear(parsed.loan)]),
    );
    setArmDraft(scenario.arm);
    setArmSaved(scenario.arm);
    setError(null);
    setInvalidField(null);
    setPictureError(null);
    setPictureInvalid(null);
    setApplyError(null);
    setEditingMonth(null);
    setEditingIndexMonth(null);
    snapshot.current = {
      draft: scenario.draft,
      extras: scenario.extras,
      applied: scenario.applied,
      prefill: scenario.prefill,
      openYears: scenario.openYears ?? [firstPaymentYear(parsed.loan)],
      picture: scenario.picture,
      arm: scenario.arm,
      armStored: scenario.armStored,
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
      arm: patch.arm ?? snapshot.current.arm,
      armStored: patch.armStored ?? snapshot.current.armStored,
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
    () => buildPicture(loan, validText.rate, validText.down, pictureValues),
    [loan, validText, pictureValues],
  );
  const activeFigures = useMemo(
    () => scenarioFigures(loanSet.scenarios[loanSet.active]),
    [loanSet],
  );
  const rateThousandths = Math.round(loan.ratePercent * 1000);
  const armParsed = useMemo(
    () => parseArm(armSaved, loan.years, rateThousandths),
    [armSaved, loan.years, rateThousandths],
  );
  const armOn = armSaved.enabled && armParsed.ok;
  const reportLoan = useMemo<Loan>(
    () =>
      armSaved.enabled && armParsed.ok
        ? { ...loan, arm: { enabled: true, values: armParsed.values, index: armSaved.index } }
        : loan,
    [loan, armSaved, armParsed],
  );
  const report = useMemo(
    () => loanReport(reportLoan, extras, lines.financedCents),
    [reportLoan, extras, lines.financedCents],
  );
  const years = useMemo(
    () => groupByYear(reportLoan, report, extras, lines.financedCents, applied),
    [reportLoan, report, extras, lines.financedCents, applied],
  );
  const payoff = paymentDate(loan.startMonth, report.payoff_month);
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
      const armResult = parseArm(armSaved, parsed.loan.years, Math.round(parsed.loan.ratePercent * 1000));
      if (!armResult.ok) {
        setError(armResult.message);
        setInvalidField(armResult.field);
        return;
      }
      const index = dropIndexBeyond(
        armSaved.index,
        resetMonths(armResult.values.fixedMonths, armResult.values.adjustMonths, parsed.loan.years * 12),
      );
      if (index !== armSaved.index) nextArm = { ...armSaved, index };
    }
    const kept = dropExtrasBeyond(extras, parsed.loan.years * 12);
    const keptApplied = dropExtrasBeyond(applied, parsed.loan.years * 12);
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
      const pictureParsed = parsePicture(pictureNext, pictureCounts);
      if (pictureParsed.ok) {
        setPictureDraft(pictureNext);
        setPictureSaved({ ...pictureNext, open: pictureDraft.open, closingOpen: pictureDraft.closingOpen });
        setPictureValues(pictureParsed.values);
      }
    }
    persist(
      nextArm === armSaved
        ? {
            draft: next,
            extras: kept,
            applied: keptApplied,
            ...(pictureNext ? { picture: { ...pictureNext, open: pictureDraft.open, closingOpen: pictureDraft.closingOpen } } : {}),
          }
        : {
            draft: next,
            extras: kept,
            applied: keptApplied,
            arm: nextArm,
            ...(pictureNext ? { picture: { ...pictureNext, open: pictureDraft.open, closingOpen: pictureDraft.closingOpen } } : {}),
          },
    );
  }

  function updateFico(value: string) {
    const previousScore = parseFicoScore(validText.fico) ?? 780;
    const next = { ...draft, fico: value };
    setDraft(next);
    const parsed = parseFicoScore(value);
    if (parsed === null) {
      setError("FICO must be a whole number from 0 through 999.");
      setInvalidField("fico");
      return;
    }
    setValidText((current) => ({ ...current, fico: value }));
    setError(null);
    setInvalidField(null);
    let pictureNext: typeof pictureDraft | undefined;
    if (ficoBand(parsed) !== ficoBand(previousScore)) {
      pictureNext = pmiDraftForLoan(pictureDraft, validText.down, value);
      const pictureParsed = parsePicture(pictureNext, pictureCounts);
      if (pictureParsed.ok) {
        setPictureDraft(pictureNext);
        setPictureSaved({
          ...pictureNext,
          open: pictureDraft.open,
          closingOpen: pictureDraft.closingOpen,
        });
        setPictureValues(pictureParsed.values);
      }
    }
    persist({
      draft: next,
      ...(pictureNext
        ? {
            picture: {
              ...pictureNext,
              open: pictureDraft.open,
              closingOpen: pictureDraft.closingOpen,
            },
          }
        : {}),
    });
  }

  function chooseFicoRange(value: string) {
    const score = Number(value);
    const previousScore = parseFicoScore(validText.fico) ?? 780;
    const next = { ...draft, fico: String(score) };
    setDraft(next);
    setValidText((current) => ({ ...current, fico: String(score) }));
    setError(null);
    setInvalidField(null);
    let pictureNext: typeof pictureDraft | undefined;
    if (ficoBand(score) !== ficoBand(previousScore)) {
      pictureNext = pmiDraftForLoan(pictureDraft, validText.down, String(score));
      const pictureParsed = parsePicture(pictureNext, pictureCounts);
      if (pictureParsed.ok) {
        setPictureDraft(pictureNext);
        setPictureSaved({
          ...pictureNext,
          open: pictureDraft.open,
          closingOpen: pictureDraft.closingOpen,
        });
        setPictureValues(pictureParsed.values);
      }
    }
    persist({
      draft: next,
      ...(pictureNext
        ? {
            picture: {
              ...pictureNext,
              open: pictureDraft.open,
              closingOpen: pictureDraft.closingOpen,
            },
          }
        : {}),
    });
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
    const result = parseArm(candidate, loan.years, rateThousandths);
    if (!result.ok) {
      select.value = "fixed";
      setError(result.message);
      setInvalidField(result.field);
      return;
    }
    const index = dropIndexBeyond(
      candidate.index,
      resetMonths(result.values.fixedMonths, result.values.adjustMonths, loan.years * 12),
    );
    setError(null);
    setInvalidField(null);
    commitArm({ ...candidate, index });
  }

  function updateArm(field: ArmField, value: string) {
    const next = { ...armDraft, [field]: value };
    setArmDraft(next);
    const parsed = parseArm(next, loan.years, rateThousandths);
    if (!parsed.ok) {
      setError(parsed.message);
      setInvalidField(parsed.field);
      return;
    }
    const index = dropIndexBeyond(
      armSaved.index,
      resetMonths(parsed.values.fixedMonths, parsed.values.adjustMonths, loan.years * 12),
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
    const index = withIndex(armSaved.index, month, parsed.percent);
    if (index === armSaved.index) return;
    const next = { ...armSaved, index };
    setArmSaved(next);
    setArmDraft({ ...armDraft, index });
    persist({ arm: next, armStored: true });
  }

  function setRoundEighth(roundEighth: boolean) {
    commitArm({ ...armSaved, roundEighth });
  }

  function setArmOpen(open: boolean) {
    commitArm({ ...armSaved, open });
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
    const next = { ...pictureDraft, [field]: value };
    setPictureDraft(next);
    let counts = pictureCounts;
    if (field === "insuranceMonths" || field === "taxMonths" || field === "interestDays") {
      const parsedCount = parseWholeCount(value);
      if (parsedCount !== null) {
        counts = { ...counts, [field]: parsedCount };
        setPictureCounts(counts);
      }
    }
    const parsed = parsePicture(next, counts);
    if (!parsed.ok) {
      setPictureError(parsed.message);
      setPictureInvalid(parsed.field);
      return;
    }
    const saved = { ...next, open: pictureDraft.open, closingOpen: pictureDraft.closingOpen };
    setPictureValues(parsed.values);
    setPictureCounts(pictureCountsFromValues(parsed.values));
    setPictureSaved(saved);
    setPictureError(null);
    setPictureInvalid(null);
    persist({ picture: saved });
  }

  function updatePictureBasis(value: string) {
    const next = { ...pictureDraft, interestBasis: value };
    setPictureDraft(next);
    const parsed = parsePicture(next, pictureCounts);
    if (!parsed.ok) return;
    const saved = { ...next, open: pictureDraft.open, closingOpen: pictureDraft.closingOpen };
    setPictureValues(parsed.values);
    setPictureSaved(saved);
    persist({ picture: saved });
  }

  function setTaxesOpen(open: boolean) {
    const saved = { ...pictureSaved, open };
    setPictureSaved(saved);
    setPictureDraft({ ...pictureDraft, open });
    persist({ picture: saved });
  }

  function setClosingOpen(open: boolean) {
    const saved = { ...pictureSaved, closingOpen: open };
    setPictureSaved(saved);
    setPictureDraft({ ...pictureDraft, closingOpen: open });
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
    const next = buildPrefillMap(
      loan.years * 12,
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
    <main class="column">
      <h1>
        Compound
        <span class="title-tagline">A mortgage amortization calculator</span>
      </h1>
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
        <input
          id="years"
          aria-label="Term"
          inputMode="numeric"
          autoComplete="off"
          value={draft.years}
          aria-invalid={invalidField === "years"}
          style={{ width: `${Math.max(draft.years.length, 1) + 1}ch` }}
          onInput={(event) => update("years", event.currentTarget.value)}
        />
        <span>-year </span>
        {armOn && armParsed.ok ? (
          <span class="arm-label" data-testid="arm-label">
            {armLabel(armParsed.values.fixedMonths / 12, armParsed.values.adjustMonths)}
          </span>
        ) : null}
        {armOn ? " " : null}
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
        <input
          id="fico"
          aria-label="FICO"
          inputMode="numeric"
          autoComplete="off"
          value={draft.fico}
          aria-invalid={invalidField === "fico"}
          style={{ width: `${Math.max(draft.fico.length, 1) + 1}ch` }}
          onInput={(event) => updateFico(event.currentTarget.value)}
        />
        <span> FICO </span>
        <select
          id="fico-range"
          aria-label="FICO range"
          value={ficoRangeValue}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFicoRangeValue("");
            if (value) chooseFicoRange(value);
          }}
        >
          <option value=""></option>
          <option value="780">780+</option>
          <option value="740">740–779</option>
          <option value="700">700–739</option>
          <option value="660">660–699</option>
          <option value="620">620–659</option>
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
              label="Conventional PMI"
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
            <dd class="money">
              {`${longDate(payoff.year, payoff.month)} (${yearsAndMonths(report.payoff_month)})`}
            </dd>
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
                {`${formatMoney(report.arm.max_payment_cents)} from ${armDateLabel(loan, report.arm.max_payment_month)}`}
              </dd>
            </div>
          ) : null}
          <div role="region" aria-label="Extra principal paid">
            <dt>Extra principal paid</dt>
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
      {armOn && armParsed.ok ? (
        <Disclosure className="arm" title="ARM terms" open={armSaved.open} onToggle={setArmOpen}>
          <div class="inputs">
            <Field
              id="arm-fixed-years"
              label={ARM_FIELD_LABELS.fixedYears}
              value={armDraft.fixedYears}
              suffix="years"
              invalid={invalidField === "fixedYears"}
              onInput={(value) => updateArm("fixedYears", value)}
            />
            <Field
              id="arm-adjust-months"
              label={ARM_FIELD_LABELS.adjustMonths}
              value={armDraft.adjustMonths}
              suffix="months"
              invalid={invalidField === "adjustMonths"}
              onInput={(value) => updateArm("adjustMonths", value)}
            />
            <Field
              id="arm-margin"
              label={ARM_FIELD_LABELS.margin}
              value={armDraft.margin}
              suffix="%"
              invalid={invalidField === "margin"}
              onInput={(value) => updateArm("margin", value)}
            />
            <Field
              id="arm-initial-cap"
              label={ARM_FIELD_LABELS.initialCap}
              value={armDraft.initialCap}
              suffix="%"
              invalid={invalidField === "initialCap"}
              onInput={(value) => updateArm("initialCap", value)}
            />
            <Field
              id="arm-periodic-cap"
              label={ARM_FIELD_LABELS.periodicCap}
              value={armDraft.periodicCap}
              suffix="%"
              invalid={invalidField === "periodicCap"}
              onInput={(value) => updateArm("periodicCap", value)}
            />
            <Field
              id="arm-lifetime-cap"
              label={ARM_FIELD_LABELS.lifetimeCap}
              value={armDraft.lifetimeCap}
              suffix="%"
              invalid={invalidField === "lifetimeCap"}
              onInput={(value) => updateArm("lifetimeCap", value)}
            />
            <Field
              id="arm-floor"
              label={ARM_FIELD_LABELS.floor}
              value={armDraft.floor}
              suffix="%"
              invalid={invalidField === "floor"}
              onInput={(value) => updateArm("floor", value)}
            />
            <Field
              id="arm-initial-floor"
              label={ARM_FIELD_LABELS.initialFloor}
              value={armDraft.initialFloor}
              suffix="%"
              invalid={invalidField === "initialFloor"}
              onInput={(value) => updateArm("initialFloor", value)}
            />
          </div>
          <label class="arm-check" for="arm-round-eighth">
            <input
              id="arm-round-eighth"
              type="checkbox"
              checked={armSaved.roundEighth}
              onChange={(event) => setRoundEighth(event.currentTarget.checked)}
            />
            Round to nearest 1/8 point
          </label>
          <p class="arm-computed" data-line="arm-ceiling">
            {`Ceiling ${formatPercentThousandths(rateThousandths + armParsed.values.lifetimeCapThousandths)}%`}
          </p>
          <p class="arm-computed" data-line="arm-first-adjustment">
            {`First adjustment ${armDateLabel(loan, armParsed.values.fixedMonths + 1)} (payment ${armParsed.values.fixedMonths + 1})`}
          </p>
        </Disclosure>
      ) : null}
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
              line="origination"
              label="Lender origination fee"
              amount={lines.originationCents}
              rate={
                <PictureInput
                  id="picture-origination"
                  label="Lender origination"
                  value={pictureDraft.origination}
                  invalid={pictureInvalid === "origination"}
                  suffix="%"
                  onInput={(value) => updatePicture("origination", value)}
                />
              }
            />
            <MoneyRow
              line="processing"
              label="Lender processing fee"
              amount={lines.processingCents}
              rate={
                <PictureInput
                  id="picture-processing"
                  label="Lender processing fee"
                  value={pictureDraft.processing}
                  invalid={pictureInvalid === "processing"}
                  prefix="$"
                  onInput={(value) => updatePicture("processing", value)}
                />
              }
            />
            <MoneyRow
              line="appraisal"
              label="Conventional appraisal"
              amount={lines.appraisalCents}
              rate={
                <PictureInput
                  id="picture-appraisal"
                  label="Conventional appraisal"
                  value={pictureDraft.appraisal}
                  invalid={pictureInvalid === "appraisal"}
                  prefix="$"
                  onInput={(value) => updatePicture("appraisal", value)}
                />
              }
            />
            <MoneyRow
              line="title"
              label="Title and escrow"
              amount={lines.titleCents}
              rate={
                <PictureInput
                  id="picture-title"
                  label="Title and escrow"
                  value={pictureDraft.title}
                  invalid={pictureInvalid === "title"}
                  suffix="%"
                  onInput={(value) => updatePicture("title", value)}
                />
              }
            />
            <MoneyRow
              line="recording"
              label="Recording and taxes"
              amount={lines.recordingCents}
              rate={
                <PictureInput
                  id="picture-recording"
                  label="Recording and taxes"
                  value={pictureDraft.recording}
                  invalid={pictureInvalid === "recording"}
                  prefix="$"
                  onInput={(value) => updatePicture("recording", value)}
                />
              }
            />
            <MoneyRow
              line="prepaid-insurance"
              label="Prepaid home insurance"
              amount={lines.prepaidInsuranceCents}
              rate={
                <PictureInput
                  id="picture-insurance-months"
                  label="Prepaid home insurance months"
                  value={pictureDraft.insuranceMonths}
                  invalid={pictureInvalid === "insuranceMonths"}
                  onInput={(value) => updatePicture("insuranceMonths", value)}
                />
              }
            />
            <MoneyRow
              line="prepaid-interest"
              label="Prepaid interest"
              amount={lines.prepaidInterestCents}
              rate={
                <span class="picture-interest-row">
                  <PictureInput
                    id="picture-interest-days"
                    label="Prepaid interest days"
                    value={pictureDraft.interestDays}
                    invalid={pictureInvalid === "interestDays"}
                    onInput={(value) => updatePicture("interestDays", value)}
                  />
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
              line="prepaid-tax"
              label="Prepaid property taxes"
              amount={lines.prepaidTaxCents}
              rate={
                <PictureInput
                  id="picture-tax-months"
                  label="Prepaid property tax months"
                  value={pictureDraft.taxMonths}
                  invalid={pictureInvalid === "taxMonths"}
                  onInput={(value) => updatePicture("taxMonths", value)}
                />
              }
            />
            <MoneyRow
              line="cushion"
              label="Escrow cushion"
              amount={lines.cushionCents}
              rate={
                <PictureInput
                  id="picture-cushion"
                  label="Escrow cushion"
                  value={pictureDraft.cushion}
                  invalid={pictureInvalid === "cushion"}
                  prefix="$"
                  onInput={(value) => updatePicture("cushion", value)}
                />
              }
            />
            <MoneyRow line="closing" label="Total closing costs" amount={lines.closingCents} />
            <MoneyRow line="cash-to-close" label="Total cash to close" amount={lines.cashToCloseCents} />
          </tbody>
        </table>
        {pictureError ? (
          <p class="error" role="alert">
            {pictureError}
          </p>
        ) : null}
      </Disclosure>
      <Schedule
        years={years}
        prevailingExtraCents={activeFigures?.prevailingExtraCents ?? 0}
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
    </main>
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

function armDateLabel(loan: Loan, paymentNumber: number): string {
  const date = paymentDate(loan.startMonth, paymentNumber);
  return longDate(date.year, date.month);
}

function MoneyRow(props: {
  line: string;
  label: string;
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

function Field(props: {
  id: string;
  label: string;
  value: string;
  suffix?: string;
  invalid: boolean;
  edited?: boolean;
  onInput: (value: string) => void;
}) {
  return (
    <div class="field">
      <label for={props.id}>{props.label}</label>
      <div class="control">
        <input
          id={props.id}
          inputMode="decimal"
          autoComplete="off"
          value={props.value}
          aria-invalid={props.invalid}
          data-edited={props.edited ? "true" : undefined}
          onInput={(event) => props.onInput(event.currentTarget.value)}
          onChange={(event) => props.onInput(event.currentTarget.value)}
        />
        {props.suffix ? <span aria-hidden="true">{props.suffix}</span> : null}
      </div>
    </div>
  );
}
