import "./index.css";
import { Composition } from "remotion";
import { FluddBoot, FRAMES } from "./FluddBoot";

// Logo centre and size match the HTML text placed over the film in web/components/boot.
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BootDesktop" component={FluddBoot} durationInFrames={FRAMES} fps={30} width={1440} height={900} defaultProps={{ cx: 720, cy: 320, size: 320 }} />
    <Composition id="BootPhone" component={FluddBoot} durationInFrames={FRAMES} fps={30} width={780} height={1688} defaultProps={{ cx: 390, cy: 520, size: 480 }} />
  </>
);
