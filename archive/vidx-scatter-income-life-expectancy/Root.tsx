// This story's own Remotion root.
//
// ONE COMPOSITION PER EXPORT SIZE, and that is the half of the size migration a component cannot do
// on its own. This file used to register a single 1080 x 1080 composition with the two numbers typed
// here, beside a `const FRAME` in the component that repeated them — `specs/W4-export-sizes.md` §1a,
// "stated twice with nothing between them". A journalist who pinned `portrait` at gate 2c had no
// composition to render at all, whatever the component read.
//
// The list is built from the table's own row names, so a row added to `sizes.mjs` arrives here with
// nobody remembering to widen a list, and the id carries the size (`vidx-scatter-income-life-expectancy-landscape`) because
// `remotion still` / `remotion render` select a beat by composition id and nothing else.
//
// A size this TYPE cannot enter still gets a composition. It refuses inside the component, loudly,
// naming what is missing and the size that works — a stated refusal a journalist can read, rather
// than a missing id and a listing that says nothing.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
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
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidx-scatter-income-life-expectancy-${name}`}
          component={ScatterVideo}
          durationInFrames={SCATTER_TIMING.total}
          fps={SCATTER_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
