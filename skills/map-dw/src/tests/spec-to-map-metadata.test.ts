import { describe, it, expect } from "bun:test";
import { specToMapMetadata } from "../spec-to-map-metadata";
import {
  DEFAULT_BLUE,
  OKABE_ITO,
  type LocatorMapSpec,
  type MapSpec,
  type SymbolMapSpec,
} from "../map-spec";

const base: MapSpec = {
  mapType: "choropleth",
  basemap: "world-2019",
  mapKeyAttr: "DW_STATE_CODE",
  regionKey: "code",
  valueColumn: "value",
  data: "code,value\nFRA,10\nSWE,70",
  title: "Sweden leads",
  altInsight: "Sweden highest, France lowest",
};

describe("specToMapMetadata", () => {
  it("emits the choropleth type and binds axes to the data columns", () => {
    const p = specToMapMetadata(base);
    expect(p.type).toBe("d3-maps-choropleth");
    expect(p.metadata.axes).toEqual({ keys: "code", values: "value" });
  });

  it("sets basemap and map-key-attr in visualize", () => {
    const p = specToMapMetadata(base);
    expect(p.metadata.visualize.basemap).toBe("world-2019");
    expect(p.metadata.visualize["map-key-attr"]).toBe("DW_STATE_CODE");
  });

  it("emits a colorscale WITHOUT the black-trap `stops` string", () => {
    const cs = specToMapMetadata(base).metadata.visualize.colorscale as Record<
      string,
      unknown
    >;
    expect(cs.colors).toBeDefined();
    expect(cs.mode).toBe("continuous");
    expect("stops" in cs).toBe(false); // the string `stops` forces black — must be absent
  });

  it("defaults to the light→blue colorScale when none is given", () => {
    const cs = specToMapMetadata(base).metadata.visualize.colorscale as {
      colors: unknown;
    };
    expect(cs.colors).toEqual(DEFAULT_BLUE);
  });

  it("uses a custom colorScale when provided", () => {
    const custom = [
      { color: "#fee5d9", position: 0 },
      { color: "#a50f15", position: 1 },
    ];
    const cs = specToMapMetadata({ ...base, colorScale: custom }).metadata
      .visualize.colorscale as { colors: unknown };
    expect(cs.colors).toEqual(custom);
  });

  it("carries altInsight as the aria-description (WCAG)", () => {
    const d = specToMapMetadata(base).metadata.describe as Record<
      string,
      unknown
    >;
    expect(d["aria-description"]).toBe("Sweden highest, France lowest");
  });

  it("defaults number-format to a plain numeral token when numberFormat is absent", () => {
    const d = specToMapMetadata(base).metadata.describe as Record<
      string,
      unknown
    >;
    expect(d["number-format"]).toBe("0,0.[00]");
  });

  it("passes a valid percent token through unchanged, so the legend renders %", () => {
    const d = specToMapMetadata({ ...base, numberFormat: "0%" }).metadata
      .describe as Record<string, unknown>;
    expect(d["number-format"]).toBe("0%");
  });

  // The regression this guards: a printf/Python-style token (what the ② suggester layer
  // sometimes emits, per dw-chart/chart-spec.ts's normalizeNumberFormat) is silently
  // unrecognised by Datawrapper's numeral.js parser and the legend falls back to bare
  // numbers ("15…70" instead of "15%…70%") — indistinguishable from the field having been
  // dropped. Normalising here (same fix dw-chart already applies for value labels/axes)
  // closes that gap for the map legend too.
  it('normalises a printf-style percent mistake (".0f%") to a valid Datawrapper token', () => {
    const d = specToMapMetadata({ ...base, numberFormat: ".0f%" }).metadata
      .describe as Record<string, unknown>;
    expect(d["number-format"]).toBe("0%");
  });

  it("throws on an un-mappable numberFormat rather than silently dropping it", () => {
    expect(() => specToMapMetadata({ ...base, numberFormat: "%s" })).toThrow(
      /invalid numberFormat/,
    );
  });

  it("#1b — emits the declared unit as describe.number-append (legend + %REGION_VALUE% tooltip)", () => {
    // With a plain numberFormat + unit:"%", a percentage-point value 9.8 renders "9.8%"
    // WITHOUT the 100× a "%" token would risk — the append is a literal suffix.
    const d = specToMapMetadata({ ...base, unit: "%" }).metadata
      .describe as Record<string, unknown>;
    expect(d["number-append"]).toBe("%");
  });

  it("#1b — no unit ⇒ no number-append key (back-compat)", () => {
    const d = specToMapMetadata(base).metadata.describe as Record<
      string,
      unknown
    >;
    expect("number-append" in d).toBe(false);
  });

  // Legend number grouping (verified-bug fix). Datawrapper's continuous choropleth legend
  // formats its min/max endpoint labels with `visualize.legends.color.labelFormat`
  // (default "0.[00]" — NO thousands grouping → a French GDP map shipped bare "17600" /
  // "41500" while its subtitle correctly wrote "28 000 €"). Ground truth read from the
  // published d3-maps-choropleth renderer: the legend label formatter (`TL`) reads
  // `legends.color.labelFormat` and the value column's `data.column-format` prepend/append —
  // NOT describe.number-format. So the grouped token must be set on BOTH.
  it("groups the legend via visualize.legends.color.labelFormat (default is un-grouped)", () => {
    const v = specToMapMetadata(base).metadata.visualize as Record<
      string,
      unknown
    >;
    const legends = v.legends as { color?: { labelFormat?: string } };
    expect(legends?.color?.labelFormat).toBe("0,0.[00]"); // "0,0" = thousands grouping
    expect(legends.color!.labelFormat).toContain("0,0");
  });

  it("emits the value column format on data.column-format so the legend groups + carries the unit", () => {
    const p = specToMapMetadata({ ...base, unit: " €" });
    const cf = (p.metadata.data as Record<string, unknown>)?.[
      "column-format"
    ] as Record<string, Record<string, unknown>>;
    expect(cf.value).toBeDefined();
    expect(cf.value.type).toBe("number");
    expect(cf.value["number-format"]).toBe("0,0.[00]"); // grouped
    expect(cf.value["number-append"]).toBe(" €"); // unit on legend + %REGION_VALUE% tooltip
  });

  it("mirrors an explicit numberFormat into the legend + column format", () => {
    const p = specToMapMetadata({ ...base, numberFormat: "0,0" });
    const v = p.metadata.visualize as Record<string, unknown>;
    const legends = v.legends as { color: { labelFormat: string } };
    const cf = (p.metadata.data as Record<string, unknown>)[
      "column-format"
    ] as Record<string, Record<string, unknown>>;
    expect(legends.color.labelFormat).toBe("0,0");
    expect(cf.value["number-format"]).toBe("0,0");
  });

  it("sets the DW chart language (regional locale) from spec.lang, so fr groups with a space", () => {
    expect(specToMapMetadata({ ...base, lang: "fr" }).language).toBe("fr-FR");
    expect(specToMapMetadata({ ...base, lang: "fr-CH" }).language).toBe(
      "fr-CH",
    );
    // Absent lang ⇒ no language (DW default en-US) — not sent by produce.
    expect(specToMapMetadata(base).language).toBeUndefined();
  });

  // SOURCE-LABEL i18n (verified-bug fix). A French map-dw choropleth shipped an English
  // "Source:" footer caption on an otherwise French map. Root cause (verified live against
  // the real Datawrapper API, 3 independently created charts, 2 chart types): the chart
  // `language` field DOES localize DW's OTHER auto-captions on the exact same chart
  // ("Created with Datawrapper" → "Créé avec Datawrapper"; the byline caption "Chart:" →
  // "Graphique:") but does NOT localize the "Source:" caption specifically — a narrow,
  // Datawrapper-side translation-key gap with no documented metadata override (confirmed
  // against the full v3 OpenAPI chart schema: `language` is the only locale field). So a
  // non-English deliverable must build its OWN "Source : X" line (the same fr/de/it table
  // chart-native and map-native already use) and ship it via `annotate.notes` — the one DW
  // field that renders verbatim with no auto-caption — instead of `describe.source-name`,
  // whose un-relocalizable "Source:" prefix would otherwise still show in English.
  it("routes the source through annotate.notes with a localized prefix when lang is non-English", () => {
    const p = specToMapMetadata({
      ...base,
      lang: "fr",
      source: { name: "Insee", url: "https://insee.fr" },
    });
    const d = p.metadata.describe as Record<string, unknown>;
    // The native caption can't be relocalized — suppress it so "Source:" never ships in
    // English on a French map (else the footer would show BOTH captions).
    expect(d["source-name"]).toBe("");
    expect(d["source-url"]).toBe("");
    const a = p.metadata.annotate as Record<string, unknown>;
    expect(a.notes).toBe("Source : Insee"); // narrow space before the colon (French typography)
  });

  it("keeps the native source-name/source-url (with its working hyperlink) for English/absent lang", () => {
    const p = specToMapMetadata({
      ...base,
      source: { name: "Insee", url: "https://insee.fr" },
    });
    const d = p.metadata.describe as Record<string, unknown>;
    // English is DW's own default — its native "Source:" caption already reads correctly,
    // so keep the native field (preserves the clickable hyperlink in the interactive embed).
    expect(d["source-name"]).toBe("Insee");
    expect(d["source-url"]).toBe("https://insee.fr");
    const a = p.metadata.annotate as Record<string, unknown>;
    expect(a.notes).toBe("");
  });

  it("localizes the source prefix for German and Italian too (Quelle: / Fonte:)", () => {
    const de = specToMapMetadata({
      ...base,
      lang: "de",
      source: { name: "Destatis" },
    }).metadata.annotate as Record<string, unknown>;
    expect(de.notes).toBe("Quelle: Destatis");

    const it_ = specToMapMetadata({
      ...base,
      lang: "it",
      source: { name: "Istat" },
    }).metadata.annotate as Record<string, unknown>;
    expect(it_.notes).toBe("Fonte: Istat");
  });

  it("no source ⇒ empty notes, regardless of lang", () => {
    const a = specToMapMetadata({ ...base, lang: "fr" }).metadata
      .annotate as Record<string, unknown>;
    expect(a.notes).toBe("");
  });
});

const symbol: SymbolMapSpec = {
  mapType: "symbol",
  basemap: "france-metropolitan-departments",
  latColumn: "lat",
  lonColumn: "lon",
  sizeColumn: "population",
  data: "city,lat,lon,population\nParis,48.85,2.35,2100\nLyon,45.76,4.83,520",
  title: "Population concentrates in Paris",
  altInsight: "Paris dwarfs Lyon",
};

describe("specToMapMetadata — symbol", () => {
  it("emits the symbol type and binds value→SIZE via axes.area, value→COLOUR via axes.values", () => {
    const p = specToMapMetadata(symbol);
    expect(p.type).toBe("d3-maps-symbols");
    // The load-bearing fix: SIZE is axes.area, not axes.keys/values.
    expect(p.metadata.axes).toEqual({
      lat: "lat",
      lon: "lon",
      area: "population",
      values: "population",
    });
  });

  it("uses an explicit colorColumn for COLOUR when given", () => {
    const p = specToMapMetadata({ ...symbol, colorColumn: "lat" });
    expect((p.metadata.axes as Record<string, unknown>).values).toBe("lat");
    expect((p.metadata.axes as Record<string, unknown>).area).toBe(
      "population",
    );
  });

  it("sets the basemap as a backdrop and map-type-set (no map-key-attr join)", () => {
    const v = specToMapMetadata(symbol).metadata.visualize;
    expect(v.basemap).toBe("france-metropolitan-departments");
    expect(v["map-type-set"]).toBe(true);
    expect("map-key-attr" in v).toBe(false);
  });

  it("emits a colorscale WITHOUT the black-trap `stops` string", () => {
    const cs = specToMapMetadata(symbol).metadata.visualize
      .colorscale as Record<string, unknown>;
    expect(cs.colors).toEqual(DEFAULT_BLUE);
    expect("stops" in cs).toBe(false);
  });

  it("enables a hover tooltip templated on the SIZE and label columns (mustache {{ col }})", () => {
    const t = specToMapMetadata(symbol).metadata.visualize.tooltip as Record<
      string,
      unknown
    >;
    expect(t).toBeDefined();
    expect(t.enabled).toBe(true);
    // title = the place label column (lat is not it; default labelColumn falls back to lat? no —
    // the symbol case has no label column, so title templates the SIZE column by default).
    expect(typeof t.title).toBe("string");
    expect(typeof t.body).toBe("string");
    // the SIZE value is referenced via DW's tooltip FORMAT() expression (grouped, see below),
    // and its column is declared in `fields`.
    expect(t.body as string).toContain("FORMAT(population");
    expect(t.fields).toEqual({ population: "population" });
  });

  it("templates the tooltip title on an explicit labelColumn when given", () => {
    const t = specToMapMetadata({ ...symbol, labelColumn: "city" }).metadata
      .visualize.tooltip as Record<string, unknown>;
    // a non-numeric label column stays a RAW mustache token (no FORMAT — it is not a number)
    expect(t.title).toBe("{{ city }}");
    expect(t.body).toBe('{{ FORMAT(population, "0,0.[00]") }}');
    expect(t.fields).toEqual({ city: "city", population: "population" });
  });

  // BUG #5 (verified live): the symbol tooltip showed a BARE "2100" — DW substitutes a raw
  // `{{ column }}` mustache token VERBATIM (no thousands grouping). The grouped value must be
  // produced by DW's tooltip FORMAT() expression (value first, numeral token second); the chart
  // `language` then localizes the group separator (fr → "2 100"). Verified against the published
  // renderer + Datawrapper Academy "How to customize tooltips".
  it("#5 — groups the SIZE value in the tooltip body via FORMAT() (default grouped token)", () => {
    const t = specToMapMetadata(symbol).metadata.visualize.tooltip as Record<
      string,
      unknown
    >;
    // "0,0" = thousands grouping, ".[00]" = up to two optional decimals — the same grouped
    // default the choropleth legend uses. Renders 2100 → "2 100" (fr) / "2,100" (en).
    expect(t.body).toBe('{{ FORMAT(population, "0,0.[00]") }}');
  });

  it("#5 — the numeric fallback title (no labelColumn) is grouped too", () => {
    // With no labelColumn, the title falls back to the SIZE column — a number, so it must be
    // grouped exactly like the body (else the tooltip title reads a bare "2100").
    const t = specToMapMetadata(symbol).metadata.visualize.tooltip as Record<
      string,
      unknown
    >;
    expect(t.title).toBe('{{ FORMAT(population, "0,0.[00]") }}');
  });

  it("#5 — mirrors an explicit numberFormat into the tooltip FORMAT() token", () => {
    const t = specToMapMetadata({ ...symbol, numberFormat: "0,0" }).metadata
      .visualize.tooltip as Record<string, unknown>;
    expect(t.body).toBe('{{ FORMAT(population, "0,0") }}');
  });

  // BUG #5 (legend): the symbol map's visible COLOR-gradient legend endpoints rendered with
  // DW's default un-grouped format ("4000000"). The choropleth fix set `legends.color.labelFormat`
  // — RENDER-VERIFIED it groups the symbol color legend too ("4000000" → "4 000 000").
  it("#5 — groups the color-gradient legend via visualize.legends.color.labelFormat", () => {
    const v = specToMapMetadata(symbol).metadata.visualize as Record<
      string,
      unknown
    >;
    const legends = v.legends as { color?: { labelFormat?: string } };
    expect(legends?.color?.labelFormat).toBe("0,0.[00]");
    expect(legends.color!.labelFormat).toContain("0,0");
  });

  it("#5 — mirrors an explicit numberFormat into the legend labelFormat", () => {
    const v = specToMapMetadata({ ...symbol, numberFormat: "0,0" }).metadata
      .visualize as Record<string, unknown>;
    const legends = v.legends as { color: { labelFormat: string } };
    expect(legends.color.labelFormat).toBe("0,0");
  });

  it("#1b — bakes the declared unit into the tooltip body after the grouped value", () => {
    // The confirmed bug: the symbol tooltip showed a bare "85" with no "M". `number-append`
    // only touches auto-formatted numbers, and the tooltip body is a mustache token, so the
    // unit must live in the template — appended AFTER the grouped FORMAT() value.
    const t = specToMapMetadata({ ...symbol, unit: "M" }).metadata.visualize
      .tooltip as Record<string, unknown>;
    expect(t.body).toBe('{{ FORMAT(population, "0,0.[00]") }}M');
  });

  it("#1b — also emits the unit as describe.number-append (for the size legend)", () => {
    const d = specToMapMetadata({ ...symbol, unit: "M" }).metadata
      .describe as Record<string, unknown>;
    expect(d["number-append"]).toBe("M");
  });

  it("#1b — no unit ⇒ no number-append key and no unit suffix on the tooltip body (back-compat)", () => {
    const p = specToMapMetadata(symbol);
    const d = p.metadata.describe as Record<string, unknown>;
    const t = p.metadata.visualize.tooltip as Record<string, unknown>;
    expect("number-append" in d).toBe(false);
    expect(t.body).toBe('{{ FORMAT(population, "0,0.[00]") }}');
  });

  // SOURCE-LABEL i18n — systemic check: symbol maps share describeBlock with choropleth,
  // so the fix must cover them too, even though validateMapSpec currently routes symbol
  // maps to map-native (this exercises specToMapMetadata directly, same as every other
  // test in this block).
  it("localizes the source for symbol maps too (systemic — shares describeBlock)", () => {
    const p = specToMapMetadata({
      ...symbol,
      lang: "fr",
      source: { name: "Insee" },
    });
    const d = p.metadata.describe as Record<string, unknown>;
    expect(d["source-name"]).toBe("");
    const a = p.metadata.annotate as Record<string, unknown>;
    expect(a.notes).toBe("Source : Insee");
  });
});

const locator: LocatorMapSpec = {
  mapType: "locator",
  title: "Three sites along the Arve valley",
  altInsight: "Annemasse, Geneva, Chamonix",
  markers: [
    { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
    { lng: 6.1432, lat: 46.2044, label: "Geneva", color: "#D55E00" },
  ],
};

describe("specToMapMetadata — locator", () => {
  it("emits the locator type and an empty axes (no data table)", () => {
    const p = specToMapMetadata(locator);
    expect(p.type).toBe("locator-map");
    expect(p.metadata.axes).toEqual({});
  });

  it("maps each marker to a point with [lng,lat] coordinates", () => {
    const markers = specToMapMetadata(locator).metadata.visualize
      .markers as Array<Record<string, unknown>>;
    expect(markers).toHaveLength(2);
    expect(markers[0].type).toBe("point");
    expect(markers[0].coordinates).toEqual([6.2347, 46.1939]);
    expect(markers[0].title).toBe("Annemasse");
  });

  it("cycles Okabe-Ito colours but honours a per-marker colour", () => {
    const markers = specToMapMetadata(locator).metadata.visualize
      .markers as Array<Record<string, unknown>>;
    expect(markers[0].markerColor).toBe(OKABE_ITO[0]);
    expect(markers[1].markerColor).toBe("#D55E00"); // explicit override
  });

  it("computes a center/zoom from the markers when no view is given (fit:true frames the whole world)", () => {
    const v = specToMapMetadata(locator).metadata.visualize.view as {
      center: [number, number];
      zoom: number;
      fit: boolean;
    };
    // center is the midpoint of the two markers' bounding box
    expect(v.center[0]).toBeCloseTo((6.2347 + 6.1432) / 2, 4);
    expect(v.center[1]).toBeCloseTo((46.1939 + 46.2044) / 2, 4);
    // a tight cluster zooms in, never the whole world
    expect(v.zoom).toBeGreaterThan(6);
    expect(v.fit).toBe(false);
  });

  it("uses an explicit center/zoom when a view is provided", () => {
    const v = specToMapMetadata({
      ...locator,
      view: { center: [6.4, 46.05], zoom: 8.5 },
    }).metadata.visualize.view as Record<string, unknown>;
    expect(v.center).toEqual([6.4, 46.05]);
    expect(v.zoom).toBe(8.5);
    expect(v.fit).toBe(false);
  });

  it("carries altInsight as the aria-description (WCAG)", () => {
    const d = specToMapMetadata(locator).metadata.describe as Record<
      string,
      unknown
    >;
    expect(d["aria-description"]).toBe("Annemasse, Geneva, Chamonix");
  });

  // SOURCE-LABEL i18n — systemic check: locator maps share describeBlock too.
  it("localizes the source for locator maps too (systemic — shares describeBlock)", () => {
    const p = specToMapMetadata({
      ...locator,
      lang: "fr",
      source: { name: "IGN" },
    });
    const d = p.metadata.describe as Record<string, unknown>;
    expect(d["source-name"]).toBe("");
    const a = p.metadata.annotate as Record<string, unknown>;
    expect(a.notes).toBe("Source : IGN");
  });

  it("enables the per-marker hover tooltip so the title shows on hover", () => {
    const markers = specToMapMetadata(locator).metadata.visualize
      .markers as Array<Record<string, unknown>>;
    for (const m of markers) {
      expect(m.tooltip).toEqual({ enabled: true });
    }
  });
});
