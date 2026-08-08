// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import { MigrationVideo, type MigrationVideoProps } from "./MigrationVideo";
import { MIGRATION_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: MigrationVideoProps = {
  data: [
    { year: 1996, value: 4.7 },
    { year: 1997, value: -1.9 },
    { year: 1998, value: -3.4 },
    { year: 1999, value: 11.2 },
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
  subjectYears: [1997, 1998],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="migration"
    component={MigrationVideo}
    durationInFrames={MIGRATION_TIMING.total}
    fps={MIGRATION_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
