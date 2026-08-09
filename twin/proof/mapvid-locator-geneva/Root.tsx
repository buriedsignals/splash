/**
 * The Remotion root: the one composition this beat ships.
 *
 * Its duration and fps come from the timing contract — `durationInFrames` is `LOCATOR_TIMING.total`,
 * not a number typed here.
 *
 * There is no usable `defaultProps`: this composition cannot be previewed without its bake, which
 * carries not only the plate and the eleven projected points but the 24 projected great-circle
 * search rings the sweep interpolates between. Every real render goes through `render.mjs`.
 */

import { Composition } from "remotion";
import { LocatorVideo, type LocatorVideoProps } from "./LocatorVideo";
import { LOCATOR_TIMING } from "./timing";

const PLACEHOLDER: LocatorVideoProps = {
  geometry: {
    frame: { width: 660, height: 660 },
    centre: { px: [330, 330] },
    radiiKm: [1],
    rings: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
    ],
    searchKm: 6,
  },
  plate: "",
  orgs: [],
  farthestKey: "o0",
  title: "Placeholder — render through proof/mapvid-locator-geneva/render.mjs",
  source: "Placeholder",
  basemapCredit: "Placeholder",
  axisCaption: "Placeholder",
  centreLabel: "Placeholder",
  conclusion: "Placeholder",
  caveat: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  alt: "Placeholder",
};

export function RemotionRoot() {
  return (
    <Composition
      id="mapvid-locator-geneva"
      component={LocatorVideo}
      durationInFrames={LOCATOR_TIMING.total}
      fps={LOCATOR_TIMING.fps}
      width={1080}
      height={1350}
      defaultProps={PLACEHOLDER}
    />
  );
}
