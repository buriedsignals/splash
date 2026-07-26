// lib/brain/typology-drift.test.ts
import { test, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTypology, renderableSheets } from "./typology";
import { allProducers, engineTypes } from "../core/registry";
import { INTENTS } from "./intents";
import "../loop/engines";

const KB = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../knowledge/references",
);

test("DRIFT 1: every declared render key exists in that engine's catalogue", () => {
  for (const sheet of loadTypology())
    for (const [engine, key] of Object.entries(sheet.engines)) {
      const ids = engineTypes(engine).map((t) => t.id);
      expect(ids, `${sheet.id} declares ${engine}:${key}`).toContain(key);
    }
});

test("DRIFT 2: every reachable engine type has a sheet", () => {
  const claimed = new Map<string, string>(); // `${engine}:${key}` → sheet id
  for (const sheet of loadTypology())
    for (const [engine, key] of Object.entries(sheet.engines))
      claimed.set(`${engine}:${key}`, sheet.id);
  const missing: string[] = [];
  for (const p of allProducers())
    for (const t of engineTypes(p.name))
      if (!t.deferred && !claimed.has(`${p.name}:${t.id}`))
        missing.push(`${p.name}:${t.id}`);
  expect(missing).toEqual([]);
});

test("DRIFT 3: every intent used belongs to the closed vocabulary", () => {
  for (const sheet of loadTypology())
    for (const i of sheet.intent) expect(INTENTS).toContain(i);
});

test("a header-less sheet is only tolerated when no engine declares its type", () => {
  const declared = new Set(
    allProducers().flatMap((p) => engineTypes(p.name).map((t) => t.id)),
  );
  for (const family of ["chart/types", "map/types", "image/types"])
    for (const file of readdirSync(join(KB, family)).filter((f) =>
      f.endsWith(".md"),
    )) {
      const raw = readFileSync(join(KB, family, file), "utf8");
      if (raw.startsWith("---")) continue;
      const id = file.replace(/\.md$/, "");
      expect(declared.has(id), `${family}/${file} has no header`).toBe(false);
    }
});

test("renderableSheets pairs a sheet with each engine that can render it today", () => {
  const pairs = renderableSheets();
  expect(pairs.length).toBeGreaterThan(20);
  expect(
    pairs.some((p) => p.sheet.id === "slope" && p.engine === "chart-native"),
  ).toBe(true);
  // a deferred type never pairs
  expect(pairs.some((p) => p.sheet.id === "sankey")).toBe(false);
});
