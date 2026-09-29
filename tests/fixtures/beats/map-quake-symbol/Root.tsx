import { Composition } from "remotion";
import {
  QuakeSymbolVideo,
  type QuakeSymbolVideoProps,
} from "./QuakeSymbolVideo";
import { QUAKE_TIMING } from "./timing";

const PLACEHOLDER: QuakeSymbolVideoProps = {
  geometry: { frame: { width: 620, height: 620 }, points: [] },
  plate: "",
  title: "Placeholder — render through proof/map-quake-symbol/render.mjs",
  source: "Placeholder",
  basemapCredit: "Placeholder",
  legendCaption: "Placeholder",
  caveat: "Placeholder",
  ground: "#FFFFFF",
  accent: "#C1440E",
  ink: "#000000",
  muted: "#616161",
  subjectKey: "q0",
  comparisonKey: "q1",
};

export function RemotionRoot() {
  return (
    <Composition
      id="quake-symbol"
      component={QuakeSymbolVideo}
      durationInFrames={QUAKE_TIMING.total}
      fps={QUAKE_TIMING.fps}
      width={1080}
      height={1080}
      defaultProps={PLACEHOLDER}
    />
  );
}
