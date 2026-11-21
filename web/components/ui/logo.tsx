import { Fraunces } from "next/font/google";

// The brand's wordmark face, the same cut the boot film uses.
const wordmark = Fraunces({ subsets: ["latin"], weight: "600", display: "swap" });

/** Class for the wordmark face and colour, for places that set "Fludd" on its own. */
export const WORDMARK_CLASS = `${wordmark.className} font-semibold text-[#23467f]`;

/** The Fludd mark: a pelican riding the crest of a wave. Paths from design/boot/reference/fludd-logo.svg. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 18 200 182" className={className} aria-hidden>
      <g transform="translate(0 40)">
        <path
          d="M0 150 C35 148 55 110 70 70 C85 30 110 26 130 28 C155 30 178 48 180 72 C182 92 166 102 154 94 C144 88 146 74 158 74 C150 62 128 58 116 74 C104 92 108 128 140 140 C160 146 180 146 200 146 L200 160 L0 160 Z"
          fill="#23467f"
        />
        <path d="M44 152 C60 140 70 112 80 90 C90 66 106 50 128 44" fill="none" stroke="#9cc7ea" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
        <path d="M0 160 V148 C30 140 60 140 90 148 C120 156 150 154 200 142 V160 Z" fill="#5b8fd6" />
        <circle cx="151.5" cy="33.8" r="5" fill="#fbfaf6" />
        <circle cx="168.7" cy="46.7" r="5" fill="#fbfaf6" />
        <circle cx="177.7" cy="61.6" r="4.5" fill="#fbfaf6" />
        <circle cx="138" cy="30" r="3.5" fill="#fbfaf6" />
      </g>
      <path d="M102 56 L88 64 L104 63 Z" fill="#5a4e44" />
      <ellipse cx="124" cy="57" rx="22" ry="12" fill="#5a4e44" />
      <path d="M108 56 C118 48 132 48 142 55" fill="none" stroke="#e4d8bf" strokeWidth="3" strokeLinecap="round" />
      <path d="M138 52 C142 48 142 43 145 38" fill="none" stroke="#5a4e44" strokeWidth="8" strokeLinecap="round" />
      <circle cx="146" cy="36" r="7" fill="#5a4e44" />
      <path d="M151 33 L182 44 L176 48 L150 40 Z" fill="#e8964a" stroke="#e8964a" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="147" cy="34" r="1.6" fill="#fbfaf6" />
    </svg>
  );
}

/** Mark and wordmark together. `size` is the mark's height in px; the word scales with it. */
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.3em] ${className}`} style={{ fontSize: size * 0.82 }} translate="no">
      <LogoMark size={size} />
      <span className={`${wordmark.className} font-semibold leading-none tracking-[-0.02em] text-[#23467f]`}>Fludd</span>
    </span>
  );
}
