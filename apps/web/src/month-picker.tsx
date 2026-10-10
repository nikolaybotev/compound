import { useEffect, useRef, useState } from "preact/hooks";
import { longDate, MONTH_NAMES, SHORT_MONTHS } from "./loan";

const MIN_YEAR = 1000;
const MAX_YEAR = 9999;

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  closeSignal?: number;
};

function parseValue(value: string): { year: number; month: number } | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function clampYear(year: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
}

export function MonthPicker({ id, value, onChange, closeSignal = 0 }: Props) {
  const parsed = parseValue(value);
  const [open, setOpen] = useState(false);
  const [shownYear, setShownYear] = useState(() => clampYear(parsed?.year ?? MIN_YEAR));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [closeSignal]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (cardRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      const label = document.querySelector(`label[for="${id}"]`);
      if (label?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, id]);

  function toggle() {
    if (!open) setShownYear(clampYear(parsed?.year ?? MIN_YEAR));
    setOpen(!open);
  }

  function choose(monthIndex: number) {
    onChange(`${String(shownYear).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}`);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div class="month-picker-anchor">
      <button
        id={id}
        ref={triggerRef}
        type="button"
        class="month-button"
        data-value={value}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        {parsed ? longDate(parsed.year, parsed.month) : value}
      </button>
      {open ? (
        <div class="month-picker" role="dialog" aria-label="Choose start month" ref={cardRef}>
          <div class="month-picker-year">
            <button
              type="button"
              aria-label="Previous year"
              disabled={shownYear <= MIN_YEAR}
              onClick={() => setShownYear(clampYear(shownYear - 1))}
            >
              ◀
            </button>
            <span>{shownYear}</span>
            <button
              type="button"
              aria-label="Next year"
              disabled={shownYear >= MAX_YEAR}
              onClick={() => setShownYear(clampYear(shownYear + 1))}
            >
              ▶
            </button>
          </div>
          <div class="month-picker-grid">
            {SHORT_MONTHS.map((short, index) => (
              <button
                key={short}
                type="button"
                aria-label={`${MONTH_NAMES[index]} ${shownYear}`}
                aria-pressed={parsed !== null && parsed.year === shownYear && parsed.month === index + 1}
                onClick={() => choose(index)}
              >
                {short}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
