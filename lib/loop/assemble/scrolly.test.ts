import { test, expect, describe, it } from "bun:test";
import type { ProductionBrief, BriefBeat } from "../../core/production-brief";
import { assembleScrolly, SCROLLY_TRACK_TYPES } from "./scrolly";
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

// A point-family fixture for the map track's non-region types (symbol, hex-grid, locator) —
// the region fixture (REGION_BRIEF) has a `geo` match, not coordinates, so it cannot stand in
// for these.
const POINT_BRIEF: ProductionBrief = {
  elementId: "e3",
  nativeType: "symbol",
  format: "scrolly",
  angle: {
    confirmedTakeaway: "The strongest quakes cluster along the Pacific rim",
    altInsight: "A map with the largest circles down the Pacific coast",
    unit: "magnitude",
  },
  dataCsv:
    "place,lat,lon,magnitude\nValparaíso,-33.05,-71.62,8.2\nSendai,38.26,140.87,9.1",
  attribution: "USGS",
};

const REGION_TRACK_TYPES = new Set(["choropleth", "cartogram", "dot-density"]);

function briefFixtureFor(nativeType: string): ProductionBrief {
  if (REGION_TRACK_TYPES.has(nativeType))
    return { ...REGION_BRIEF, nativeType };
  if (nativeType === "line" || nativeType === "bar")
    return { ...CHART_BRIEF, nativeType };
  return { ...POINT_BRIEF, nativeType };
}

// § 8.7 — REGRESSION PROOF, not a fix. sweep-2026-07-28-triage / family-B spec §8.7 recorded
// "scrolly.ts has no `source` field, so a loop-built scrolly ships unattributed". The grep
// behind that claim is accurate — there is no `source` literal in this file — but the
// conclusion is not: assembleScrolly (scrolly.ts:65-76) is a pure DISPATCHER. It emits no
// object of its own; every branch delegates to assembleChartNative (chart-native.ts:23 has
// `source`) or assembleMapNative (map-native.ts:171 and :261 both build `source`). This test
// pins the fact that the delegate's attribution really does reach the assembled config, across
// every type either track hosts, so the same wrong grep-driven conclusion cannot be redrawn
// later. If this ever reddens, the dispatcher itself stopped forwarding the brief (or a
// delegate stopped carrying `source`) — a real regression, not the false one on record.
for (const nativeType of SCROLLY_TRACK_TYPES) {
  test(`hands ${nativeType} to a delegate that carries the source — the register said it did not`, () => {
    const r = assembleScrolly({
      ...briefFixtureFor(nativeType),
      attribution: "OFS",
      sourceUrl: "https://www.bfs.admin.ch/x",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(
      (r.value as { source?: { name: string; url?: string } }).source,
    ).toEqual({
      name: "OFS",
      url: "https://www.bfs.admin.ch/x",
    });
  });
}

// ---------------------------------------------------------------------------
// SUB-PROJECT ③ — a map scrolly's confirmed walk must REACH the map, not be refused at the
// door. MAP_TRACK_BEATS_REFUSAL was written when a brief beat could only be chart-shaped and
// had nowhere to go on a map; a region-anchored beat now has a home (`arcBeats`, which
// ScrollyMap.tsx:223 reads). Without this, the whole proposal step stranded here: routed to
// draft-beats, authored by the journalist, then refused at assembly.
// ---------------------------------------------------------------------------
describe("a map scrolly carries the journalist's confirmed walk", () => {
  const MAP_BRIEF: ProductionBrief = {
    ...REGION_BRIEF,
    format: "scrolly",
  };

  it("threads a region-anchored walk into arcBeats", () => {
    const r = assembleScrolly({
      ...MAP_BRIEF,
      beats: [
        { region: "TCD", role: "establish", text: "Chad starts lowest." },
        { region: "NER", role: "build", text: "Niger is barely ahead." },
        { region: "CHE", role: "payoff", text: "Switzerland is universal." },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.value as Record<string, unknown>).arcBeats).toEqual([
      { region: "TCD", role: "establish", text: "Chad starts lowest." },
      { region: "NER", role: "build", text: "Niger is barely ahead." },
      { region: "CHE", role: "payoff", text: "Switzerland is universal." },
    ]);
  });

  it("still refuses a CHART-shaped walk on the map track, in the same words", () => {
    const r = assembleScrolly({
      ...MAP_BRIEF,
      beats: [{ x: "2019", role: "establish", text: "It began here." }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("arcBeats");
  });
});
