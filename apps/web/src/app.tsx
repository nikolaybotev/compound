import { useMemo, useState } from "preact/hooks";
import { Chart, type ChartBar } from "./chart";
import {
  bands,
  firstPaymentYear,
  formatMoney,
  groupByYear,
  loadDraft,
  loanReport,
  longDate,
  parseLoan,
  paymentDate,
  saveDraft,
  shortDate,
  type Loan,
  type LoanDraft,
} from "./loan";
import { Schedule } from "./schedule";

function readInitial(): { draft: LoanDraft; loan: Loan } {
  const draft = loadDraft(typeof localStorage === "undefined" ? undefined : localStorage);
  const parsed = parseLoan(draft);
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }
  return { draft, loan: parsed.loan };
}

export function App() {
  const initial = useState(readInitial)[0];
  const [draft, setDraft] = useState(initial.draft);
  const [loan, setLoan] = useState(initial.loan);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [openYears, setOpenYears] = useState<Set<number>>(
    () => new Set([firstPaymentYear(initial.loan)]),
  );

  const report = useMemo(() => loanReport(loan), [loan]);
  const years = useMemo(() => groupByYear(report, loan.startMonth), [report, loan.startMonth]);
  const payoff = paymentDate(loan.startMonth, report.payoff_month);
  const bars: ChartBar[] = report.schedule.slice(0, report.payoff_month).map((row) => {
    const date = paymentDate(loan.startMonth, row.month);
    const split = bands(report, row);
    return {
      month: row.month,
      dateLabel: shortDate(date.year, date.month),
      paymentPrincipal: row.principal_cents,
      paymentInterest: row.interest_cents,
      paymentExtra: 0,
      total: report.amount_cents + report.interest_cents,
      ...split,
    };
  });

  function update(field: keyof LoanDraft, value: string) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    const parsed = parseLoan(next);
    if (parsed.ok) {
      setLoan(parsed.loan);
      setError(null);
      setInvalidField(null);
      saveDraft(localStorage, next);
      return;
    }
    setError(parsed.message);
    setInvalidField(parsed.field);
  }

  function toggleYear(year: number) {
    setOpenYears((current) => {
      const next = new Set(current);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  function toggleAll() {
    setOpenYears((current) => {
      const every = years.every((year) => current.has(year.year));
      return every ? new Set() : new Set(years.map((year) => year.year));
    });
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
        </dl>
      </section>
      <Chart bars={bars} />
      <Schedule
        years={years}
        openYears={openYears}
        onToggleYear={toggleYear}
        onToggleAll={toggleAll}
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
