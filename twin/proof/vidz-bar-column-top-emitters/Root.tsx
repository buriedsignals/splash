// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
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
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidz-bar-column-top-emitters"
    component={ColumnRankingVideo}
    durationInFrames={COLUMN_RANKING_TIMING.total}
    fps={COLUMN_RANKING_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
