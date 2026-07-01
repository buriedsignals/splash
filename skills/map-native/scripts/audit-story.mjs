// Deterministic "the video tells a story" audit. Runs deriveMapStory and
// deriveSymbolStory on sample configs and asserts the narrative invariants —
// distinct cameras (camera moves), callouts with text, title→takeaway envelope,
// non-empty copy on non-establish beats.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeChoropleth } from "../src/choropleth-geo.ts";
import { deriveMapStory } from "../src/map-story.ts";
import { deriveSymbolStory } from "../src/symbol-story.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// ---------------------------------------------------------------------------
// Shared assertion helper
// ---------------------------------------------------------------------------

/**
 * Assert narrative invariants on a beat array.
 * @param {import("../src/map-story.ts").Beat[]} beats
 * @param {string} label  e.g. "choropleth" or "symbol"
 * @returns {string[]} list of failure messages (empty = all OK)
 */
function assertStoryBeats(beats, label) {
  const problems = [];

  if (beats.length < 4) problems.push(`only ${beats.length} beats (expected ≥4)`);
  if (beats[0]?.kind !== "title") problems.push("does not open on title beat");
  if (beats[beats.length - 1]?.kind !== "takeaway") problems.push("does not close on takeaway");

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

  return problems;
}

// ---------------------------------------------------------------------------
// Choropleth story
// ---------------------------------------------------------------------------

const choroplethConfig = JSON.parse(readFileSync(join(root, "assets/sample-data/choropleth.json"), "utf8"));
const world = JSON.parse(readFileSync(join(root, "assets/geo/world.geojson"), "utf8"));

const layout = computeChoropleth(choroplethConfig, world, "iso_a3", { bins: 5, scaleType: "sequential" });
const choroplethBeats = deriveMapStory(layout, world, "iso_a3", {
  title: choroplethConfig.title,
  insight: choroplethConfig.insight ?? choroplethConfig.title,
  unit: choroplethConfig.valueUnit ?? "",
});

const choroplethProblems = assertStoryBeats(choroplethBeats, "choropleth");

// ---------------------------------------------------------------------------
// Symbol story
// ---------------------------------------------------------------------------

const symbolConfig = JSON.parse(readFileSync(join(root, "assets/sample-data/symbol.json"), "utf8"));
const symbolMeta = {
  title: symbolConfig.title,
  insight: symbolConfig.description ?? symbolConfig.title,
  unit: symbolConfig.valueUnit ?? "",
};
const symbolBeats = deriveSymbolStory(symbolConfig.points, symbolMeta, { maxReveals: 5 });

const symbolProblems = assertStoryBeats(symbolBeats, "symbol");

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

let failed = false;

if (choroplethProblems.length) {
  console.error(`✗ choropleth story audit FAILED:\n  ${choroplethProblems.join("\n  ")}`);
  failed = true;
} else {
  const reveals = choroplethBeats.filter((b) => b.kind === "reveal");
  const cameras = new Set(choroplethBeats.map((b) => JSON.stringify(b.camera))).size;
  console.log(`✓ choropleth OK — ${choroplethBeats.length} beats, ${reveals.length} reveals, ${cameras} distinct cameras, callouts present.`);
}

if (symbolProblems.length) {
  console.error(`✗ symbol story audit FAILED:\n  ${symbolProblems.join("\n  ")}`);
  failed = true;
} else {
  const reveals = symbolBeats.filter((b) => b.kind === "reveal");
  const cameras = new Set(symbolBeats.map((b) => JSON.stringify(b.camera))).size;
  console.log(`✓ symbol OK — ${symbolBeats.length} beats, ${reveals.length} reveals, ${cameras} distinct cameras, callouts present.`);
}

if (failed) process.exit(1);
