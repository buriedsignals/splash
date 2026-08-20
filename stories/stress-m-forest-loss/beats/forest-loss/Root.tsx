/**
 * The Remotion root: the one composition this beat ships. `durationInFrames` is `FOREST_TIMING.total`,
 * not a number typed here. Every real render goes through `render-video.mjs`, which reads the
 * frozen csv, runs the join, derives the furniture in node, and writes the props file — the
 * `PLACEHOLDER` below only satisfies the CLI's own listing requirement.
 */

import { Composition } from "remotion";
import { ForestMapVideo, type ForestMapVideoProps } from "./ForestMapVideo";
import { FOREST_TIMING } from "./timing";

const PLACEHOLDER: ForestMapVideoProps = {
  geometry: { frame: { width: 100, height: 20 }, shapes: [] },
  plate: "",
  rows: [],
  namesByCode: {},
  breaks: [50000, 150000, 350000, 700000],
  ramp: ["#2a2a2a", "#4a4a4a", "#6a6a6a", "#8a8a8a", "#d4a853"],
  title: "Placeholder — render through render-video.mjs",
  subtitle: "Placeholder",
  source: "Placeholder",
  basemapCredit: "Placeholder",
  caveat: "Placeholder",
  conclusion: "Placeholder",
  ground: "#16191B",
  accent: "#D4A853",
  ink: "#FFFFFF",
  muted: "#9a9a9a",
  subject: "BRA",
};

export function RemotionRoot() {
  return (
    <Composition
      id="forest-loss"
      component={ForestMapVideo}
      durationInFrames={FOREST_TIMING.total}
      fps={FOREST_TIMING.fps}
      width={1080}
      height={1080}
      defaultProps={PLACEHOLDER}
    />
  );
}
