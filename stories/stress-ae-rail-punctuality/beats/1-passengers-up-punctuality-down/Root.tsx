// This beat's own Remotion root. One composition per row of the export-size table — not three
// beats, one beat offered at the three sizes ruling R2 names. `render.mjs` renders exactly the one
// `BRIEF.md`'s front matter pins.
import { Composition } from "remotion";
import { RailVideo, type RailVideoProps } from "./RailVideo";
import { RAIL_TIMING } from "./timing-contract";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";

// A placeholder so `remotion compositions` can list this without a props file. Every real render is
// driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: Omit<RailVideoProps, "size"> = {
  data: [
    { year: 2014, passengers: 58.2, punctuality: 91.4 },
    { year: 2020, passengers: 28.1, punctuality: 94.6 },
    { year: 2025, passengers: 74.6, punctuality: 81.6 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#8A6A12",
  secondAccent: "#2F5E5E",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  referenceYear: 2014,
  subjectYear: 2020,
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((size: string) => {
      const row = sizeFor(size);
      return (
        <Composition
          key={size}
          // The id carries the size, so a render names the size it asked for and a stale artifact
          // cannot be mistaken for a fresh one at another size.
          id={`rail-punctuality-${size}`}
          component={RailVideo}
          durationInFrames={RAIL_TIMING.total}
          fps={RAIL_TIMING.fps}
          width={row.width}
          height={row.height}
          defaultProps={{ ...PLACEHOLDER, size }}
        />
      );
    })}
  </>
);
