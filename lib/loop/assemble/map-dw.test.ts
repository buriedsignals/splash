import { test, expect } from "bun:test";
import { assembleMapDw } from "./map-dw";
import { validateMapSpec } from "../../../skills/map-dw/src/map-spec";
import type { ProductionBrief } from "../../core/production-brief";

// The same geography map-native's own fixture uses (lib/loop/assemble/map-native.test.ts):
// four ISO alpha-3 rows, one numeric column, a full join. What changes here is the ENGINE —
// the same brief has to come out as a Datawrapper spec, in Datawrapper's basemap vocabulary.
const REGION_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "choropleth",
  format: "static",
  angle: {
    confirmedTakeaway: "Electricity access is lowest across the Sahel",
    altInsight: "A world map shaded darkest across the Sahel band",
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

test("a choropleth spec clears the engine's own validator", () => {
  const r = assembleMapDw(REGION_BRIEF);
  expect(r.ok ? [] : [r.message]).toEqual([]);
  if (!r.ok) return;
  const v = validateMapSpec(r.value);
  expect(v.ok ? [] : v.errors).toEqual([]);
  const spec = r.value as Record<string, unknown>;
  expect(spec.mapType).toBe("choropleth");
  // Datawrapper's own ids, NOT map-native's "world" — the join key is the alpha-3 one
  // (skills/map-dw/src/basemap-keys.ts, SKILL.md gotcha 0).
  expect(spec.basemap).toBe("world-2019");
  expect(spec.mapKeyAttr).toBe("DW_STATE_CODE");
  expect(spec.regionKey).toBe("country");
  expect(spec.valueColumn).toBe("access");
  expect(spec.data).toBe(REGION_BRIEF.dataCsv);
  expect(spec.title).toBe("Electricity access is lowest across the Sahel");
  expect(spec.altInsight).toBe(
    "A world map shaded darkest across the Sahel band",
  );
  expect(spec.source).toEqual({
    name: "World Bank",
    url: "https://data.worldbank.org",
  });
  // The spine injects the canonical channel before dispatch — an assembler that also set
  // one would be a second writer for the same field.
  expect("channel" in spec).toBe(false);
});

test("carries the run's language onto the engine spec", () => {
  const r = assembleMapDw({ ...REGION_BRIEF, lang: "de" });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as { lang?: string }).lang).toBe("de");
});

test("omits lang entirely when the run has none — byte-identical to before", () => {
  const r = assembleMapDw(REGION_BRIEF);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect("lang" in (r.value as object)).toBe(false);
});

test("the unit is not doubled when the number format already renders a percent", () => {
  // The measured DW behaviour (map-spec.ts:235): DW APPENDS the unit without multiplying.
  // Emitting both a "%" unit and a "%" numberFormat token shipped a doubled "10% %" legend.
  const r = assembleMapDw({
    ...REGION_BRIEF,
    nativeType: "choropleth",
    angle: { ...REGION_BRIEF.angle, unit: "%" },
  });
  const spec = r.ok
    ? (r.value as { unit?: string; numberFormat?: string })
    : undefined;
  expect(spec?.unit).toBe("%");
  // Boolean(): with no numberFormat at all the raw expression is `undefined`, not `false` —
  // the doubling is what must be absent, whichever way the absence is spelled.
  expect(Boolean(spec?.unit === "%" && spec?.numberFormat?.includes("%"))).toBe(
    false,
  );
  expect(spec?.numberFormat).toBeUndefined();
});

test("no unit declared — the field is omitted rather than shipped empty", () => {
  const r = assembleMapDw({
    ...REGION_BRIEF,
    angle: {
      confirmedTakeaway: REGION_BRIEF.angle.confirmedTakeaway,
      altInsight: REGION_BRIEF.angle.altInsight,
    },
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect("unit" in (r.value as Record<string, unknown>)).toBe(false);
});

test("an unknown type is refused, and the refusal LISTS what map-dw can assemble", () => {
  const r = assembleMapDw({ ...REGION_BRIEF, nativeType: "treemap" });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("invalid-request");
  expect(r.message).toContain("treemap");
  expect(r.message).toContain("choropleth");
});

test("a symbol map is refused, pointing at map-native — map-dw can never draw one", () => {
  const r = assembleMapDw({ ...REGION_BRIEF, nativeType: "symbol" });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.code).toBe("invalid-request");
  expect(r.message).toContain("map-native");
});

test("no geography measured — the refusal names the geographies map-dw can place", () => {
  const r = assembleMapDw({ ...REGION_BRIEF, geo: undefined });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("world");
});

test("a geography with no honest Datawrapper basemap is refused, not guessed", () => {
  const r = assembleMapDw({
    ...REGION_BRIEF,
    geo: {
      ...REGION_BRIEF.geo!,
      geography: { ...REGION_BRIEF.geo!.geography, set: "mars" },
    },
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.message).toContain("mars");
  expect(r.message).toContain("world");
});

test("fewer than half the rows join — refused, and every orphan is named", () => {
  const r = assembleMapDw({
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
  const r = assembleMapDw({
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

test("the takeaway names one of several numeric columns — that one is mapped", () => {
  const r = assembleMapDw({
    ...REGION_BRIEF,
    dataCsv: "country,access,population\nCHE,100,8\nTCD,11,17",
    angle: {
      ...REGION_BRIEF.angle,
      confirmedTakeaway: "Electricity access is lowest across the Sahel",
    },
  });
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect((r.value as Record<string, unknown>).valueColumn).toBe("access");
});

// INVARIANT I1 — an assembler never throws. Garbage in, refusal out.
test("garbage data comes back as a refusal, never as a throw", () => {
  for (const dataCsv of ["", "   ", "country\n", "not a csv at all"]) {
    const r = assembleMapDw({ ...REGION_BRIEF, dataCsv });
    expect(r.ok).toBe(false);
  }
});
