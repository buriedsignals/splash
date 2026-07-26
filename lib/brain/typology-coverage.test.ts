// lib/brain/typology-coverage.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTypology, type TypeSheet } from "./typology";
import { engineTypes } from "../core/registry";
import "../loop/engines";

const KB = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../knowledge/references",
);

// Load a named subset of one family, so each authoring task can prove ITS sheets while its
// siblings are still header-less. The real whole-KB load is Task 9's drift test.
function loadFamily(family: string, ids: string[]): Map<string, TypeSheet> {
  const root = mkdtempSync(join(tmpdir(), "kb-family-"));
  mkdirSync(join(root, family), { recursive: true });
  for (const id of ids)
    copyFileSync(join(KB, family, `${id}.md`), join(root, family, `${id}.md`));
  return new Map(loadTypology(root).map((s) => [s.id, s]));
}

const SINGLE = [
  "bar",
  "line",
  "pie",
  "diverging-bar",
  "waterfall",
  "lollipop",
  "bullet",
  "treemap",
  "waffle",
  "dot-strip",
  "radial-bar",
];

test("every single-shape chart sheet carries a complete, engine-true header", () => {
  const byId = loadFamily("chart/types", SINGLE);
  const chartNative = new Set(engineTypes("chart-native").map((t) => t.id));
  for (const id of SINGLE) {
    const sheet = byId.get(id);
    expect(sheet, `${id}.md must load`).toBeDefined();
    expect(sheet!.intent.length).toBeGreaterThan(0);
    expect(sheet!.bestFor.length).toBeGreaterThan(0);
    expect(sheet!.notFor.length).toBeGreaterThan(0);
    // every declared render key must exist in that engine's catalogue
    for (const [engine, keys] of Object.entries(sheet!.engines))
      if (engine === "chart-native")
        for (const key of keys)
          expect(chartNative.has(key), `${id} → chart-native:${key}`).toBe(
            true,
          );
  }
});

const WIDE = [
  "grouped-bar",
  "stacked-bar",
  "stacked-area",
  "slope",
  "population-pyramid",
  "bump",
  "diverging-stacked",
  "fan",
  "heatmap",
];

test("every wide-shape chart sheet carries a complete, engine-true header", () => {
  const byId = loadFamily("chart/types", WIDE);
  const chartNative = new Set(engineTypes("chart-native").map((t) => t.id));
  for (const id of WIDE) {
    const sheet = byId.get(id);
    expect(sheet, `${id}.md must load`).toBeDefined();
    expect(sheet!.shape).toBe("wide");
    expect(sheet!.bestFor.length).toBeGreaterThan(0);
    for (const [engine, keys] of Object.entries(sheet!.engines))
      if (engine === "chart-native")
        for (const key of keys)
          expect(chartNative.has(key), `${id} → chart-native:${key}`).toBe(
            true,
          );
  }
});

const PAIRED_AND_DISTRIBUTION = [
  "scatter",
  "dumbbell",
  "connected-scatter",
  "histogram",
  "boxplot",
  "beeswarm",
  "violin",
];

test("every paired/distribution chart sheet carries a complete header", () => {
  const byId = loadFamily("chart/types", PAIRED_AND_DISTRIBUTION);
  for (const id of PAIRED_AND_DISTRIBUTION) {
    const sheet = byId.get(id);
    expect(sheet, `${id}.md must load`).toBeDefined();
    expect(["paired", "distribution"]).toContain(sheet!.shape);
    expect(sheet!.notFor.length).toBeGreaterThan(0);
  }
});

const MAPS = [
  "choropleth",
  "proportional-symbol",
  "locator",
  "route",
  "dot-density",
  "hex-grid",
  "cartogram",
];

test("every map sheet is spatial and engine-true", () => {
  const byId = loadFamily("map/types", MAPS);
  const mapNative = new Set(engineTypes("map-native").map((t) => t.id));
  for (const id of MAPS) {
    const sheet = byId.get(id);
    expect(sheet, `${id}.md must load`).toBeDefined();
    expect(sheet!.intent).toContain("spatial");
    for (const [engine, keys] of Object.entries(sheet!.engines))
      if (engine === "map-native")
        for (const key of keys)
          expect(mapNative.has(key), `${id} → map-native:${key}`).toBe(true);
  }
});

test("the image-scrolly sheet exists and is scrolly-only", () => {
  const sheet = loadFamily("image/types", ["image-scrolly"]).get(
    "image-scrolly",
  );
  expect(sheet).toBeDefined();
  expect(sheet!.formats).toEqual(["scrolly"]);
  expect(sheet!.engines["image-native"]).toEqual(["image-scrolly"]);
});
