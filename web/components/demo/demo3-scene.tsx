import { at, C, Cloud, Frame, Ground, Rain } from "@/components/illustrations/parts";

/** Scene scale: the tyre is 20 units across and stands for about 0.64 m, so one unit is 0.032 m of water. */
const M_PER_UNIT = 0.032;
/** The road surface. Water is clipped at this line, so the strips rise out of the road. */
const ROAD_Y = 126;
/** Kerb top: 0.15 m above the road. */
const KERB_Y = ROAD_Y - 0.15 / M_PER_UNIT;
/** The wavy strips are drawn this far below the road so their crests stay hidden while it is dry. */
const HIDE = 4;
/** No paper stock for pavement in the shared palette; this sits between the page and the road brown. */
const PAVEMENT = "#b8ad9c";

const RAIN = [
  [58, 52], [84, 58, "ill-rain-slow"], [150, 48], [104, 62, "ill-rain-slow"], [40, 62], [134, 64],
] as const;

/** A wavy-topped strip of water across the frame with its surface near `y`. */
function strip(y: number): string {
  return `M3 170V${y}c25-3 49 3 81 0c28-3 56 3 84-1c12-1 22-1 29 1V170Z`;
}

/**
 * The camera's view: a car parked at a kerb, seen side on, inside a viewfinder frame.
 * `depthM` raises two paper strips of water against the tyres (transform only). 0 is a dry street.
 */
export function Demo3Scene({ depthM, stamp, className }: { depthM: number; stamp?: string; className?: string }) {
  const rise = depthM > 0 ? depthM / M_PER_UNIT + HIDE : 0;
  const moving = "transition-transform duration-[900ms] ease-[var(--ease-calm)] motion-reduce:transition-none";
  const label =
    depthM > 0
      ? `Camera view of a parked car at a kerb with water ${Math.round(depthM * 100)} centimetres up the tyre`
      : "Camera view of a parked car at a dry kerb";
  return (
    <Frame className={className} label={label}>
      {(cut) => (
        <>
          <defs>
            <clipPath id="demo3-above-road">
              <rect x="0" y="0" width="200" height={ROAD_Y} />
            </clipPath>
          </defs>

          <g className="ill-drop" style={at(1)}>
            <g className="ill-drift"><Cloud x={112} y={32} s={0.8} cut={cut} /></g>
          </g>
          {depthM > 0 && <Rain drops={RAIN} />}

          <g className="ill-rise" style={at(1)}><Ground y={ROAD_Y} fill={C.brown} cut={cut} /></g>

          {/* Water behind the car, a touch higher, so the car sits in it rather than behind it. */}
          <g clipPath="url(#demo3-above-road)">
            <g className={moving} style={{ transform: `translateY(${-rise * 1.08}px)` }}>
              <path d={strip(ROAD_Y + HIDE)} fill={C.deep} filter={cut} />
            </g>
          </g>

          {/* Pavement and kerb on the right. */}
          <g className="ill-rise" style={at(2)}>
            <rect x="150" y={KERB_Y} width="47" height={156 - KERB_Y} rx="2" fill={PAVEMENT} filter={cut} />
            <rect x="172" y="72" width="3.5" height={KERB_Y - 72} fill={C.ink} />
            <rect x="163" y="60" width="21" height="15" rx="3" fill={C.orange} filter={cut} />
            <path d="M169 71V64h5a2.2 2.2 0 0 1 0 4.4h-5" fill="none" stroke={C.foam} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* The car (after parking.tsx), wheels standing on the road. */}
          <g className="ill-slide" style={at(3)}>
            <g fill={C.cream} filter={cut}>
              <rect x="38" y="94" width="96" height="22" rx="7" />
              <path d="M56 96L66 76H102L116 96Z" />
            </g>
            <path d="M63 94L70 80H82V94ZM86 80H100L109 94H86Z" fill={C.light} />
            <rect x="128" y="99" width="5" height="5" rx="1.5" fill={C.foam} />
            <g fill={C.ink} filter={cut}>
              <circle cx="62" cy="116" r="10" />
              <circle cx="112" cy="116" r="10" />
            </g>
            <path d="M62 112a4 4 0 1 0 .01 0ZM112 112a4 4 0 1 0 .01 0Z" fill={C.cream} />
          </g>

          {/* Water in front: the strip that climbs the tyre. */}
          <g clipPath="url(#demo3-above-road)">
            <g className={moving} style={{ transform: `translateY(${-rise}px)` }}>
              <path d={strip(ROAD_Y + HIDE)} fill={C.water} filter={cut} />
            </g>
          </g>

          {/* Viewfinder: corner brackets and the caption a camera app would draw over the picture. */}
          <g className="ill-pop" style={at(5)}>
            <path
              d="M22 34V24H32M168 24H178V34M178 128V138H168M32 138H22V128"
              fill="none"
              stroke={C.ink}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="28" y="30" width={stamp ? 102 : 62} height="13" rx="6.5" fill={C.ink} />
            <circle cx="35.5" cy="36.5" r="2.4" fill={C.orange} />
            <text x="41" y="39.2" fontSize="7.2" fontWeight="600" fill={C.foam}>
              {stamp ? `camera view · ${stamp}` : "camera view"}
            </text>
          </g>
        </>
      )}
    </Frame>
  );
}
