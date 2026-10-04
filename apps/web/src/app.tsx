import { useMemo, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { Chart, type ChartBar } from "./chart";
import { Disclosure } from "./disclosure";
import {
  MONTH_NAMES,
  THOUSANDS_MESSAGE,
  bands,
  buildPrefillMap,
  dollarsToThousandsText,
  dropExtrasBeyond,
  extraInputValue,
  firstPaymentYear,
  formatMoney,
  groupByYear,
  isTrailingDotThousands,
  loadScenario,
  loanReport,
  longDate,
  parseDollarField,
  parseLoan,
  paymentDate,
  saveScenario,
  shortDate,
  thousandsToDollarString,
  type Loan,
  type LoanDraft,
  type Prefill,
  type Scenario,
} from "./loan";
import {
  buildPicture,
  formatWholeDollars,
  parsePicture,
  type PictureInputField,
  type PictureValues,
} from "./picture";
import { Schedule } from "./schedule";
import { dollarsToCents } from "../../../amortize.js";

const MONTHLY_AMOUNT = "Additional amount to monthly payment";
const YEARLY_AMOUNT = "Additional yearly payment";
const PROPERTY_TAX_NOTE = "Nashua: 1.683%; Brentwood: 1.32%.";

function readInitial(): Scenario & { loan: Loan; pictureValues: PictureValues } {
  const scenario = loadScenario(typeof localStorage === "undefined" ? undefined : localStorage);
  const parsed = parseLoan(scenario.draft);
  if (!parsed.ok) throw new Error(parsed.message);
  const picture = parsePicture(scenario.picture);
  if (!picture.ok) throw new Error(picture.message);
  return { ...scenario, loan: parsed.loan, pictureValues: picture.values };
}

export function App() {
  const initial = useState(readInitial)[0];
  const [draft, setDraft] = useState(initial.draft);
  const [validText, setValidText] = useState({ down: initial.draft.down, rate: initial.draft.rate });
  const [loan, setLoan] = useState(initial.loan);
  const [priceText, setPriceText] = useState(() => dollarsToThousandsText(initial.draft.price));
  const [extras, setExtras] = useState(initial.extras);
  const [prefill, setPrefill] = useState(initial.prefill);
  const [pictureDraft, setPictureDraft] = useState(initial.picture);
  const [pictureSaved, setPictureSaved] = useState(initial.picture);
  const [pictureValues, setPictureValues] = useState(initial.pictureValues);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [pictureInvalid, setPictureInvalid] = useState<PictureInputField | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [openYears, setOpenYears] = useState<Set<number>>(() =>
    initial.openYears ? new Set(initial.openYears) : new Set([firstPaymentYear(initial.loan)]),
  );
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const snapshot = useRef<Scenario>({
    draft: initial.draft,
    extras: initial.extras,
    prefill: initial.prefill,
    openYears: initial.openYears ?? [firstPaymentYear(initial.loan)],
    picture: initial.picture,
  });

  function persist(patch: Partial<Scenario>) {
    const next: Scenario = {
      draft: patch.draft ?? snapshot.current.draft,
      extras: patch.extras ?? snapshot.current.extras,
      prefill: patch.prefill ?? snapshot.current.prefill,
      openYears: patch.openYears === undefined ? snapshot.current.openYears : patch.openYears,
      picture: patch.picture ?? snapshot.current.picture,
    };
    snapshot.current = next;
    saveScenario(localStorage, next);
  }

  const lines = useMemo(
    () => buildPicture(loan, validText.rate, validText.down, pictureValues),
    [loan, validText, pictureValues],
  );
  const report = useMemo(
    () => loanReport(loan, extras, lines.financedCents),
    [loan, extras, lines.financedCents],
  );
  const years = useMemo(
    () => groupByYear(loan, report, extras, lines.financedCents),
    [loan, report, extras, lines.financedCents],
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
    const kept = dropExtrasBeyond(extras, parsed.loan.years * 12);
    setValidText({ down: next.down, rate: next.rate });
    setLoan(parsed.loan);
    setExtras(kept);
    setError(null);
    setInvalidField(null);
    persist({ draft: next, extras: kept });
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
    const parsed = parsePicture(next);
    if (!parsed.ok) {
      setPictureError(parsed.message);
      setPictureInvalid(parsed.field);
      return;
    }
    const saved = { ...next, open: pictureDraft.open };
    setPictureValues(parsed.values);
    setPictureSaved(saved);
    setPictureError(null);
    setPictureInvalid(null);
    persist({ picture: saved });
  }

  function setPictureOpen(open: boolean) {
    const saved = { ...pictureSaved, open };
    setPictureSaved(saved);
    setPictureDraft({ ...pictureDraft, open });
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
    setEditingMonth(null);
    persist({ extras: next });
  }

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
      <h1>Amortization</h1>
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
        <span>% fixed = </span>
        <span class="complete-payment" aria-label="Complete monthly payment">
          {formatWholeDollars(lines.headingDollars)}
        </span>
        <span> / month</span>
      </p>
      <div class="inputs">
        <Field
          id="years"
          label="Term"
          value={draft.years}
          suffix="years"
          invalid={invalidField === "years"}
          onInput={(value) => update("years", value)}
        />
        <div class="field">
          <label for="start">Start month</label>
          <input
            id="start"
            type="month"
            value={draft.start}
            aria-invalid={invalidField === "start"}
            onInput={(event) => update("start", event.currentTarget.value)}
          />
        </div>
      </div>
      {error ? (
        <p class="error" role="alert">
          {error}
        </p>
      ) : null}
      <section class="summary" aria-label="Loan summary">
        <div class="payment-block" role="region" aria-label="Monthly payment">
          <h2>Monthly payment</h2>
          <p class="money payment">{formatMoney(report.monthly_payment_cents)}</p>
          <p class="note">The extra payment is on top of this amount.</p>
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
            <dd class="money">{longDate(payoff.year, payoff.month)}</dd>
          </div>
          {extras.size > 0 ? (
            <div role="region" aria-label="Interest saved">
              <dt>Interest saved</dt>
              <dd class="money">{formatMoney(report.interest_saved_cents)}</dd>
            </div>
          ) : null}
          {extras.size > 0 ? (
            <div role="region" aria-label="Months saved">
              <dt>Months saved</dt>
              <dd class="money">{report.months_saved}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      <Chart bars={bars} />
      <Disclosure
        className="prefill"
        title="Make extra payments"
        open={prefill.open}
        onToggle={(open) => changePrefill({ open })}
      >
        <div class="prefill-panel">
          <p>Apply replaces the extra-payment column.</p>
          <div class="inputs">
            <Field
              id="extra-monthly"
              label={MONTHLY_AMOUNT}
              value={prefill.monthly}
              invalid={false}
              onInput={(value) => changePrefill({ monthly: value })}
            />
            <Field
              id="extra-yearly"
              label={YEARLY_AMOUNT}
              value={prefill.yearly}
              invalid={false}
              onInput={(value) => changePrefill({ yearly: value })}
            />
            <div class="field">
              <label for="extra-yearly-month">Month of year</label>
              <select
                id="extra-yearly-month"
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
          <button type="button" onClick={applyPrefill}>
            Apply
          </button>
          {applyError ? (
            <p class="error" role="alert">
              {applyError}
            </p>
          ) : null}
        </div>
      </Disclosure>
      <Disclosure
        className="picture"
        title="Monthly payment and closing costs"
        open={pictureDraft.open}
        onToggle={setPictureOpen}
      >
        <p class="loan-type">Conventional</p>
        <table class="picture-table">
          <tbody>
            <MoneyRow line="purchase-price" label="Purchase price" amount={lines.priceCents} />
            <MoneyRow line="down-payment" label="Down payment" amount={lines.downCents} />
            <MoneyRow line="base-loan" label="Base loan amount" amount={lines.baseCents} />
            <MoneyRow
              line="upfront-mip"
              label="Upfront MIP"
              amount={lines.upfrontMipCents}
              rate={
                <PictureInput
                  id="picture-upfront"
                  label="FHA upfront MIP"
                  value={pictureDraft.upfrontMip}
                  invalid={pictureInvalid === "upfrontMip"}
                  onInput={(value) => updatePicture("upfrontMip", value)}
                />
              }
            />
            <MoneyRow
              line="financed"
              label="Total loan amount financed"
              amount={lines.financedCents}
            />
            <MoneyRow
              line="principal-and-interest"
              label="Principal and interest"
              amount={lines.principalAndInterestCents}
            />
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
                  onInput={(value) => updatePicture("insurance", value)}
                />
              }
            />
            <MoneyRow
              line="fha-mip"
              label="FHA MIP"
              amount={lines.fhaMipCents}
              rate={<span>{lines.fhaMipRateText}</span>}
            />
            <MoneyRow
              line="pmi"
              label="Conventional PMI (Private Mortgage Insurance)"
              amount={lines.pmiCents}
              rate={<span>{lines.pmiRateText}</span>}
            />
            <MoneyRow line="total-monthly" label="Total monthly payment" amount={lines.totalMonthlyCents} />
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
                  onInput={(value) => updatePicture("recording", value)}
                />
              }
            />
            <MoneyRow
              line="prepaid-insurance"
              label="Prepaid home insurance"
              amount={lines.prepaidInsuranceCents}
            />
            <MoneyRow line="prepaid-interest" label="Prepaid interest" amount={lines.prepaidInterestCents} />
            <MoneyRow line="prepaid-tax" label="Prepaid property taxes" amount={lines.prepaidTaxCents} />
            <MoneyRow line="cushion" label="Escrow cushion" amount={lines.cushionCents} />
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
        openYears={openYears}
        editingMonth={editingMonth}
        editingValue={editingValue}
        onToggleYear={toggleYear}
        onToggleAll={toggleAll}
        onEdit={(month, value) => {
          setEditingMonth(month);
          setEditingValue(value);
        }}
        onCommit={commitExtra}
      />
    </main>
  );
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
  onInput: (value: string) => void;
}) {
  return (
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
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  suffix?: string;
  invalid: boolean;
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
          onInput={(event) => props.onInput(event.currentTarget.value)}
        />
        {props.suffix ? <span aria-hidden="true">{props.suffix}</span> : null}
      </div>
    </div>
  );
}
