// This story's own Remotion root. One composition, because a story workspace holds one story.
import { Composition } from "remotion";
import { SlopeVideo, type SlopeVideoProps } from "./SlopeVideo";
import { SLOPE_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: SlopeVideoProps = {
  data: [
    { country: "Niger", v1990: 33.24, v2023: 11.35 },
    { country: "Nigeria", v1990: 20.76, v2023: 11.68 },
    { country: "Rwanda", v1990: 15.07, v2023: 3.88 },
    { country: "India", v1990: 12.7, v2023: 2.8 },
    { country: "Brazil", v1990: 6.28, v2023: 1.44 },
    { country: "Switzerland", v1990: 0.82, v2023: 0.39 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#9A9A9A",
  grid: "#D1D1D1",
  reference: 2.5,
  referenceLabel: "Placeholder",
  periodLabels: ["1990", "2023"],
  subjectCountry: "Rwanda",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidx-slope-child-mortality"
    component={SlopeVideo}
    durationInFrames={SLOPE_TIMING.total}
    fps={SLOPE_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
