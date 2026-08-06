// Remotion root for cesium-flyover. Registers:
//   LandscapeFlyover — MapTiler terrain + satellite, 1280x720, 24 s (the proven landscape recipe)
//   CityFlyover      — Google Photorealistic 3D Tiles, 1280x720, 18 s (needs a Google key; NOT
//                      rendered in this repo yet — see SKILL.md "What is proven here")
//
// Render the landscape proof:
//   bunx remotion still  remotion/src/index.ts LandscapeFlyover out/still.png --frame=360 --gl=angle --timeout=180000
//   bunx remotion render remotion/src/index.ts LandscapeFlyover out/flyover.mp4 --gl=angle --concurrency=1 --timeout=180000
// `--gl=angle` is mandatory (WebGL under headless Chrome) and `--concurrency=1` is required:
// each frame settles a shared Cesium viewer, so two workers would race on one tile pipeline.

import React from "react";
import { Composition } from "remotion";
import {
  CesiumFlyover,
  type CesiumFlyoverConfig,
  type LngLat,
} from "../../src/CesiumFlyover";
import yarlungGorgePath from "../../assets/sample-data/yarlung-gorge-path.json";
import manhattanPath from "../../assets/sample-data/manhattan-path.json";

// Duration is the SPEED knob: travelKm / seconds = ground speed. 13 km over 24 s is ~0.54 km/s —
// a slow, peaceful glide. A short duration is not just rushed editorially, it renders SLOWER per
// frame: a fast camera outruns the tile cache, so every frame re-settles from cold tiles.
const LANDSCAPE_FRAMES = 24 * 30;
const landscapeProps: CesiumFlyoverConfig = {
  mode: "landscape",
  path: yarlungGorgePath as LngLat[],
  pathSmoothingPasses: 3,
  altitudeStart: 4600,
  altitudeEnd: 4300,
  lookAheadKm: 1.5,
  travelKm: 13,
  pitchFromNadir: 76,
  verticalExaggeration: 1.1,
};

// Google's Map Tiles policy caps promotional video at 30 s; the component enforces the ceiling.
const CITY_FRAMES = 18 * 30;
const cityProps: CesiumFlyoverConfig = {
  mode: "city",
  path: manhattanPath as LngLat[],
  pathSmoothingPasses: 3,
  altitudeStart: 700,
  altitudeEnd: 500,
  lookAheadKm: 0.7,
  travelKm: 4.5,
  pitchFromNadir: 72,
  verticalExaggeration: 1,
  maximumScreenSpaceError: 6,
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="LandscapeFlyover"
      component={CesiumFlyover}
      durationInFrames={LANDSCAPE_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={landscapeProps}
    />
    <Composition
      id="CityFlyover"
      component={CesiumFlyover}
      durationInFrames={CITY_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={cityProps}
    />
  </>
);
