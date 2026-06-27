// Remotion root for map-native. Registers:
//   MapExplainer  — Tom's Yarlung river reveal (requires public/geo/borders.geojson from prep-geo.mjs)
//   HarnessCheck  — Minimal MapTiler-in-Remotion smoke test (no external geo files needed)
//
// Render HarnessCheck to prove the harness:
//   npx remotion render remotion/src/index.ts HarnessCheck out/harness-check.mp4 --gl=angle --concurrency=1 --timeout=120000

import React from "react";
import { Composition } from "remotion";
import { RiverReveal } from "../../src/components/RiverReveal";
import { HarnessCheck } from "../../src/components/HarnessCheck";

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
  </>
);
