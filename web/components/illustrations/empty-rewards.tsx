import { at, C, Frame, Ground, Pelican, phase, type IllustrationProps } from "./parts";

const STAR = "M0-5L1.4-1.4L5 0L1.4 1.4L0 5L-1.4 1.4L-5 0L-1.4-1.4Z";
const STARS = [[172, 40, 1.3, C.water], [150, 28, 0.9, C.deep], [178, 86, 1, C.water]] as const;

/** Empty rewards state: the pelican on a small podium, holding out a flag for you to take. */
export function EmptyRewardsIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {(cut) => (
        <>
          <g className="ill-rise" style={at(1)}><Ground y={124} fill={C.brown} cut={cut} /></g>
          <g className="ill-rise" style={at(2)}>
            <rect x="50" y="112" width="62" height="14" rx="2" fill={C.cream} filter={cut} />
          </g>
          <g className="ill-drop" style={at(5)}>
            <g className="ill-sway">
              <path d="M121 106L134 46" stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" />
              <path d="M134 46L164 58L130.4 62.8Z" fill={C.orange} filter={cut} />
            </g>
          </g>
          <g className="ill-drop" style={at(3)}><Pelican x={80} y={113} s={0.85} cut={cut} /></g>
          {STARS.map(([x, y, s, fill], n) => (
            <g key={n} transform={`translate(${x} ${y}) scale(${s})`}>
              <path className="ill-twinkle" style={phase(n)} d={STAR} fill={fill} />
            </g>
          ))}
        </>
      )}
    </Frame>
  );
}
