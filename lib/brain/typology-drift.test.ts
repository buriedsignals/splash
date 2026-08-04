// lib/brain/typology-drift.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTypology, renderableSheets, type TypeSheet } from "./typology";
import {
  allProducers,
  engineTypes,
  producerForFormat,
} from "../core/registry";
import { VISUAL_FORMATS } from "../core/vocabulary";
import "../loop/engines";

test("DRIFT 1: every declared render key exists in that engine's catalogue", () => {
  for (const sheet of loadTypology())
    for (const [engine, keys] of Object.entries(sheet.engines)) {
      const ids = engineTypes(engine).map((t) => t.id);
      for (const key of keys)
        expect(ids, `${sheet.id} declares ${engine}:${key}`).toContain(key);
    }
});

/** The engines whose track `host` renders on their behalf — i.e. those some format of theirs
 *  routes INTO it. skills/scrolly is the case: it is a MECHANISM, not a peer engine (CLAUDE.md,
 *  "skills/scrolly n'est que le mécanisme partagé … PAS un moteur pair"), so a map-scrolly is a
 *  map-native choropleth the orchestrator drives — which is exactly how the offer enumerates it
 *  (`choropleth · map-native/choropleth → scrolly`, lib/loop/scrolly-routing.test.ts).
 *
 *  Self-redirects are excluded: image-native builds its own scrolly, so it hosts nothing. */
function hostedFrom(host: string): string[] {
  return allProducers()
    .map((p) => p.name)
    .filter(
      (engine) =>
        engine !== host &&
        VISUAL_FORMATS.some((f) => producerForFormat(engine, f) === host),
    );
}

// A sheet must claim every type a journalist can be shown — but it claims it on the engine that
// OWNS the visual, never on the mechanism that drives it. A sheet declaring `scrolly:choropleth`
// would be claiming an orchestrator, and would then contradict the offer, which routes the same
// form as `map-native/choropleth → scrolly`.
//
// This indirection became load-bearing on 2026-08-03, when the scrolly producer began declaring
// the six map types it hosts SO THAT it could declare their GESTURES (sub-project ①: "every
// engine declares what it can make move" — the orchestrator implements Scrolly*Map.tsx, so it is
// the honest declarer of what those move like). That made one `types` array serve two readings:
// the gesture vocabulary, and this guard's "types needing a sheet". They are reconciled here,
// where the second reading lives, rather than by weakening the first.
//
// THE GUARD STILL BITES: a hosted type is claimed only if the engine it is hosted FROM claims
// it. A type on the orchestrator that no owning engine's sheet covers still fails, which is the
// dead end this test exists to prevent.
test("DRIFT 2: every reachable engine type has a sheet", () => {
  const claimed = new Map<string, string>(); // `${engine}:${key}` → sheet id
  for (const sheet of loadTypology())
    for (const [engine, keys] of Object.entries(sheet.engines))
      for (const key of keys) claimed.set(`${engine}:${key}`, sheet.id);
  const missing: string[] = [];
  for (const p of allProducers()) {
    const owners = hostedFrom(p.name);
    for (const t of engineTypes(p.name)) {
      if (t.deferred) continue;
      if (claimed.has(`${p.name}:${t.id}`)) continue;
      if (owners.some((engine) => claimed.has(`${engine}:${t.id}`))) continue;
      missing.push(`${p.name}:${t.id}`);
    }
  }
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

// A10: the frontmatter `limits` block is the fact the brain reads (limitFailure() in
// eligibility.ts checks it, nothing reads the prose). A sheet whose prose states a DIFFERENT
// number for the same cap is lying to whichever of the two audiences reads the other one — a
// human trusts the prose, the machine trusts the frontmatter, and they now disagree. `bar.md`
// stated its category ceiling twice (`maxCategories: 25` vs "~20-25" in prose, twice) and
// `streamgraph.md` stated its series ceiling three ways (`maxSeries: 7` vs "5-10" in `bestFor`
// vs "≤ ~7" in its own Correctness section). Both are fixed now; this locks the number the
// prose states to the number the frontmatter enforces, so the next edit to one is caught
// against the other instead of drifting quietly.
test("DRIFT 4: a sheet's prose states the same numeric cap as its own frontmatter limits", () => {
  const bar = loadTypology().find((s) => s.id === "bar")!;
  expect(bar.limits.maxCategories).toBe(25);
  expect(bar.body).not.toMatch(/20.{0,3}25 categories/);
  expect(bar.body).toMatch(/~?25 categories/);

  const streamgraph = loadTypology().find((s) => s.id === "streamgraph")!;
  expect(streamgraph.limits.maxSeries).toBe(7);
  expect(streamgraph.body).not.toMatch(/5.{0,3}10/);
});

// A10 (family convention): every chart/image type sheet cites its research under a plural
// "> Sources:" line and titles its per-type rules section `## Correctness "de base" (...)`,
// even a sheet with exactly one citation (map/types sheets are a separate family with their
// own shared geo-prep layer and are out of scope here — CLAUDE.md). `image-scrolly.md` was the
// sole outlier in both — a lone "> Source:" and a bare "## Correctness" — which reads as a
// different sheet family to a journalist or reviewer skimming the corpus. Fixed; locked so the
// next new sheet is caught at authoring time instead of by the next sweep.
test("DRIFT 5: every chart/image type sheet follows the family's Sources/Correctness heading convention", () => {
  const sheets = loadTypology().filter(
    (s) =>
      s.sheetPath.includes("/chart/types/") ||
      s.sheetPath.includes("/image/types/"),
  );
  expect(sheets.length).toBeGreaterThan(30);
  for (const sheet of sheets) {
    expect(sheet.body, `${sheet.id}: cites "> Sources:" (plural)`).toMatch(
      /^\n?> Sources:/m,
    );
    expect(sheet.body, `${sheet.id}: no lone "> Source:" line`).not.toMatch(
      /^> Source:/m,
    );
    expect(
      sheet.body,
      `${sheet.id}: has a '## Correctness "de base" (...)' heading`,
    ).toMatch(/^## Correctness "de base" \(/m);
  }
});

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
