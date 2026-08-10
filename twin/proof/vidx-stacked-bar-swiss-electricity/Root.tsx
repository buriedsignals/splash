// This story's own Remotion root.
//
// ONE COMPOSITION PER EXPORT SIZE, and that is the half of the size migration a component cannot do
// on its own. This file used to register a single 1080 x 1080 composition with the two numbers typed
// here, beside a `const FRAME` in the component that repeated them — `specs/W4-export-sizes.md` §1a,
// "stated twice with nothing between them". A journalist who pinned `portrait` at gate 2c had no
// composition to render at all, whatever the component read.
//
// The list is built from the table's own row names, so a row added to `sizes.mjs` arrives here with
// nobody remembering to widen a list, and the id carries the size (`vidx-stacked-bar-swiss-electricity-landscape`) because
// `remotion still` / `remotion render` select a beat by composition id and nothing else.
//
// A size this TYPE cannot enter still gets a composition. It refuses inside the component, loudly,
// naming what is missing and the size that works — a stated refusal a journalist can read, rather
// than a missing id and a listing that says nothing.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/twin-chart-video/sizes.mjs";
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
  bandInks: ["#0B7A75", "#C1440E", "#1F6FB2"],
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 66.12,
  referenceLabel: "Placeholder",
  legendLabels: ["Solar & wind", "Hydropower", "Nuclear & other"],
  subjectYear: 2024,
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidx-stacked-bar-swiss-electricity-${name}`}
          component={StackedBarVideo}
          durationInFrames={STACKED_BAR_TIMING.total}
          fps={STACKED_BAR_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
