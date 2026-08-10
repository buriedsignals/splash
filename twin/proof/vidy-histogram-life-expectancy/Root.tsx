// This story's own Remotion root.
//
// ONE COMPOSITION PER EXPORT SIZE, and that is the half of the size migration a component cannot do
// on its own: this file used to register a single 1080 x 1080 composition with the two numbers typed
// here, so a journalist who pinned `portrait` at gate 2c had no composition to render at all. The
// list is built from the table's own row names, so a row added to `sizes.mjs` arrives here without
// anybody widening a list, and the id carries the size because `remotion still` / `remotion render`
// select a beat by composition id and nothing else.
//
// A size this TYPE cannot enter still gets a composition; it refuses inside the component, loudly,
// naming the measurement that is missing and the sizes that do work.
import { Composition } from "remotion";
import {
  EXPORT_SIZE_NAMES,
  sizeFor,
} from "#shared/twin-chart-video/sizes.mjs";
import { HistogramVideo, type HistogramVideoProps } from "./HistogramVideo";
import { HISTOGRAM_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: HistogramVideoProps = {
  readings: [
    { entity: "Nigeria", value: 54.4623 },
    { entity: "Morocco", value: 75.3128 },
    { entity: "Monaco", value: 86.3724 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  axisNote: "Placeholder",
  unitLabel: "Placeholder",
  ground: "#FFFFFF",
  accent: "#B5541E",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  referenceLabel: "Placeholder",
  medianValue: 75.3128,
  binWidth: 5,
  domainStart: 50,
  domainEnd: 90,
  subjectBinStart: 75,
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidy-histogram-life-expectancy-${name}`}
          component={HistogramVideo}
          durationInFrames={HISTOGRAM_TIMING.total}
          fps={HISTOGRAM_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
