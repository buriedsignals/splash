import { describe, it, expect } from "bun:test";
import { validateMapSpec } from "../map-spec";

// 24 countries on the 212-region world basemap: representative NATIONAL-coverage data —
// wide enough (24 ≥ SPARSE_MAX_ROWS, 24/212 ≈ 11% ≥ SPARSE_REGION_FRACTION) that the
// sparse-basemap-subset guardrail stays silent, so the zero-warning assertions below keep
// testing exactly the field each one targets. (The old 3-row fixture was itself the sparse
// anti-pattern: 3 filled countries lost on a world map.)
const valid = {
  mapType: "choropleth",
  basemap: "world-2019",
  mapKeyAttr: "DW_STATE_CODE",
  regionKey: "code",
  valueColumn: "value",
  data:
    "code,value\nFRA,10\nDEU,40\nSWE,70\nESP,42\nITA,36\nPOL,16\nNOR,68\nFIN,54\nDNK,61\nNLD,33\n" +
    "BEL,28\nAUT,58\nCHE,55\nPRT,47\nGRC,35\nIRL,39\nCZE,22\nHUN,19\nROU,31\nBGR,24\nHRV,44\n" +
    "SVK,26\nSVN,41\nEST,38",
  title: "Sweden leads renewable adoption in western Europe",
  altInsight: "Sweden has the highest value (70); France the lowest (10)",
};

describe("validateMapSpec — choropleth", () => {
  it("passes a complete choropleth spec", () => {
    const r = validateMapSpec(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  it("rejects an unknown mapType", () => {
    const r = validateMapSpec({ ...valid, mapType: "heatmap" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/choropleth.*symbol.*locator/);
  });

  it("requires basemap, mapKeyAttr, title, altInsight", () => {
    for (const f of ["basemap", "mapKeyAttr", "title", "altInsight"]) {
      const r = validateMapSpec({ ...valid, [f]: "" });
      expect(r.ok).toBe(false);
    }
  });

  it("fails when regionKey is not a column of the data (key-bound)", () => {
    const r = validateMapSpec({ ...valid, regionKey: "iso" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/regionKey/);
  });

  it("fails when valueColumn is not a column of the data (key-bound)", () => {
    const r = validateMapSpec({ ...valid, valueColumn: "amount" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/valueColumn/);
  });

  it("fails on a malformed colour stop", () => {
    const r = validateMapSpec({
      ...valid,
      colorScale: [
        { color: "blue", position: 0 },
        { color: "#0072B2", position: 1 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/colorScale/i);
  });

  it("fails when colour stop positions are out of 0..1 or not ascending", () => {
    const desc = validateMapSpec({
      ...valid,
      colorScale: [
        { color: "#0072B2", position: 1 },
        { color: "#deebf7", position: 0 },
      ],
    });
    expect(desc.ok).toBe(false);
    const oob = validateMapSpec({
      ...valid,
      colorScale: [
        { color: "#deebf7", position: 0 },
        { color: "#0072B2", position: 2 },
      ],
    });
    expect(oob.ok).toBe(false);
  });

  it("accepts a valid two-stop blue colorScale", () => {
    const r = validateMapSpec({
      ...valid,
      colorScale: [
        { color: "#deebf7", position: 0 },
        { color: "#0072B2", position: 1 },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("warns when the title looks like a bare label, not an insight", () => {
    const r = validateMapSpec({ ...valid, title: "value" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).toMatch(/label/);
  });

  it("accepts a valid numeral numberFormat with no warning", () => {
    const r = validateMapSpec({ ...valid, numberFormat: "0%" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  // Mirrors dw-chart's chart-spec.ts guard: a printf/Python leftover token is silently
  // unrecognised by Datawrapper and the legend falls back to bare numbers — warn so the
  // caller (the ② suggester layer) knows its token was auto-corrected.
  it("warns when numberFormat is a printf-style token that gets auto-corrected", () => {
    const r = validateMapSpec({ ...valid, numberFormat: ".0f%" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).toMatch(/numberFormat/);
  });

  it("fails on an un-mappable numberFormat", () => {
    const r = validateMapSpec({ ...valid, numberFormat: "%s" });
    expect(r.ok).toBe(false);
  });

  it("#1c — warns when a '%' numberFormat is applied to 0–1 fractional value data", () => {
    const r = validateMapSpec({
      ...valid,
      data: "code,value\nFRA,0.10\nDEU,0.40\nSWE,0.70",
      numberFormat: "0%",
    });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) => /appends "%" WITHOUT multiplying/.test(w)),
      ).toBe(true);
  });

  it("#1c — does NOT warn when the '%' value data is already percentage points", () => {
    const r = validateMapSpec({ ...valid, numberFormat: "0%" }); // values 10/40/70
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) => /appends "%" WITHOUT multiplying/.test(w)),
      ).toBe(false);
  });

  it("#1b — accepts a unit suffix on a choropleth (no error, no warning)", () => {
    const r = validateMapSpec({ ...valid, unit: "%" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  // JOIN-KEY MISMATCH (the silent grey-map bug). `mapKeyAttr:"ISO_A3"` on `world-2019` — whose
  // real alpha-3 key is `DW_STATE_CODE` — silently fails the join and ships a fully grey,
  // dataless map. A KNOWN basemap must reject a key that is not one of its declared join keys.
  it("rejects a mapKeyAttr that is not a join key of the (known) basemap", () => {
    const r = validateMapSpec({ ...valid, mapKeyAttr: "ISO_A3" }); // world-2019
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/not a join key/);
  });

  it("names the valid join keys when it rejects a wrong mapKeyAttr", () => {
    const r = validateMapSpec({ ...valid, mapKeyAttr: "ISO_A3" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/DW_STATE_CODE/);
  });

  it("still accepts every declared join key of the basemap", () => {
    for (const key of ["DW_STATE_CODE", "DW_NAME", "ISO_2"]) {
      const r = validateMapSpec({ ...valid, mapKeyAttr: key });
      expect(r.ok).toBe(true);
    }
  });

  it("skips the join-key check for a basemap absent from the registry (produce guard covers it)", () => {
    // An unknown basemap has no recorded keys — validation cannot know them, so it must NOT
    // reject a plausible key here; the produce-time dataless-join guard is the net instead.
    const r = validateMapSpec({
      ...valid,
      basemap: "narnia-2030",
      mapKeyAttr: "WHATEVER",
    });
    expect(r.ok).toBe(true);
  });
});

// SPARSE BASEMAP SUBSET (routing guardrail — QA case: 7 Veneto provinces mapped on the
// FULL-Italy provinces basemap rendered an illegible micro-cluster in the country's
// north-east corner, the rest of Italy grey). The signal is data-region-count vs the
// basemap's recorded region count (basemap-keys.ts BASEMAP_REGION_COUNTS). A WARNING, not
// an error: a sparse choropleth is sometimes intended (verified legit: 8 cantons on the
// 26-canton swiss basemap, Wave 4 deficit-cantons case) — the threshold is tuned so the
// known-legit cases stay silent (see SPARSE_REGION_FRACTION rationale in map-spec.ts).
describe("validateMapSpec — sparse basemap subset (choropleth)", () => {
  // The 7 provinces of Veneto on the 127-province full-Italy basemap ≈ 5.5% coverage.
  const veneto = {
    mapType: "choropleth",
    basemap: "italy-provinces-2025",
    mapKeyAttr: "SIGLA",
    regionKey: "prov",
    valueColumn: "rate",
    data: "prov,rate\nVE,5.9\nPD,4.8\nVR,4.2\nVI,3.9\nTV,4.5\nRO,6.3\nBL,3.4",
    title: "Unemployment splits Veneto between Rovigo and Belluno",
    altInsight:
      "Unemployment ranges from 3.4% in Belluno to 6.3% in Rovigo across Veneto's provinces",
  };

  it("warns when the data covers a small fraction of the basemap's regions (Veneto on full Italy)", () => {
    const r = validateMapSpec(veneto);
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.warnings.join()).toMatch(/covers 7 of .*127|micro-cluster/);
  });

  it("stays a WARNING, never an error — a sparse choropleth can be intended", () => {
    const r = validateMapSpec(veneto);
    expect(r.ok).toBe(true);
  });

  it("advises a fitted basemap or the map-native escalation", () => {
    const r = validateMapSpec(veneto);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.join()).toMatch(/fitted|region-scoped/);
      expect(r.warnings.join()).toMatch(/map-native/);
    }
  });

  it("does NOT warn for the known-legit 8-cantons subset (8 of 26 is a real share of the basemap)", () => {
    const r = validateMapSpec({
      mapType: "choropleth",
      basemap: "switzerland-2026-cantons",
      mapKeyAttr: "Name",
      regionKey: "canton",
      valueColumn: "deficit",
      data: "canton,deficit\nZürich,-120\nBern,85\nVaud,42\nAargau,-15\nGenève,96\nLuzern,-8\nTicino,31\nFribourg,8",
      title: "Half these cantons run a deficit, led by Zürich",
      altInsight:
        "Zürich has the largest deficit (-120M); Genève the largest surplus (96M)",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  it("does NOT warn for national coverage (24 of 212 world countries)", () => {
    const r = validateMapSpec(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  it("does NOT warn for a big dataset even on a huge basemap (≥20 rows reads as deliberate coverage)", () => {
    // 21 counties of the 3291-county US basemap ≈ 0.6% — but 21 rows is a real dataset,
    // not a hand-picked micro-subset; the row cap (SPARSE_MAX_ROWS) keeps it silent.
    const rows = Array.from(
      { length: 21 },
      (_, i) => `010${String(i + 10).padStart(2, "0")},${50 + i}`,
    ).join("\n");
    const r = validateMapSpec({
      mapType: "choropleth",
      basemap: "us-counties-2023",
      mapKeyAttr: "GEOID",
      regionKey: "geoid",
      valueColumn: "pct",
      data: `geoid,pct\n${rows}`,
      title: "Broadband coverage varies widely across these counties",
      altInsight: "County broadband coverage ranges from 50% to 70%",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  it("skips the check for a basemap with no recorded region count (like the join-key check)", () => {
    const r = validateMapSpec({
      ...veneto,
      basemap: "narnia-2030",
      mapKeyAttr: "WHATEVER",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  it("counts UNIQUE regions (duplicate rows do not inflate coverage)", () => {
    // 7 unique provinces duplicated to 14 rows — still the same 5.5% coverage, still warns.
    const dup =
      veneto.data + "\nVE,5.9\nPD,4.8\nVR,4.2\nVI,3.9\nTV,4.5\nRO,6.3\nBL,3.4";
    const r = validateMapSpec({ ...veneto, data: dup });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).toMatch(/covers 7 of/);
  });
});

const validSymbol = {
  mapType: "symbol",
  basemap: "france-metropolitan-departments",
  latColumn: "lat",
  lonColumn: "lon",
  sizeColumn: "population",
  data: "city,lat,lon,population\nParis,48.85,2.35,2100\nLyon,45.76,4.83,520",
  title: "Population concentrates in Paris and Lyon",
  altInsight: "Paris (2.1M) dwarfs Lyon (0.52M) among these French cities",
};

describe("validateMapSpec — symbol", () => {
  // #2 — map-dw symbol maps are RETIRED as a claim-carrying producer. Datawrapper draws
  // proportional circles with values on HOVER only and offers no "label symbols by column"
  // option (verified against the Datawrapper Academy "Customizing your symbol map" docs), so
  // the owned static PNG — which every atelier channel requires as the claim-carrying
  // deliverable (the social static, or the article-web a11y static fallback) — ships mute,
  // unlabeled circles. A valid symbol spec is therefore REJECTED and routed to map-native,
  // whose proportional-symbol renderer directly labels the top-N circles by name + value.
  it("rejects a complete symbol spec and routes it to map-native", () => {
    const r = validateMapSpec(validSymbol);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/map-native/);
  });

  it("#2 — the route-to-map-native error fires on every symbol map (static circles are unlabeled)", () => {
    const r = validateMapSpec(validSymbol);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.some((e) => /HOVER only|hover only/.test(e))).toBe(true);
  });

  it("#2 — a choropleth is NOT rejected (it can label regions statically by column)", () => {
    const r = validateMapSpec(valid);
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.warnings.some((w) => /not directly labeled/.test(w))).toBe(
        false,
      );
  });

  it("requires lat/lon/size columns and they must be real data columns", () => {
    for (const f of ["latColumn", "lonColumn", "sizeColumn"]) {
      const missing = validateMapSpec({ ...validSymbol, [f]: "" });
      expect(missing.ok).toBe(false);
      const wrong = validateMapSpec({ ...validSymbol, [f]: "nope" });
      expect(wrong.ok).toBe(false);
      if (!wrong.ok) expect(wrong.errors.join()).toMatch(new RegExp(f));
    }
  });

  it("fails when an optional colorColumn is not a data column", () => {
    const r = validateMapSpec({ ...validSymbol, colorColumn: "ghost" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/colorColumn/);
  });

  it("requires basemap and altInsight", () => {
    for (const f of ["basemap", "altInsight"]) {
      const r = validateMapSpec({ ...validSymbol, [f]: "" });
      expect(r.ok).toBe(false);
    }
  });

  it("validates colorScale stops like choropleth", () => {
    const r = validateMapSpec({
      ...validSymbol,
      colorScale: [{ color: "notahex", position: 0 }],
    });
    expect(r.ok).toBe(false);
  });
});

const validLocator = {
  mapType: "locator",
  title: "Three sites along the Arve valley",
  altInsight: "Annemasse, Geneva and Chamonix marked along the Arve",
  markers: [
    { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
    { lng: 6.1432, lat: 46.2044, label: "Geneva" },
    { lng: 6.8694, lat: 45.9237, label: "Chamonix" },
  ],
};

describe("validateMapSpec — locator", () => {
  it("passes a complete locator spec", () => {
    const r = validateMapSpec(validLocator);
    expect(r.ok).toBe(true);
  });

  it("requires a non-empty markers array", () => {
    const empty = validateMapSpec({ ...validLocator, markers: [] });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors.join()).toMatch(/markers/);
    const missing = validateMapSpec({ ...validLocator, markers: undefined });
    expect(missing.ok).toBe(false);
  });

  it("fails on out-of-range coordinates", () => {
    const badLng = validateMapSpec({
      ...validLocator,
      markers: [{ lng: 999, lat: 46, label: "x" }],
    });
    expect(badLng.ok).toBe(false);
    if (!badLng.ok) expect(badLng.errors.join()).toMatch(/lng/);
    const badLat = validateMapSpec({
      ...validLocator,
      markers: [{ lng: 6, lat: 200, label: "x" }],
    });
    expect(badLat.ok).toBe(false);
    if (!badLat.ok) expect(badLat.errors.join()).toMatch(/lat/);
  });

  it("requires a label on every marker", () => {
    const r = validateMapSpec({
      ...validLocator,
      markers: [{ lng: 6, lat: 46, label: "" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/label/);
  });

  it("fails on a malformed marker colour", () => {
    const r = validateMapSpec({
      ...validLocator,
      markers: [{ lng: 6, lat: 46, label: "x", color: "red" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/color/);
  });

  it("requires title and altInsight", () => {
    for (const f of ["title", "altInsight"]) {
      const r = validateMapSpec({ ...validLocator, [f]: "" });
      expect(r.ok).toBe(false);
    }
  });

  it("warns to prefer map-native for a sub-national / regional extent", () => {
    // Lamerd ↔ Kuwait ≈ 5° span — map-dw renders inland Lamerd offshore here.
    const r = validateMapSpec({
      ...validLocator,
      markers: [
        { lng: 53.1804, lat: 27.3424, label: "Lamerd" },
        { lng: 47.9774, lat: 29.3759, label: "Kuwait" },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).toMatch(/prefer map-native/);
  });

  it("does NOT warn for a wide continental / global extent", () => {
    // European capitals span ~40° of longitude — map-dw's basemap is fine.
    const r = validateMapSpec({
      ...validLocator,
      markers: [
        { lng: -9.14, lat: 38.72, label: "Lisbon" },
        { lng: 30.52, lat: 50.45, label: "Kyiv" },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).not.toMatch(/prefer map-native/);
  });
});
