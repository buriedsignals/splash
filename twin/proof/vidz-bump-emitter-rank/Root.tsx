// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
// ONE COMPOSITION PER EXPORT SIZE — the half of the size migration a component cannot do on its
// own. A single 1080 x 1080 composition with the two numbers typed here left a journalist who
// pinned `portrait` with no composition to render at all. The list is built from the table's own
// row names; the id carries the size, because `remotion still` / `remotion render` select a beat by
// composition id and nothing else. A size this TYPE cannot enter still gets a composition, and
// refuses inside the component with the measurement that is missing named.
import { Composition } from "remotion";
import {
  EXPORT_SIZE_NAMES,
  sizeFor,
} from "#shared/twin-chart-video/sizes.mjs";
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
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidz-bump-emitter-rank-${name}`}
          component={BumpVideo}
          durationInFrames={BUMP_TIMING.total}
          fps={BUMP_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
