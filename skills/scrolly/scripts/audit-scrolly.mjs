// Deterministic scrolly audit: builds the story from the sample config and asserts
// the narrative invariants (≥3 steps, prose on every step, refs in beat range). No render.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeChoropleth } from "../../map-native/src/choropleth-geo.ts";
import { deriveMapStory } from "../../map-native/src/map-story.ts";
import { mapStoryToChapters } from "../src/chapters.ts";
import { checkScrollyConformance } from "../src/conformance.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const config = JSON.parse(readFileSync(join(root, "assets/sample-data/scrolly.json"), "utf8"));
const world = JSON.parse(readFileSync(join(root, "../map-native/assets/geo/world.geojson"), "utf8"));

const layout = computeChoropleth(config, world, "iso_a3", { bins: 5, scaleType: "sequential" });
const beats = deriveMapStory(layout, world, "iso_a3", {
  title: config.title, insight: config.insight ?? config.title, unit: config.valueUnit ?? "",
});
const regionsWithData = layout.joined.filter((j) => j.value !== null).length;
const story = mapStoryToChapters(beats, {
  title: config.title,
  description: config.description ?? config.unit,
  source: config.source,
  regionsWithData,
});
const problems = checkScrollyConformance(story, beats.length);
if (problems.length) {
  console.error("✗ scrolly audit FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ scrolly audit GREEN — ${story.steps.length} steps, all prose+refs valid.`);
