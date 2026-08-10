// This story's own Remotion root. THREE compositions now, one per row of the export-size table —
// not three stories, one story offered at the three sizes R2 names. Remotion registers extra
// compositions for free, and `render.mjs` renders exactly the one this beat's `BRIEF.md` pins.
//
// Before this there was one `<Composition>` carrying `width={1080} height={1080}` as literals, and
// the video component carried the same two numbers again as its own `const FRAME`. Neither was
// reachable from the gate.
import { Composition } from "remotion";
import { MigrationVideo, type MigrationVideoProps } from "./MigrationVideo";
import { MIGRATION_TIMING } from "./timing-contract";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/twin-chart-video/sizes.mjs";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: Omit<MigrationVideoProps, "size"> = {
  data: [
    { year: 1995, value: 14.458 },
    { year: 1996, value: -5.807 },
    { year: 1997, value: -6.834 },
    { year: 1998, value: 1.177 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 0,
  referenceLabel: "Placeholder",
  subjectYears: [1996, 1997],
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
          id={`migration-${size}`}
          component={MigrationVideo}
          durationInFrames={MIGRATION_TIMING.total}
          fps={MIGRATION_TIMING.fps}
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
