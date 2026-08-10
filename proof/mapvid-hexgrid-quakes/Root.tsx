/**
 * The Remotion root: the one composition this beat ships.
 *
 * Its duration and fps come from the timing contract — `durationInFrames` is `HEXGRID_TIMING.total`,
 * not a number typed here.
 *
 * There is no usable `defaultProps`: this composition cannot be previewed without its bake (a
 * basemap plate and 149 binned cells, each carrying the days it crossed a class) nor without the
 * frozen catalogue the clock reads its dates from. Every real render goes through `render.mjs`,
 * which reads the CSV, bins against the plate, derives every number on the frame, and writes the
 * props file.
 */

import { Composition } from "remotion";
import { HexGridVideo, type HexGridVideoProps } from "./HexGridVideo";
import { HEXGRID_TIMING } from "./timing";

const PLACEHOLDER: HexGridVideoProps = {
  geometry: { frame: { width: 940, height: 540 } },
  plate: "",
  cells: [],
  hexSize: 30,
  breaks: [1, 2, 3, 4],
  ramp: ["#e6e6e6", "#cccccc", "#b3b3b3", "#999999", "#666666"],
  runningTotal: [0],
  subjectRunning: [0],
  yearStart: "2024-01-01T00:00:00.000Z",
  subjectKey: "0,0",
  subjectLabel: "Placeholder",
  title: "Placeholder — render through proof/mapvid-hexgrid-quakes/render.mjs",
  source: "Placeholder",
  basemapCredit: "Placeholder",
  legendCaption: "Placeholder",
  conclusion: "Placeholder",
  caveat: "Placeholder",
  ground: "#FFFFFF",
  accent: "#C1440E",
  ink: "#000000",
  muted: "#616161",
  alt: "Placeholder",
};

export function RemotionRoot() {
  return (
    <Composition
      id="mapvid-hexgrid-quakes"
      component={HexGridVideo}
      durationInFrames={HEXGRID_TIMING.total}
      fps={HEXGRID_TIMING.fps}
      width={1080}
      height={1080}
      defaultProps={PLACEHOLDER}
    />
  );
}
