// This story's own Remotion root. One composition, because a story workspace holds one story.
import { Composition } from "remotion";
import { StackedBarVideo, type StackedBarVideoProps } from "./StackedBarVideo";
import { STACKED_BAR_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: StackedBarVideoProps = {
  data: [
    { year: 2000, solarWind: 0.01, hydro: 36.83, nuclearOther: 29.28 },
    { year: 2010, solarWind: 0.13, hydro: 36.06, nuclearOther: 29.86 },
    { year: 2020, solarWind: 2.75, hydro: 37.87, nuclearOther: 27.88 },
    { year: 2024, solarWind: 5.84, hydro: 44.94, nuclearOther: 27.59 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 66.12,
  referenceLabel: "Placeholder",
  legendLabels: ["Solar & wind", "Hydropower", "Nuclear & other"],
  subjectYear: 2024,
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidx-stacked-bar-swiss-electricity"
    component={StackedBarVideo}
    durationInFrames={STACKED_BAR_TIMING.total}
    fps={STACKED_BAR_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
