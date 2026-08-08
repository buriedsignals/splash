// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import {
  LifeExpectancyVideo,
  type LifeExpectancyVideoProps,
} from "./LifeExpectancyVideo";
import { LIFE_EXPECTANCY_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: LifeExpectancyVideoProps = {
  data: [
    { year: 2000, value: 79.8 },
    { year: 2020, value: 82.9 },
    { year: 2023, value: 84.0 },
    { year: 2024, value: 84.2 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 83.8,
  referenceLabel: "Placeholder",
  subjectYear: 2020,
  recoveryYear: 2023,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="life-expectancy"
    component={LifeExpectancyVideo}
    durationInFrames={LIFE_EXPECTANCY_TIMING.total}
    fps={LIFE_EXPECTANCY_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
