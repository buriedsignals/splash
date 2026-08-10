/**
 * The Remotion root: the one composition this map beat ships.
 *
 * Its duration and fps come from the timing contract — `durationInFrames` is `MAP_TIMING.total`,
 * not a number typed here, so a journalist who lengthens the hold gets a longer video rather than a
 * video that ends mid-hold.
 *
 * There is no usable `defaultProps`: a map beat cannot be listed without its bake (a plate and a
 * few thousand projected points). Every render goes through `scripts/render-map.mjs`, which reads
 * the frozen csv, runs the join, derives the furniture in node, and writes the props file.
 */

import { Composition } from "remotion";
import { Co2MapVideo, type Co2MapVideoProps } from "./Co2MapVideo";
import { MAP_TIMING } from "./timing";

const PLACEHOLDER: Co2MapVideoProps = {
  geometry: {
    frame: { width: 560, height: 560 },
    shapes: [],
    anchors: { label: [0, 0] },
  },
  plate: "",
  rows: [],
  breaks: [2, 4, 6, 8, 10],
  ramp: ["#e6e6e6", "#cccccc", "#b3b3b3", "#999999", "#808080", "#666666"],
  title: "Placeholder — render through scripts/render-map.mjs",
  source: "Placeholder",
  basemapCredit: "Placeholder",
  legendCaption: "Placeholder",
  caveat: "Placeholder",
  noDataLabel: "Placeholder",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  ink: "#000000",
  muted: "#616161",
  subject: "CHE",
  subjectLabel: "Suisse",
  subjectValue: 3.6,
  comparisonLabel: "Moyenne européenne",
  comparisonValue: 6.5,
};

export function RemotionRoot() {
  return (
    <Composition
      id="co2-europe"
      component={Co2MapVideo}
      durationInFrames={MAP_TIMING.total}
      fps={MAP_TIMING.fps}
      width={1080}
      height={1080}
      defaultProps={PLACEHOLDER}
    />
  );
}
