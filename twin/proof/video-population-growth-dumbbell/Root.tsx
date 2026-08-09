// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import { DumbbellVideo, type DumbbellVideoProps } from "./DumbbellVideo";
import { DUMBBELL_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: DumbbellVideoProps = {
  data: [
    { country: "Switzerland", index2000: 100, index2023: 123.5, gap: 23.5 },
    { country: "Norway", index2000: 100, index2023: 122.9, gap: 22.9 },
    { country: "Poland", index2000: 100, index2023: 101.3, gap: 1.3 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  referenceLabel: "Placeholder",
  legendLabels: ["2000", "2023"],
  subjectCountry: "Switzerland",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="video-population-growth-dumbbell"
    component={DumbbellVideo}
    durationInFrames={DUMBBELL_TIMING.total}
    fps={DUMBBELL_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
