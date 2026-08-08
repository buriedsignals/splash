// THE MAP'S LEGEND AND POPUP FURNITURE, IN THE DELIVERABLE'S LANGUAGE.
//
// Measured on a built French page, 2026-08-08 (docs/splash/proofs/2026-08-08-map-closing-captions
// §4c, `web-after-hex-grid-fr.png`): every caption on the page was French — "l'hexagone le plus
// dense — 18 points", "18 points dans l'hexagone le plus dense, 62 hexagones au total" — and the
// legend above them read, in capitals:
//
//     POINTS PER HEXAGON
//
// That is `layout.aggregateLabel`, composed from English literals in `hex-grid-geo.ts`, a
// GEO/LAYOUT-layer string rather than a caption one — which is why the caption leaks closed this
// week never touched it. Its siblings, found by sweeping the same layer and the legend/popup
// builders that read from it, are covered here too: they are the same mechanism (an English word
// minted outside the locale table) on the same surface (furniture a reader sees).
//
// The rule: every generated word goes through `lib/core/story-copy`, and NEVER through a list
// held privately by a renderer. The drift guard at the bottom is what keeps the renderers from
// re-minting one.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { storyCopy } from "../../../lib/core/story-copy";
import { computeHexGrid } from "../src/hex-grid-geo";
import { computeCartogram } from "../src/cartogram-geo";

const LANGS = ["en", "fr", "de", "it"] as const;
const src = (rel: string) =>
  readFileSync(join(import.meta.dir, "..", "..", rel), "utf8");

// ---------------------------------------------------------------------------
// The rows themselves — one per leaked literal, four languages each.
// ---------------------------------------------------------------------------
describe("story-copy: the legend/popup furniture rows", () => {
  it("names a hex grid's aggregate, with the grid's own bin noun", () => {
    expect(storyCopy("en").binAggregate("count", "hex")).toBe(
      "points per hexagon",
    );
    expect(storyCopy("en").binAggregate("count", "square")).toBe(
      "points per cell",
    );
    expect(storyCopy("fr").binAggregate("count", "hex")).toBe(
      "points par hexagone",
    );
    expect(storyCopy("de").binAggregate("count", "square")).toBe(
      "Punkte pro Zelle",
    );
    expect(storyCopy("it").binAggregate("count", "hex")).toBe(
      "punti per esagono",
    );
    expect(storyCopy("fr").binAggregate("sum", "hex")).toBe(
      "somme des valeurs",
    );
    expect(storyCopy("de").binAggregate("mean", "hex")).toBe("Mittelwert");
  });

  it("states a hovered bin's aggregate value in the reader's own words", () => {
    expect(storyCopy("en").aggregateValue("sum", "42")).toBe("sum 42");
    expect(storyCopy("fr").aggregateValue("sum", "42")).toBe("somme 42");
    expect(storyCopy("fr").aggregateValue("mean", "12,5")).toBe("moyenne 12,5");
    expect(storyCopy("de").aggregateValue("mean", "12,5")).toBe(
      "Mittelwert 12,5",
    );
    expect(storyCopy("it").aggregateValue("sum", "42")).toBe("somma 42");
  });

  it("states what one dot is worth in the dot-density legend", () => {
    expect(storyCopy("en").dotLegend("100k")).toBe("1 dot = 100k");
    expect(storyCopy("fr").dotLegend("100k")).toBe("1 point = 100k");
    expect(storyCopy("de").dotLegend("100k")).toBe("1 Punkt = 100k");
    expect(storyCopy("it").dotLegend("100k")).toBe("1 punto = 100k");
  });

  it("names the unnamed: a cartogram with no valueLabel of its own", () => {
    expect(storyCopy("en").valueLabelFallback).toBe("value");
    expect(storyCopy("fr").valueLabelFallback).toBe("valeur");
    expect(storyCopy("de").valueLabelFallback).toBe("Wert");
    expect(storyCopy("it").valueLabelFallback).toBe("valore");
  });

  it("explains a grid cartogram's equal-size cells", () => {
    expect(storyCopy("en").gridCartogramNote).toBe(
      "each cell = one region, equal size; colour = value",
    );
    expect(storyCopy("fr").gridCartogramNote).toContain("chaque case");
    expect(storyCopy("de").gridCartogramNote).toContain("Zelle");
    expect(storyCopy("it").gridCartogramNote).toContain("cella");
  });

  it("titles the route map's legend", () => {
    expect(storyCopy("en").territoriesLabel).toBe("Territories");
    expect(storyCopy("fr").territoriesLabel).toBe("Territoires");
    expect(storyCopy("de").territoriesLabel).toBe("Gebiete");
    expect(storyCopy("it").territoriesLabel).toBe("Territori");
  });

  it("leaves no row identical across languages — a table with an English hole is the defect", () => {
    for (const row of [
      "valueLabelFallback",
      "gridCartogramNote",
      "territoriesLabel",
    ] as const) {
      const values = LANGS.map((l) => storyCopy(l)[row]);
      expect(new Set(values).size).toBe(LANGS.length);
    }
  });
});

// ---------------------------------------------------------------------------
// The geo layer: the two labels a LAYOUT carries, now derived from the config's lang.
// ---------------------------------------------------------------------------
const gridPoints = [
  { lon: 2.1, lat: 45.1 },
  { lon: 2.2, lat: 45.15 },
  { lon: 2.9, lat: 45.6 },
];

describe("computeHexGrid: aggregateLabel is the deliverable's language", () => {
  it("was English on a French page — the measured leak", () => {
    const fr = computeHexGrid({
      points: gridPoints,
      binShape: "hex",
      aggregate: "count",
      lang: "fr",
    });
    expect(fr.aggregateLabel).toBe("points par hexagone");
    expect(fr.aggregateLabel).not.toContain("per");
  });

  it("keeps the English wording byte-identical when no language is declared", () => {
    const en = computeHexGrid({
      points: gridPoints,
      binShape: "hex",
      aggregate: "count",
    });
    expect(en.aggregateLabel).toBe("points per hexagon");
    expect(
      computeHexGrid({ points: gridPoints, aggregate: "sum" }).aggregateLabel,
    ).toBe("sum of values");
    expect(
      computeHexGrid({ points: gridPoints, aggregate: "mean" }).aggregateLabel,
    ).toBe("mean value");
  });

  it("carries a square grid's own bin noun through the locale row", () => {
    expect(
      computeHexGrid({
        points: gridPoints,
        binShape: "square",
        aggregate: "count",
        lang: "de",
      }).aggregateLabel,
    ).toBe("Punkte pro Zelle");
  });
});

describe("computeCartogram: the valueLabel fallback is not an English word", () => {
  const values = [
    { id: "FRA", value: 12 },
    { id: "DEU", value: 8 },
  ];
  const world: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: values.map((v, i) => ({
      type: "Feature" as const,
      properties: { iso_a3: v.id, name: v.id },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [i, 45],
            [i + 1, 45],
            [i + 1, 46],
            [i, 46],
            [i, 45],
          ],
        ],
      },
    })),
  };

  it("falls back to the reader's word for 'value', not to the English one", () => {
    const fr = computeCartogram(
      { values, variant: "grid", lang: "fr" },
      world,
      "iso_a3",
    );
    expect(fr.valueLabel).toBe("valeur");
  });

  it("keeps the journalist's own label untouched — it is data, never furniture", () => {
    const fr = computeCartogram(
      { values, variant: "grid", valueLabel: "part renouvelable", lang: "fr" },
      world,
      "iso_a3",
    );
    expect(fr.valueLabel).toBe("part renouvelable");
  });

  it("is byte-identical in English", () => {
    expect(
      computeCartogram({ values, variant: "grid" }, world, "iso_a3").valueLabel,
    ).toBe("value");
  });
});

// ---------------------------------------------------------------------------
// THE DRIFT GUARD. Every leak above was a literal a renderer minted for itself. The rows
// exist now; this is what stops the next one being written by hand — it reads the renderer
// sources and refuses the exact spellings that shipped.
// ---------------------------------------------------------------------------
describe("no renderer mints its own English furniture", () => {
  const RENDERERS = [
    "map-native/src/HexGridMap.tsx",
    "map-native/src/CartogramMap.tsx",
    "map-native/src/DotDensityMap.tsx",
    "map-native/src/RouteMap.tsx",
    "map-native/src/components/HexGridStory.tsx",
    "map-native/src/components/HexGridReveal.tsx",
    "map-native/src/components/HexGridScrolly.tsx",
    "map-native/src/components/CartogramStory.tsx",
    "map-native/src/components/CartogramReveal.tsx",
    "map-native/src/components/CartogramScrolly.tsx",
    "map-native/src/components/DotDensityStory.tsx",
    "map-native/src/components/DotDensityReveal.tsx",
    "map-native/src/components/DotDensityScrolly.tsx",
    "scrolly/src/ScrollyHexMap.tsx",
    "scrolly/src/ScrollyCartogramMap.tsx",
    "scrolly/src/ScrollyDotDensityMap.tsx",
  ];
  // Each entry is a spelling that WAS in one of these files and shipped onto a French page.
  const BANNED = [
    "1 dot =",
    "points per hexagon",
    "points per cell",
    "each cell = one region",
    ">Territories<",
  ];

  // The graphic's ACCESSIBLE NAME is furniture too — never in the page's visible text (verified
  // on the built French page: `document.body.innerText` contains none of it), but it is the
  // first thing a screen reader announces. It shipped as `Map: <French title>` and
  // `Interactive map: <French title>`, and the reset control as "Reset map view".
  const ARIA_CARRIERS = [
    "map-native/src/HexGridMap.tsx",
    "map-native/src/CartogramMap.tsx",
    "map-native/src/ChoroplethMap.tsx",
    "map-native/src/DotDensityMap.tsx",
    "map-native/src/RouteMap.tsx",
    "map-native/src/SymbolMap.tsx",
    "map-native/src/LocatorMap.tsx",
    "map-native/src/controls.ts",
    "scrolly/src/ScrollyHexMap.tsx",
    "scrolly/src/ScrollySymbolMap.tsx",
    "scrolly/src/ScrollyLocatorMap.tsx",
    "scrolly/src/ScrollyMap.tsx",
    "scrolly/src/ScrollyDotDensityMap.tsx",
    "scrolly/src/ScrollyCartogramMap.tsx",
  ];

  // Comments are stripped first: a header that explains "the legend reads '1 dot = N'" is
  // documentation of the shape, not a string that ships. What must not survive is the literal
  // in CODE.
  const stripComments = (text: string) =>
    text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

  it("carries none of the literals that leaked", () => {
    const offenders: string[] = [];
    for (const rel of RENDERERS) {
      const code = stripComments(src(rel));
      for (const literal of BANNED)
        if (code.includes(literal)) offenders.push(`${rel}: ${literal}`);
    }
    expect(offenders).toEqual([]);
  });

  it("names the graphic, and its reset control, from the locale table", () => {
    const offenders: string[] = [];
    for (const rel of ARIA_CARRIERS) {
      const code = stripComments(src(rel));
      if (/`(Interactive m|M)ap: \$\{/.test(code))
        offenders.push(`${rel}: hand-built aria name`);
      if (code.includes('"Reset map view"'))
        offenders.push(`${rel}: hand-built control name`);
    }
    expect(offenders).toEqual([]);
  });

  // ── THE ONE ENGLISH STRING LEFT ON A FRENCH PAGE, AND WHY IT IS NOT OURS ────────────────
  // Measured on the built French hex-grid page after this fix, by reading every [aria-label]
  // in the DOM:
  //     "Carte interactive : Where road-traffic incidents cluster across Britain"   ← ours
  //     "Map"                                                                       ← maplibre
  //     "MapTiler logo"                                                             ← maplibre
  //     "Toggle attribution"                                                        ← maplibre
  // The last three are maplibre-gl's own control chrome, set from ITS defaultLocale table:
  // `maplibre-gl-dev.js` writes them as `this._getUIString("Map.Title")`,
  // `LogoControl.Title` and `Popup.Close`/`AttributionControl.*`. They are not literals in
  // this repo — there is nothing here to route through story-copy — and reaching them means
  // handing the vendor a `locale` option at map construction, i.e. translating a third-party
  // widget's vocabulary rather than our own. Different owner, different mechanism, so it is
  // recorded here rather than closed here. This test keeps the claim honest: if one of those
  // spellings ever appears in OUR sources, it stops being the vendor's problem.
  it("does not itself mint maplibre's control chrome (measured: it is the vendor's)", () => {
    const offenders: string[] = [];
    for (const rel of [...RENDERERS, ...ARIA_CARRIERS]) {
      const code = stripComments(src(rel));
      for (const literal of ['"MapTiler logo"', '"Toggle attribution"'])
        if (code.includes(literal)) offenders.push(`${rel}: ${literal}`);
    }
    expect(offenders).toEqual([]);
  });

  it("localizes the hex tooltip's own words, numbers and nouns alike", () => {
    const text = src("map-native/src/HexGridMap.tsx");
    // The numbers here always went through formatLocaleNumber; the words beside them did not.
    const found = [
      /\}\s*points<\/strong>/.test(text) ? "bare 'points' noun" : null,
      text.includes('aggregate === "mean" ? "mean" : "sum"')
        ? "inline mean/sum label"
        : null,
    ].filter(Boolean);
    expect(found).toEqual([]);
  });
});
