// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
import { Composition } from "remotion";
import { BumpVideo, type BumpVideoProps } from "./BumpVideo";
import { BUMP_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render is
// driven by ./render.mjs, which computes every rank from the frozen emissions file. These ranks are
// deliberately obviously not the data.
const PLACEHOLDER: BumpVideoProps = {
  years: [2000, 2010, 2020],
  data: [
    { country: "Placeholder A", ranks: [2, 1, 1] },
    { country: "Placeholder B", ranks: [1, 2, 2] },
    { country: "Placeholder C", ranks: [3, 3, 3] },
  ],
  rankRows: 3,
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  caveat: "Placeholder",
  axisTitle: "World rank",
  subjectCountry: "Placeholder A",
  crossings: [{ country: "Placeholder B", year: 2010, drawn: true }],
  conclusion: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="vidz-bump-emitter-rank"
    component={BumpVideo}
    durationInFrames={BUMP_TIMING.total}
    fps={BUMP_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
