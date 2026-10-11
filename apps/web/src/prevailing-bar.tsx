import { formatMoney } from "./loan";

type Props = {
  modalCents: number;
  taxCents: number;
  insuranceCents: number;
  pmiCents: number;
  prevailingExtraCents: number;
  variant: "heading" | "dropdown" | "summary";
};

export function PrevailingBar({
  modalCents,
  taxCents,
  insuranceCents,
  pmiCents,
  prevailingExtraCents,
  variant,
}: Props) {
  const tiCents = taxCents + insuranceCents + pmiCents;
  const segments = [
    { className: "prevailing-pi", cents: modalCents, label: "PI" },
    { className: "prevailing-ti", cents: tiCents, label: "TI" },
    { className: "prevailing-pe", cents: prevailingExtraCents, label: "PE" },
  ].filter((segment) => segment.cents > 0);

  if (variant === "summary") {
    const ariaLabel = segments
      .map((segment) => {
        if (segment.label === "PI") {
          return `Principal and interest ${formatMoney(segment.cents)}`;
        }
        if (segment.label === "TI") {
          return `Taxes and insurance ${formatMoney(segment.cents)}`;
        }
        return `Prevailing extra ${formatMoney(segment.cents)}`;
      })
      .join(", ");
    return (
      <div class="summary-prevailing">
        <div class="summary-prevailing-labels" aria-hidden="true">
          {segments.map((segment) => (
            <span key={segment.label} class={`summary-prevailing-tag ${segment.className}`}>
              {formatMoney(segment.cents)} {segment.label}
            </span>
          ))}
        </div>
        <span
          class="prevailing-bar prevailing-bar--summary"
          role="img"
          aria-label={ariaLabel}
        >
          {segments.map((segment) => (
            <span
              key={segment.className}
              class={`prevailing-segment ${segment.className}`}
              style={{ flexGrow: segment.cents }}
            />
          ))}
        </span>
      </div>
    );
  }

  const heading = variant === "heading";
  const ariaLabel = heading
    ? `Principal and interest ${formatMoney(modalCents)}, taxes and insurance ${formatMoney(tiCents)}, prevailing extra ${formatMoney(prevailingExtraCents)}`
    : undefined;
  return (
    <span
      class={`prevailing-bar prevailing-bar--${variant}`}
      role={heading ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={heading ? undefined : true}
    >
      {segments.map((segment) => (
        <span
          key={segment.className}
          class={`prevailing-segment ${segment.className}`}
          style={{ flexGrow: segment.cents }}
        />
      ))}
    </span>
  );
}
