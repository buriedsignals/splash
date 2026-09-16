// This story's own Remotion root — one composition, per the project's own rule that a story
// workspace holds one story.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import {
  SmallMultiplesCo2Video,
  type SmallMultiplesCo2VideoProps,
} from "./SmallMultiplesCo2Video";
import { SMALL_MULTIPLES_CO2_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: Omit<SmallMultiplesCo2VideoProps, "size"> = {
  countries: [
    {
      name: "Placeholder A",
      data: [
        { year: 1950, value: 1 },
        { year: 2024, value: 2 },
      ],
    },
    {
      name: "Placeholder B",
      data: [
        { year: 1950, value: 1 },
        { year: 2024, value: 2 },
      ],
    },
    {
      name: "Placeholder C",
      data: [
        { year: 1950, value: 1 },
        { year: 2024, value: 2 },
      ],
    },
    {
      name: "Placeholder D",
      data: [
        { year: 1950, value: 1 },
        { year: 2024, value: 2 },
      ],
    },
  ],
  order: [0, 1, 2, 3],
  subjectIndex: 3,
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  limits: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  conclusionText: "Placeholder",
};

// THREE compositions, one per row of the export-size table — not three stories, one story offered
// at the three sizes R2 names. Remotion registers extra compositions for free, and `render.mjs`
// renders exactly the one this beat's `BRIEF.md` pins. Before this there was one, carrying
// `width={1080} height={1080}` as literals, with the same two numbers again in the component.
export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((size: string) => {
      const row = sizeFor(size);
      return (
        <Composition
          key={size}
          id={`small-multiples-co2-${size}`}
          component={SmallMultiplesCo2Video}
          durationInFrames={SMALL_MULTIPLES_CO2_TIMING.total}
          fps={SMALL_MULTIPLES_CO2_TIMING.fps}
          width={row.width}
          height={row.height}
          defaultProps={{ ...PLACEHOLDER, size }}
        />
      );
    })}
  </>
);
