import type { RouteRevealLayout } from "./route-geo";
import { computeRouteReveal } from "./route-geo";
import { computeChoropleth } from "./choropleth-geo";
import { deriveMapStory } from "./map-story";
import { deriveSymbolStory } from "./symbol-story";
import { buildTimeline } from "./story-timeline";
import { TITLE_SCENE_FRAMES } from "./video-scene";
import { mapStoryToChapters } from "../../scrolly/src/chapters";
import type { ScrollyStory, ScrollyStep } from "../../scrolly/src/chapters";

// Route → ScrollyStory: an intro step (flyTo, carries the description) followed by one
// drawTo step per crossed territory (in the layout's already-sorted order). Each drawTo
// step's `ref` is the territory index; the renderer looks up territory.stop from it. Prose
// is the territory label (always non-empty — computeRouteReveal defaults label to the key);
// config.territories[].label lets the curator enrich it upstream.
export function routeStoryToChapters(
  layout: RouteRevealLayout,
  meta: {
    title: string;
    description?: string;
    source?: { name: string; url: string };
  },
): ScrollyStory {
  const intro: ScrollyStep = {
    id: "step-0-intro",
    visual: "map",
    action: "flyTo",
    ref: 0,
    prose: meta.description?.trim() ? meta.description : meta.title,
    align: "center",
  };

  const drawSteps: ScrollyStep[] = layout.territories.map((t, i) => ({
    id: `step-${i + 1}-draw`,
    visual: "map",
    action: "drawTo",
    ref: i,
    prose: t.label,
    align: "center",
  }));

  return {
    title: meta.title,
    description: meta.description,
    source: meta.source,
    visual: "map",
    steps: [intro, ...drawSteps],
  };
}

// Total frames for a scrolly video: step 0 is the full-screen title scene (buildTimeline's
// "title" hold defaults to 2.5s = TITLE_SCENE_FRAMES @30fps), each later step is a "reveal"
// (move + hold). Reusing buildTimeline keeps scrolly pacing identical to the storytelling video.
export function scrollyFrames(stepCount: number, fps: number): number {
  const kinds = Array.from({ length: Math.max(1, stepCount) }, (_, i) =>
    i === 0 ? "title" : "reveal",
  );
  return buildTimeline(kinds, fps).totalFrames;
}

// Derive the scrolly step count for a config (used by Root's calculateMetadata to size the
// composition to the real data, not the sample). Mirrors the per-type derivation the
// renderers use.
export function scrollyStepCount(
  config: any,
  world: GeoJSON.FeatureCollection,
): number {
  if (config.type === "route") {
    return computeRouteReveal(config, world).territories.length + 1;
  }
  if (config.type === "symbol") {
    const beats = deriveSymbolStory(config.points, {
      title: config.title ?? "",
      insight: config.insight ?? config.title ?? "",
      unit: config.valueUnit ?? "",
    });
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: config.points.length,
    }).steps.length;
  }
  const layout = computeChoropleth(config, world, "iso_a3", {
    bins: 5,
    scaleType: "sequential",
  });
  const beats = deriveMapStory(layout, world, "iso_a3", {
    title: config.title ?? "",
    insight: config.insight ?? config.title ?? "",
    unit: config.valueUnit ?? "",
  });
  return mapStoryToChapters(beats, {
    title: config.title ?? "",
    description: config.description,
    source: config.source,
    regionsWithData: layout.joined.filter((j) => j.value !== null).length,
  }).steps.length;
}

// Suppress unused-import warning — TITLE_SCENE_FRAMES documents the frame budget
// this module aligns with (buildTimeline's "title" hold = TITLE_SCENE_FRAMES @30fps).
void TITLE_SCENE_FRAMES;
