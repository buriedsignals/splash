/**
 * The Remotion root: the compositions this skill ships, one per beat.
 *
 * Each `<Composition>`'s duration and fps come from that beat's own timing contract —
 * `durationInFrames` is `<STORY>_TIMING.total`, not a number typed here, so a journalist who
 * lengthens a hold gets a longer video rather than a video that ends mid-hold. `remotion still` and
 * `remotion render` both take a composition id as their second argument, which is how one root
 * registers several beats without any of them sharing a drawing.
 *
 * `defaultProps` on each is a placeholder so the composition can be listed without a props file.
 * Every real render is driven by that beat's own `scripts/render-*.mjs`, which reads its frozen CSV
 * and derives the furniture colours in node and passes them in — see those scripts.
 */

import { Composition } from "remotion";
import { EmissionsVideo, type EmissionsVideoProps } from "./EmissionsVideo";
import { CO2_TIMING } from "./timing";
import {
  LifeExpectancyVideo,
  type LifeExpectancyVideoProps,
} from "./LifeExpectancyVideo";
import { LIFE_EXPECTANCY_TIMING } from "./life-expectancy-timing";
import { MigrationVideo, type MigrationVideoProps } from "./MigrationVideo";
import { MIGRATION_TIMING } from "./migration-timing";

const CO2_PLACEHOLDER: EmissionsVideoProps = {
  data: [
    { year: 1950, mt: 10 },
    { year: 2024, mt: 32.1 },
  ],
  title: "Placeholder — render through scripts/render-video.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 32.5,
  referenceLabel: "Placeholder",
  peakLabel: "Placeholder",
};

const LIFE_EXPECTANCY_PLACEHOLDER: LifeExpectancyVideoProps = {
  data: [
    { year: 2000, value: 79.8 },
    { year: 2020, value: 82.9 },
    { year: 2023, value: 84.0 },
    { year: 2024, value: 84.2 },
  ],
  title: "Placeholder — render through scripts/render-life-expectancy.mjs",
  source: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  grid: "#D1D1D1",
  reference: 83.8,
  referenceLabel: "Placeholder",
  subjectYear: 2020,
  recoveryYear: 2023,
};

const MIGRATION_PLACEHOLDER: MigrationVideoProps = {
  data: [
    { year: 1996, value: 4.7 },
    { year: 1997, value: -1.9 },
    { year: 1998, value: -3.4 },
    { year: 1999, value: 11.2 },
  ],
  title: "Placeholder — render through scripts/render-migration.mjs",
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

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="co2-suisse"
        component={EmissionsVideo}
        durationInFrames={CO2_TIMING.total}
        fps={CO2_TIMING.fps}
        width={1080}
        height={1080}
        defaultProps={CO2_PLACEHOLDER}
      />
      <Composition
        id="life-expectancy"
        component={LifeExpectancyVideo}
        durationInFrames={LIFE_EXPECTANCY_TIMING.total}
        fps={LIFE_EXPECTANCY_TIMING.fps}
        width={1080}
        height={1080}
        defaultProps={LIFE_EXPECTANCY_PLACEHOLDER}
      />
      <Composition
        id="migration"
        component={MigrationVideo}
        durationInFrames={MIGRATION_TIMING.total}
        fps={MIGRATION_TIMING.fps}
        width={1080}
        height={1080}
        defaultProps={MIGRATION_PLACEHOLDER}
      />
    </>
  );
}
