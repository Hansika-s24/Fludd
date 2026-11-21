import { useId, type CSSProperties, type ReactNode } from "react";
import "./illustrations.css";

/** The paper stock. Orange is the one warm accent; use it sparingly. */
export const C = {
  page: "#f2f1ec",
  water: "#5b8fd6",
  deep: "#23467f",
  light: "#9cc7ea",
  foam: "#fbfaf6",
  brown: "#5a4e44",
  cream: "#e4d8bf",
  orange: "#e8964a",
  ink: "#1c1d21",
} as const;

export type IllustrationProps = {
  /** Height in px. Width follows the 5:4 frame. */
  size?: number;
  className?: string;
  /** Give a label only when the picture carries meaning on its own; otherwise it is hidden from assistive tech. */
  label?: string;
};

/** Entrance order: each step is 60ms later. */
export const at = (i: number) => ({ "--i": i }) as CSSProperties;
/** Phase offset for a looping piece (rain, sparkles). */
export const phase = (n: number) => ({ "--n": n }) as CSSProperties;

/**
 * The shared 200 x 160 frame: one "cut paper" filter (wobbly edge plus a soft shadow, light from the upper left)
 * and the page-coloured card every scene sits on. Children get the filter reference to put on each paper layer.
 */
export function Frame({ size = 160, className, label, children }: IllustrationProps & { children: (cut: string) => ReactNode }) {
  const id = useId();
  const cut = `url(#${id})`;
  return (
    <svg
      className={className ? `ill ${className}` : "ill"}
      viewBox="0 0 200 160"
      width={size * 1.25}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feDropShadow in="d" dx="1.4" dy="2" stdDeviation="1" floodColor={C.ink} floodOpacity="0.26" />
      </filter>
      <rect className="ill-rise" x="12" y="6" width="176" height="138" rx="14" fill={C.page} filter={cut} />
      {children(cut)}
    </svg>
  );
}

/** The logo pelican (paths from design/boot/reference/fludd-logo.svg). (x, y) is where the underside of its body rests. */
export function Pelican({ x, y, s = 1, cut }: { x: number; y: number; s?: number; cut: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(-124 -69)`}>
      <g fill={C.brown} filter={cut}>
        <path d="M102 56 L88 64 L104 63 Z" />
        <ellipse cx="124" cy="57" rx="22" ry="12" />
        <path d="M138 52 C142 48 142 43 145 38" fill="none" stroke={C.brown} strokeWidth="8" strokeLinecap="round" />
        <circle cx="146" cy="36" r="7" />
      </g>
      <path d="M108 56 C118 48 132 48 142 55" fill="none" stroke={C.cream} strokeWidth="3" strokeLinecap="round" />
      <path d="M151 33 L182 44 L176 48 L150 40 Z" fill={C.orange} stroke={C.orange} strokeWidth="1.5" strokeLinejoin="round" filter={cut} />
      <circle className="ill-blink" cx="147" cy="34" r="1.6" fill={C.foam} />
    </g>
  );
}

/** The logo wave, in the logo's own 200 x 200 space. Scale and place it with a wrapping transform. */
export function Wave({ cut }: { cut: string }) {
  return (
    <g transform="translate(0 40)">
      <path
        d="M0 150 C35 148 55 110 70 70 C85 30 110 26 130 28 C155 30 178 48 180 72 C182 92 166 102 154 94 C144 88 146 74 158 74 C150 62 128 58 116 74 C104 92 108 128 140 140 C160 146 180 146 200 146 L200 160 L0 160 Z"
        fill={C.deep}
        filter={cut}
      />
      <path d="M44 152 C60 140 70 112 80 90 C90 66 106 50 128 44" fill="none" stroke={C.light} strokeWidth="5" strokeLinecap="round" opacity="0.6" />
      <g fill={C.foam} filter={cut}>
        <circle cx="151.5" cy="33.8" r="5" />
        <circle cx="168.7" cy="46.7" r="5" />
        <circle cx="177.7" cy="61.6" r="4.5" />
        <circle cx="138" cy="30" r="3.5" />
      </g>
    </g>
  );
}

/** A strip of water across the whole frame, wavy along the top at about `y`. */
export function Water({ y, fill, cut }: { y: number; fill: string; cut: string }) {
  return <path d={`M3 156V${y}c25-6 49 5 81 0c28-4 56 5 84-1c12-2 22-1 29 1V156Z`} fill={fill} filter={cut} />;
}

/** A strip of ground across the whole frame, sticking out past the card like a second sheet. */
export function Ground({ y = 122, fill, cut }: { y?: number; fill: string; cut: string }) {
  return <rect x="3" y={y} width="194" height={156 - y} rx="3" fill={fill} filter={cut} />;
}

export function Cloud({ x, y, s = 1, cut }: { x: number; y: number; s?: number; cut: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={C.foam} filter={cut}>
      <rect y="10" width="46" height="14" rx="7" />
      <circle cx="15" cy="11" r="9" />
      <circle cx="29" cy="8" r="11" />
    </g>
  );
}

/** A small house; (x, y) is the middle of its doorstep. */
export function House({ x, y, s = 1, door = C.deep, cut }: { x: number; y: number; s?: number; door?: string; cut: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-28" y="-44" width="56" height="44" fill={C.cream} filter={cut} />
      <path d="M14 -50V-66h8V-50ZM-36 -42L0 -70L36 -42Z" fill={C.brown} filter={cut} />
      <rect x="-7" y="-24" width="14" height="24" rx="2" fill={door} />
      <path d="M-22 -32h11v11h-11ZM11 -32h11v11h-11Z" fill={C.light} />
    </g>
  );
}

/** Rain streaks. Each entry is x, y and an optional extra class (ill-rain-2 / ill-rain-5 stop after a few falls). */
export function Rain({ drops, stroke = C.water }: { drops: readonly (readonly [number, number, string?])[]; stroke?: string }) {
  return (
    <g stroke={stroke} strokeWidth="2.2" strokeLinecap="round">
      {drops.map(([x, y, extra], n) => (
        <path key={n} className={extra ? `ill-rain ${extra}` : "ill-rain"} style={phase(n)} d={`M${x} ${y}l-3 8`} />
      ))}
    </g>
  );
}
