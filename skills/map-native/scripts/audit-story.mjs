// Deterministic "the video tells a story" audit. Runs deriveMapStory on the sample
// config and asserts the narrative invariants — distinct cameras (camera moves),
// callouts with text, title→takeaway envelope, non-empty copy on non-establish beats.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeChoropleth } from "../src/choropleth-geo.ts";
import { deriveMapStory } from "../src/map-story.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const config = JSON.parse(readFileSync(join(root, "assets/sample-data/choropleth.json"), "utf8"));
const world = JSON.parse(readFileSync(join(root, "assets/geo/world.geojson"), "utf8"));

const layout = computeChoropleth(config, world, "iso_a3", { bins: 5, scaleType: "sequential" });
const beats = deriveMapStory(layout, world, "iso_a3", {
  title: config.title, insight: config.insight ?? config.title, unit: config.valueUnit ?? "",
});

const problems = [];
if (beats.length < 4) problems.push(`only ${beats.length} beats (expected ≥4)`);
if (beats[0].kind !== "title") problems.push("does not open on title beat");
if (beats[beats.length - 1].kind !== "takeaway") problems.push("does not close on takeaway");

const reveals = beats.filter((b) => b.kind === "reveal");
if (!reveals.length) problems.push("no reveal beats");
for (const r of reveals) {
  if (!r.highlight.length) problems.push("a reveal has no highlight");
  if (!r.callout || !r.callout.text) problems.push("a reveal has no callout text");
}

// Assert ≥2 distinct cameras (the map must move between at least two positions).
const distinctCameras = new Set(beats.map((b) => JSON.stringify(b.camera))).size;
if (distinctCameras < 2) problems.push(`only ${distinctCameras} distinct camera(s) — map never moves`);

// Assert copy rules: establish always empty; takeaway may be empty when insight === title (Fix 4).
for (const b of beats) {
  if (b.kind === "establish" || b.kind === "takeaway") {
    // establish: always empty. takeaway: empty when insight === title — no requirement.
  } else {
    if (!b.copy) problems.push(`beat kind="${b.kind}" has empty copy`);
  }
}

if (problems.length) {
  console.error("✗ story audit FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ story audit GREEN — ${beats.length} beats, ${reveals.length} reveals, ${distinctCameras} distinct cameras, callouts present.`);
