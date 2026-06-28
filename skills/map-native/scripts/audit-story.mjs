// Deterministic "the video tells a story" audit. Runs deriveMapStory on the sample
// config and asserts the narrative invariants — distinct cameras (camera moves),
// callouts with text, establish→takeaway envelope, non-empty copy. No render.
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
  title: config.title, insight: config.insight ?? config.title, unit: config.unit,
});

const problems = [];
if (beats.length < 3) problems.push(`only ${beats.length} beats`);
if (beats[0].kind !== "establish") problems.push("does not open on establish");
if (beats[beats.length - 1].kind !== "takeaway") problems.push("does not close on takeaway");
const reveals = beats.filter((b) => b.kind === "reveal");
if (!reveals.length) problems.push("no reveal beats");
for (const r of reveals) {
  if (!r.highlight.length) problems.push("a reveal has no highlight");
  if (!r.callout || !r.callout.text) problems.push("a reveal has no callout text");
}
for (let i = 1; i < beats.length; i++)
  if (JSON.stringify(beats[i].camera) === JSON.stringify(beats[i - 1].camera))
    problems.push(`beats ${i - 1}->${i} share a camera (no movement)`);
if (beats.some((b) => !b.copy)) problems.push("a beat has empty copy");

if (problems.length) {
  console.error("✗ story audit FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ story audit GREEN — ${beats.length} beats, ${reveals.length} reveals, cameras move, callouts present.`);
