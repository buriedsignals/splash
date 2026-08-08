/**
 * The Remotion root: the one composition this beat ships.
 *
 * Its duration, fps and the whole edit come from the timing contract — `durationInFrames` is
 * `CO2_TIMING.total`, not a number typed here, so a journalist who lengthens the hold gets a longer
 * video rather than a video that ends mid-hold.
 *
 * `defaultProps` is a two-reading placeholder that exists so the composition can be listed without
 * a props file. Every real render is driven by `scripts/render-video.mjs`, which reads the frozen
 * CSV and derives the furniture colours in node and passes them in — see that script.
 */

import { Composition } from "remotion";
import { EmissionsVideo, type EmissionsVideoProps } from "./EmissionsVideo";
import { CO2_TIMING } from "./timing";

const PLACEHOLDER: EmissionsVideoProps = {
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
      defaultProps={PLACEHOLDER}
    />
  );
}
