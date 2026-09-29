/**
 * The Remotion root: the one composition this beat ships.
 *
 * Its duration and fps come from the timing contract — `durationInFrames` is `DOT_TIMING.total`,
 * not a number typed here.
 *
 * There is no usable `defaultProps`: this composition cannot be previewed without its bake (a
 * basemap plate and 42 countries of projected outline) nor without the seeded scatter the render
 * script computes from the frozen population file. Every real render goes through `render.mjs`.
 */

import { Composition } from "remotion";
import { DotDensityVideo, type DotDensityVideoProps } from "./DotDensityVideo";
import { DOT_TIMING } from "./timing";

const PLACEHOLDER: DotDensityVideoProps = {
  geometry: { frame: { width: 936, height: 827 } },
  plate: "",
  countries: [],
  namedCount: 0,
  dotValue: 1,
  totalDots: 0,
  totalPopulation: 0,
  landFill: "#F2F2F2",
  title: "Placeholder — render through proof/mapvid-dot-population/render.mjs",
  source: "Placeholder",
  basemapCredit: "Placeholder",
  dotKey: "Placeholder",
  meterCaption: "Placeholder",
  halfLabel: "Placeholder",
  conclusion: "Placeholder",
  caveat: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0072B2",
  ink: "#000000",
  muted: "#616161",
  alt: "Placeholder",
};

export function RemotionRoot() {
  return (
    <Composition
      id="mapvid-dot-population"
      component={DotDensityVideo}
      durationInFrames={DOT_TIMING.total}
      fps={DOT_TIMING.fps}
      width={1080}
      height={1440}
      defaultProps={PLACEHOLDER}
    />
  );
}
