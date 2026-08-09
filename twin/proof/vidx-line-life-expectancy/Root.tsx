// This story's own Remotion root. One composition, because a story workspace holds one story.
import { Composition } from "remotion";
import {
  LifeExpectancyGapVideo,
  type LifeExpectancyGapVideoProps,
} from "./LifeExpectancyGapVideo";
import { LINE_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: LifeExpectancyGapVideoProps = {
  che: [
    { year: 1990, value: 77.3851 },
    { year: 2023, value: 83.9536 },
  ],
  fra: [
    { year: 1990, value: 76.8351 },
    { year: 2023, value: 83.3253 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 80,
  referenceLabel: "Placeholder",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidx-line-life-expectancy"
    component={LifeExpectancyGapVideo}
    durationInFrames={LINE_TIMING.total}
    fps={LINE_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
