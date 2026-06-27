// Remotion root for map-native. Registers:
//   MapExplainer      — Tom's Yarlung river reveal (requires public/geo/borders.geojson from prep-geo.mjs)
//   HarnessCheck      — Minimal MapTiler-in-Remotion smoke test (no external geo files needed)
//   ChoroplethReveal  — Choropleth reveal landscape 1280×720
//   ChoroplethSquare  — Choropleth reveal square 1080×1080
//   ChoroplethPortrait — Choropleth reveal portrait 1080×1350
//
// Render HarnessCheck to prove the harness:
//   npx remotion render remotion/src/index.ts HarnessCheck out/harness-check.mp4 --gl=angle --concurrency=1 --timeout=120000
//
// Render choropleth videos:
//   for C in ChoroplethReveal ChoroplethSquare ChoroplethPortrait; do
//     npx remotion render remotion/src/index.ts $C output-proof/choropleth/$C.mp4 --gl=angle --concurrency=1 --timeout=120000
//   done

import React from "react";
import { Composition } from "remotion";
import { RiverReveal } from "../../src/components/RiverReveal";
import { HarnessCheck } from "../../src/components/HarnessCheck";
import { ChoroplethReveal } from "../../src/components/ChoroplethReveal";
import sampleConfig from "../../assets/sample-data/choropleth.json";

const choroplethDefaultProps = { config: sampleConfig };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="MapExplainer"
      component={RiverReveal}
      durationInFrames={12 * 30}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="HarnessCheck"
      component={HarnessCheck}
      durationInFrames={3 * 30}
      fps={30}
      width={1280}
      height={720}
    />
    <Composition
      id="ChoroplethReveal"
      component={ChoroplethReveal}
      durationInFrames={6 * 30}
      fps={30}
      width={1280}
      height={720}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethSquare"
      component={ChoroplethReveal}
      durationInFrames={6 * 30}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethPortrait"
      component={ChoroplethReveal}
      durationInFrames={6 * 30}
      fps={30}
      width={1080}
      height={1350}
      defaultProps={choroplethDefaultProps}
    />
  </>
);
