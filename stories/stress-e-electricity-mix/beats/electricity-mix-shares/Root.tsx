// This story's own Remotion root. One composition, because a story workspace holds one story.
import { Composition } from "remotion";
import {
  ElectricityMixVideo,
  type ElectricityMixVideoProps,
} from "./ElectricityMixVideo";
import { ELECTRICITY_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which computes every claim from the frozen CSV.
const PLACEHOLDER: ElectricityMixVideoProps = {
  data: [
    { source: "Placeholder A", share: 40 },
    { source: "Placeholder B", share: 20 },
    { source: "Placeholder C", share: -4 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  caveat: "Placeholder",
  axisTitle: "Placeholder unit",
  subjectSource: "Placeholder C",
  conclusion: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="electricity-mix-shares"
    component={ElectricityMixVideo}
    durationInFrames={ELECTRICITY_TIMING.total}
    fps={ELECTRICITY_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
