import { test, expect } from "bun:test";
import { loadTypology } from "./typology";
import { engineTypes, isRenderable } from "../core/registry";
import "../../skills/splash/src/register-producers";

test("DRIFT 3: a declared engine key must be a NON-deferred type of that engine", () => {
  // The hole between DRIFT 1 (typology-drift.test.ts:10-17 — the key EXISTS in the catalogue,
  // deferred included) and completeness.test.ts:38 (which EXEMPTS deferred types). streamgraph
  // sat in it: streamgraph.md declared `engines: chart-native: streamgraph`, the components
  // exist (component-registry.tsx:117, :163), and MAPPERS has no entry — so the sheet promised
  // a renderer no path could reach.
  const broken: string[] = [];
  for (const sheet of loadTypology())
    for (const [engine, keys] of Object.entries(sheet.engines))
      for (const key of keys) {
        const declared = engineTypes(engine).some((t) => t.id === key);
        if (declared && !isRenderable(engine, key))
          broken.push(
            `${sheet.id} promises ${engine}:${key}, which is deferred`,
          );
      }
  expect(broken).toEqual([]);
});

test("DRIFT 3b: a sheet with no engines states why", () => {
  const silent = loadTypology()
    .filter((s) => Object.keys(s.engines).length === 0 && !s.unreachable)
    .map((s) => s.id);
  expect(silent).toEqual([]);
});
