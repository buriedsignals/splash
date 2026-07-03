// Deterministic scrolly audit: builds the story from the sample config and asserts
// the narrative invariants (≥3 steps, prose on every step, refs in beat range). No render.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeChoropleth } from "../../map-native/src/choropleth-geo.ts";
import { deriveMapStory } from "../../map-native/src/map-story.ts";
import { mapStoryToChapters } from "../src/chapters.ts";
import {
  checkScrollyConformance,
  auditTemporalNarrative,
} from "../src/conformance.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
// A second config path may be passed (e.g. a workflow-test config) to audit it
// instead of the built-in sample; defaults to the sample.
const configPath = process.argv[2]
  ? process.argv[2]
  : join(root, "assets/sample-data/scrolly.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const world = JSON.parse(readFileSync(join(root, "../map-native/assets/geo/world.geojson"), "utf8"));

const layout = computeChoropleth(config, world, "iso_a3", { bins: 5, scaleType: "sequential" });
const beats = deriveMapStory(layout, world, "iso_a3", {
  title: config.title,
  insight: config.insight ?? config.title,
  unit: config.valueUnit ?? "",
  valueField: config.valueField,
  narrativePattern: config.valueKind,
});
const regionsWithData = layout.joined.filter((j) => j.value !== null).length;
const story = mapStoryToChapters(beats, {
  title: config.title,
  description: config.description ?? config.unit,
  source: config.source,
  regionsWithData,
});
// Guardrail (defect #3): a temporal field must never revert to "highest/lowest".
const problems = [
  ...checkScrollyConformance(story, beats.length),
  ...auditTemporalNarrative(story, beats),
];
if (problems.length) {
  console.error("✗ scrolly audit FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ scrolly audit GREEN — ${story.steps.length} steps, all prose+refs valid.`);
