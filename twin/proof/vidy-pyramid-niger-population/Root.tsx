// This story's own Remotion root. One composition, because a story workspace holds one story —
// the skill's root registers only its seed.
// ONE COMPOSITION PER EXPORT SIZE — the half of the size migration a component cannot do on its
// own. This beat's single composition was 1080 x 1350, a fourth frame no size table has, so every
// pin the journalist could take produced 4:5. The list is built from the table's own row names; the
// id carries the size, because `remotion still` / `remotion render` select a beat by composition id
// and nothing else. A size this TYPE cannot enter still gets a composition and refuses inside the
// component, naming the measurement that is missing.
import { Composition } from "remotion";
import {
  EXPORT_SIZE_NAMES,
  sizeFor,
} from "#shared/twin-chart-video/sizes.mjs";
import { PyramidVideo, type PyramidVideoProps } from "./PyramidVideo";
import { PYRAMID_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: PyramidVideoProps = {
  data: [
    { ageBand: "0-4", male: 2369723, female: 2297427 },
    { ageBand: "5-9", male: 2073417, female: 2005535 },
    { ageBand: "100+", male: 0, female: 0 },
  ],
  title: "Placeholder — render through render.mjs",
  note: "Placeholder",
  source: "Placeholder",
  referenceLabel: "Placeholder",
  ground: "#FFFFFF",
  ink: "#000000",
  muted: "#616161",
  male: "#0072B2",
  female: "#D55E00",
  legendLabels: ["Male", "Female"],
  subjectBand: "0-4",
  elderTotal: 672585,
  size: "landscape",
};

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((name: string) => {
      const { width, height } = sizeFor(name);
      return (
        <Composition
          key={name}
          id={`vidy-pyramid-niger-population-${name}`}
          component={PyramidVideo}
          durationInFrames={PYRAMID_TIMING.total}
          fps={PYRAMID_TIMING.fps}
          width={width}
          height={height}
          defaultProps={{ ...PLACEHOLDER, size: name }}
        />
      );
    })}
  </>
);
