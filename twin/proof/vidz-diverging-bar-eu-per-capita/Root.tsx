// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import {
  DivergingBarVideo,
  type DivergingBarVideoProps,
} from "./DivergingBarVideo";
import { DIVERGING_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render is
// driven by ./render.mjs, which computes every claim from the frozen CSV.
const PLACEHOLDER: DivergingBarVideoProps = {
  data: [
    { country: "Placeholder A", change: 1 },
    { country: "Placeholder B", change: -2 },
    { country: "Placeholder C", change: -4 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  caveat: "Placeholder",
  axisTitle: "Placeholder unit",
  subjectCountry: "Placeholder A",
  averageFall: -3,
  averageFallLabel: "Average of the 2 falls: -3.00",
  conclusion: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidz-diverging-bar-eu-per-capita"
    component={DivergingBarVideo}
    durationInFrames={DIVERGING_TIMING.total}
    fps={DIVERGING_TIMING.fps}
    width={1080}
    height={1350}
    defaultProps={PLACEHOLDER}
  />
);
