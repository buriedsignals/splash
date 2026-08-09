// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import { HeatmapVideo, type HeatmapVideoProps } from "./HeatmapVideo";
import { HEATMAP_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: HeatmapVideoProps = {
  years: [2016, 2017, 2018],
  data: [
    { country: "Iceland", values: [100, 100, 100] },
    { country: "Norway", values: [98.1, 98.1, 98.0] },
    { country: "Poland", values: [13.7, 14.2, 12.8] },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  legendTitle: "Placeholder",
  ground: "#FFFFFF",
  accent: "#1E7B45",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  subjectCountry: "Iceland",
  subjectNote: "Placeholder",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidy-heatmap-renewables-europe"
    component={HeatmapVideo}
    durationInFrames={HEATMAP_TIMING.total}
    fps={HEATMAP_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
