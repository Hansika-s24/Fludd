import { at, C, Cloud, Frame, Pelican, Rain, Water, Wave, type IllustrationProps } from "./parts";

// Heavy drops fall twice, medium five times, and a slow drizzle stays: the rain eases off.
const DROPS = [
  [30, 56, "ill-rain-2"], [172, 44, "ill-rain-5"], [58, 54, "ill-rain-slow"],
  [44, 78, "ill-rain-5"], [180, 76, "ill-rain-2"], [26, 100, "ill-rain-slow"],
  [70, 86, "ill-rain-2"], [170, 106, "ill-rain-slow"], [48, 112, "ill-rain-5"],
] as const;

/** Welcome: the pelican on its wave, exactly as in the logo, with the rain easing off. */
export function WelcomeIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      {(cut) => (
        <>
          <g className="ill-drop" style={at(1)}>
            <g className="ill-drift"><Cloud x={24} y={18} cut={cut} /></g>
          </g>
          <Rain drops={DROPS} />
          <g className="ill-bob-b">
            <g className="ill-rise" style={at(2)}>
              <g transform="translate(34 22) scale(.66)"><Wave cut={cut} /></g>
            </g>
            <g className="ill-drop" style={at(4)}><Pelican x={115.84} y={67.54} s={0.66} cut={cut} /></g>
          </g>
          <g className="ill-rise" style={at(3)}>
            <g className="ill-bob"><Water y={141} fill={C.water} cut={cut} /></g>
          </g>
        </>
      )}
    </Frame>
  );
}
