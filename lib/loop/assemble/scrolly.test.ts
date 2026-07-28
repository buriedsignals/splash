import { test, expect } from "bun:test";
import type { ProductionBrief, BriefBeat } from "../../core/production-brief";
import { assembleScrolly } from "./scrolly";
import { assembleChartNative } from "./chart-native";
import { assembleMapNative } from "./map-native";

const CHART_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "line",
  format: "scrolly",
  angle: {
    confirmedTakeaway: "Summer sea ice has lost a third of its extent",
    altInsight: "A line falling from 7 to 4.3 million square kilometres",
    unit: "million km²",
  },
  dataCsv: "year,extent\n1979,7.0\n2025,4.3",
  attribution: "NSIDC Sea Ice Index",
  sourceUrl: "https://nsidc.org/data/seaice_index",
};

const REGION_BRIEF: ProductionBrief = {
  elementId: "e2",
  nativeType: "choropleth",
  format: "scrolly",
  angle: {
    confirmedTakeaway: "Electricity access is lowest across the Sahel",
    altInsight: "A map of Africa shaded darkest across the Sahel band",
    unit: "%",
  },
  dataCsv: "country,access\nCHE,100\nFRA,100\nTCD,11\nNER,19",
  attribution: "World Bank",
  sourceUrl: "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS",
  geo: {
    column: "country",
    basemap: "world",
    matched: 4,
    total: 4,
    unmatched: [],
  },
};

const BEATS: BriefBeat[] = [
  { x: "1979", role: "establish", text: "1979 : la banquise couvre 7." },
  { x: "2025", role: "payoff", text: "2025 : elle en couvre 4,3." },
];

test("a chart-track scrolly is exactly the chart-native spec, beats included", () => {
  const brief = { ...CHART_BRIEF, format: "scrolly" as const, beats: BEATS };
  const s = assembleScrolly(brief);
  const c = assembleChartNative(brief);
  expect(s.ok && c.ok && JSON.stringify(s.value)).toBe(
    JSON.stringify(c.ok && c.value),
  );
});

test("a map-track scrolly is the map config, and an explicit beat plan is refused loud", () => {
  const r = assembleScrolly({
    ...REGION_BRIEF,
    format: "scrolly",
    beats: BEATS,
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("map scrolly");
});

test("a map-track scrolly without beats assembles the map config unchanged", () => {
  const r = assembleScrolly({ ...REGION_BRIEF, format: "scrolly" });
  const m = assembleMapNative({ ...REGION_BRIEF, format: "scrolly" });
  expect(r.ok && m.ok && JSON.stringify(r.value)).toBe(
    JSON.stringify(m.ok && m.value),
  );
});
