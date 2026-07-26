// lib/brain/typology-coverage.test.ts
import { test, expect } from "bun:test";
import { loadTypology } from "./typology";
import { engineTypes } from "../core/registry";
import "../loop/engines";

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
  const byId = new Map(loadTypology().map((s) => [s.id, s]));
  const chartNative = new Set(engineTypes("chart-native").map((t) => t.id));
  for (const id of SINGLE) {
    const sheet = byId.get(id);
    expect(sheet, `${id}.md must load`).toBeDefined();
    expect(sheet!.intent.length).toBeGreaterThan(0);
    expect(sheet!.bestFor.length).toBeGreaterThan(0);
    expect(sheet!.notFor.length).toBeGreaterThan(0);
    // every declared render key must exist in that engine's catalogue
    for (const [engine, key] of Object.entries(sheet!.engines))
      if (engine === "chart-native")
        expect(chartNative.has(key), `${id} → chart-native:${key}`).toBe(true);
  }
});
