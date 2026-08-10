// This story's own Remotion root.
//
// ONE COMPOSITION PER EXPORT SIZE, and that is the half of the size migration a component cannot do
// on its own. This file used to register a single 1080 x 1080 composition with the two numbers typed
// here, beside a `const FRAME` in the component that repeated them — `specs/W4-export-sizes.md` §1a,
// "stated twice with nothing between them". A journalist who pinned `portrait` at gate 2c had no
// composition to render at all, whatever the component read.
//
// The list is built from the table's own row names, so a row added to `sizes.mjs` arrives here with
// nobody remembering to widen a list, and the id carries the size (`vidy-boxplot-co2-by-continent-landscape`) because
// `remotion still` / `remotion render` select a beat by composition id and nothing else.
//
// A size this TYPE cannot enter still gets a composition. It refuses inside the component, loudly,
// naming what is missing and the size that works — a stated refusal a journalist can read, rather
// than a missing id and a listing that says nothing.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/twin-chart-video/sizes.mjs";
import { BoxplotVideo, type BoxplotVideoProps } from "./BoxplotVideo";
import { BOXPLOT_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: BoxplotVideoProps = {
  data: [
    {
      continent: "Africa",
      n: 12,
      min: 0.14,
      q1: 0.43,
      median: 0.69,
      q3: 2.29,
      max: 6.91,
      whiskerLo: 0.14,
      whiskerHi: 4.39,
      outliers: [{ country: "South Africa", value: 6.91 }],
    },
    {
      continent: "Americas",
      n: 12,
      min: 1.72,
      q1: 2.1,
      median: 3.01,
      q3: 4.02,
      max: 14.32,
      whiskerLo: 1.72,
      whiskerHi: 4.23,
      outliers: [
        { country: "Canada", value: 13.88 },
        { country: "United States", value: 14.32 },
      ],
    },
    {
      continent: "Asia",
      n: 14,
      min: 0.61,
      q1: 2.28,
      median: 4.84,
      q3: 8.4,
      max: 20.37,
      whiskerLo: 0.61,
      whiskerHi: 11.39,
      outliers: [{ country: "Saudi Arabia", value: 20.37 }],
    },
    {
      continent: "Europe",
      n: 15,
      min: 3.48,
      q1: 4.27,
      median: 5.25,
      q3: 7.03,
      max: 7.7,
      whiskerLo: 3.48,
      whiskerHi: 7.7,
      outliers: [],
    },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  referenceValue: 3.69,
  referenceLabel: "Placeholder",
  axisUnit: "Placeholder",
  subjectContinent: "Americas",
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidy-boxplot-co2-by-continent-${name}`}
          component={BoxplotVideo}
          durationInFrames={BOXPLOT_TIMING.total}
          fps={BOXPLOT_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
