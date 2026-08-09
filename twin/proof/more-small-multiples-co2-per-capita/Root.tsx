// This story's own Remotion root — one composition, per the project's own rule that a story
// workspace holds one story.
import { Composition } from "remotion";
import {
  SmallMultiplesCo2Video,
  type SmallMultiplesCo2VideoProps,
} from "./SmallMultiplesCo2Video";
import { SMALL_MULTIPLES_CO2_TIMING } from "./timing-contract";

// A placeholder so `remotion compositions` can list this without a props file. Every real render
// is driven by ./render.mjs, which reads the frozen CSV and passes the real props.
const PLACEHOLDER: SmallMultiplesCo2VideoProps = {
  countries: [
    {
      name: "Placeholder A",
      data: [
        { year: 1950, value: 1 },
        { year: 2024, value: 2 },
      ],
    },
    {
      name: "Placeholder B",
      data: [
        { year: 1950, value: 1 },
        { year: 2024, value: 2 },
      ],
    },
    {
      name: "Placeholder C",
      data: [
        { year: 1950, value: 1 },
        { year: 2024, value: 2 },
      ],
    },
    {
      name: "Placeholder D",
      data: [
        { year: 1950, value: 1 },
        { year: 2024, value: 2 },
      ],
    },
  ],
  order: [0, 1, 2, 3],
  subjectIndex: 3,
  title: "Placeholder — render through render.mjs",
  source: "Placeholder",
  limits: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  conclusionText: "Placeholder",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="small-multiples-co2"
    component={SmallMultiplesCo2Video}
    durationInFrames={SMALL_MULTIPLES_CO2_TIMING.total}
    fps={SMALL_MULTIPLES_CO2_TIMING.fps}
    width={1080}
    height={1080}
    defaultProps={PLACEHOLDER}
  />
);
