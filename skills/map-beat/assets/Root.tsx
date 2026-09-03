/**
 * The Remotion root: the one composition this map beat ships.
 *
 * Its duration and fps come from the timing contract — `durationInFrames` is `MAP_TIMING.total`,
 * not a number typed here, so a journalist who lengthens the hold gets a longer video rather than a
 * video that ends mid-hold.
 *
 * AND ITS FRAME COMES FROM THE RECORDED SIZE, for exactly the same reason. `width`/`height` were
 * two literals — 1080 x 1080 — so a journalist who chose `landscape` at gate 2c, and for whom a
 * 16:9 plate was then baked, received a SQUARE mp4 with that plate letterboxed into it and the
 * camera work discarded. Nothing warned, because nothing connected the slot's `size` to this file.
 * The argument the header already makes about duration is the argument: a choice the gate exists to
 * take has to reach the producer, or the gate is ceremony.
 *
 * `calculateMetadata` rather than a prop read inside the component: the frame is composition
 * metadata, so Remotion has to know it before the first frame is drawn, and `--props` is the only
 * channel `scripts/render-map.mjs` has. A props file with no `size` keeps the square default, which
 * is what every existing call site sends.
 *
 * There is no usable `defaultProps`: a map beat cannot be listed without its bake (a plate and a
 * few thousand projected points). Every render goes through `scripts/render-map.mjs`, which reads
 * the frozen csv, runs the join, derives the furniture in node, and writes the props file.
 */

import { Composition } from "remotion";
import { Co2MapVideo, type Co2MapVideoProps } from "./Co2MapVideo";
import { MAP_TIMING } from "./timing";
// The three rows ruling R2 names, this skill's own carried copy. `sizeFor` throws naming all three
// on anything else, so a size nobody exports refuses here rather than rendering at a default.
import { sizeFor } from "../scripts/sizes.mjs";

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

/** The frame this render was pinned to. `square` is the default because it is what this
 *  composition has always rendered at, so a caller that sends no size gets what it got before. */
const DEFAULT_SIZE = "square";

export function RemotionRoot() {
  return (
    <Composition
      id="co2-europe"
      component={Co2MapVideo}
      durationInFrames={MAP_TIMING.total}
      fps={MAP_TIMING.fps}
      width={sizeFor(DEFAULT_SIZE).width}
      height={sizeFor(DEFAULT_SIZE).height}
      calculateMetadata={({ props }) => {
        const row = sizeFor((props as { size?: string }).size ?? DEFAULT_SIZE);
        return { width: row.width, height: row.height };
      }}
      defaultProps={PLACEHOLDER}
    />
  );
}
