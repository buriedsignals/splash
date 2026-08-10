// This story's own Remotion root.
//
// ONE COMPOSITION PER EXPORT SIZE, and that is the half of the size migration a component cannot do
// on its own. `Root.tsx` used to register a single 1080 x 1080 composition with the two numbers
// typed here, so a journalist who pinned `portrait` at gate 2c had no composition to render at all —
// whatever the component read. The list is built from the table's own row names, so a row added to
// `sizes.mjs` arrives here without anybody remembering to widen a list, and the id carries the size
// (`vidz-bar-column-top-emitters-landscape`) because `remotion still` / `remotion render` select a
// beat by composition id and nothing else.
//
// A size this TYPE cannot enter still gets a composition. It refuses inside the component, loudly,
// naming the ladder rung and the size that works — a stated refusal a journalist can read, rather
// than a missing id and a listing that says nothing. See `ColumnRankingVideo`'s `formForSize` block.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import {
  ColumnRankingVideo,
  type ColumnRankingVideoProps,
} from "./ColumnRankingVideo";
import { COLUMN_RANKING_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render is
// driven by ./render.mjs, which reads the frozen CSV, derives every claim from it, and passes the
// real props. These numbers are deliberately round and obviously not the data.
const PLACEHOLDER: ColumnRankingVideoProps = {
  data: [
    { country: "Placeholder A", gt: 10 },
    { country: "Placeholder B", gt: 4 },
    { country: "Placeholder C", gt: 3 },
    { country: "Placeholder D", gt: 2 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  axisTitle: "Placeholder unit",
  subjectCountry: "Placeholder A",
  combinedCount: 2,
  combinedTotal: 7,
  combinedLabel: "The next two combined",
  unit: "placeholder units",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidz-bar-column-top-emitters-${name}`}
          component={ColumnRankingVideo}
          durationInFrames={COLUMN_RANKING_TIMING.total}
          fps={COLUMN_RANKING_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
