import { at, C, Frame, Ground, Pelican, type IllustrationProps } from "./parts";

/** Empty address state: the pelican on a map, holding a magnifier up to a blank pin. */
export function EmptyAddressIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {(cut) => (
        <>
          <g className="ill-rise" style={at(1)}>
            <Ground fill={C.cream} cut={cut} />
            <path d="M24 151L66 127M112 152L184 128" stroke={C.foam} strokeWidth="3" strokeLinecap="round" />
          </g>
          <g className="ill-pop" style={at(3)}>
            <path
              d="M152 126C143 113 137 103 137 92a15 15 0 1 1 30 0C167 103 161 113 152 126Z"
              fill={C.foam}
              stroke={C.ink}
              strokeWidth="1.6"
              strokeDasharray="3 4"
              filter={cut}
            />
            <circle cx="152" cy="92" r="5" fill={C.page} />
          </g>
          <g className="ill-drop" style={at(5)}>
            <g className="ill-look">
              <g filter={cut}>
                <path d="M127.5 96.5L112 106" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
                <circle cx="136" cy="88" r="12" fill={C.light} fillOpacity=".5" stroke={C.ink} strokeWidth="4" />
              </g>
            </g>
          </g>
          <g className="ill-drop" style={at(2)}><Pelican x={62} y={124} s={0.85} cut={cut} /></g>
        </>
      )}
    </Frame>
  );
}
