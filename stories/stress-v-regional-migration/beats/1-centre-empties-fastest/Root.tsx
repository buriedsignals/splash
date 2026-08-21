// This story's own Remotion root.
//
// TWO compositions for ONE beat, which is not the usual shape and is deliberate. The journalist
// asked for the same visual twice — "vertical for stories, and a version for the feed as well" —
// and `STORYBOARD.md` records a size on the SLOT, one scalar, so it can carry `portrait` or
// `square` but not both. Rather than invent a second slot for what is not a second argument, the
// beat registers the same component at each of the two frames it ships in and `render.mjs` drives
// whichever one it is asked for. `portrait` is this beat's pinned size (`BRIEF.md`); `square` is
// the second form, produced from the same geometry, the same timing and the same props.
import { Composition } from "remotion";
import {
  RegionalMigrationVideo,
  type RegionalMigrationVideoProps,
} from "./RegionalMigrationVideo";
import { MIGRATION_TIMING } from "./timing-contract";
import { sizeFor } from "#shared/chart-video/sizes.mjs";

// A placeholder so `remotion compositions` can list these without a props file. Every real render
// is driven by ./render.mjs, which computes every claim from the frozen CSV.
const PLACEHOLDER: RegionalMigrationVideoProps = {
  data: [
    { region: "Placeholder A", net: 1500 },
    { region: "Placeholder B", net: 400 },
    { region: "Placeholder C", net: -2100 },
  ],
  size: "portrait",
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  caveat: "Placeholder",
  axisTitle: "Placeholder unit",
  subjectRegion: "Placeholder C",
  conclusion: "Placeholder",
  fontFamily: "Helvetica, Arial, sans-serif",
  ground: "#16191B",
  accent: "#D4A853",
  ink: "#FFFFFF",
  muted: "#9AA0A6",
  grid: "#3A3F44",
};

const portrait = sizeFor("portrait");
const square = sizeFor("square");

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="centre-empties-fastest-portrait"
      component={RegionalMigrationVideo}
      durationInFrames={MIGRATION_TIMING.total}
      fps={MIGRATION_TIMING.fps}
      width={portrait.width}
      height={portrait.height}
      defaultProps={{ ...PLACEHOLDER, size: "portrait" }}
    />
    <Composition
      id="centre-empties-fastest-square"
      component={RegionalMigrationVideo}
      durationInFrames={MIGRATION_TIMING.total}
      fps={MIGRATION_TIMING.fps}
      width={square.width}
      height={square.height}
      defaultProps={{ ...PLACEHOLDER, size: "square" }}
    />
  </>
);
