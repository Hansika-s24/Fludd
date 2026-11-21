import { at, C, Frame, Ground, House, Rain, type IllustrationProps } from "./parts";

const DROPS = [[28, 26], [174, 30], [22, 58], [180, 64], [32, 88], [170, 94]] as const;

/** Insurance: an umbrella over a house, rain falling either side of it. */
export function InsuranceIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {(cut) => (
        <>
          <Rain drops={DROPS} />
          <g className="ill-rise" style={at(1)}><Ground y={124} fill={C.brown} cut={cut} /></g>
          <g className="ill-drop" style={at(4)}>
            <g className="ill-sway">
              <path d="M100 12V104" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
              <path
                d="M38 66A62 50 0 0 1 162 66q-10.3-9-20.7 0q-10.3-9-20.7 0q-10.3-9-20.6 0q-10.3-9-20.7 0q-10.3-9-20.7 0q-10.3-9-20.6 0Z"
                fill={C.deep}
                filter={cut}
              />
              <path d="M100 16C90 28 80 46 79.3 66q10.35-9 20.7 0q10.3-9 20.6 0C120 46 110 28 100 16Z" fill={C.water} filter={cut} />
              <circle cx="100" cy="11" r="3.2" fill={C.orange} />
            </g>
          </g>
          <g className="ill-drop" style={at(2)}><House x={100} y={128} s={0.8} cut={cut} /></g>
        </>
      )}
    </Frame>
  );
}
