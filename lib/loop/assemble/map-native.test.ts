import { test, expect } from "bun:test";
import { assembleMapNative } from "./map-native";
import { mapNativeConfigErrors } from "../../../skills/map-native/src/validate-config";
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
    basemap: "world",
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
      basemap: "world",
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

// DotDensityMap.tsx hard-imports world.geojson and hard-codes the join key "iso_a3" — it never
// reads config.basemap or config.boundaries at all (verified 2026-07-28, task-7). The engine's
// own validate-config only checks that `basemap` NAMES a shipped basemap, so a "us-states"
// dot-density would clear it and then render wrong (a state postal code joined against country
// ISO codes) rather than fail loud. Refused here — the assembler is the one place that knows
// which basemap this geography actually matched — until the component itself reads basemap.
test("a dot-density against any basemap but world is refused, not silently rendered wrong", () => {
  const r = assembleMapNative({
    ...REGION_BRIEF,
    nativeType: "dot-density",
    dataCsv: "state,access\nCA,100\nTX,90",
    geo: {
      column: "state",
      basemap: "us-states",
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
