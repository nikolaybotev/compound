type IconProps = {
  class?: string;
  style?: Record<string, string>;
};

const PAPER = "#F2F4F3";
const INK = "#17211F";

export function PiggyBank(props: IconProps) {
  return (
    <svg class={props.class} style={props.style} viewBox="0 0 64 40" role="img" aria-label="Piggy bank">
      <path
        d="M14 18c-3.2-.2-6 1.6-6.2 4.2-.2 2.2 1.6 3.6 3.8 3.2"
        fill="none"
        stroke={INK}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M24 14.5 27.2 7l7.2 6.2" fill={PAPER} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="26" y="9.2" width="11" height="2.4" rx="0.6" fill={INK} />
      <circle cx="31.5" cy="6.2" r="2.1" fill={PAPER} stroke={INK} strokeWidth="1.4" />
      <ellipse cx="30" cy="22" rx="16.5" ry="11" fill={PAPER} stroke={INK} strokeWidth="1.7" />
      <ellipse cx="47.5" cy="23.5" rx="8.2" ry="6.2" fill={PAPER} stroke={INK} strokeWidth="1.7" />
      <circle cx="45.2" cy="23.6" r="1.05" fill={INK} />
      <circle cx="49.6" cy="23.6" r="1.05" fill={INK} />
      <circle cx="36.2" cy="18.2" r="1.35" fill={INK} />
      <path d="M20 31.2v5.2M28.5 32.4v4.6M40 31.6v4.8" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function HoodedFigure(props: IconProps) {
  return (
    <svg class={props.class} style={props.style} viewBox="0 0 48 56" role="img" aria-label="Hooded figure">
      <ellipse cx="35.5" cy="30" rx="8" ry="9.5" fill={PAPER} stroke={INK} strokeWidth="1.7" />
      <path d="M31.2 22.5h8.2" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M33.6 21.2c.8-2.4 2.2-3.6 4-3.6" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M18 24c.4-9 4.2-16 8.2-17.6 4.4 1.6 8.4 8.6 8.6 17.6l3.4 18.2H14.2L18 24z"
        fill={PAPER}
        stroke={INK}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M20.2 18.6c2.2 3.4 6.6 3.6 9.2.2" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24.5 28.5h8" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 43.2 14.2 53M27.2 43.4 33 53" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
