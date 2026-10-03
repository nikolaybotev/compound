import { useMemo, useRef, useState } from "preact/hooks";
import { Chart, type ChartBar } from "./chart";
import {
  MONTH_NAMES,
  bands,
  buildPrefillMap,
  dropExtrasBeyond,
  extraInputValue,
  firstPaymentYear,
  formatMoney,
  groupByYear,
  loadScenario,
  loanReport,
  longDate,
  parseDollarField,
  parseLoan,
  paymentDate,
  saveScenario,
  shortDate,
  type Loan,
  type LoanDraft,
  type Prefill,
  type Scenario,
} from "./loan";
import { Schedule } from "./schedule";
import { dollarsToCents } from "../../../amortize.js";

const MONTHLY_AMOUNT = "Additional amount to monthly payment";
const YEARLY_AMOUNT = "Additional yearly payment";

function readInitial(): Scenario & { loan: Loan } {
  const scenario = loadScenario(typeof localStorage === "undefined" ? undefined : localStorage);
  const parsed = parseLoan(scenario.draft);
  if (!parsed.ok) throw new Error(parsed.message);
  return { ...scenario, loan: parsed.loan };
}

export function App() {
  const initial = useState(readInitial)[0];
  const [draft, setDraft] = useState(initial.draft);
  const [loan, setLoan] = useState(initial.loan);
  const [extras, setExtras] = useState(initial.extras);
  const [prefill, setPrefill] = useState(initial.prefill);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
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
  });

  function persist(patch: Partial<Scenario>) {
    const next: Scenario = {
      draft: patch.draft ?? snapshot.current.draft,
      extras: patch.extras ?? snapshot.current.extras,
      prefill: patch.prefill ?? snapshot.current.prefill,
      openYears: patch.openYears === undefined ? snapshot.current.openYears : patch.openYears,
    };
    snapshot.current = next;
    saveScenario(localStorage, next);
  }

  const report = useMemo(() => loanReport(loan, extras), [loan, extras]);
  const years = useMemo(
    () => groupByYear(report, loan.startMonth, extras),
    [report, loan.startMonth, extras],
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
      setError(parsed.message);
      setInvalidField(parsed.field);
      return;
    }
    const kept = dropExtrasBeyond(extras, parsed.loan.years * 12);
    setLoan(parsed.loan);
    setExtras(kept);
    setError(null);
    setInvalidField(null);
    persist({ draft: next, extras: kept });
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
      <div class="inputs">
        <Field
          id="price"
          label="Purchase price"
          value={draft.price}
          invalid={invalidField === "price"}
          onInput={(value) => update("price", value)}
        />
        <Field
          id="down"
          label="Down payment"
          value={draft.down}
          suffix="%"
          invalid={invalidField === "down" || invalidField === "loan"}
          onInput={(value) => update("down", value)}
        />
        <Field
          id="years"
          label="Term"
          value={draft.years}
          suffix="years"
          invalid={invalidField === "years"}
          onInput={(value) => update("years", value)}
        />
        <Field
          id="rate"
          label="Interest"
          value={draft.rate}
          suffix="%"
          invalid={invalidField === "rate"}
          onInput={(value) => update("rate", value)}
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
      <section class="prefill">
        <button
          type="button"
          aria-expanded={prefill.open}
          onClick={() => changePrefill({ open: !prefill.open })}
        >
          Make extra payments
        </button>
        <div class="prefill-panel" hidden={!prefill.open}>
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
      </section>
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
