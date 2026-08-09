// This story's own Remotion root. One composition, because a story workspace holds one story.
import { Composition } from "remotion";
import { GroupedBarVideo, type GroupedBarVideoProps } from "./GroupedBarVideo";
import { GROUPED_BAR_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: GroupedBarVideoProps = {
  data: [
    { country: "United States", y2000: 21.4, y2023: 14.32 },
    { country: "China", y2000: 2.87, y2023: 8.56 },
    { country: "Brazil", y2000: 1.95, y2023: 2.29 },
    { country: "India", y2000: 0.93, y2023: 2.13 },
    { country: "Nigeria", y2000: 0.77, y2023: 0.57 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#B7B7B7",
  grid: "#D1D1D1",
  reference: 4.71,
  referenceLabel: "Placeholder",
  legendLabels: ["2000", "2023"],
  subjectCountry: "China",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidx-grouped-bar-co2-per-capita"
    component={GroupedBarVideo}
    durationInFrames={GROUPED_BAR_TIMING.total}
    fps={GROUPED_BAR_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
