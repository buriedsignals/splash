/**
 * The Remotion root: the skill's seed composition only.
 *
 * The Composition element's duration and fps come from its own timing contract — `durationInFrames`
 * is `CO2_TIMING.total`, not a number typed here, so a journalist who lengthens a hold gets a
 * longer video rather than a video that ends mid-hold.
 *
 * `defaultProps` is a placeholder so the composition can be listed without a props file. Every
 * real render is driven by `scripts/render-video.mjs`, which reads the frozen CSV and derives the
 * furniture colours in node.
 */

import { Composition } from "remotion";
import { EmissionsVideo, type EmissionsVideoProps } from "./EmissionsVideo";
import { CO2_TIMING } from "./timing";

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

export function RemotionRoot() {
  return (
    <Composition
      id="co2-suisse"
      component={EmissionsVideo}
      durationInFrames={CO2_TIMING.total}
      fps={CO2_TIMING.fps}
      width={1080}
      height={1080}
      defaultProps={CO2_PLACEHOLDER}
    />
  );
}
