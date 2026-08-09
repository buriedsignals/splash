// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import { WaterfallVideo, type WaterfallVideoProps } from "./WaterfallVideo";
import { WATERFALL_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: WaterfallVideoProps = {
  data: [
    {
      id: "open",
      label: "2010",
      kind: "total",
      value: 624.21,
      runningBefore: 0,
      runningAfter: 624.21,
    },
    {
      id: "solar",
      label: "Solar",
      kind: "increase",
      value: 51.91,
      runningBefore: 624.21,
      runningAfter: 676.12,
    },
    {
      id: "coal",
      label: "Coal",
      kind: "decrease",
      value: -138.11,
      runningBefore: 676.12,
      runningAfter: 538.01,
    },
    {
      id: "close",
      label: "2023",
      kind: "total",
      value: 506.72,
      runningBefore: 0,
      runningAfter: 506.72,
    },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  increase: "#0072B2",
  decrease: "#D55E00",
  total: "#3D3D3D",
  legendLabels: ["Increase", "Decrease", "Total"],
  unit: "TWh",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidy-waterfall-germany-electricity-mix"
    component={WaterfallVideo}
    durationInFrames={WATERFALL_TIMING.total}
    fps={WATERFALL_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
