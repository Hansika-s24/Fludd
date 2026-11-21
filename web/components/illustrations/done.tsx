import { at, C, Cloud, Frame, Pelican, Water, type IllustrationProps } from "./parts";

/** Done: the sky cleared, the pelican dry on a post above calm water. */
export function DoneIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {(cut) => (
        <>
          <g className="ill-pop" style={at(1)}>
            <path
              className="ill-spin"
              d="M65 40h6M27 40h-6M46 59v6M46 21v-6M59.4 53.4l4.3 4.3M32.6 53.4l-4.3 4.3M32.6 26.6l-4.3-4.3M59.4 26.6l4.3-4.3"
              stroke={C.orange}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="46" cy="40" r="13" fill={C.orange} filter={cut} />
          </g>
          <g className="ill-drop" style={at(2)}>
            <g className="ill-drift"><Cloud x={144} y={22} s={0.8} cut={cut} /></g>
          </g>
          <g className="ill-rise" style={at(3)}>
            <rect x="91" y="96" width="18" height="60" rx="3" fill={C.cream} filter={cut} />
            <path d="M94 106h12M94 112h12" stroke={C.brown} strokeWidth="2" strokeLinecap="round" opacity=".5" />
          </g>
          <g className="ill-drop" style={at(5)}><Pelican x={100} y={97} s={0.8} cut={cut} /></g>
          <g className="ill-rise" style={at(4)}>
            <g className="ill-bob-b"><Water y={136} fill={C.deep} cut={cut} /></g>
          </g>
          <g className="ill-rise" style={at(5)}>
            <g className="ill-bob"><Water y={144} fill={C.water} cut={cut} /></g>
          </g>
        </>
      )}
    </Frame>
  );
}
