/**
 * The Remotion root: ONE COMPOSITION PER EXPORT SIZE.
 *
 * That is the half of the size migration a component cannot do on its own. This file used to
 * register a single composition with `width={1080} height={1080}` typed here, so a journalist who
 * pinned `landscape` at gate 2c had no composition to render at all — whatever the component read.
 * The list is built from the table's own row names, so a row added to `sizes.mjs` arrives here
 * without anybody remembering to widen a list, and the id carries the size because
 * `remotion still` / `remotion render` select a beat by composition id and nothing else.
 *
 * A size this beat cannot enter still gets a composition. It refuses inside `ChoroplethVideo`,
 * loudly, with the arithmetic and the ladder in the message and the size that works named — a
 * stated refusal a journalist can read, rather than a missing id and a listing that says nothing.
 *
 * Its duration and fps come from the timing contract — `durationInFrames` is
 * `CHOROPLETH_TIMING.total`, not a number typed here.
 *
 * There is no usable `defaultProps`: a choropleth video cannot be listed without its bake (a plate
 * and 41 countries of projected geometry). Every real render goes through `render.mjs`, which
 * reads the frozen csv, runs the join and the claim check, derives the furniture in node, and
 * writes the props file.
 */

import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import { ChoroplethVideo, type ChoroplethVideoProps } from "./ChoroplethVideo";
import { CHOROPLETH_TIMING } from "./timing";

const PLACEHOLDER: ChoroplethVideoProps = {
  geometry: {
    frame: { width: 620, height: 620 },
    frameCorners: { west: -26, north: 68.2, east: 33, south: 33.4 },
    shapes: [],
    anchors: { label: [0, 0] },
  },
  plate: "",
  rows: [],
  breaks: [2, 4, 6, 8, 10],
  ramp: ["#e6e6e6", "#cccccc", "#b3b3b3", "#999999", "#808080", "#666666"],
  title:
    "Placeholder — render through proof/mapgen-choropleth-video/render.mjs",
  source: "Placeholder",
  basemapCredit: "Placeholder",
  legendCaption: "Placeholder",
  caveat: "Placeholder",
  noDataLabel: "Placeholder",
  ground: "#FFFFFF",
  accent: "#C1440E",
  ink: "#000000",
  muted: "#616161",
  subject: "POL",
  subjectLabel: "Poland",
  subjectValue: 7.3,
  comparisonLabel: "Sweden",
  comparisonValue: 3.5,
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
            id={`mapgen-choropleth-video-${name}`}
            component={ChoroplethVideo}
            durationInFrames={CHOROPLETH_TIMING.total}
            fps={CHOROPLETH_TIMING.fps}
            width={width}
            height={height}
            defaultProps={{ ...PLACEHOLDER, size: name }}
          />
        );
      })}
    </>
  );
}
