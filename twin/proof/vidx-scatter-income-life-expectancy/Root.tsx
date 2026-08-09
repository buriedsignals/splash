// This story's own Remotion root. One composition, because a story workspace holds one story.
import { Composition } from "remotion";
import { ScatterVideo, type ScatterVideoProps } from "./ScatterVideo";
import { SCATTER_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: ScatterVideoProps = {
  data: [
    { country: "Spain", gdp: 34123, lifeExpectancy: 82.37 },
    { country: "United States", gdp: 58487, lifeExpectancy: 77.98 },
    { country: "Norway", gdp: 88366, lifeExpectancy: 82.63 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#9A9A9A",
  grid: "#D1D1D1",
  reference: 82.05,
  referenceLabel: "Placeholder",
  subjectCountry: "United States",
  xAxisLabel: "GDP per capita ($)",
  yAxisLabel: "Life expectancy at birth (years)",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidx-scatter-income-life-expectancy"
    component={ScatterVideo}
    durationInFrames={SCATTER_TIMING.total}
    fps={SCATTER_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
