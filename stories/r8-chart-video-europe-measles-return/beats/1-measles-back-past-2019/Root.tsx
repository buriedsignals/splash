// This beat's own Remotion root. One composition per row of the export-size table — not three
// beats, one beat offered at the three sizes R2 names. `render.mjs` renders exactly the one this
// beat's `BRIEF.md` pins.
import { Composition } from "remotion";
import { MeaslesReturnVideo, type MeaslesReturnVideoProps } from "./MeaslesReturnVideo";
import { MEASLES_TIMING } from "./timing-contract";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen table and passes the real props.
const PLACEHOLDER: Omit<MeaslesReturnVideoProps, "size"> = {
  data: [
    { year: 2011, cases: 33646 },
    { year: 2019, cases: 104442 },
    { year: 2021, cases: 150 },
    { year: 2024, cases: 106237 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 104442,
  referenceLabel: "Placeholder",
  subjectYear: 2024,
  floorYear: 2021,
  excessLabel: "Placeholder",
  unit: "cases",
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
          id={`measles-return-${size}`}
          component={MeaslesReturnVideo}
          durationInFrames={MEASLES_TIMING.total}
          fps={MEASLES_TIMING.fps}
          width={row.width}
          height={row.height}
          // The row's own name travels with the composition, and the component checks it back
          // against `useVideoConfig()`.
          defaultProps={{ ...PLACEHOLDER, size }}
        />
      );
    })}
  </>
);
