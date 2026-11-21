import { at, C, Frame, Ground, type IllustrationProps } from "./parts";

/** Parking: a car beside a map pin, with water creeping along the road toward the back wheel. */
export function ParkingIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {(cut) => (
        <>
          <g className="ill-rise" style={at(1)}><Ground fill={C.brown} cut={cut} /></g>
          <g className="ill-slide" style={at(2)}>
            <g fill={C.cream} filter={cut}>
              <rect x="38" y="94" width="92" height="22" rx="7" />
              <path d="M56 96L66 76H100L114 96Z" />
            </g>
            <path d="M63 94L70 80H82V94ZM86 80H98L107 94H86Z" fill={C.light} />
            <rect x="124" y="99" width="5" height="5" rx="1.5" fill={C.foam} />
            <g fill={C.ink} filter={cut}>
              <circle cx="62" cy="116" r="10" />
              <circle cx="110" cy="116" r="10" />
            </g>
            <path d="M62 112.5a3.5 3.5 0 1 0 .01 0ZM110 112.5a3.5 3.5 0 1 0 .01 0Z" fill={C.cream} />
          </g>
          <g className="ill-pop" style={at(4)}>
            <g className="ill-bob-b">
              <path d="M160 124C151 111 145 101 145 90a15 15 0 1 1 30 0C175 101 169 111 160 124Z" fill={C.orange} filter={cut} />
              <circle cx="160" cy="90" r="5.5" fill={C.foam} />
            </g>
          </g>
          <g className="ill-rise" style={at(5)}>
            <g className="ill-creep">
              <path d="M3 156V128C16 124 30 126 40 133C48 139 46 149 36 156Z" fill={C.deep} filter={cut} />
            </g>
            <g className="ill-creep ill-creep-b">
              <path d="M3 156V137C12 134 22 135 29 140C35 145 34 151 27 156Z" fill={C.water} filter={cut} />
            </g>
          </g>
        </>
      )}
    </Frame>
  );
}
