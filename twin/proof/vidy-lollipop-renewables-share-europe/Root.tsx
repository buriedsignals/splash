// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
// ONE COMPOSITION PER EXPORT SIZE — the half of the size migration a component cannot do on its
// own. This file used to register a single 1080 x 1080 composition with the two numbers typed here,
// so a journalist who pinned `portrait` had no composition to render at all. The list is built from
// the table's own row names, and the id carries the size because `remotion still` / `remotion
// render` select a beat by composition id and nothing else.
import { Composition } from "remotion";
import {
  EXPORT_SIZE_NAMES,
  sizeFor,
} from "#shared/twin-chart-video/sizes.mjs";
import { LollipopVideo, type LollipopVideoProps } from "./LollipopVideo";
import { LOLLIPOP_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: LollipopVideoProps = {
  data: [
    { country: "Iceland", value: 100 },
    { country: "Norway", value: 98.99882 },
    { country: "Switzerland", value: 67.82529 },
    { country: "France", value: 26.064074 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  subjectCountry: "Switzerland",
  compareCountry: "Norway",
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidy-lollipop-renewables-share-europe-${name}`}
          component={LollipopVideo}
          durationInFrames={LOLLIPOP_TIMING.total}
          fps={LOLLIPOP_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
