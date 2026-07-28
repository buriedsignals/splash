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

test("a cartogram carries id/value pairs, not rows", () => {
  const r = assembleMapNative({ ...REGION_BRIEF, nativeType: "cartogram" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(mapNativeConfigErrors(r.value)).toEqual([]);
  const cfg = r.value as { values: { id: string; value: number }[] };
  expect(cfg.values[0]).toEqual({ id: "CHE", value: 100 });
});
