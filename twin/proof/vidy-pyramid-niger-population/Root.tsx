// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import { PyramidVideo, type PyramidVideoProps } from "./PyramidVideo";
import { PYRAMID_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: PyramidVideoProps = {
  data: [
    { ageBand: "0-4", male: 2369723, female: 2297427 },
    { ageBand: "5-9", male: 2073417, female: 2005535 },
    { ageBand: "100+", male: 0, female: 0 },
  ],
  title: "Placeholder — render through render.mjs",
  note: "Placeholder",
  source: "Placeholder",
  referenceLabel: "Placeholder",
  ground: "#FFFFFF",
  ink: "#000000",
  muted: "#616161",
  male: "#0072B2",
  female: "#D55E00",
  legendLabels: ["Male", "Female"],
  subjectBand: "0-4",
  elderTotal: 672585,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidy-pyramid-niger-population"
    component={PyramidVideo}
    durationInFrames={PYRAMID_TIMING.total}
    fps={PYRAMID_TIMING.fps}
    width={1080}
    height={1350}
    defaultProps={PLACEHOLDER}
  />
);
