import { at, C, Frame, Rain, type IllustrationProps } from "./parts";

const DROPS = [[70, 36], [120, 34], [86, 60], [138, 52]] as const;

/** Camera: a spare phone propped on a window sill, looking out at a wet street. Its screen blinks one still at a time. */
export function CameraIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {(cut) => (
        <g transform="translate(0 6)">
          <g className="ill-drop" style={at(1)}>
            <rect x="44" y="20" width="112" height="90" fill={C.light} />
            <g filter={cut}>
              <path d="M60 92V70L74 58L88 70V92Z" fill={C.brown} />
              <path d="M112 92V62h24V92Z" fill={C.cream} />
            </g>
            <Rain drops={DROPS} stroke={C.foam} />
            <g className="ill-bob">
              <path d="M44 109V88c14-4 26 3 40 0c14-3 28 4 42 0c10-3 20-1 30 0V109Z" fill={C.deep} />
              <path d="M44 109V96c16-3 30 3 46 0c20-4 40 3 66 0V109Z" fill={C.water} />
            </g>
          </g>
          <g className="ill-drop" style={at(2)}>
            <path
              d="M46 16h108a6 6 0 0 1 6 6v86a6 6 0 0 1-6 6h-108a6 6 0 0 1-6-6v-86a6 6 0 0 1 6-6ZM48 26v80h49v-80ZM103 26v80h49v-80Z"
              fill={C.cream}
              fillRule="evenodd"
              filter={cut}
            />
          </g>
          <g className="ill-rise" style={at(3)}>
            <rect x="30" y="112" width="140" height="11" rx="3" fill={C.brown} filter={cut} />
          </g>
          <g className="ill-drop" style={at(5)}>
            <rect x="141" y="97" width="17" height="15" rx="2.5" fill={C.brown} filter={cut} />
            <g transform="rotate(8 128 112)">
              <rect x="116" y="66" width="26" height="46" rx="4" fill={C.ink} filter={cut} />
              <rect x="118.5" y="69.5" width="21" height="39" rx="2" fill={C.light} />
              <path d="M118.5 94h21v12.5a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2Z" fill={C.water} />
              <path d="M124 94v-7l5-4l5 4v7Z" fill={C.brown} />
              <circle cx="129" cy="103" r="2.6" fill={C.orange} />
              <rect className="ill-snap" x="118.5" y="69.5" width="21" height="39" rx="2" fill={C.foam} />
            </g>
          </g>
        </g>
      )}
    </Frame>
  );
}
