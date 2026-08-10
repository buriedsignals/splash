// This story's own Remotion root.
//
// ONE COMPOSITION PER EXPORT SIZE, and that is the half of the size migration a component cannot do
// on its own. This file used to register a single 1080 x 1080 composition with the two numbers typed
// here, beside a `const FRAME` in the component that repeated them — `specs/W4-export-sizes.md` §1a,
// "stated twice with nothing between them". A journalist who pinned `portrait` at gate 2c had no
// composition to render at all, whatever the component read.
//
// The list is built from the table's own row names, so a row added to `sizes.mjs` arrives here with
// nobody remembering to widen a list, and the id carries the size (`vidx-grouped-bar-co2-per-capita-landscape`) because
// `remotion still` / `remotion render` select a beat by composition id and nothing else.
//
// A size this TYPE cannot enter still gets a composition. It refuses inside the component, loudly,
// naming what is missing and the size that works — a stated refusal a journalist can read, rather
// than a missing id and a listing that says nothing.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/twin-chart-video/sizes.mjs";
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
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidx-grouped-bar-co2-per-capita-${name}`}
          component={GroupedBarVideo}
          durationInFrames={GROUPED_BAR_TIMING.total}
          fps={GROUPED_BAR_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
