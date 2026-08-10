// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
// ONE COMPOSITION PER EXPORT SIZE — the half of the size migration a component cannot do on its
// own. A single 1080 x 1080 composition with the two numbers typed here left a journalist who
// pinned `portrait` with no composition to render at all. The list is built from the table's own
// row names; the id carries the size, because `remotion still` / `remotion render` select a beat by
// composition id and nothing else. A size this TYPE cannot enter still gets a composition and
// refuses inside the component, naming the measurement that is missing.
import { Composition } from "remotion";
import {
  EXPORT_SIZE_NAMES,
  sizeFor,
} from "#shared/chart-video/sizes.mjs";
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
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidy-waterfall-germany-electricity-mix-${name}`}
          component={WaterfallVideo}
          durationInFrames={WATERFALL_TIMING.total}
          fps={WATERFALL_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
