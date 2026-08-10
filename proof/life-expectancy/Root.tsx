// This story's own Remotion root. THREE compositions now, one per row of the export-size table —
// not three stories, one story offered at the three sizes R2 names. Remotion registers extra
// compositions for free, and `render.mjs` renders exactly the one this beat's `BRIEF.md` pins.
//
// Before this there was one `<Composition>` carrying `width={1080} height={1080}` as literals, and
// the video component carried the same two numbers again as its own `const FRAME`. Neither was
// reachable from the gate: a journalist pinning `portrait` got a square mp4 and nothing threw.
import { Composition } from "remotion";
import {
  LifeExpectancyVideo,
  type LifeExpectancyVideoProps,
} from "./LifeExpectancyVideo";
import { LIFE_EXPECTANCY_TIMING } from "./timing-contract";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: Omit<LifeExpectancyVideoProps, "size"> = {
  data: [
    { year: 2000, value: 79.8 },
    { year: 2020, value: 82.9 },
    { year: 2023, value: 84.0 },
    { year: 2024, value: 84.2 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 83.8,
  referenceLabel: "Placeholder",
  subjectYear: 2020,
  recoveryYear: 2023,
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
          id={`life-expectancy-${size}`}
          component={LifeExpectancyVideo}
          durationInFrames={LIFE_EXPECTANCY_TIMING.total}
          fps={LIFE_EXPECTANCY_TIMING.fps}
          width={row.width}
          height={row.height}
          // The row's own name travels with the composition, and the component checks it back
          // against `useVideoConfig()` — see `LifeExpectancyVideo`, where the two statements of the
          // frame are compared rather than trusted.
          defaultProps={{ ...PLACEHOLDER, size }}
        />
      );
    })}
  </>
);
