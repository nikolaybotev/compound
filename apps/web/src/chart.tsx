import { useEffect, useRef, useState } from "preact/hooks";
import { HoodedFigure, PiggyBank } from "./icons";
import { formatMoney, type BandAmounts } from "./loan";

export type ChartBar = BandAmounts & {
  month: number;
  dateLabel: string;
  paymentPrincipal: number;
  paymentInterest: number;
  paymentExtra: number;
  total: number;
};

type Props = {
  bars: ChartBar[];
};

const COLORS = {
  principalPaid: "#1B7A4D",
  interestPaid: "#C5362B",
  loanBalance: "#2A4365",
  interestRemaining: "#D9A441",
} as const;

function stackHeights(bar: ChartBar): number[] {
  const parts = [bar.principalPaid, bar.interestPaid, bar.loanBalance, bar.interestRemaining];
  if (bar.total <= 0) return [0, 0, 0, 0];
  const heights = parts.map((cents) => (cents / bar.total) * 1000);
  const drift = 1000 - heights.reduce((sum, height) => sum + height, 0);
  heights[3] += drift;
  return heights;
}

function monthAt(element: HTMLElement, clientX: number, count: number): number {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || count <= 0) return 1;
  const ratio = (clientX - rect.left) / rect.width;
  const index = Math.floor(ratio * count);
  return Math.min(count, Math.max(1, index + 1));
}

export function Chart({ bars }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const [width, setWidth] = useState(0);
  const count = bars.length;
  const indicated = bars.find((bar) => bar.month === month) ?? null;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (month === null) return;
    const onDown = (event: PointerEvent) => {
      const element = ref.current;
      if (element && event.target instanceof Node && !element.contains(event.target)) {
        setMonth(null);
        setPinned(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [month]);

  const cardWidth = Math.min(348, Math.max(0, width - 16));
  const center = indicated ? ((indicated.month - 0.5) / count) * width : 0;
  const beside = center < width / 2 ? center + 36 : center - cardWidth - 36;
  const cardLeft = Math.max(8, Math.min(Math.max(8, width - cardWidth - 8), beside));

  return (
    <div
      class="chart"
      data-testid="chart"
      tabIndex={0}
      ref={ref}
      role="group"
      aria-label="Amortization chart"
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse" || !ref.current) return;
        const legend = ref.current.querySelector("[data-testid='legend']");
        if (legend && event.target instanceof Node && legend.contains(event.target)) return;
        setMonth(monthAt(ref.current, event.clientX, count));
      }}
      onPointerLeave={() => {
        if (!pinned) setMonth(null);
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch" || !ref.current) return;
        setPinned(true);
        setMonth(monthAt(ref.current, event.clientX, count));
      }}
      onFocus={() => {
        setMonth((current) => current ?? 1);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        setPinned(true);
        setMonth((current) => {
          const base = current ?? 1;
          const next = event.key === "ArrowRight" ? base + 1 : base - 1;
          return Math.min(count, Math.max(1, next));
        });
      }}
    >
      <svg
        class="bands"
        viewBox={`0 0 ${Math.max(count, 1)} 1000`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {bars.map((bar) => {
          const heights = stackHeights(bar);
          let y = 1000;
          const fills = [
            COLORS.principalPaid,
            COLORS.interestPaid,
            COLORS.loanBalance,
            COLORS.interestRemaining,
          ];
          return (
            <g key={bar.month} data-bar={bar.month}>
              {heights.map((height, index) => {
                y -= height;
                if (height <= 0) return null;
                return (
                  <rect
                    key={fills[index]}
                    x={bar.month - 1}
                    y={y}
                    width="1"
                    height={height}
                    fill={fills[index]}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      {indicated ? <BarIcons bar={indicated} count={count} /> : null}
      {indicated ? (
        <div class="legend" data-testid="legend" style={{ left: `${cardLeft}px`, width: `${cardWidth}px` }}>
          <h2>{indicated.dateLabel}</h2>
          <ul class="legend-list">
            <li>
              <PiggyBank class="icon" />
              <span class="swatch" style={{ background: COLORS.principalPaid }} />
              <span>Principal paid</span>
              <span class="money">{formatMoney(indicated.principalPaid)}</span>
            </li>
            <li>
              <HoodedFigure class="icon" />
              <span class="swatch" style={{ background: COLORS.interestPaid }} />
              <span>Interest paid</span>
              <span class="money">{formatMoney(indicated.interestPaid)}</span>
            </li>
            <li>
              <span />
              <span class="swatch" style={{ background: COLORS.loanBalance }} />
              <span>Loan balance</span>
              <span class="money">{formatMoney(indicated.loanBalance)}</span>
            </li>
            <li>
              <span />
              <span class="swatch" style={{ background: COLORS.interestRemaining }} />
              <span>Interest remaining</span>
              <span class="money">{formatMoney(indicated.interestRemaining)}</span>
            </li>
          </ul>
          <p class="this-payment">This payment</p>
          <ul class="legend-list payment-split">
            <li>
              <span>Principal</span>
              <span class="money">{formatMoney(indicated.paymentPrincipal)}</span>
            </li>
            <li>
              <span>Interest</span>
              <span class="money">{formatMoney(indicated.paymentInterest)}</span>
            </li>
            <li>
              <span>Extra principal</span>
              <span class="money">{formatMoney(indicated.paymentExtra)}</span>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BarIcons({ bar, count }: { bar: ChartBar; count: number }) {
  const total = bar.total;
  const principalCenter = total <= 0 ? 1 : 1 - bar.principalPaid / 2 / total;
  const interestCenter =
    total <= 0 ? 1 : 1 - (bar.principalPaid + bar.interestPaid / 2) / total;
  const left = `${((bar.month - 0.5) / count) * 100}%`;
  return (
    <>
      <PiggyBank class="icon bar-icon" style={{ left, top: `${principalCenter * 100}%` }} />
      <HoodedFigure class="icon bar-icon" style={{ left, top: `${interestCenter * 100}%` }} />
    </>
  );
}
