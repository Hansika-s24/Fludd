// Fludd boot film, paper-cut. Every piece is a cut sheet: rough edge, drop shadow, paper grain,
// moved on twos like stop motion. A storm of paper rain, one drop, paper ripples that clear the
// sky to the page colour, then the wave rises and the pelican lands on it.
// The wordmark and caption are HTML over the video (web/components/boot), not part of this film.
import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const FRAMES = 132; // 4.4 s at 30 fps

const BG = "#f2f1ec";
const WATER = "#5b8fd6";
const DEEP = "#23467f";
const HILITE = "#9cc7ea";
const FOAM = "#fbfaf6";
const BODY = "#5a4e44";
const STRIPE = "#e4d8bf";
const BEAK = "#e8964a";
const NIGHT = "#14233f";
const CLOUD_A = "#1d3157";
const CLOUD_B = "#2a4273";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const HIT = 34; // the drop lands (1.15 s)

const Defs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      <filter id="rough" x="-4%" y="-4%" width="108%" height="108%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={3.2} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
);

// One sheet of cut paper covering the frame: rough edge and a drop shadow from the top-left light.
const Sheet: React.FC<{ lift?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ lift = 4, children, style }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      filter: `url(#rough) drop-shadow(${lift * 0.5}px ${lift}px ${lift * 1.6}px rgba(8,16,34,0.34))`,
      ...style,
    }}
  >
    {children}
  </div>
);

const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useVideoConfig();
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {children}
    </svg>
  );
};

// A bumpy cloud bank hanging from the top edge.
const cloudPath = (w: number, base: number, bump: number, seed: string) => {
  const n = Math.max(5, Math.round(w / 190));
  let d = `M -60 -80 L -60 ${base}`;
  for (let i = 0; i < n; i++) {
    const x0 = -60 + ((w + 120) / n) * i;
    const x1 = -60 + ((w + 120) / n) * (i + 1);
    const dip = bump * (0.55 + random(`${seed}${i}`) * 0.9);
    d += ` C ${x0 + (x1 - x0) * 0.1} ${base + dip}, ${x0 + (x1 - x0) * 0.9} ${base + dip}, ${x1} ${base}`;
  }
  return `${d} L ${w + 60} -80 Z`;
};

// A strip of sea along the bottom edge.
const seaPath = (w: number, h: number, top: number, amp: number, phase: number) => {
  const n = Math.max(4, Math.round(w / 240));
  const step = (w + 480) / n;
  let d = `M ${-240 + phase} ${h + 80} L ${-240 + phase} ${top}`;
  for (let i = 0; i < n; i++) {
    const x = -240 + phase + step * i;
    d += ` C ${x + step * 0.3} ${top - amp}, ${x + step * 0.7} ${top + amp}, ${x + step} ${top}`;
  }
  return `${d} L ${w + 240 + phase} ${h + 80} Z`;
};

const WAVE = "M0 150 C35 148 55 110 70 70 C85 30 110 26 130 28 C155 30 178 48 180 72 C182 92 166 102 154 94 C144 88 146 74 158 74 C150 62 128 58 116 74 C104 92 108 128 140 140 C160 146 180 146 200 146 L200 160 L0 160 Z";
const BEADS: Array<[number, number, number]> = [
  [151.5, 33.8, 5],
  [168.7, 46.7, 5],
  [177.7, 61.6, 4.5],
  [138, 30, 3.5],
];

export const FluddBoot: React.FC<{ cx: number; cy: number; size: number }> = ({ cx, cy, size }) => {
  const raw = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const f = Math.floor(raw / 2) * 2; // on twos
  const k = size / 200; // logo units to pixels
  const lx = cx - size / 2;
  const ly = cy - size / 2;
  const u = Math.min(W, H) / 900; // general scale for scenery
  const hit = { x: lx + 104 * k, y: ly + 186 * k }; // where the drop meets the water line
  const diag = Math.hypot(Math.max(hit.x, W - hit.x), Math.max(hit.y, H - hit.y)) + 80;
  const jig = (s: string, a = 1.2) => (random(`${s}${Math.floor(raw / 4)}`) - 0.5) * 2 * a;

  // ---- storm ----
  const cloudIn = interpolate(f, [0, 10], [-50 * u, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const streaks = Array.from({ length: Math.round((W * H) / 16000) }).map((_, i) => {
    const speed = (34 + random(`s${i}`) * 22) * u;
    const len = (46 + random(`l${i}`) * 50) * u;
    const span = H + 300;
    const y = ((random(`y${i}`) * span + f * speed) % span) - 150;
    const x = random(`x${i}`) * (W + 200) - 100 - y * 0.16;
    return { x, y, len, w: (5 + random(`w${i}`) * 4) * u, o: 0.5 + random(`o${i}`) * 0.5 };
  });
  const rainOn = interpolate(f, [0, 4, HIT, HIT + 8], [0, 1, 1, 0], clamp);

  // ---- the drop ----
  const dropT = interpolate(f, [13, HIT], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const dropY = interpolate(dropT, [0, 1], [150 * u, hit.y - 30 * k]);
  const dropS = 1.5 * k;

  // ---- paper ripples that clear the sky ----
  const ring = (delay: number) => interpolate(f, [HIT + delay, HIT + delay + 20], [0, diag], { ...clamp, easing: Easing.out(Easing.cubic) });

  // ---- crown droplets ----
  const crownT = interpolate(f, [HIT, HIT + 18], [0, 1], clamp);
  const crown = Array.from({ length: 11 }).map((_, i) => {
    const a = -Math.PI * (0.12 + (i / 10) * 0.76);
    const reach = (150 + random(`c${i}`) * 110) * k;
    return {
      x: hit.x + Math.cos(a) * reach * crownT,
      y: hit.y + Math.sin(a) * reach * crownT + 300 * k * crownT * crownT,
      r: (5 + random(`r${i}`) * 6) * k * (1 - crownT * 0.7),
      c: i % 3 === 0 ? HILITE : WATER,
      o: crownT > 0 && crownT < 1 ? 1 : 0,
    };
  });

  // ---- logo ----
  const rise = (delay: number) => spring({ frame: f - (HIT + 2) - delay, fps, config: { damping: 9, stiffness: 120, mass: 0.7 } });
  const band = rise(0);
  const curl = rise(4);
  const stroke = interpolate(f, [HIT + 12, HIT + 24], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const bead = (i: number) => spring({ frame: f - 51 - i * 2, fps, config: { damping: 8, stiffness: 220, mass: 0.5 } });
  const land = spring({ frame: f - 54, fps, config: { damping: 10, stiffness: 150, mass: 0.8 } });
  const pelY = interpolate(land, [0, 1], [-(cy + size), 0]);
  const pelTilt = interpolate(land, [0, 1], [-22, 0]);
  const squash = interpolate(f, [60, 62, 68], [1, 0.84, 1], clamp);
  const idle = f > 70 ? Math.sin(((f - 70) / 44) * Math.PI * 2) : 0;
  const blink = (f >= 96 && f < 100) || (f >= 118 && f < 120);

  // ---- calm scenery after the sky clears ----
  const seaIn = spring({ frame: f - (HIT + 8), fps, config: { damping: 14, stiffness: 90 } });
  const seaTop = H - 96 * u;
  const calm = interpolate(f, [HIT + 14, HIT + 30], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const sea = [
    { c: HILITE, top: seaTop - 34 * u, amp: 16, drift: 46, ph: 0 },
    { c: WATER, top: seaTop, amp: 20, drift: -60, ph: 70 },
    { c: DEEP, top: seaTop + 40 * u, amp: 14, drift: 38, ph: 150 },
  ];

  return (
    <AbsoluteFill style={{ background: NIGHT }}>
      <Defs />

      {/* storm: two cloud banks and paper rain */}
      <Sheet lift={7} style={{ translate: `0 ${cloudIn * 0.6}px` }}>
        <Svg>
          <path d={cloudPath(W, 120 * u, 46 * u, "a")} fill={CLOUD_A} />
        </Svg>
      </Sheet>
      <div style={{ position: "absolute", inset: 0, opacity: rainOn, filter: "drop-shadow(2px 4px 3px rgba(4,10,24,0.5))" }}>
        <Svg>
          {streaks.map((s, i) => (
            <rect key={i} x={s.x} y={s.y} width={s.w} height={s.len} rx={s.w / 2} fill={HILITE} opacity={s.o} transform={`rotate(9 ${s.x} ${s.y})`} />
          ))}
        </Svg>
      </div>
      <Sheet lift={9} style={{ translate: `${jig("cb")}px ${cloudIn}px` }}>
        <Svg>
          <path d={cloudPath(W, 70 * u, 40 * u, "b")} fill={CLOUD_B} />
        </Svg>
      </Sheet>

      {/* the one drop */}
      {f >= 13 && f < HIT + 2 ? (
        <Sheet lift={6}>
          <Svg>
            <g transform={`translate(${hit.x - 20 * dropS} ${dropY - 56 * dropS}) scale(${dropS})`}>
              <path d="M20 2 C20 2 4 26 4 38 A16 16 0 0 0 36 38 C36 26 20 2 20 2 Z" fill={WATER} />
              <path d="M12 36 C12 31 14 27 16 24" fill="none" stroke={FOAM} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
            </g>
          </Svg>
        </Sheet>
      ) : null}

      {/* three paper ripples open from where it lands; the last one is the page */}
      {[
        { c: WATER, d: 0 },
        { c: HILITE, d: 3 },
        { c: BG, d: 6 },
      ].map((r) => (
        <Sheet key={r.c} lift={8}>
          <Svg>
            <circle cx={hit.x} cy={hit.y} r={ring(r.d)} fill={r.c} />
          </Svg>
        </Sheet>
      ))}

      {/* calm scenery: pale clouds and a sea along the bottom */}
      <Sheet lift={3} style={{ opacity: calm, translate: `${(1 - calm) * -60 * u}px 0` }}>
        <Svg>
          <g fill={FOAM} transform={`translate(${W * 0.1 + jig("k1", 0.8)} ${H * 0.1}) scale(${u})`}>
            <ellipse cx={0} cy={0} rx={74} ry={24} />
            <ellipse cx={-30} cy={-16} rx={36} ry={24} />
            <ellipse cx={22} cy={-22} rx={44} ry={30} />
          </g>
        </Svg>
      </Sheet>
      <Sheet lift={3} style={{ opacity: calm, translate: `${(1 - calm) * 60 * u}px 0` }}>
        <Svg>
          <g fill={FOAM} transform={`translate(${W * 0.88 + jig("k2", 0.8)} ${H * 0.19}) scale(${u * 0.8})`}>
            <ellipse cx={0} cy={0} rx={74} ry={24} />
            <ellipse cx={-26} cy={-18} rx={40} ry={26} />
            <ellipse cx={26} cy={-14} rx={34} ry={22} />
          </g>
        </Svg>
      </Sheet>
      {sea.map((s, i) => (
        <Sheet key={s.c} lift={6} style={{ translate: `0 ${(1 - seaIn) * (190 + i * 40) * u}px` }}>
          <Svg>
            <path d={seaPath(W, H, s.top, s.amp * u, s.ph * u + Math.sin((f / 60) * Math.PI * 2 + i) * s.drift * u * 0.5)} fill={s.c} />
          </Svg>
        </Sheet>
      ))}

      {/* crown of droplets */}
      <Sheet lift={4}>
        <Svg>
          {crown.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={Math.max(0, c.r)} fill={c.c} opacity={c.o} />
          ))}
        </Svg>
      </Sheet>

      {/* the logo: each part is its own sheet, in the logo's own 200-unit space */}
      <div style={{ position: "absolute", left: lx, top: ly, width: size, height: size, translate: `0 ${idle * 1.6 * k}px` }}>
        <Sheet lift={6} style={{ transformOrigin: "50% 100%", scale: `1 ${curl}`, opacity: f >= HIT + 6 ? 1 : 0 }}>
          <svg viewBox="0 0 200 200" width={size} height={size} style={{ overflow: "visible" }}>
            <g transform="translate(0 40)">
              <path d={WAVE} fill={DEEP} />
              <path
                d="M44 152 C60 140 70 112 80 90 C90 66 106 50 128 44"
                fill="none"
                stroke={HILITE}
                strokeWidth={5}
                strokeLinecap="round"
                opacity={stroke > 0 ? 0.75 : 0}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - stroke}
              />
            </g>
          </svg>
        </Sheet>
        <Sheet lift={3}>
          <svg viewBox="0 0 200 200" width={size} height={size} style={{ overflow: "visible" }}>
            <g transform="translate(0 40)" fill={FOAM}>
              {BEADS.map(([x, y, r], i) => (
                <circle key={i} cx={x + jig(`b${i}`, 0.5)} cy={y + jig(`d${i}`, 0.5)} r={Math.max(0, r * bead(i))} />
              ))}
            </g>
          </svg>
        </Sheet>
        <Sheet
          lift={5}
          style={{
            translate: `0 ${pelY}px`,
            rotate: `${pelTilt + idle * 0.8}deg`,
            transformOrigin: "62% 30%",
            scale: `${2 - squash} ${squash}`,
            opacity: f >= 54 ? 1 : 0,
          }}
        >
          <svg viewBox="0 0 200 200" width={size} height={size} style={{ overflow: "visible" }}>
            <path d="M102 56 L88 64 L104 63 Z" fill={BODY} />
            <ellipse cx={124} cy={57} rx={22} ry={12} fill={BODY} />
            <path d="M108 56 C118 48 132 48 142 55" fill="none" stroke={STRIPE} strokeWidth={3} strokeLinecap="round" />
            <path d="M138 52 C142 48 142 43 145 38" fill="none" stroke={BODY} strokeWidth={8} strokeLinecap="round" />
            <circle cx={146} cy={36} r={7} fill={BODY} />
            <path d="M151 33 L182 44 L176 48 L150 40 Z" fill={BEAK} stroke={BEAK} strokeWidth={1.5} strokeLinejoin="round" />
            {blink ? (
              <path d="M145 34.4 L149 34.4" stroke={FOAM} strokeWidth={0.9} strokeLinecap="round" />
            ) : (
              <circle cx={147} cy={34} r={1.6} fill={FOAM} />
            )}
          </svg>
        </Sheet>
        <Sheet lift={5} style={{ transformOrigin: "50% 100%", scale: `1 ${band}`, opacity: f >= HIT + 2 ? 1 : 0 }}>
          <svg viewBox="0 0 200 200" width={size} height={size} style={{ overflow: "visible" }}>
            <path transform="translate(0 40)" d="M0 160 V148 C30 140 60 140 90 148 C120 156 150 154 200 142 V160 Z" fill={WATER} />
          </svg>
        </Sheet>
      </div>

      {/* paper grain over everything, re-seated every other frame */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: 0.17,
          mixBlendMode: "multiply",
          backgroundImage: `url(${staticFile("bg/grain.png")})`,
          backgroundSize: "640px",
          backgroundPosition: `${Math.round(random(`g${f}`) * 640)}px ${Math.round(random(`h${f}`) * 640)}px`,
        }}
      />
    </AbsoluteFill>
  );
};
