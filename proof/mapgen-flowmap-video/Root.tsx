/**
 * The Remotion root: the one composition this beat ships.
 *
 * Duration and fps come from the timing contract — `durationInFrames` is `FLOW_TIMING.total`, not a
 * number typed here. There is no usable `defaultProps`: this beat cannot be listed without its bake
 * (a plate and the projected route/territories). Every render goes through `render-map.mjs`, which
 * reads the frozen csv, runs the claim check, derives the furniture in node, and writes the props
 * file.
 */

import { Composition } from "remotion";
import { FlowMapVideo, type FlowMapVideoProps } from "./FlowMapVideo";
import { FLOW_TIMING } from "./timing";

const PLACEHOLDER: FlowMapVideoProps = {
  geometry: { frame: { width: 940, height: 420 }, route: [] },
  crossings: [],
  cumKm: [0],
  plate: "",
  title:
    "Placeholder — render through proof/mapgen-flowmap-video/render-map.mjs",
  source: "Placeholder",
  basemapCredit: "Placeholder",
  caveat: "Placeholder",
  ground: "#FFFFFF",
  accent: "#E69F00",
  ink: "#000000",
  muted: "#616161",
};

export function RemotionRoot() {
  return (
    <Composition
      id="flowmap-video"
      component={FlowMapVideo}
      durationInFrames={FLOW_TIMING.total}
      fps={FLOW_TIMING.fps}
      width={1080}
      height={1080}
      defaultProps={PLACEHOLDER}
    />
  );
}
