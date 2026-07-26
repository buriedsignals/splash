// lib/brain/typology-drift.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTypology, renderableSheets, type TypeSheet } from "./typology";
import { allProducers, engineTypes } from "../core/registry";
import "../loop/engines";

test("DRIFT 1: every declared render key exists in that engine's catalogue", () => {
  for (const sheet of loadTypology())
    for (const [engine, keys] of Object.entries(sheet.engines)) {
      const ids = engineTypes(engine).map((t) => t.id);
      for (const key of keys)
        expect(ids, `${sheet.id} declares ${engine}:${key}`).toContain(key);
    }
});

test("DRIFT 2: every reachable engine type has a sheet", () => {
  const claimed = new Map<string, string>(); // `${engine}:${key}` → sheet id
  for (const sheet of loadTypology())
    for (const [engine, keys] of Object.entries(sheet.engines))
      for (const key of keys) claimed.set(`${engine}:${key}`, sheet.id);
  const missing: string[] = [];
  for (const p of allProducers())
    for (const t of engineTypes(p.name))
      if (!t.deferred && !claimed.has(`${p.name}:${t.id}`))
        missing.push(`${p.name}:${t.id}`);
  expect(missing).toEqual([]);
});

// DRIFT 3 ("every intent used belongs to the closed vocabulary") was dropped in the
// fix-round-1 review: HeaderSchema's `z.enum(INTENTS)` already rejects a bad intent AT PARSE
// TIME, inside `loadTypology()` itself — a corpus-scan test built the same way DRIFT 1/2 are
// can never observe a false case, because loadTypology() throws before the test's loop body
// ever runs. That invariant is exercised where it actually CAN fail — a fixture sheet with a
// bad intent making loadTypology() throw — in typology.test.ts's "an intent outside the
// closed vocabulary is a hard error" test. Keeping a second, structurally-inert copy here
// would read as a live lock while asserting nothing.

test("a header-less sheet fails the load, loudly — regardless of whether its type is declared", () => {
  const root = mkdtempSync(join(tmpdir(), "kb-headerless-"));
  mkdirSync(join(root, "chart", "types"), { recursive: true });
  writeFileSync(
    join(root, "chart", "types", "slope.md"),
    "# Slope\n\nNo frontmatter block at all.\n",
  );
  expect(() => loadTypology(root)).toThrow(/frontmatter/);
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

// A minimal, otherwise-valid TypeSheet fixture — only `id` and `engines` vary per test below.
function fixtureSheet(
  id: string,
  engines: Record<string, string[]>,
): TypeSheet {
  return {
    id,
    engines,
    intent: ["magnitude"],
    shape: "single",
    limits: {},
    formats: ["static"],
    bestFor: ["testing"],
    notFor: ["testing"],
    sheetPath: `chart/types/${id}.md`,
    body: "",
  };
}

test("renderableSheets prefers the FIRST key when several are renderable", () => {
  // "slope" and "bar" are both real, non-deferred chart-native ids.
  const sheet = fixtureSheet("fixture-both-renderable", {
    "chart-native": ["slope", "bar"],
  });
  const pairs = renderableSheets([sheet]);
  expect(pairs).toEqual([{ sheet, engine: "chart-native", key: "slope" }]);
});

test("renderableSheets falls through to the second key when the first is deferred", () => {
  // "sankey" is a real, deferred chart-native id; "slope" is real and renderable.
  const sheet = fixtureSheet("fixture-first-deferred", {
    "chart-native": ["sankey", "slope"],
  });
  const pairs = renderableSheets([sheet]);
  expect(pairs).toEqual([{ sheet, engine: "chart-native", key: "slope" }]);
});
