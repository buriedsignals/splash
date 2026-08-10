// This beat's own Remotion root.
//
// ONE COMPOSITION PER EXPORT SIZE, and that is the half of the size migration a component cannot do
// on its own. This used to register a single 1080 x 1080 composition with the two numbers typed
// here, so a journalist who pinned `landscape` at gate 2c had no composition to render at all —
// whatever the component read. The list is built from the table's own row names, so a row added to
// `sizes.mjs` arrives here without anybody remembering to widen a list, and the id carries the size
// (`quake-symbol-landscape`) because `remotion still` / `remotion render` select a beat by
// composition id and nothing else.
//
// A size this BEAT cannot enter still gets a composition. It refuses inside the component, loudly,
// with its own arithmetic and the sizes that work — a stated refusal a journalist can read, rather
// than a missing id and a listing that says nothing. This beat refuses at all three: see the block
// at the top of `QuakeSymbolVideo.tsx` and the table in `BRIEF.md`. Its STILL ships at landscape.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import {
  QuakeSymbolVideo,
  type QuakeSymbolVideoProps,
} from "./QuakeSymbolVideo";
import { QUAKE_TIMING } from "./timing";

// A placeholder so `remotion compositions` can list this without a props file. Every real render is
// driven by ./render.mjs, which reads the frozen CSV, derives every claim from it, and passes the
// real props.
const PLACEHOLDER: QuakeSymbolVideoProps = {
  geometry: {
    frame: { width: 620, height: 620 },
    frameCorners: { west: 90, north: 53, east: 173, south: -19 },
    points: [],
  },
  plate: "",
  title: "Placeholder — render through proof/map-quake-symbol/render.mjs",
  source: "Placeholder",
  basemapCredit: "Placeholder",
  legendCaption: "Placeholder",
  caveat: "Placeholder",
  ground: "#FFFFFF",
  accent: "#C1440E",
  ink: "#000000",
  muted: "#616161",
  subjectKey: "q0",
  comparisonKey: "q1",
  size: "landscape",
};

export function RemotionRoot() {
  return (
    <>
      {EXPORT_SIZE_NAMES.map((name: string) => {
        const { width, height } = sizeFor(name);
        return (
          <Composition
            key={name}
            id={`quake-symbol-${name}`}
            component={QuakeSymbolVideo}
            durationInFrames={QUAKE_TIMING.total}
            fps={QUAKE_TIMING.fps}
            width={width}
            height={height}
            defaultProps={{ ...PLACEHOLDER, size: name }}
          />
        );
      })}
    </>
  );
}
