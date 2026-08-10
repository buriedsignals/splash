// This story's own Remotion root.
//
// ONE COMPOSITION PER EXPORT SIZE, and that is the half of the size migration a component cannot do
// on its own. This file used to register a single 1080 x 1080 composition with the two numbers typed
// here, beside a `const FRAME` in the component that repeated them — `specs/W4-export-sizes.md` §1a,
// "stated twice with nothing between them". A journalist who pinned `portrait` at gate 2c had no
// composition to render at all, whatever the component read.
//
// The list is built from the table's own row names, so a row added to `sizes.mjs` arrives here with
// nobody remembering to widen a list, and the id carries the size (`vidy-heatmap-renewables-europe-landscape`) because
// `remotion still` / `remotion render` select a beat by composition id and nothing else.
//
// A size this TYPE cannot enter still gets a composition. It refuses inside the component, loudly,
// naming what is missing and the size that works — a stated refusal a journalist can read, rather
// than a missing id and a listing that says nothing.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/twin-chart-video/sizes.mjs";
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
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidy-heatmap-renewables-europe-${name}`}
          component={HeatmapVideo}
          durationInFrames={HEATMAP_TIMING.total}
          fps={HEATMAP_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
