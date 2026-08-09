// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import { HistogramVideo, type HistogramVideoProps } from "./HistogramVideo";
import { HISTOGRAM_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: HistogramVideoProps = {
  readings: [
    { entity: "Nigeria", value: 54.4623 },
    { entity: "Morocco", value: 75.3128 },
    { entity: "Monaco", value: 86.3724 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  axisNote: "Placeholder",
  unitLabel: "Placeholder",
  ground: "#FFFFFF",
  accent: "#B5541E",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  referenceLabel: "Placeholder",
  medianValue: 75.3128,
  binWidth: 5,
  domainStart: 50,
  domainEnd: 90,
  subjectBinStart: 75,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidy-histogram-life-expectancy"
    component={HistogramVideo}
    durationInFrames={HISTOGRAM_TIMING.total}
    fps={HISTOGRAM_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
