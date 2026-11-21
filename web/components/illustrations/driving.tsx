import { at, C, Cloud, Frame, type IllustrationProps } from "./parts";

// The road. The ill-route keyframes in illustrations.css are points on this path, measured from its start (22,142).
const ROAD = "M22 142C70 142 84 118 110 104C136 90 150 72 178 66";

/** Driving: a dry road curving up to higher ground, with a route dot travelling along it. The water stays below the road. */
export function DrivingIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {(cut) => (
        <>
          <g className="ill-drop" style={at(1)}>
            <g className="ill-drift"><Cloud x={28} y={22} s={0.8} cut={cut} /></g>
          </g>
          <g className="ill-rise" style={at(1)}>
            <path d="M90 156C110 90 140 40 170 30C182 26 192 28 197 32V156Z" fill={C.brown} filter={cut} />
          </g>
          <g className="ill-rise" style={at(2)}>
            <path d="M3 156V124C50 124 66 104 96 90C122 76 140 58 197 50V156Z" fill={C.cream} filter={cut} />
          </g>
          <g className="ill-drop" style={at(3)}>
            <g filter={cut}><path d={ROAD} fill="none" stroke={C.ink} strokeWidth="10" strokeLinecap="round" /></g>
            <path d={ROAD} fill="none" stroke={C.cream} strokeWidth="1.4" strokeDasharray="4 5" opacity=".8" />
          </g>
          <g className="ill-pop" style={at(5)}>
            <circle cx="178" cy="66" r="7" fill={C.foam} filter={cut} />
            <circle cx="178" cy="66" r="3" fill={C.deep} />
          </g>
          <g className="ill-rise" style={at(4)}>
            <g className="ill-bob">
              <path d="M3 156V151C20 147 40 154 62 150C76 148 88 152 96 156Z" fill={C.water} filter={cut} />
            </g>
          </g>
          <circle className="ill-route" cx="22" cy="142" r="4.5" fill={C.orange} stroke={C.foam} strokeWidth="2" />
        </>
      )}
    </Frame>
  );
}
