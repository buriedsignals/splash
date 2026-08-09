// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import {
  CumulativeCo2AreaVideo,
  type CumulativeCo2AreaVideoProps,
} from "./CumulativeCo2AreaVideo";
import { CUMULATIVE_CO2_AREA_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: CumulativeCo2AreaVideoProps = {
  data: [
    { year: 1858, mt: 0.15 },
    { year: 1950, mt: 473.2 },
    { year: 1986, mt: 1583.0 },
    { year: 2024, mt: 3158.1 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 1579.0,
  referenceLabel: "Placeholder",
  subjectYear: 1986,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="cumulative-co2-area"
    component={CumulativeCo2AreaVideo}
    durationInFrames={CUMULATIVE_CO2_AREA_TIMING.total}
    fps={CUMULATIVE_CO2_AREA_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
