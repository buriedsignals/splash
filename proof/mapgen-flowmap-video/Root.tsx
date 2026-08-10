/**
 * This beat's own Remotion root.
 *
 * ONE COMPOSITION PER EXPORT SIZE, and that is the half of the size migration a component cannot do
 * on its own. This file used to register a single 1080 x 1080 composition with the two numbers typed
 * here, so a journalist who pinned a size at gate 2c had no composition to render at all — whatever
 * the component read. The list is built from the VIDEO table's own row names, so a row added to
 * `sizes.mjs` arrives here without anybody remembering to widen a list, and the id carries the size
 * (`mapgen-flowmap-video-landscape`) because `remotion still` / `remotion render` select a beat by
 * composition id and nothing else.
 *
 * A size this beat cannot enter still gets a composition. `FlowMapVideo` refuses inside itself,
 * loudly, naming the ladder rung and the genre that does ship — a stated refusal a journalist can
 * read, rather than a missing id and a listing that says nothing.
 *
 * Duration and fps come from the timing contract — `durationInFrames` is `FLOW_TIMING.total`, not a
 * number typed here. There is no usable `defaultProps`: this beat cannot be listed without its bake
 * (a plate and the projected route/territories). Every render goes through `render-map.mjs`, which
 * reads the frozen csv, runs the claim check, derives the furniture in node, and writes the props
 * file.
 */

import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import { FlowMapVideo, type FlowMapVideoProps } from "./FlowMapVideo";
import { FLOW_TIMING } from "./timing";

const PLACEHOLDER: FlowMapVideoProps = {
  geometry: {
    frame: { width: 940, height: 420 },
    frameCorners: { west: 0, north: 1, east: 1, south: 0 },
    route: [],
  },
  crossings: [],
  cumKm: [0],
  plate: "",
  title:
    "Placeholder — render through proof/mapgen-flowmap-video/render-map.mjs",
  source: "Placeholder",
  basemapCredit: "Placeholder",
  caveat: "Placeholder",
  ground: "#FFFFFF",
  accent: "#C68900",
  ink: "#000000",
  muted: "#616161",
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
            id={`mapgen-flowmap-video-${name}`}
            component={FlowMapVideo}
            durationInFrames={FLOW_TIMING.total}
            fps={FLOW_TIMING.fps}
            width={width}
            height={height}
            defaultProps={{ ...PLACEHOLDER, size: name }}
          />
        );
      })}
    </>
  );
}
