import { ficoBand } from "./picture";

export const FICO_BAND_OPTIONS: Array<{ score: number; label: string }> = [
  { score: 780, label: "780+" },
  { score: 740, label: "740–779" },
  { score: 700, label: "700–739" },
  { score: 660, label: "660–699" },
  { score: 620, label: "620–659" },
];

type Props = {
  score: number;
  onChoose: (score: number) => void;
};

export function FicoBands({ score, onChoose }: Props) {
  const activeBand = ficoBand(score);
  return (
    <span class="fico-bands" role="group" aria-label="FICO range">
      {FICO_BAND_OPTIONS.map((option) => {
        const band = ficoBand(option.score);
        const pressed = band === activeBand;
        return (
          <button
            key={option.label}
            type="button"
            class="fico-band"
            aria-pressed={pressed}
            onClick={() => onChoose(option.score)}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}
