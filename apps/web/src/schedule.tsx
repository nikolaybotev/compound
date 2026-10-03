import { extraInputValue, formatMoney, type ScheduleYear } from "./loan";

type Props = {
  years: ScheduleYear[];
  openYears: Set<number>;
  editingMonth: number | null;
  editingValue: string;
  onToggleYear: (year: number) => void;
  onToggleAll: () => void;
  onEdit: (month: number, value: string) => void;
  onCommit: (month: number) => void;
};

export function Schedule({
  years,
  openYears,
  editingMonth,
  editingValue,
  onToggleYear,
  onToggleAll,
  onEdit,
  onCommit,
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
              <th scope="col">Principal</th>
              <th scope="col">Interest</th>
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
                  <td class="money">{formatMoney(year.principalCents)}</td>
                  <td class="money">{formatMoney(year.interestCents)}</td>
                  <td class="money">{formatMoney(year.extraCents)}</td>
                  <td />
                  <td class="money">{formatMoney(year.principalBalanceCents)}</td>
                  <td class="money">{formatMoney(year.interestBalanceCents)}</td>
                </tr>
                {open
                  ? year.rows.map((row) => (
                      <tr key={row.month}>
                        <td class="money">{row.month}</td>
                        <td>{row.dateLabel}</td>
                        <td class="money">{formatMoney(row.principalCents)}</td>
                        <td class="money">{formatMoney(row.interestCents)}</td>
                        <td>
                          <input
                            class="extra"
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
