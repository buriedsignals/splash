import type { RouteRevealLayout } from "./route-geo";
import { computeRouteReveal } from "./route-geo";
import { computeChoropleth } from "./choropleth-geo";
import { computeDotDensity } from "./dot-density-geo";
import { deriveLocatorStory } from "./locator-story";
import { deriveMapStory } from "./map-story";
import { deriveSymbolStory } from "./symbol-story";
import { deriveDotDensityStory } from "./dot-density-story";
import { computeHexGrid } from "./hex-grid-geo";
import { deriveHexGridStory } from "./hex-grid-story";
import { computeCartogram } from "./cartogram-geo";
import { deriveCartogramStory } from "./cartogram-story";
import { buildTimeline } from "./story-timeline";
import { mapStoryToChapters } from "../../scrolly/src/chapters";
import type { ScrollyStory, ScrollyStep } from "../../scrolly/src/chapters";

// Route → ScrollyStory. Step sequence:
//   [0] intro       — flyTo, title card scene, carries the description (ref 0)
//   [1] overview     — flyTo, full route framed, nothing drawn yet, all territories outlined
//                      (sentinel ref = -1)
//   [2..N+1] draw×N  — one drawTo per crossed territory (ref = territory index 0..N-1); prose
//                      is the editorial note if provided, else the territory label
//   [N+2] takeaway   — flyTo, full route fully drawn, all territories filled, full-extent camera
//                      (sentinel ref = territories.length)
// Sentinel refs let the renderer detect the two framing steps: ref === -1 → overview,
// ref === territories.length → takeaway. drawTo refs stay 0..N-1 so the driver reads
// territory.stop from them.
export function routeStoryToChapters(
  layout: RouteRevealLayout,
  meta: {
    title: string;
    description?: string;
    source?: { name: string; url: string };
    insight?: string;
    notes?: Record<string, string>;
  },
): ScrollyStory {
  const n = layout.territories.length;

  const intro: ScrollyStep = {
    id: "step-0-intro",
    visual: "map",
    action: "flyTo",
    ref: 0,
    prose: meta.description?.trim() ? meta.description : meta.title,
    align: "center",
  };

  const overview: ScrollyStep = {
    id: "step-1-overview",
    visual: "map",
    action: "flyTo",
    ref: -1,
    prose: meta.description?.trim() ? meta.description : meta.title,
    align: "center",
  };

  const drawSteps: ScrollyStep[] = layout.territories.map((t, i) => ({
    id: `step-${i + 2}-draw`,
    visual: "map",
    action: "drawTo",
    ref: i,
    prose: meta.notes?.[t.key]?.trim()
      ? (meta.notes[t.key] as string)
      : t.label,
    align: "center",
  }));

  const takeawayProse = meta.insight?.trim()
    ? meta.insight
    : `${n} territories, ${Math.round(layout.totalLengthKm)} km`;
  const takeaway: ScrollyStep = {
    id: `step-${n + 2}-takeaway`,
    visual: "map",
    action: "flyTo",
    ref: n,
    prose: takeawayProse,
    align: "center",
  };

  return {
    title: meta.title,
    description: meta.description,
    source: meta.source,
    visual: "map",
    steps: [intro, overview, ...drawSteps, takeaway],
  };
}

// Total frames for a scrolly video: step 0 is the full-screen title scene (buildTimeline's
// "title" hold = 75 frames @30fps), each later step is a "reveal"
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
    return computeRouteReveal(config, world).territories.length + 3;
  }
  if (config.type === "locator") {
    const beats = deriveLocatorStory(config.markers, {
      title: config.title ?? "",
      description: config.description,
      insight: config.insight ?? config.title ?? "",
    });
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: config.markers.length,
    }).steps.length;
  }
  if (config.type === "dot-density") {
    const layout = computeDotDensity(config, world, "iso_a3");
    const beats = deriveDotDensityStory(layout, {
      title: config.title ?? "",
      description: config.description,
      insight: config.insight ?? config.title ?? "",
      unit: config.valueUnit ?? "",
    });
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: layout.regions.length,
    }).steps.length;
  }
  if (config.type === "hex-grid") {
    const layout = computeHexGrid(config);
    const beats = deriveHexGridStory(layout, {
      title: config.title ?? "",
      description: config.description,
      insight: config.insight ?? config.title ?? "",
    });
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: layout.cells.length,
    }).steps.length;
  }
  if (config.type === "cartogram") {
    const layout = computeCartogram(config, world);
    const beats = deriveCartogramStory(layout, {
      title: config.title ?? "",
      description: config.description,
      insight: config.insight ?? config.title ?? "",
    });
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: layout.cells.length,
    }).steps.length;
  }
  if (config.type === "symbol") {
    const beats = deriveSymbolStory(
      config.points,
      {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
        unit: config.valueUnit ?? "",
      },
      { maxReveals: config.maxReveals },
    );
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
