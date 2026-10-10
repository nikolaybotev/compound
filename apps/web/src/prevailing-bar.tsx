import { formatMoney } from "./loan";

type Props = {
  modalCents: number;
  taxCents: number;
  insuranceCents: number;
  fhaMipCents: number;
  pmiCents: number;
  prevailingExtraCents: number;
  variant: "heading" | "dropdown";
};

export function PrevailingBar({
  modalCents,
  taxCents,
  insuranceCents,
  fhaMipCents,
  pmiCents,
  prevailingExtraCents,
  variant,
}: Props) {
  const tiCents = taxCents + insuranceCents + fhaMipCents + pmiCents;
  const segments = [
    { className: "prevailing-pi", cents: modalCents },
    { className: "prevailing-ti", cents: tiCents },
    { className: "prevailing-pe", cents: prevailingExtraCents },
  ].filter((segment) => segment.cents > 0);
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
