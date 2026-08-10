// This story's own Remotion root.
//
// ONE COMPOSITION PER EXPORT SIZE, and that is the half of the size migration a component cannot do
// on its own. This file used to register a single 1080 x 1080 composition with the two numbers typed
// here, next to a `const FRAME` in the component that repeated them — `specs/W4-export-sizes.md` §1a:
// "stated twice with nothing between them". A journalist who pinned `portrait` at gate 2c had no
// composition to render at all, whatever the component read.
//
// The list is built from the table's own row names, so a row added to `sizes.mjs` arrives here
// without anybody remembering to widen a list, and the id carries the size
// (`cumulative-co2-area-landscape`) because `remotion still` / `remotion render` select a beat by
// composition id and nothing else.
//
// A size this TYPE cannot enter still gets a composition. It refuses inside the component, loudly,
// naming the missing measurement and the size that works — a stated refusal a journalist can read,
// rather than a missing id and a listing that says nothing.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import {
  CumulativeCo2AreaVideo,
  type CumulativeCo2AreaVideoProps,
} from "./CumulativeCo2AreaVideo";
import { CUMULATIVE_CO2_AREA_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: CumulativeCo2AreaVideoProps = {
  data: [
    { year: 1858, mt: 0.15 },
    { year: 1950, mt: 473.2 },
    { year: 1986, mt: 1583.0 },
    { year: 2024, mt: 3158.1 },
  ],
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 1579.0,
  referenceLabel: "Placeholder",
  subjectYear: 1986,
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`cumulative-co2-area-${name}`}
          component={CumulativeCo2AreaVideo}
          durationInFrames={CUMULATIVE_CO2_AREA_TIMING.total}
          fps={CUMULATIVE_CO2_AREA_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
