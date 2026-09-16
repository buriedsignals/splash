/**
 * The Remotion root: the one composition this beat ships.
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
import { ChoroplethVideo, type ChoroplethVideoProps } from "./ChoroplethVideo";
import { CHOROPLETH_TIMING } from "./timing";

const PLACEHOLDER: ChoroplethVideoProps = {
  geometry: {
    frame: { width: 620, height: 620 },
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
};

export function RemotionRoot() {
  return (
    <Composition
      id="choropleth-co2"
      component={ChoroplethVideo}
      durationInFrames={CHOROPLETH_TIMING.total}
      fps={CHOROPLETH_TIMING.fps}
      width={1080}
      height={1080}
      defaultProps={PLACEHOLDER}
    />
  );
}
