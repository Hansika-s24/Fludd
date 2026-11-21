import { at, C, Cloud, Frame, Ground, House, Water, type IllustrationProps } from "./parts";

/** Home: a small house on a street, with a water line that rises a little and falls. */
export function HomeIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {(cut) => (
        <>
          <g className="ill-drop" style={at(1)}>
            <g className="ill-drift"><Cloud x={132} y={22} s={0.8} cut={cut} /></g>
          </g>
          <g className="ill-rise" style={at(1)}>
            <Ground fill={C.brown} cut={cut} />
            <path d="M20 131h14M52 131h14M84 131h14M116 131h14M148 131h14" stroke={C.cream} strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
          </g>
          <g className="ill-drop" style={at(3)}><House x={100} y={126} door={C.orange} cut={cut} /></g>
          <g className="ill-rise" style={at(4)}>
            <g className="ill-tide"><Water y={137} fill={C.deep} cut={cut} /></g>
          </g>
          <g className="ill-rise" style={at(5)}>
            <g className="ill-tide ill-tide-b"><Water y={144} fill={C.water} cut={cut} /></g>
          </g>
        </>
      )}
    </Frame>
  );
}
