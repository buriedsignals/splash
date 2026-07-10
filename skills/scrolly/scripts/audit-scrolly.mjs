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
  auditDistinctBookends,
} from "../src/conformance.ts";
import { checkPaletteConformance } from "../../map-native/src/conformance.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
// A second config path may be passed (e.g. a workflow-test config) to audit it
// instead of the built-in sample; defaults to the sample.
const configPath = process.argv[2]
  ? process.argv[2]
  : join(root, "assets/sample-data/scrolly.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const world = JSON.parse(readFileSync(join(root, "../map-native/assets/geo/world.geojson"), "utf8"));

const scaleType = config.scaleType ?? "sequential";
const layout = computeChoropleth(config, world, "iso_a3", {
  bins: 5,
  scaleType,
  palette: config.palette,
  labelField: config.labelField,
});
const beats = deriveMapStory(layout, world, "iso_a3", {
  title: config.title,
  insight: config.insight ?? config.title,
  unit: config.valueUnit ?? "",
  valueField: config.valueField,
  narrativePattern: config.valueKind,
  lang: config.lang,
});
const regionsWithData = layout.joined.filter((j) => j.value !== null).length;
const story = mapStoryToChapters(beats, {
  title: config.title,
  description: config.description ?? config.unit,
  source: config.source,
  regionsWithData,
  lang: config.lang,
});
// Guardrails:
//   - defect #3: a temporal field must never revert to "highest/lowest";
//   - bookends: the intro and takeaway must differ (no recycled description);
//   - palette: a declared subject must not sit on the default blue ramp (subject-fit).
const problems = [
  ...checkScrollyConformance(story, beats.length),
  ...auditTemporalNarrative(story, beats),
  ...auditDistinctBookends(story),
  ...checkPaletteConformance({
    scaleType,
    scaleColors: layout.bins.map((b) => b.color),
    values: layout.joined
      .map((j) => j.value)
      .filter((v) => v !== null),
    paletteName: typeof config.palette === "string" ? config.palette : undefined,
    subject: typeof config.subject === "string" ? config.subject : undefined,
  }),
];
if (problems.length) {
  console.error("✗ scrolly audit FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ scrolly audit GREEN — ${story.steps.length} steps, all prose+refs valid.`);
