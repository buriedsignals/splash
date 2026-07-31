import { describe, it, expect } from "bun:test";
import {
  mapArcErrors,
  deriveMapStory,
  mapNarrativeFallbackWarning,
  type MapArcBeat,
} from "./map-story.ts";
import { deriveSymbolStory } from "./symbol-story.ts";
import { deriveLocatorStory } from "./locator-story.ts";
import { computeChoropleth, type ChoroplethData } from "./choropleth-geo.ts";
import type { SymbolPoint } from "./symbol-geo.ts";
import type { LocatorMarker } from "./locator-geo.ts";
import {
  validateChoroplethConfig,
  validateLocatorConfig,
} from "./validate-config.ts";

const validRegions = ["Geneva", "Vaud", "Zurich", "Bern"];

describe("mapArcErrors", () => {
  it("accepts a well-formed region-anchored arc (establish→build→turn→payoff)", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Geneva", role: "establish", text: "Geneva starts low." },
      { region: "Vaud", role: "build", text: "Vaud climbs." },
      { region: "Zurich", role: "turn", text: "Zurich is the peak." },
      { region: "Bern", role: "payoff", text: "Bern lands the argument." },
    ];
    expect(mapArcErrors(arcBeats, validRegions)).toEqual([]);
  });

  it("rejects an unknown region", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Atlantis", role: "establish", text: "sets" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /not found|region/i.test(e))).toBe(true);
  });

  it("rejects an arc with no establish", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Vaud", role: "build", text: "climbs" },
      { region: "Bern", role: "payoff", text: "lands" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /open.*establish/i.test(e))).toBe(true);
  });

  it("rejects an arc with no payoff", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Geneva", role: "establish", text: "sets" },
      { region: "Vaud", role: "build", text: "climbs" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /close.*payoff/i.test(e))).toBe(true);
  });

  it("rejects an arc with no build", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Geneva", role: "establish", text: "sets" },
      { region: "Bern", role: "payoff", text: "lands" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /build/i.test(e))).toBe(true);
  });

  it("rejects more than one turn", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Geneva", role: "establish", text: "sets" },
      { region: "Vaud", role: "turn", text: "peak 1" },
      { region: "Zurich", role: "turn", text: "peak 2" },
      { region: "Bern", role: "payoff", text: "lands" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /turn|peak/i.test(e))).toBe(true);
  });

  it("rejects a role beat with an empty claim (text)", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Geneva", role: "establish", text: "sets" },
      { region: "Vaud", role: "build", text: "   " },
      { region: "Bern", role: "payoff", text: "lands" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /claim|text/i.test(e))).toBe(true);
  });

  it("stays byte-identical for legacy region-only beats (no role) — arc validation skipped", () => {
    const arcBeats: MapArcBeat[] = [{ region: "Geneva" }, { region: "Bern" }];
    expect(mapArcErrors(arcBeats, validRegions)).toEqual([]);
  });

  it("returns [] for an empty/absent arcBeats list", () => {
    expect(mapArcErrors([], validRegions)).toEqual([]);
  });
});

describe("mapArcErrors wired into validateChoroplethConfig", () => {
  const baseSpec = {
    regionKey: "region",
    valueField: "value",
    basemap: "world",
    title: "A choropleth with a real insight",
    rows: [
      { region: "Geneva", value: 10 },
      { region: "Vaud", value: 20 },
      { region: "Zurich", value: 30 },
    ],
  };

  it("passes with a well-formed arcBeats override anchored on real regions", () => {
    const result = validateChoroplethConfig({
      ...baseSpec,
      arcBeats: [
        { region: "Geneva", role: "establish", text: "Geneva starts." },
        { region: "Vaud", role: "build", text: "Vaud climbs." },
        { region: "Zurich", role: "payoff", text: "Zurich lands it." },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("fails on an arcBeats override anchored on a non-existent region", () => {
    const result = validateChoroplethConfig({
      ...baseSpec,
      arcBeats: [{ region: "Nowhere", role: "establish", text: "sets" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /not found|region/i.test(e))).toBe(true);
    }
  });

  it("validates exactly as today when arcBeats is absent (behaviour-preserving)", () => {
    const result = validateChoroplethConfig(baseSpec);
    expect(result.ok).toBe(true);
  });
});

describe("mapArcErrors wired into validateLocatorConfig", () => {
  const baseLocatorSpec = {
    basemap: "world",
    title: "Three places along a route",
    markers: [
      { lon: 6.1, lat: 46.2, label: "Geneva" },
      { lon: 6.6, lat: 46.5, label: "Lausanne" },
      { lon: 8.5, lat: 47.4, label: "Zurich" },
    ],
  };

  it("passes with a well-formed arcBeats override anchored on real marker names", () => {
    const result = validateLocatorConfig({
      ...baseLocatorSpec,
      arcBeats: [
        { region: "Geneva", role: "establish", text: "Geneva starts." },
        { region: "Lausanne", role: "build", text: "Lausanne climbs." },
        { region: "Zurich", role: "payoff", text: "Zurich lands it." },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("fails on an arcBeats override anchored on a non-existent marker, listing the real names", () => {
    const result = validateLocatorConfig({
      ...baseLocatorSpec,
      arcBeats: [{ region: "Nowhere", role: "establish", text: "sets" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /not found|region/i.test(e))).toBe(true);
      expect(result.errors.some((e) => /Geneva/.test(e))).toBe(true);
    }
  });

  it("validates exactly as today when arcBeats is absent (behaviour-preserving)", () => {
    const result = validateLocatorConfig(baseLocatorSpec);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyMapArc wiring — deriveMapStory (choropleth) + deriveSymbolStory (symbol)
// honour a confirmed arcBeats claim-arc; the salience path (no arcBeats) stays
// byte-identical to today's output (captured on this fixture before wiring).
// ---------------------------------------------------------------------------

const choroplethFeatures: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { region: "Geneva", name: "Geneva" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [6, 46],
            [6.2, 46],
            [6.2, 46.2],
            [6, 46.2],
            [6, 46],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { region: "Vaud", name: "Vaud" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [6.5, 46.5],
            [6.7, 46.5],
            [6.7, 46.7],
            [6.5, 46.7],
            [6.5, 46.5],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { region: "Zurich", name: "Zurich" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [8.5, 47.3],
            [8.7, 47.3],
            [8.7, 47.5],
            [8.5, 47.5],
            [8.5, 47.3],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { region: "Bern", name: "Bern" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [7.4, 46.9],
            [7.6, 46.9],
            [7.6, 47.1],
            [7.4, 47.1],
            [7.4, 46.9],
          ],
        ],
      },
    },
  ],
};

const choroplethData: ChoroplethData = {
  regionKey: "region",
  valueField: "value",
  rows: [
    { region: "Geneva", value: 10 },
    { region: "Vaud", value: 20 },
    { region: "Zurich", value: 30 },
    { region: "Bern", value: 40 },
  ],
};

const choroplethLayout = computeChoropleth(
  choroplethData,
  choroplethFeatures,
  "region",
);

const choroplethArc: MapArcBeat[] = [
  { region: "Geneva", role: "establish", text: "Geneva starts low." },
  { region: "Vaud", role: "build", text: "Vaud climbs." },
  { region: "Zurich", role: "turn", text: "Zurich is the peak." },
  { region: "Bern", role: "payoff", text: "Bern lands the argument." },
];

describe("deriveMapStory — applyMapArc wiring", () => {
  it("with a confirmed arcBeats: reveals follow the ARC order, carry role, and copy is the claim text (not salience name — value)", () => {
    const beats = deriveMapStory(
      choroplethLayout,
      choroplethFeatures,
      "region",
      {
        title: "Swiss cantons",
        insight: "",
        unit: " pts",
        arcBeats: choroplethArc,
      },
    );
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.map((b) => b.highlight[0])).toEqual([
      "Geneva",
      "Vaud",
      "Zurich",
      "Bern",
    ]);
    expect(reveals.map((b) => b.role)).toEqual([
      "establish",
      "build",
      "turn",
      "payoff",
    ]);
    expect(reveals.map((b) => b.copy)).toEqual([
      "Geneva starts low.",
      "Vaud climbs.",
      "Zurich is the peak.",
      "Bern lands the argument.",
    ]);
    // The claim text, never the salience "name — value" caption.
    for (const b of reveals) {
      expect(b.copy).not.toMatch(/—/);
      expect(b.callout?.text).toBe(b.copy);
    }
  });

  it("without arcBeats: byte-identical to the captured salience baseline", () => {
    const beats = deriveMapStory(
      choroplethLayout,
      choroplethFeatures,
      "region",
      {
        title: "Swiss cantons",
        insight: "",
        unit: " pts",
      },
    );
    expect(beats).toEqual([
      {
        kind: "title",
        camera: [6, 46, 8.7, 47.5],
        highlight: [],
        dim: false,
        callout: null,
        copy: "Swiss cantons",
      },
      {
        kind: "establish",
        camera: [6, 46, 8.7, 47.5],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
      {
        kind: "reveal",
        camera: [7.4, 46.9, 7.6, 47.1],
        highlight: ["Bern"],
        dim: true,
        callout: {
          region: "Bern",
          name: "Bern",
          value: "40 pts",
          text: "Bern leads — 40 pts",
        },
        copy: "Bern leads — 40 pts",
        pattern: "magnitude",
        rank: 1,
        rankRole: "leader",
      },
      {
        kind: "reveal",
        camera: [8.5, 47.3, 8.7, 47.5],
        highlight: ["Zurich"],
        dim: true,
        callout: {
          region: "Zurich",
          name: "Zurich",
          value: "30 pts",
          text: "Zurich — 30 pts, 2nd",
        },
        copy: "Zurich — 30 pts, 2nd",
        pattern: "magnitude",
        rank: 2,
        rankRole: "leader",
      },
      {
        kind: "reveal",
        camera: [6.5, 46.5, 6.7, 46.7],
        highlight: ["Vaud"],
        dim: true,
        callout: {
          region: "Vaud",
          name: "Vaud",
          value: "20 pts",
          text: "Vaud — 20 pts, 3rd",
        },
        copy: "Vaud — 20 pts, 3rd",
        pattern: "magnitude",
        rank: 3,
        rankRole: "leader",
      },
      {
        kind: "reveal",
        camera: [6, 46, 6.2, 46.2],
        highlight: ["Geneva"],
        dim: true,
        callout: {
          region: "Geneva",
          name: "Geneva",
          value: "10 pts",
          text: "The long tail — Geneva, 10 pts",
        },
        copy: "The long tail — Geneva, 10 pts",
        pattern: "magnitude",
        rank: 4,
        rankRole: "tail",
      },
      {
        kind: "takeaway",
        camera: [6, 46, 8.7, 47.5],
        highlight: [],
        dim: false,
        callout: null,
        copy: "Bern: 40 pts, Geneva: 10 pts — a 4-fold gap",
      },
    ]);
  });
});

const symbolPoints: SymbolPoint[] = [
  { lon: 6.1, lat: 46.2, value: 40, label: "Geneva" },
  { lon: 6.6, lat: 46.5, value: 30, label: "Lausanne" },
  { lon: 8.5, lat: 47.4, value: 20, label: "Zurich" },
  { lon: 7.4, lat: 46.9, value: 10, label: "Bern" },
];

const symbolArc: MapArcBeat[] = [
  { region: "Geneva", role: "establish", text: "Geneva starts low." },
  { region: "Lausanne", role: "build", text: "Lausanne climbs." },
  { region: "Zurich", role: "turn", text: "Zurich is the peak." },
  { region: "Bern", role: "payoff", text: "Bern lands the argument." },
];

describe("deriveSymbolStory — applyMapArc wiring", () => {
  it("with a confirmed arcBeats: reveals follow the ARC order, carry role, and copy is the claim text (not salience name — value)", () => {
    const beats = deriveSymbolStory(symbolPoints, {
      title: "Swiss cities",
      unit: " pts",
      arcBeats: symbolArc,
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.map((b) => b.highlight[0])).toEqual([
      "Geneva",
      "Lausanne",
      "Zurich",
      "Bern",
    ]);
    expect(reveals.map((b) => b.role)).toEqual([
      "establish",
      "build",
      "turn",
      "payoff",
    ]);
    expect(reveals.map((b) => b.copy)).toEqual([
      "Geneva starts low.",
      "Lausanne climbs.",
      "Zurich is the peak.",
      "Bern lands the argument.",
    ]);
    for (const b of reveals) {
      expect(b.copy).not.toMatch(/—/);
      expect(b.callout?.text).toBe(b.copy);
    }
  });

  it("without arcBeats: byte-identical to the captured salience baseline", () => {
    const beats = deriveSymbolStory(symbolPoints, {
      title: "Swiss cities",
      unit: " pts",
    });
    expect(beats).toEqual([
      {
        kind: "title",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: [],
        dim: false,
        callout: null,
        copy: "Swiss cities",
      },
      {
        kind: "establish",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
      {
        kind: "reveal",
        camera: [4.6, 44.7, 7.6, 47.7],
        highlight: ["Geneva"],
        dim: true,
        callout: {
          region: "Geneva",
          name: "Geneva",
          value: "40 pts",
          text: "Geneva — 40 pts",
        },
        copy: "Geneva — 40 pts",
      },
      {
        kind: "reveal",
        camera: [5.1, 45, 8.1, 48],
        highlight: ["Lausanne"],
        dim: true,
        callout: {
          region: "Lausanne",
          name: "Lausanne",
          value: "30 pts",
          text: "Lausanne — 30 pts",
        },
        copy: "Lausanne — 30 pts",
      },
      {
        kind: "reveal",
        camera: [7, 45.9, 10, 48.9],
        highlight: ["Zurich"],
        dim: true,
        callout: {
          region: "Zurich",
          name: "Zurich",
          value: "20 pts",
          text: "Zurich — 20 pts",
        },
        copy: "Zurich — 20 pts",
      },
      {
        kind: "reveal",
        camera: [5.9, 45.4, 8.9, 48.4],
        highlight: ["Bern"],
        dim: true,
        callout: {
          region: "Bern",
          name: "Bern",
          value: "10 pts",
          text: "Bern — 10 pts",
        },
        copy: "Bern — 10 pts",
      },
      {
        kind: "takeaway",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
    ]);
  });
});

const locatorMarkers: LocatorMarker[] = [
  { lon: 6.1, lat: 46.2, label: "Geneva" },
  { lon: 6.6, lat: 46.5, label: "Lausanne" },
  { lon: 8.5, lat: 47.4, label: "Zurich" },
];

const locatorArc: MapArcBeat[] = [
  { region: "Zurich", role: "establish", text: "Zurich anchors the search." },
  { region: "Geneva", role: "build", text: "Geneva widens it." },
  { region: "Lausanne", role: "payoff", text: "Lausanne closes the loop." },
];

describe("deriveLocatorStory — applyMapArc wiring", () => {
  it("with a confirmed arcBeats: reveals follow the ARC order (not the marker array order), carry the claim text verbatim, and the camera anchors on the named marker's own coordinates — not the map's default framing", () => {
    const beats = deriveLocatorStory(locatorMarkers, {
      title: "Three Swiss places, in the order the story needs",
      arcBeats: locatorArc,
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    // ARC order (Zurich, Geneva, Lausanne) — NOT the markers' array order
    // (Geneva, Lausanne, Zurich), which is what the few-annotated salience walk would give.
    expect(reveals.map((b) => b.highlight[0])).toEqual([
      "Zurich",
      "Geneva",
      "Lausanne",
    ]);
    expect(reveals.map((b) => b.role)).toEqual([
      "establish",
      "build",
      "payoff",
    ]);
    expect(reveals.map((b) => b.copy)).toEqual([
      "Zurich anchors the search.",
      "Geneva widens it.",
      "Lausanne closes the loop.",
    ]);
    for (const b of reveals) {
      expect(b.callout?.text).toBe(b.copy);
    }
    // Camera is a tight box on the NAMED marker's own coordinates — never the map's
    // default framing (allBounds, [6.1, 46.2, 8.5, 47.4]), which the salience walk below
    // uses instead. Zurich sits at [8.5, 47.4]; ±1.5° (CITY_DELTA) around it.
    const allBounds = [6.1, 46.2, 8.5, 47.4];
    expect(reveals[0].camera).toEqual([7, 45.9, 10, 48.9]);
    expect(reveals[0].camera).not.toEqual(allBounds);
    expect(reveals[1].camera).toEqual([4.6, 44.7, 7.6, 47.7]); // Geneva ±1.5°
    expect(reveals[2].camera).toEqual([5.1, 45, 8.1, 48]); // Lausanne ±1.5°
  });

  it("an arcBeats naming a marker that does not exist is refused by name, listing the real marker names — not silently dropped", () => {
    const result = validateLocatorConfig({
      basemap: "world",
      title: "Three places along a route",
      markers: locatorMarkers,
      arcBeats: [
        { region: "Bern", role: "establish", text: "Bern is not on this map." },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /"Bern" not found in the data/i.test(e)),
      ).toBe(true);
      expect(
        result.errors.some((e) => /Geneva.*Lausanne.*Zurich/.test(e)),
      ).toBe(true);
    }
  });

  it("without arcBeats: byte-identical to the captured salience baseline", () => {
    const beats = deriveLocatorStory(locatorMarkers, {
      title: "Three Swiss places",
    });
    expect(beats).toEqual([
      {
        kind: "title",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: [],
        dim: false,
        callout: null,
        copy: "Three Swiss places",
      },
      {
        kind: "establish",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
      {
        kind: "reveal",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: ["Geneva"],
        dim: true,
        callout: {
          region: "Geneva",
          name: "Geneva",
          value: "",
          text: "Geneva",
        },
        copy: "Geneva",
      },
      {
        kind: "reveal",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: ["Lausanne"],
        dim: true,
        callout: {
          region: "Lausanne",
          name: "Lausanne",
          value: "",
          text: "Lausanne",
        },
        copy: "Lausanne",
      },
      {
        kind: "reveal",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: ["Zurich"],
        dim: true,
        callout: {
          region: "Zurich",
          name: "Zurich",
          value: "",
          text: "Zurich",
        },
        copy: "Zurich",
      },
      {
        kind: "takeaway",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Finding #1 — an arc region can be in the DATA but absent from the BASEMAP
// (a partial join: computeChoropleth only throws when NOTHING matches). The gate
// (validateChoroplethConfig) only ever sees the data rows, never the basemap, so it
// cannot catch this — deriveMapStory must fail loud with an HONEST message, not the
// misleading "should have been caught by validation" claim.
// ---------------------------------------------------------------------------

describe("deriveMapStory — arc region absent from the basemap (Finding #1)", () => {
  it("throws a clean, honest error naming the offending region — not the old misleading wording", () => {
    const dataWithOffBasemapRegion: ChoroplethData = {
      regionKey: "region",
      valueField: "value",
      rows: [
        ...choroplethData.rows,
        // "Fribourg" is a real data row but has NO matching feature in
        // choroplethFeatures — a partial join (computeChoropleth tolerates this).
        { region: "Fribourg", value: 50 },
      ],
    };
    const layoutWithGap = computeChoropleth(
      dataWithOffBasemapRegion,
      choroplethFeatures,
      "region",
    );
    const callDerive = () =>
      deriveMapStory(layoutWithGap, choroplethFeatures, "region", {
        title: "Swiss cantons",
        insight: "",
        unit: " pts",
        arcBeats: [
          { region: "Fribourg", role: "establish", text: "Fribourg starts." },
        ],
      });

    expect(callDerive).toThrow(/basemap|absent|did not/i);
    expect(callDerive).not.toThrow(/should have been caught/i);
  });
});

// ---------------------------------------------------------------------------
// Finding #2 — arcBeats: [] must warn like an absent arcBeats (it still renders via
// the salience fallback path — deriveMapStory/deriveSymbolStory gate on `?.length`).
// ---------------------------------------------------------------------------

describe("mapNarrativeFallbackWarning — empty arcBeats (Finding #2)", () => {
  it("warns when arcBeats is an empty array (renders via salience, same as absent)", () => {
    const warning = mapNarrativeFallbackWarning({
      type: "choropleth",
      arcBeats: [],
    });
    expect(warning).not.toBeNull();
  });

  it("stays silent when arcBeats is a non-empty confirmed arc", () => {
    const warning = mapNarrativeFallbackWarning({
      type: "choropleth",
      arcBeats: [{ region: "Geneva", role: "establish", text: "sets" }],
    });
    expect(warning).toBeNull();
  });

  it("still warns when arcBeats is absent (behaviour-preserving)", () => {
    const warning = mapNarrativeFallbackWarning({ type: "choropleth" });
    expect(warning).not.toBeNull();
  });
});
