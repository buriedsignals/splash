// Remotion root for map-native. Registers:
//   MapExplainer          — Tom's Yarlung river reveal (requires public/geo/borders.geojson from prep-geo.mjs)
//   HarnessCheck          — Minimal MapTiler-in-Remotion smoke test (no external geo files needed)
//   ChoroplethStory       — Choropleth story landscape 1280×720
//   ChoroplethStorySquare — Choropleth story square 1080×1080
//   ChoroplethStoryPortrait — Choropleth story portrait 1080×1350
//
// Render HarnessCheck to prove the harness:
//   bunx remotion render remotion/src/index.ts HarnessCheck out/harness-check.mp4 --gl=angle --concurrency=1 --timeout=120000
//
// Render choropleth videos:
//   for C in ChoroplethStory ChoroplethStorySquare ChoroplethStoryPortrait; do
//     bunx remotion render remotion/src/index.ts $C output-proof/choropleth/$C.mp4 --gl=angle --concurrency=1 --timeout=120000
//   done

import React from "react";
import { Composition } from "remotion";
import { RiverReveal } from "../../src/components/RiverReveal";
import { HarnessCheck } from "../../src/components/HarnessCheck";
import { ChoroplethStory } from "../../src/components/ChoroplethStory";
import { computeChoropleth } from "../../src/choropleth-geo";
import { deriveMapStory } from "../../src/map-story";
import { buildTimeline } from "../../src/story-timeline";
import sampleConfig from "../../assets/sample-data/choropleth.json";
import world from "../../assets/geo/world.geojson";

const sampleLayout = computeChoropleth(sampleConfig, world as any, "iso_a3", {
  bins: 5,
  scaleType: "sequential",
});
const sampleBeats = deriveMapStory(sampleLayout, world as any, "iso_a3", {
  title: sampleConfig.title,
  insight: (sampleConfig as any).insight ?? sampleConfig.title,
  unit: sampleConfig.unit,
});
const STORY_FRAMES = buildTimeline(sampleBeats.length, 30).totalFrames;

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
      id="ChoroplethStory"
      component={ChoroplethStory}
      durationInFrames={STORY_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethStorySquare"
      component={ChoroplethStory}
      durationInFrames={STORY_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethStoryPortrait"
      component={ChoroplethStory}
      durationInFrames={STORY_FRAMES}
      fps={30}
      width={1080}
      height={1350}
      defaultProps={choroplethDefaultProps}
    />
  </>
);
