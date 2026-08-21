/**
 * The Remotion root: the one composition this beat ships.
 *
 * `durationInFrames` is `RECYCLING_TIMING.total` and `width`/`height` come from the size gate's own
 * row (`sizeFor("portrait")`), not from numbers typed here — a journalist who lengthens the hold
 * gets a longer video, and the pinned size reaches the composition rather than being repeated as
 * two literals that happen to agree.
 *
 * There is no usable `defaultProps`: a map beat cannot be listed without its bake. Every render
 * goes through `render-video.mjs`, which reads the frozen csv, runs the join, derives the furniture
 * in node and writes the props file.
 */

import { Composition } from "remotion";
import { sizeFor } from "#shared/chart-video/sizes.mjs";
import { RecyclingMapVideo, type RecyclingMapVideoProps } from "./RecyclingMapVideo";
import { RECYCLING_TIMING } from "./timing";

const SIZE = sizeFor("portrait");

const PLACEHOLDER: RecyclingMapVideoProps = {
  geometry: { frame: { width: 640, height: 640 }, shapes: [], anchors: { label: [0, 0], comparisonLabel: [0, 0] } },
  plate: "",
  rows: [],
  breaks: [20, 30, 40, 50, 60],
  ramp: ["#544e41", "#6d6450", "#86795f", "#9f8e6e", "#b7a47d", "#d0b98c"],
  title: "Placeholder — render through render-video.mjs",
  legendCaption: "Placeholder",
  caveat: "Placeholder",
  credit: "Placeholder",
  noDataLabel: "Placeholder",
  conclusion: "Placeholder",
  ground: "#16191B",
  accent: "#D4A853",
  ink: "#FFFFFF",
  muted: "#a6a8a8",
  subject: "DEU",
  subjectLabel: "Germany",
  subjectValue: 67.8,
  comparison: "MKD",
  comparisonLabel: "Macedonia",
  comparisonValue: 18.4,
};

export function RemotionRoot() {
  return (
    <Composition
      id="europe-recycling"
      component={RecyclingMapVideo}
      durationInFrames={RECYCLING_TIMING.total}
      fps={RECYCLING_TIMING.fps}
      width={SIZE.width}
      height={SIZE.height}
      defaultProps={PLACEHOLDER}
    />
  );
}
