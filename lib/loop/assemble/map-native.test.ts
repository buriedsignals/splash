import { test, expect, describe, it } from "bun:test";
import { assembleMapNative } from "./map-native";
import { mapNativeConfigErrors } from "../../../skills/map-native/src/validate-config";
import { resolveGeographyRef } from "../../geo/ref";
import { ISO_A3_PINNED_JOIN_TYPES } from "../../../skills/map-native/src/region-join-support";
import type { ProductionBrief } from "../../core/production-brief";

const REGION_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "choropleth",
  format: "static",
  angle: {
    confirmedTakeaway: "Electricity access is lowest across the Sahel",
    altInsight: "A map of Africa shaded darkest across the Sahel band",
    unit: "%",
  },
  dataCsv: "country,access\nCHE,100\nFRA,100\nTCD,11\nNER,19",
  attribution: "World Bank",
  sourceUrl: "https://data.worldbank.org",
  geo: {
    column: "country",
    geography: {
      origin: "shipped",
      set: "natural-earth-admin-0",
      level: "country",
      joinKey: "iso_a3",
      joinKeyFamily: "iso_a3",
    },
    matched: 4,
    total: 4,
    unmatched: [],
  },
};

test("a choropleth config clears the engine's own validator", () => {
  const r = assembleMapNative(REGION_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  const cfg = r.value as Record<string, unknown>;
  expect(cfg.type).toBe("choropleth");
  expect(cfg.regionKey).toBe("country");
  expect(cfg.valueField).toBe("access");
  expect(cfg.basemap).toBe("world");
  expect(cfg.title).toBe("Electricity access is lowest across the Sahel");
  expect(cfg.source).toEqual({
    name: "World Bank",
    url: "https://data.worldbank.org",
  });
});

test("carries the run's language onto the engine spec (region family)", () => {
  const r = assembleMapNative({ ...REGION_BRIEF, lang: "de" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as { lang?: string }).lang).toBe("de");
});

test("omits lang entirely when the run has none — byte-identical to before (region family)", () => {
  const r = assembleMapNative(REGION_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect("lang" in (r.value as object)).toBe(false);
});

test("no geography measured — the refusal names the shipped basemaps, so the fix is knowable", () => {
  const r = assembleMapNative({ ...REGION_BRIEF, geo: undefined });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("invalid-request");
  expect(r.message).toContain("world");
  expect(r.message).toContain("us-states");
});

test("fewer than half the rows join — refused, and every orphan is named", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    geo: {
      column: "country",
      geography: {
        origin: "shipped",
        set: "natural-earth-admin-0",
        level: "country",
        joinKey: "iso_a3",
        joinKeyFamily: "iso_a3",
      },
      matched: 1,
      total: 4,
      unmatched: ["Genève", "Vaud", "Valais"],
    },
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("Genève");
  expect(r.message).toContain("Vaud");
  expect(r.message).toContain("Valais");
});

test("several numeric columns and none named in the takeaway — refused, candidates listed", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    dataCsv: "country,access,population\nCHE,100,8\nTCD,11,17",
    angle: {
      ...REGION_BRIEF.angle,
      confirmedTakeaway: "Two very different countries",
    },
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("access");
  expect(r.message).toContain("population");
});

test("several numeric columns, one named in the takeaway — that one is used", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    dataCsv: "country,access,population\nCHE,100,8\nTCD,11,17",
    angle: {
      ...REGION_BRIEF.angle,
      confirmedTakeaway: "Access to electricity splits the continent",
    },
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as Record<string, unknown>).valueField).toBe("access");
});

test("a bare column name like 'n' never matches as an accidental substring of unrelated prose — refused, not silently picked", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    dataCsv: "country,n,score\nCHE,100,8\nTCD,11,17",
    angle: {
      ...REGION_BRIEF.angle,
      confirmedTakeaway: "Countries differ widely in outcome",
    },
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("n, score");
});

test("a multi-word column name matches as a whole phrase when the takeaway names it", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    dataCsv: "country,gdp_per_capita,population\nCHE,80000,8\nTCD,700,17",
    angle: {
      ...REGION_BRIEF.angle,
      confirmedTakeaway:
        "GDP per capita explains the gap between rich and poor nations",
    },
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as Record<string, unknown>).valueField).toBe(
    "gdp_per_capita",
  );
});

test("a cartogram carries id/value pairs, not rows", () => {
  const r = assembleMapNative({ ...REGION_BRIEF, nativeType: "cartogram" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  const cfg = r.value as { values: { id: string; value: number }[] };
  expect(cfg.values[0]).toEqual({ id: "CHE", value: 100 });
});

// THE POINT FAMILY — symbol, hex-grid, locator, route.

const POINT_BRIEF: ProductionBrief = {
  elementId: "e2",
  nativeType: "symbol",
  format: "static",
  angle: {
    confirmedTakeaway: "The strongest quakes cluster along the Pacific rim",
    altInsight: "A map with the largest circles down the Pacific coast",
    unit: "magnitude",
  },
  dataCsv:
    "place,lat,lon,magnitude\nValparaíso,-33.05,-71.62,8.2\nSendai,38.26,140.87,9.1",
  attribution: "USGS",
};

test("lat/lon columns become the symbol points, label included", () => {
  const r = assembleMapNative(POINT_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  const cfg = r.value as {
    points: { lon: number; lat: number; value: number; label?: string }[];
  };
  expect(cfg.points).toEqual([
    { lon: -71.62, lat: -33.05, value: 8.2, label: "Valparaíso" },
    { lon: 140.87, lat: 38.26, value: 9.1, label: "Sendai" },
  ]);
});

test("longitude spelled `long` or `lng` is still longitude", () => {
  const r = assembleMapNative({
    ...POINT_BRIEF,
    dataCsv: "place,latitude,lng,magnitude\nSendai,38.26,140.87,9.1",
  });
  expect(r.ok).toBe(true);
});

test("a point type with no coordinates is refused, naming the columns it looked for", () => {
  const r = assembleMapNative({
    ...POINT_BRIEF,
    dataCsv: "place,magnitude\nSendai,9.1",
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("lat");
  expect(r.message).toContain("lon");
});

test("an out-of-range coordinate is refused, naming the row — never plotted in the sea", () => {
  const r = assembleMapNative({
    ...POINT_BRIEF,
    dataCsv: "place,lat,lon,magnitude\nSendai,138.26,140.87,9.1",
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("Sendai");
});

test("a coordinate that does not parse as a number is refused, naming the row", () => {
  const r = assembleMapNative({
    ...POINT_BRIEF,
    dataCsv: "place,lat,lon,magnitude\nSendai,north,140.87,9.1",
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("Sendai");
});

test("a route is the ordered coordinates, as pairs", () => {
  const r = assembleMapNative({ ...POINT_BRIEF, nativeType: "route" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  expect((r.value as { route: [number, number][] }).route).toEqual([
    [-71.62, -33.05],
    [140.87, 38.26],
  ]);
});

// Task 17 (RouteMap.tsx reads injected geometry, mirroring ChoroplethMap.tsx/CartogramMap.tsx)
// — route's config now carries `geography` alongside its literal `basemap: "world"`, the same
// GeographyRef shape the region family already emits, so the renderer can resolve a join key
// from `config.geography` the same way ChoroplethMap.tsx does instead of a bare string.
test("a route config names its geography (always world — point family has no basemap match)", () => {
  const r = assembleMapNative({ ...POINT_BRIEF, nativeType: "route" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const cfg = r.value as { basemap: string; geography: unknown };
  expect(cfg.basemap).toBe("world");
  expect(cfg.geography).toEqual(resolveGeographyRef("world"));
});

test("a hex-grid's points carry an optional value, resolved the same way as symbol", () => {
  const r = assembleMapNative({ ...POINT_BRIEF, nativeType: "hex-grid" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  const cfg = r.value as {
    points: { lon: number; lat: number; value?: number }[];
  };
  expect(cfg.points).toEqual([
    { lon: -71.62, lat: -33.05, value: 8.2 },
    { lon: 140.87, lat: 38.26, value: 9.1 },
  ]);
});

test("a locator's markers carry the row's own name as the label", () => {
  const r = assembleMapNative({ ...POINT_BRIEF, nativeType: "locator" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  const cfg = r.value as {
    markers: { lon: number; lat: number; label: string }[];
  };
  expect(cfg.markers).toEqual([
    { lon: -71.62, lat: -33.05, label: "Valparaíso" },
    { lon: 140.87, lat: 38.26, label: "Sendai" },
  ]);
});

test("a locator with no column to name the markers is refused", () => {
  const r = assembleMapNative({
    ...POINT_BRIEF,
    nativeType: "locator",
    dataCsv: "lat,lon\n-33.05,-71.62\n38.26,140.87",
  });
  expect(r.ok).toBe(false);
});

test("a symbol map with no numeric column besides the coordinates is refused", () => {
  const r = assembleMapNative({
    ...POINT_BRIEF,
    dataCsv: "place,lat,lon\nValparaíso,-33.05,-71.62",
  });
  expect(r.ok).toBe(false);
});

test("the widened guard accepts the point family alongside the region family, and still refuses what is neither", () => {
  const r = assembleMapNative({ ...POINT_BRIEF, nativeType: "pie" });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("invalid-request");
  expect(r.message).toContain("pie");
});

// map-native has no single ok() return — seven, one per type across the region and point
// families (choropleth/cartogram/dot-density, symbol/hex-grid/locator/route). "all the ok
// returns in the file" (the brief's own correction of its stale "four branches" anchor) means
// every one of the seven, not the first the guard happens to reach.
test("every one of the seven native types carries the run's language onto its own spec", () => {
  for (const nativeType of [
    "choropleth",
    "cartogram",
    "dot-density",
    "symbol",
    "hex-grid",
    "locator",
    "route",
  ]) {
    const base = ["symbol", "hex-grid", "locator", "route"].includes(nativeType)
      ? POINT_BRIEF
      : REGION_BRIEF;
    const r = assembleMapNative({ ...base, nativeType, lang: "fr" });
    expect(r.ok).toBe(true);
    if (!r.ok) continue;
    expect((r.value as { lang?: string }).lang).toBe("fr");
  }
});

test("a dot-density config against the world basemap clears the engine's own validator", () => {
  const r = assembleMapNative({ ...REGION_BRIEF, nativeType: "dot-density" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  const cfg = r.value as Record<string, unknown>;
  expect(cfg.type).toBe("dot-density");
  expect(cfg.basemap).toBe("world");
});

// DotDensityMap.tsx hard-codes the join key "iso_a3" — it never reads config.basemap or
// config.boundaries at all (verified 2026-07-28, task-7; the component's separate hard-import of
// world.geojson was closed by Task 17, commit 5e4e9f71 — only the join-key literal survives).
// The engine's own validate-config only checks that `basemap` NAMES a shipped basemap, so a
// "us-states" dot-density would clear it and then render wrong (a state postal code joined
// against country ISO codes) rather than fail loud. Refused here — the assembler is the one
// place that knows which basemap this geography actually matched — until the component itself
// derives its join key from basemap/geography (Task 13, task-13-brief.md Steps 3-6).
test("a dot-density against any basemap but world is refused in the formats whose component pins the key, not silently rendered wrong", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    nativeType: "dot-density",
    dataCsv: "state,access\nCA,100\nTX,90",
    geo: {
      column: "state",
      geography: {
        origin: "shipped",
        set: "us-states",
        level: "state",
        joinKey: "postal",
        joinKeyFamily: "postal",
      },
      matched: 2,
      total: 2,
      unmatched: [],
    },
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("invalid-request");
  expect(r.message).toContain("us-states");
  expect(r.message).toContain("world");
});

// THE SCOPE OF THE REFUSAL ABOVE — and, until 2026-08-07, the capability it deleted. That refusal
// was format-BLIND while its cartogram sibling was scoped, and the asymmetry was never a decision:
// the cartogram fix left it deliberately alone, saying a narrowing "would ADMIT a pairing that is
// refused today, which is a capability decision owed its own rendered proof". This is that proof's
// unit-level half. DotDensityStory (:199), DotDensityReveal (:134) and DotDensityScrolly (:140)
// resolve the join key through resolveVideoGeometry (core/video-geometry.ts), which prefers
// `config.geography.joinKey`; only DotDensityMap.tsx pins it (`const JOIN_KEY = "iso_a3"`, :41).
//
// THE RENDER that decides it is lib/loop/dot-density-video-e2e.test.ts — a us-states dot-density
// video built through produce() with a real Remotion render, measured on the mp4 and on the
// engine's own video-verify report. Without THIS test, widening the refusal back to every format
// would leave the gate green (that proof is opt-in) while removing what the render measured.
for (const format of ["video", "scrolly"] as const) {
  test(`a non-world dot-density is ACCEPTED in ${format}, whose components resolve the join key`, () => {
    const r = assembleMapNative({
      ...REGION_BRIEF,
      nativeType: "dot-density",
      format,
      dataCsv: "state,access\nCA,100\nTX,90",
      geo: {
        column: "state",
        geography: {
          origin: "shipped",
          set: "us-states",
          level: "state",
          joinKey: "postal",
          joinKeyFamily: "postal",
        },
        matched: 2,
        total: 2,
        unmatched: [],
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Beyond "not refused": the emitted config must name the geography the video path reads its
    // join key OFF, or the acceptance is vacuous.
    const cfg = r.value as Record<string, unknown>;
    expect(cfg.type).toBe("dot-density");
    expect(cfg.basemap).toBe("us-states");
    expect((cfg.geography as { joinKey?: string } | undefined)?.joinKey).toBe(
      "postal",
    );
  });
}

// THE SIBLING THE REFUSAL ABOVE FORGOT. `cartogram` sits in the same family and fails the same
// way: CartogramMap.tsx (the static AND interactive component) calls `computeCartogram(config,
// world)` at :194 without threading a key, and cartogram-geo.ts:62 falls back to
// `data.joinKey ?? "iso_a3"`. Nothing on the loop's cartogram branch ever set `config.joinKey`,
// so a us-states cartogram assembled, built, and produced an artifact.
//
// MEASURED end-to-end through the loop's own CLI (2026-08-07, init → advance → confirm-angle →
// phrase → choose-form → advance, four US states with rents): the interactive build succeeded
// and the delivered self-contained index.html renders a bare basemap of EUROPE — the
// journalist's title, their alt-insight and their source credit painted over Poland and Turkey,
// with not one region of data and no `cartogram-cells` layer at all. The page's only console
// output is `choropleth: no region matched the data — nothing to map`, thrown inside the browser,
// which is why produce then died on a 60 s (static: 90 s) Playwright `waitForFunction` timeout —
// after the full vite build, with a stack trace instead of a sentence the journalist can act on.
//
// SCOPED BY FORMAT, exactly like the prose chain's own gate (skills/splash/src/validate-gate.ts's
// regionJoinError) and for the reason region-join-support.ts's header measured: only
// CartogramMap.tsx pins the key. CartogramStory, CartogramReveal and CartogramScrolly all thread
// it through resolveVideoGeometry, so a non-world cartogram video/scrolly is a WORKING capability
// and a format-blind refusal would delete it.
test("a cartogram against any basemap but world is refused in the formats whose component pins the key", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    nativeType: "cartogram",
    format: "static",
    dataCsv: "state,rent\nNY,3200\nCA,2900",
    geo: {
      column: "state",
      geography: {
        origin: "shipped",
        set: "us-states",
        level: "state",
        joinKey: "postal",
        joinKeyFamily: "postal",
      },
      matched: 2,
      total: 2,
      unmatched: [],
    },
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("invalid-request");
  expect(r.message).toContain("cartogram");
  expect(r.message).toContain("us-states");
  expect(r.message).toContain("world");
});

// THE OTHER HALF OF THE SCOPE, and the reason the refusal above says `isoA3PinnedInFormat`
// instead of refusing outright. Without this test the scope is unguarded: widening the sibling
// refusal to every format would leave every test green while silently deleting a capability
// that demonstrably works.
//
// MEASURED, not reasoned: the SAME us-states cartogram, driven through the same loop CLI in the
// video format (2026-08-07), produced a clean 27.3 s / 819-frame landscape.mp4 —
// video-verify.json reports ZERO violations, revealMeanDiff 198.2 against a 0.5 floor — and the
// still shows all four states joined, shaded by rent, over correct North-American bounds. That
// works because CartogramStory/CartogramReveal/CartogramScrolly resolve the key through
// resolveVideoGeometry; only CartogramMap.tsx pins it. Scrolly rides the same components (the
// scrolly assembler delegates straight to this function), so it is covered here too.
for (const format of ["video", "scrolly"] as const) {
  test(`a non-world cartogram is ACCEPTED in ${format}, whose components resolve the join key`, () => {
    const r = assembleMapNative({
      ...REGION_BRIEF,
      nativeType: "cartogram",
      format,
      dataCsv: "state,rent\nNY,3200\nCA,2900",
      geo: {
        column: "state",
        geography: {
          origin: "shipped",
          set: "us-states",
          level: "state",
          joinKey: "postal",
          joinKeyFamily: "postal",
        },
        matched: 2,
        total: 2,
        unmatched: [],
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Beyond "not refused": the emitted config must still name the geography the video path
    // reads its join key OFF, or the acceptance is vacuous.
    const cfg = r.value as Record<string, unknown>;
    expect(cfg.type).toBe("cartogram");
    expect((cfg.geography as { joinKey?: string } | undefined)?.joinKey).toBe(
      "postal",
    );
  });
}

// THE GUARD IS DRIVEN BY THE SHARED SET, not by two hand-written branches — which is what stops
// the asymmetry this branch removed from growing back a third time. A type joins the set by
// pinning its key (region-join-support.ts), and joining it must be enough to be refused here.
//
// The second half is the one that keeps the exclusion honest: `choropleth` is in the same region
// family, reaches the same code, and is NOT in the set — because ChoroplethMap.tsx reads
// `config.geography.joinKey` (:265-267). It must keep assembling against a non-world basemap in
// the very formats the other two are refused in, or the guard has widened past its own fact.
test("the pinned-join refusal follows the shared set, and stops at its edge", () => {
  const nonWorld = {
    column: "state",
    geography: {
      origin: "shipped" as const,
      set: "us-states",
      level: "state",
      joinKey: "postal",
      joinKeyFamily: "postal",
    },
    matched: 2,
    total: 2,
    unmatched: [],
  };
  const brief = {
    ...REGION_BRIEF,
    dataCsv: "state,access\nCA,100\nTX,90",
    geo: nonWorld,
  };
  for (const format of ["static", "interactive"] as const) {
    for (const nativeType of ISO_A3_PINNED_JOIN_TYPES) {
      const r = assembleMapNative({ ...brief, nativeType, format });
      expect(`${nativeType}/${format}: ${r.ok ? "accepted" : "refused"}`).toBe(
        `${nativeType}/${format}: refused`,
      );
    }
    const clear = assembleMapNative({
      ...brief,
      nativeType: "choropleth",
      format,
    });
    expect(
      `choropleth/${format}: ${clear.ok ? "accepted" : clear.message}`,
    ).toBe(`choropleth/${format}: accepted`);
  }
});

// The world basemap is the one case the pinned key is RIGHT for — it must keep assembling in
// every format, or the guard has eaten the ordinary path.
test("a world cartogram still assembles in the pinned formats", () => {
  for (const format of ["static", "interactive"] as const) {
    const r = assembleMapNative({
      ...REGION_BRIEF,
      nativeType: "cartogram",
      format,
    });
    expect(r.ok).toBe(true);
  }
});

// Task 13 (task-13-brief.md, Step 1) — a deliberate pre-condition breadcrumb, not a bug in this
// task. The plan sequences Task 13's refusal rewrite AFTER Task 17 (skills/map-native geometry
// de-inlining: DotDensityMap.tsx stops hard-importing world.geojson + hard-coding join key
// "iso_a3"). UPDATE (2026-07-30, commit 5e4e9f71): Task 17 has now landed — DotDensityMap.tsx no
// longer hard-imports `world.geojson?raw` (it decodes `config.geometry`, a TopoJSON injected by
// produce at Task 20). But its join key is STILL hard-coded to the literal "iso_a3"
// (`const JOIN_KEY = "iso_a3";`), never derived from `config.basemap`/`config.boundaries`/
// `config.geography` — Task 17's own brief scoped that rewrite out (file list did not include
// this rewire; see task-17-report.md's "deviations" section). That surviving hard-coded join key
// is precisely what keeps THIS test red and the sibling refusal above load-bearing: a
// "us-states" dot-density would still clear validate-config and render against the WORLD
// geometry, joining state postal codes against country ISO codes — wrong silently, not missing.
// This test is written RED on purpose: it pins the post-Task-13 target (Steps 3-6: re-derive the
// join key from `config.geography.joinKey` instead of the "iso_a3" literal) so a future pass can
// tell "join key not yet re-derived" (this failure) apart from "re-derived but broken" (any
// other failure). Do not remove the sibling refusal above, and do not make this test pass, until
// Task 13 Steps 3-6 have actually re-derived DotDensityMap.tsx's join key on this branch.
//
// PLAN GAP (found 2026-07-30, after Task 17 landed): Task 13's own plan text (task-13-brief.md,
// Step 3) assumes Task 17 ALSO un-hardcodes DotDensityMap.tsx's join key — its Step-3 code
// comment reads "Task 17 ... made DotDensityMap.tsx read its geometry from the injected config's
// `geography` descriptor instead of a hard-imported world.geojson + hard-coded 'iso_a3'". That
// assumption is wrong: Task 17's actual brief never mentions JOIN_KEY at all (verified by reading
// its full text), and this file's own component still hard-codes `const JOIN_KEY = "iso_a3";`
// (skills/map-native/src/DotDensityMap.tsx) after Task 17 landed. So implementing Task 13's Step
// 3 exactly as written — unconditionally returning `ok(...)` once a non-world geography is
// matched — would be UNSAFE: a "us-states" dot-density would clear the refusal and then render
// SILENTLY WRONG (state postal codes joined against the still-hardcoded country ISO-A3 key),
// exactly the failure class this refusal exists to prevent.
//
// RULING (2026-07-30, after Task 20 landed): Task 20's own implementer confirmed produce.mjs now
// resolves config.geography (correct joinKey) for dot-density too, and sized what Task 13 would
// actually need: (1) DotDensityMap.tsx reading `config.geography?.joinKey ?? JOIN_KEY` instead of
// the hard-coded literal — genuinely small, mirrors ChoroplethMap.tsx's already-proven Task 16
// pattern; BUT (2) removing THIS refusal in map-native.ts, plus (3) a real, rendered, visually
// inspected proof that a non-world dot-density (e.g. us-states) has no OTHER hidden world/iso_a3
// assumption inside computeDotDensity/dot-scatter.ts — unverified, and this plan's own testing
// culture explicitly does not treat "probably fine" as sufficient here: Task 20 found a real,
// previously-unreachable vendor-level rendering crash in RouteMap.tsx the moment that sibling
// component (same "never exercised against real geometry" history) was finally given real,
// full-scale data. Attempting (2)+(3) without an independent review available to catch an
// equivalent surprise here would be exactly that same risk, blind.
// Decision: ruled OUT OF THIS PLAN'S SCOPE. This is not a stalled sequencing wait — it is a
// deliberate, documented exclusion. The refusal in map-native.ts (the sibling test above) stays
// in place and correct. This test is skipped, not left "expected red": a red test with an
// explanation nobody re-reads is exactly the failure mode this ruling exists to avoid (a gate
// reporting a failure that is neither ambient nor understood by whoever next reads it).
// FOLLOW-UP, named precisely so nothing here needs re-deriving: (a) add `geography?: GeographyRef`
// to `DotDensityConfigShape` (validate-config.ts) — one line, mirrors ChoroplethConfig; (b) change
// DotDensityMap.tsx's two JOIN_KEY use-sites to `config.geography?.joinKey ?? JOIN_KEY`; (c) remove
// this file's dot-density `basemapKey !== "world"` refusal and un-skip this test; (d) render a real
// non-world (e.g. us-states) dot-density end-to-end and visually inspect the PNG before considering
// the refusal's removal safe — do not skip step (d) on the assumption that (a)+(b) alone are enough.
it.skip("dot-density accepts a non-world geography once DotDensityMap.tsx re-derives its join key — RULED OUT OF THIS PLAN'S SCOPE 2026-07-30, see the follow-up named in the comment above", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    nativeType: "dot-density",
    dataCsv: "state,access\nCA,100\nTX,90",
    geo: {
      column: "state",
      geography: {
        origin: "shipped",
        set: "us-states",
        level: "state",
        joinKey: "postal",
        joinKeyFamily: "postal",
      },
      matched: 2,
      total: 2,
      unmatched: [],
    },
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const cfg = r.value as Record<string, unknown>;
  // Beyond "the refusal is gone": pins the emitted config actually names the matched
  // geography, not a vacuous ok:true a broken Step-3 implementation could also produce
  // (e.g. one that drops the refusal but forgets to route boundaries/basemap off it).
  expect(cfg.type).toBe("dot-density");
  expect(cfg.regionKey).toBe("state");
  expect(cfg.basemap).toBe("us-states");
  expect(cfg.boundaries).toBe("us-states");
  expect((cfg.geography as { set?: string } | undefined)?.set).toBe(
    "us-states",
  );
});

// § 8.8 — ChoroplethMap.tsx (skills/map-native/src/ChoroplethMap.tsx:53-54) types the two
// fields apart: `unit` is the long legend HEADER (:341), `valueUnit` is the SHORT suffix its
// bin ranges (:355, via fmtBinRange) and its tooltip (:388, :393) print. The assembler emitted
// `unit` alone on the choropleth branch, so a loop-built choropleth showed its unit once, in a
// heading, and on no value a reader hovers or reads off the legend scale. "%" is the fixture
// value on purpose: it is the exact unit the constraints call out as language-dependently
// spaced (French/German "70 %" vs English "70%") — the same string the render-layer spacing
// rule (fmtBinRange, unitSuffix) actually branches on, even though this test itself only
// checks that the assembler hands the string to both fields, not the render spacing.
test("gives the choropleth the field its tooltip and bins actually read", () => {
  const r = assembleMapNative(REGION_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const v = r.value as { unit?: string; valueUnit?: string };
  expect(v.unit).toBe("%");
  expect(v.valueUnit).toBe("%");
});

// The sibling branches (cartogram :189, symbol/hex-grid :333/:368) already emit `valueUnit`.
// Three point-family branches dropped the unit entirely: dot-density had no unit field at all,
// and route/locator never even read `brief.angle.unit` into a local. "km" is a realistic
// distance unit for a route/locator brief and a realistic magnitude-adjacent one for
// dot-density's access-rate CSV — chosen over a placeholder string so the fixture exercises a
// unit a reader would actually see, not an inert label nothing downstream ever prints.
for (const nativeType of ["dot-density", "route", "locator"]) {
  test(`carries the unit onto a ${nativeType} map instead of dropping it`, () => {
    const base = nativeType === "dot-density" ? REGION_BRIEF : POINT_BRIEF;
    const r = assembleMapNative({
      ...base,
      nativeType,
      angle: { ...base.angle, unit: "km" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.value as { valueUnit?: string }).valueUnit).toBe("km");
  });
}

describe("geoRefusal — ADM1-aware wording", () => {
  it("does not claim only 'world'/'us-states' are the shipped basemaps when geo is undefined", () => {
    const brief: ProductionBrief = { ...REGION_BRIEF, geo: undefined };
    const result = assembleMapNative(brief);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // the old wording named exactly "world and us-states" — the ADM1 index is a third,
      // real candidate now, and the message must not claim otherwise.
      expect(result.message).not.toMatch(
        /the shipped basemaps are world and us-states/,
      );
    }
  });

  it("emits geo.geography.set as the config's basemap string, and geography wholesale, for an ADM1 match", () => {
    const brief: ProductionBrief = {
      ...REGION_BRIEF,
      geo: {
        column: "country",
        geography: {
          origin: "shipped",
          set: "natural-earth-admin-1",
          scope: "CHE",
          level: "canton",
          joinKey: "name",
          joinKeyFamily: "name",
        },
        matched: 2,
        total: 2,
        unmatched: [],
      },
    };
    const result = assembleMapNative(brief);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const cfg = result.value as { basemap: string; geography: unknown };
      expect(cfg.basemap).toBe("natural-earth-admin-1");
      expect(cfg.geography).toEqual(brief.geo!.geography);
    }
  });
});

// ---------------------------------------------------------------------------
// THE CONFIRMED WALK REACHES THE MAP — sub-project ③. `arcBeats` is the field every map-native
// renderer already reads (map-arc.ts); until now nothing in lib/ ever wrote it, so a journalist
// who confirmed a walk through the loop saw it go nowhere.
// ---------------------------------------------------------------------------
describe("arcBeats — the journalist's confirmed walk, threaded to the engine", () => {
  const WALK = [
    { region: "TCD", role: "establish" as const, text: "Chad starts lowest." },
    { region: "NER", role: "build" as const, text: "Niger is barely ahead." },
    {
      region: "CHE",
      role: "payoff" as const,
      text: "Switzerland is universal.",
    },
  ];

  it("threads the walk onto a region-family config, verbatim", () => {
    const r = assembleMapNative({ ...REGION_BRIEF, beats: WALK });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const cfg = r.value as Record<string, unknown>;
    expect(cfg.arcBeats).toEqual(WALK);
    // Still a config the engine itself accepts — a walk must not cost validity.
    expect(mapNativeConfigErrors(r.value)).toEqual([]);
  });

  it("omits the field entirely when there is no walk", () => {
    const r = assembleMapNative(REGION_BRIEF);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value as Record<string, unknown>).not.toHaveProperty("arcBeats");
  });

  it("threads it onto a cartogram too", () => {
    const r = assembleMapNative({
      ...REGION_BRIEF,
      nativeType: "cartogram",
      beats: WALK,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.value as Record<string, unknown>).arcBeats).toEqual(WALK);
  });
});

// The point family carries the walk too — `symbol` and `locator` are proposable types
// (lib/brain/beats.ts's PROPOSABLE_MAP_TYPES), so a walk confirmed for one must reach it.
test("a symbol config carries the confirmed walk", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    nativeType: "symbol",
    dataCsv: "name,lon,lat,value\nGenève,6.1,46.2,1780\nJura,7.0,47.3,1010",
    beats: [
      { region: "Genève", role: "establish" as const, text: "Geneva leads." },
      { region: "Jura", role: "payoff" as const, text: "The Jura trails." },
    ],
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as Record<string, unknown>).arcBeats).toEqual([
    { region: "Genève", role: "establish", text: "Geneva leads." },
    { region: "Jura", role: "payoff", text: "The Jura trails." },
  ]);
});

// SUB-PROJECT ④(c) — a beat's camera decision travels with it, all the way to the engine.
// `cameraMode` stays the global default; this is how a journalist contradicts it beat by beat.
it("threads a beat's camera decision into arcBeats, and omits it when there is none", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    beats: [
      {
        region: "TCD",
        role: "establish" as const,
        text: "Chad starts lowest.",
      },
      {
        region: "NER",
        role: "build" as const,
        text: "Niger is barely ahead.",
        movement: "hold",
      },
    ],
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as Record<string, unknown>).arcBeats).toEqual([
    { region: "TCD", role: "establish", text: "Chad starts lowest." },
    {
      region: "NER",
      role: "build",
      text: "Niger is barely ahead.",
      movement: "hold",
    },
  ]);
});
