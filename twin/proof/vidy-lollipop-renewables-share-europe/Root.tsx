// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import { LollipopVideo, type LollipopVideoProps } from "./LollipopVideo";
import { LOLLIPOP_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: LollipopVideoProps = {
  data: [
    { country: "Iceland", value: 100 },
    { country: "Norway", value: 98.99882 },
    { country: "Switzerland", value: 67.82529 },
    { country: "France", value: 26.064074 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  subjectCountry: "Switzerland",
  compareCountry: "Norway",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidy-lollipop-renewables-share-europe"
    component={LollipopVideo}
    durationInFrames={LOLLIPOP_TIMING.total}
    fps={LOLLIPOP_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
