import { extraInputValue, formatMoney, indexInputValue, type ScheduleYear } from "./loan";

type Props = {
  years: ScheduleYear[];
  openYears: Set<number>;
  editingMonth: number | null;
  editingValue: string;
  arm: boolean;
  editingIndexMonth: number | null;
  editingIndexValue: string;
  onToggleYear: (year: number) => void;
  onToggleAll: () => void;
  onEdit: (month: number, value: string) => void;
  onCommit: (month: number) => void;
  onIndexEdit: (month: number, value: string) => void;
  onIndexCommit: (month: number) => void;
};

export function Schedule({
  years,
  openYears,
  editingMonth,
  editingValue,
  arm,
  editingIndexMonth,
  editingIndexValue,
  onToggleYear,
  onToggleAll,
  onEdit,
  onCommit,
  onIndexEdit,
  onIndexCommit,
}: Props) {
  const allOpen = years.length > 0 && years.every((year) => openYears.has(year.year));
  return (
    <section class="schedule" aria-labelledby="schedule-heading">
      <div class="schedule-head">
        <h2 id="schedule-heading">Schedule</h2>
        <button type="button" aria-pressed={allOpen} onClick={onToggleAll}>
          Expand all years
        </button>
      </div>
      <div class="schedule-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Date</th>
              {arm ? <th scope="col">Rate</th> : null}
              {arm ? <th scope="col">Payment</th> : null}
              <th scope="col">Principal</th>
              <th scope="col">Interest</th>
              {arm ? <th scope="col">Index</th> : null}
              <th scope="col">Extra payment</th>
              <th scope="col">Saved by extra</th>
              <th scope="col">Principal balance</th>
              <th scope="col">Interest balance</th>
            </tr>
          </thead>
          {years.map((year) => {
            const open = openYears.has(year.year);
            return (
              <tbody key={year.year} data-year={year.year}>
                <tr class="year-row" onClick={() => onToggleYear(year.year)}>
                  <td>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleYear(year.year);
                      }}
                    >
                      {year.year}
                    </button>
                  </td>
                  <td />
                  {arm ? <td /> : null}
                  {arm ? <td /> : null}
                  <td class="money">{formatMoney(year.principalCents)}</td>
                  <td class="money">{formatMoney(year.interestCents)}</td>
                  {arm ? <td /> : null}
                  <td class="money">{formatMoney(year.extraCents)}</td>
                  <td class="money">{formatMoney(year.savedByExtraCents)}</td>
                  <td class="money">{formatMoney(year.principalBalanceCents)}</td>
                  <td class="money">{formatMoney(year.interestBalanceCents)}</td>
                </tr>
                {open
                  ? year.rows.map((row) => (
                      <tr key={row.month}>
                        <td class="money">{row.month}</td>
                        <td>{row.dateLabel}</td>
                        {arm ? (
                          <td class="money">
                            {row.ratePercent === null ? "" : `${row.ratePercent}%`}
                          </td>
                        ) : null}
                        {arm ? (
                          <td class="money">
                            {row.paymentCents === null ? "" : formatMoney(row.paymentCents)}
                          </td>
                        ) : null}
                        <td class="money">{formatMoney(row.principalCents)}</td>
                        <td class="money">{formatMoney(row.interestCents)}</td>
                        {arm ? (
                          <td>
                            {row.isReset ? (
                              <input
                                class="extra index"
                                aria-label={`Index for month ${row.month}`}
                                inputMode="decimal"
                                autoComplete="off"
                                value={
                                  editingIndexMonth === row.month
                                    ? editingIndexValue
                                    : indexInputValue(row.indexPercent)
                                }
                                onFocus={() => onIndexEdit(row.month, indexInputValue(row.indexPercent))}
                                onInput={(event) => onIndexEdit(row.month, event.currentTarget.value)}
                                onBlur={() => onIndexCommit(row.month)}
                                onKeyDown={(event) => {
                                  if (event.key !== "Enter") return;
                                  event.preventDefault();
                                  event.currentTarget.blur();
                                }}
                              />
                            ) : null}
                          </td>
                        ) : null}
                        <td>
                          <input
                            class="extra"
                            data-edited={row.edited ? "true" : undefined}
                            aria-label={`Extra payment for month ${row.month}`}
                            inputMode="decimal"
                            autoComplete="off"
                            value={editingMonth === row.month ? editingValue : extraInputValue(row.extraDollars)}
                            onFocus={() => onEdit(row.month, extraInputValue(row.extraDollars))}
                            onInput={(event) => onEdit(row.month, event.currentTarget.value)}
                            onBlur={() => onCommit(row.month)}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") return;
                              event.preventDefault();
                              event.currentTarget.blur();
                            }}
                          />
                        </td>
                        <td class="money">{formatMoney(row.savedByExtraCents)}</td>
                        <td class="money">{formatMoney(row.principalBalanceCents)}</td>
                        <td class="money">{formatMoney(row.interestBalanceCents)}</td>
                      </tr>
                    ))
                  : null}
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}
