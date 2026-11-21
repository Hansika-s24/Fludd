import { useMemo, type CSSProperties, type ReactNode } from "react";

/**
 * The boot film, drawn live as cut paper: a storm of paper rain, one drop, three paper ripples that clear
 * the sky to the page colour, then the wave rises and the pelican lands on it. It is drawn for the screen it
 * is on, so nothing is cropped, and there is no video for a phone to refuse to play.
 *
 * Pure: the same frame and size always draw the same picture. The caller owns the clock.
 */
export const FPS = 30;
export const FRAMES = 132; // 4.4 s
const HIT = 34; // the drop lands (1.15 s)

const BG = "#f2f1ec";
const WATER = "#5b8fd6";
const DEEP = "#23467f";
const HILITE = "#9cc7ea";
const FOAM = "#fbfaf6";
const BODY = "#5a4e44";
const STRIPE = "#e4d8bf";
const BEAK = "#e8964a";
const CLOUD_A = "#1d3157";
const CLOUD_B = "#2a4273";
const SHADE = "rgba(8,16,34,0.16)";

const WAVE =
  "M0 150 C35 148 55 110 70 70 C85 30 110 26 130 28 C155 30 178 48 180 72 C182 92 166 102 154 94 C144 88 146 74 158 74 C150 62 128 58 116 74 C104 92 108 128 140 140 C160 146 180 146 200 146 L200 160 L0 160 Z";
const BEADS: ReadonlyArray<readonly [number, number, number]> = [
  [151.5, 33.8, 5],
  [168.7, 46.7, 5],
  [177.7, 61.6, 4.5],
  [138, 30, 3.5],
];

type Ease = (t: number) => number;
const linear: Ease = (t) => t;
const inQuad: Ease = (t) => t * t;
const outQuad: Ease = (t) => 1 - (1 - t) * (1 - t);
const outCubic: Ease = (t) => 1 - (1 - t) ** 3;
const outBack: Ease = (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;

/** Value between `from` and `to` as `f` crosses [a, b], held at the ends. */
function tween(f: number, a: number, b: number, from: number, to: number, ease: Ease = linear): number {
  const t = Math.min(1, Math.max(0, (f - a) / (b - a)));
  return from + (to - from) * ease(t);
}

/** A damped spring from 0 to 1, `frames` after it is let go. */
function spring(frames: number, damping: number, stiffness: number, mass = 1): number {
  if (frames <= 0) return 0;
  const t = frames / FPS;
  const w0 = Math.sqrt(stiffness / mass);
  const z = damping / (2 * Math.sqrt(stiffness * mass));
  if (z >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
}

/** A repeatable number in [0, 1) for a label, so the paper pieces sit the same on every load. */
function rand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** A bumpy cloud bank hanging from the top edge. */
function cloudPath(w: number, base: number, bump: number, seed: string): string {
  const n = Math.max(4, Math.round(w / 190));
  const step = (w + 120) / n;
  let d = `M -60 -80 L -60 ${base}`;
  for (let i = 0; i < n; i++) {
    const x0 = -60 + step * i;
    const dip = bump * (0.55 + rand(`${seed}${i}`) * 0.9);
    d += ` C ${x0 + step * 0.1} ${base + dip}, ${x0 + step * 0.9} ${base + dip}, ${x0 + step} ${base}`;
  }
  return `${d} L ${w + 60} -80 Z`;
}

/** A strip of sea along the bottom edge, wider than the screen so it can drift sideways. */
function seaPath(w: number, h: number, top: number, amp: number): string {
  const n = Math.max(4, Math.round(w / 240));
  const step = (w + 480) / n;
  let d = `M -240 ${h + 80} L -240 ${top}`;
  for (let i = 0; i < n; i++) {
    const x = -240 + step * i;
    d += ` C ${x + step * 0.3} ${top - amp}, ${x + step * 0.7} ${top + amp}, ${x + step} ${top}`;
  }
  return `${d} L ${w + 240} ${h + 80} Z`;
}

/** One cut sheet in the full-screen drawing: the shape, and the shadow it throws on the sheet below. */
function Cut({ d, fill, transform, shade = SHADE }: { d: string; fill: string; transform?: string; shade?: string }) {
  return (
    <g transform={transform}>
      <path d={d} fill={shade} transform="translate(2 4)" />
      <path d={d} fill={shade} transform="translate(4 8)" />
      <path d={d} fill={fill} />
    </g>
  );
}

/** One cut sheet of the logo, in the logo's own 200-unit space. */
function LogoSheet({ size, lift, style, children }: { size: number; lift: number; style?: CSSProperties; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        overflow: "visible",
        filter: `drop-shadow(${lift * 0.5}px ${lift}px ${lift * 1.4}px rgba(8,16,34,0.3))`,
        ...style,
      }}
    >
      {children}
    </svg>
  );
}

export type BootFilmProps = {
  /** Frame at 30 fps. The caller steps it by two, so the paper moves like stop motion. */
  frame: number;
  w: number;
  h: number;
  /** Centre and size of the logo, in screen pixels. */
  cx: number;
  cy: number;
  size: number;
};

export function BootFilm({ frame: f, w: W, h: H, cx, cy, size }: BootFilmProps) {
  const k = size / 200; // logo units to pixels
  const lx = cx - size / 2;
  const ly = cy - size / 2;
  const u = Math.min(1, Math.max(0.55, Math.min(W, H) / 900)); // scenery scale
  const hitX = lx + 104 * k; // where the drop meets the water line
  const hitY = ly + 186 * k;
  const diag = Math.hypot(Math.max(hitX, W - hitX), Math.max(hitY, H - hitY)) + 80;
  const seaTop = H - 96 * u;
  const jig = (seed: string, amount: number) => (rand(`${seed}${Math.floor(f / 4)}`) - 0.5) * 2 * amount;

  // Shapes that never change for a given screen.
  const still = useMemo(() => {
    const count = Math.min(110, Math.max(36, Math.round((W * H) / 7000)));
    return {
      cloudA: cloudPath(W, 120 * u, 46 * u, "a"),
      cloudB: cloudPath(W, 70 * u, 40 * u, "b"),
      sea: [
        { fill: HILITE, d: seaPath(W, H, seaTop - 34 * u, 16 * u), drift: 23 * u, rise: 190 * u },
        { fill: WATER, d: seaPath(W, H, seaTop, 20 * u), drift: -30 * u, rise: 230 * u },
        { fill: DEEP, d: seaPath(W, H, seaTop + 40 * u, 14 * u), drift: 19 * u, rise: 270 * u },
      ],
      streaks: Array.from({ length: count }, (_, i) => ({
        speed: (34 + rand(`s${i}`) * 22) * u,
        len: (46 + rand(`l${i}`) * 50) * u,
        y0: rand(`y${i}`) * (H + 300),
        x0: rand(`x${i}`) * (W + 200) - 100,
        w: (5 + rand(`w${i}`) * 4) * u,
        o: 0.5 + rand(`o${i}`) * 0.5,
      })),
      crown: Array.from({ length: 11 }, (_, i) => ({
        angle: -Math.PI * (0.12 + (i / 10) * 0.76),
        reach: (150 + rand(`c${i}`) * 110) * k,
        r: (5 + rand(`r${i}`) * 6) * k,
        fill: i % 3 === 0 ? HILITE : WATER,
      })),
    };
  }, [W, H, u, k, seaTop]);

  // ---- storm ----
  const cloudIn = tween(f, 0, 10, -50 * u, 0, outCubic);
  const rainOn = f < HIT ? tween(f, 0, 4, 0, 1) : tween(f, HIT, HIT + 8, 1, 0);
  const span = H + 300;

  // ---- the drop ----
  const dropY = tween(f, 13, HIT, 150 * u, hitY - 30 * k, inQuad);
  const dropS = 1.5 * k;

  // ---- paper ripples that clear the sky; the last one is the page ----
  const ripples = [WATER, HILITE, BG].map((fill, i) => ({ fill, r: tween(f, HIT + i * 3, HIT + i * 3 + 20, 0, diag, outCubic) }));

  // ---- crown of droplets ----
  const crownT = tween(f, HIT, HIT + 18, 0, 1);

  // ---- calm scenery ----
  const seaIn = spring(f - (HIT + 8), 14, 90);
  const calm = tween(f, HIT + 14, HIT + 30, 0, 1, outBack);

  // ---- logo ----
  const band = spring(f - (HIT + 2), 9, 120, 0.7);
  const curl = spring(f - (HIT + 6), 9, 120, 0.7);
  const stroke = tween(f, HIT + 12, HIT + 24, 0, 1, outQuad);
  const pelY = tween(f, 54, 64, -(cy + size), 0, outCubic);
  const pelTilt = tween(f, 54, 64, -22, 0, outCubic);
  const squash = f < 66 ? tween(f, 62, 66, 1, 0.84, outQuad) : tween(f, 66, 74, 0.84, 1, outBack);
  const idle = f > 74 ? Math.sin(((f - 74) / 44) * Math.PI * 2) : 0;
  const blink = (f >= 96 && f < 100) || (f >= 118 && f < 120);

  return (
    <>
      <svg className="boot-full" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <Cut d={still.cloudA} fill={CLOUD_A} transform={`translate(0 ${cloudIn * 0.6})`} shade="rgba(4,10,24,0.3)" />
        {rainOn > 0 && (
          <g opacity={rainOn} fill={HILITE}>
            {still.streaks.map((s, i) => {
              const y = ((s.y0 + f * s.speed) % span) - 150;
              const x = s.x0 - y * 0.16;
              return <rect key={i} x={x} y={y} width={s.w} height={s.len} rx={s.w / 2} opacity={s.o} transform={`rotate(9 ${x} ${y})`} />;
            })}
          </g>
        )}
        <Cut d={still.cloudB} fill={CLOUD_B} transform={`translate(${jig("cb", 1.2)} ${cloudIn})`} shade="rgba(4,10,24,0.3)" />

        {f >= 13 && f < HIT + 2 && (
          <g transform={`translate(${hitX - 20 * dropS} ${dropY - 56 * dropS}) scale(${dropS})`}>
            <Cut d="M20 2 C20 2 4 26 4 38 A16 16 0 0 0 36 38 C36 26 20 2 20 2 Z" fill={WATER} shade="rgba(4,10,24,0.25)" />
            <path d="M12 36 C12 31 14 27 16 24" fill="none" stroke={FOAM} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
          </g>
        )}

        {ripples.map(
          (r) =>
            r.r > 0 && (
              <g key={r.fill}>
                <circle cx={hitX + 3} cy={hitY + 6} r={r.r} fill="rgba(8,16,34,0.2)" />
                <circle cx={hitX} cy={hitY} r={r.r} fill={r.fill} />
              </g>
            ),
        )}

        {calm > 0 && (
          <g opacity={Math.min(1, calm)}>
            {[
              { x: W * 0.12 - (1 - calm) * 60 * u, y: H * 0.1, s: u, seed: "k1", parts: [[0, 0, 74, 24], [-30, -16, 36, 24], [22, -22, 44, 30]] },
              { x: W * 0.86 + (1 - calm) * 60 * u, y: H * 0.2, s: u * 0.8, seed: "k2", parts: [[0, 0, 74, 24], [-26, -18, 40, 26], [26, -14, 34, 22]] },
            ].map((c) => (
              <g key={c.seed} transform={`translate(${c.x + jig(c.seed, 0.8)} ${c.y}) scale(${c.s})`}>
                {c.parts.map(([x, y, rx, ry], i) => (
                  <ellipse key={`s${i}`} cx={x + 3} cy={y + 6} rx={rx} ry={ry} fill="rgba(8,16,34,0.1)" />
                ))}
                {c.parts.map(([x, y, rx, ry], i) => (
                  <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill={FOAM} />
                ))}
              </g>
            ))}
          </g>
        )}

        {f >= HIT + 8 &&
          still.sea.map((s, i) => (
            <Cut key={s.fill} d={s.d} fill={s.fill} transform={`translate(${Math.sin((f / 60) * Math.PI * 2 + i) * s.drift} ${(1 - seaIn) * s.rise})`} />
          ))}

        {crownT > 0 &&
          crownT < 1 &&
          still.crown.map((c, i) => (
            <circle
              key={i}
              cx={hitX + Math.cos(c.angle) * c.reach * crownT}
              cy={hitY + Math.sin(c.angle) * c.reach * crownT + 300 * k * crownT * crownT}
              r={c.r * (1 - crownT * 0.7)}
              fill={c.fill}
            />
          ))}
      </svg>

      <div aria-hidden="true" style={{ position: "absolute", left: lx, top: ly, width: size, height: size, transform: `translateY(${idle * 1.6 * k}px)` }}>
        <LogoSheet size={size} lift={6} style={{ transformOrigin: "50% 100%", transform: `scaleY(${curl})`, opacity: f >= HIT + 6 ? 1 : 0 }}>
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
        </LogoSheet>
        <LogoSheet size={size} lift={3}>
          <g transform="translate(0 40)" fill={FOAM}>
            {BEADS.map(([x, y, r], i) => (
              <circle key={i} cx={x + jig(`b${i}`, 0.5)} cy={y + jig(`d${i}`, 0.5)} r={Math.max(0, r * spring(f - 51 - i * 2, 8, 220, 0.5))} />
            ))}
          </g>
        </LogoSheet>
        <LogoSheet
          size={size}
          lift={5}
          style={{
            transformOrigin: "62% 30%",
            transform: `translateY(${pelY}px) rotate(${pelTilt + idle * 0.8}deg) scale(${2 - squash}, ${squash})`,
            opacity: f >= 54 ? 1 : 0,
          }}
        >
          <path d="M102 56 L88 64 L104 63 Z" fill={BODY} />
          <ellipse cx={124} cy={57} rx={22} ry={12} fill={BODY} />
          <path d="M108 56 C118 48 132 48 142 55" fill="none" stroke={STRIPE} strokeWidth={3} strokeLinecap="round" />
          <path d="M138 52 C142 48 142 43 145 38" fill="none" stroke={BODY} strokeWidth={8} strokeLinecap="round" />
          <circle cx={146} cy={36} r={7} fill={BODY} />
          <path d="M151 33 L182 44 L176 48 L150 40 Z" fill={BEAK} stroke={BEAK} strokeWidth={1.5} strokeLinejoin="round" />
          {blink ? <path d="M145 34.4 L149 34.4" stroke={FOAM} strokeWidth={0.9} strokeLinecap="round" /> : <circle cx={147} cy={34} r={1.6} fill={FOAM} />}
        </LogoSheet>
        <LogoSheet size={size} lift={5} style={{ transformOrigin: "50% 100%", transform: `scaleY(${band})`, opacity: f >= HIT + 2 ? 1 : 0 }}>
          <path transform="translate(0 40)" d="M0 160 V148 C30 140 60 140 90 148 C120 156 150 154 200 142 V160 Z" fill={WATER} />
        </LogoSheet>
      </div>

      {/* paper grain, re-seated as the film steps */}
      <div className="boot-grain" style={{ backgroundPosition: `${Math.round(rand(`g${f}`) * 160)}px ${Math.round(rand(`h${f}`) * 160)}px` }} />
    </>
  );
}
