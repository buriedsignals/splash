import { describe, it, expect } from "bun:test";
import {
  mapArcErrors,
  deriveMapStory,
  mapNarrativeFallbackWarning,
  type MapArcBeat,
} from "./map-story.ts";
import { deriveSymbolStory } from "./symbol-story.ts";
import { deriveLocatorStory } from "./locator-story.ts";
import { deriveCartogramStory } from "./cartogram-story.ts";
import { deriveDotDensityStory } from "./dot-density-story.ts";
import { deriveHexGridStory, frameCell } from "./hex-grid-story.ts";
import {
  computeChoropleth,
  regionBounds,
  type ChoroplethData,
} from "./choropleth-geo.ts";
import { computeCartogram } from "./cartogram-geo.ts";
import { computeDotDensity } from "./dot-density-geo.ts";
import { computeHexGrid } from "./hex-grid-geo.ts";
import type { SymbolPoint } from "./symbol-geo.ts";
import type { LocatorMarker } from "./locator-geo.ts";
import { bbox, booleanPointInPolygon, point as turfPoint } from "@turf/turf";
import {
  validateChoroplethConfig,
  validateLocatorConfig,
  validateCartogramConfig,
  validateDotDensityConfig,
  validateRouteConfig,
  validateHexGridConfig,
} from "./validate-config.ts";
import { computeRouteReveal } from "./route-geo.ts";
import {
  resolveRouteArc,
  resolveRouteWalk,
  routeArcCamera,
  routeStoryToChapters,
} from "./route-story.ts";

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

describe("mapArcErrors wired into validateCartogramConfig", () => {
  const baseCartogramSpec = {
    type: "cartogram",
    basemap: "world",
    title: "Three regions cartogram with a real insight",
    values: [
      { id: "FRA", value: 68 },
      { id: "DEU", value: 84 },
      { id: "ESP", value: 44 },
    ],
  };

  it("passes with a well-formed arcBeats override anchored on real region ids", () => {
    const result = validateCartogramConfig({
      ...baseCartogramSpec,
      arcBeats: [
        { region: "FRA", role: "establish", text: "France starts." },
        { region: "DEU", role: "build", text: "Germany climbs." },
        { region: "ESP", role: "payoff", text: "Spain lands it." },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("fails on an arcBeats override anchored on a non-existent region id, listing the real ids", () => {
    const result = validateCartogramConfig({
      ...baseCartogramSpec,
      arcBeats: [{ region: "Nowhere", role: "establish", text: "sets" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /not found|region/i.test(e))).toBe(true);
      expect(result.errors.some((e) => /FRA/.test(e))).toBe(true);
    }
  });

  it("validates exactly as today when arcBeats is absent (behaviour-preserving)", () => {
    const result = validateCartogramConfig(baseCartogramSpec);
    expect(result.ok).toBe(true);
  });
});

describe("mapArcErrors wired into validateDotDensityConfig", () => {
  const baseDotDensitySpec = {
    type: "dot-density",
    basemap: "world",
    boundaries: "world",
    regionKey: "iso_a3",
    valueField: "value",
    title: "Three regions dot-density with a real insight",
    rows: [
      { iso_a3: "FRA", value: 68 },
      { iso_a3: "DEU", value: 84 },
      { iso_a3: "ESP", value: 44 },
    ],
  };

  it("passes with a well-formed arcBeats override anchored on real regionKey values", () => {
    const result = validateDotDensityConfig({
      ...baseDotDensitySpec,
      arcBeats: [
        { region: "FRA", role: "establish", text: "France starts." },
        { region: "DEU", role: "build", text: "Germany climbs." },
        { region: "ESP", role: "payoff", text: "Spain lands it." },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("fails on an arcBeats override anchored on a regionKey value not in the rows, listing the real ones", () => {
    const result = validateDotDensityConfig({
      ...baseDotDensitySpec,
      arcBeats: [{ region: "Nowhere", role: "establish", text: "sets" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /not found|region/i.test(e))).toBe(true);
      expect(result.errors.some((e) => /FRA/.test(e))).toBe(true);
    }
  });

  it("validates exactly as today when arcBeats is absent (behaviour-preserving)", () => {
    const result = validateDotDensityConfig(baseDotDensitySpec);
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

  // Recaptured 2026-08-07: the reveals no longer sit on the establishing bounds. The
  // few-annotated regime frames each place in a scaled-down copy of the establishing box
  // (locator-story.ts / core/tour-box.ts's `tourStopBox`) — dLon 0.6°, dLat 0.3°, i.e. half
  // this set's own 2.4° × 1.2° spread, centred on the named marker. Pinning all three reveals
  // to [6.1, 46.2, 8.5, 47.4] is what made a locator scrolly of this shape unbuildable.
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
    // Reveal boxes are ±0.6° of longitude by ±0.3° of latitude, not the old constant ±1.5°
    // square: these four cities span 2.4° × 1.2°, and `tourStopBox` halves EACH axis of the
    // establishing box below (core/tour-box.ts). A stop is now NARROWER than that box on both
    // axes — which is the whole point — and it keeps the set's own shape, so it is one clean
    // zoom level in whichever axis the frame ends up fitting to.
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
        camera: [5.5, 45.900000000000006, 6.699999999999999, 46.5],
        highlight: ["Geneva"],
        dim: true,
        callout: {
          region: "Geneva",
          name: "Geneva",
          value: "40 pts",
          text: "Geneva — 40 pts",
        },
        copy: "Geneva — 40 pts",
        pattern: "magnitude",
        rank: 1,
        rankRole: "leader",
      },
      {
        kind: "reveal",
        camera: [6, 46.2, 7.199999999999999, 46.8],
        highlight: ["Lausanne"],
        dim: true,
        callout: {
          region: "Lausanne",
          name: "Lausanne",
          value: "30 pts",
          text: "Lausanne — 30 pts",
        },
        copy: "Lausanne — 30 pts",
        pattern: "magnitude",
        rank: 2,
        rankRole: "leader",
      },
      {
        kind: "reveal",
        camera: [7.9, 47.1, 9.1, 47.699999999999996],
        highlight: ["Zurich"],
        dim: true,
        callout: {
          region: "Zurich",
          name: "Zurich",
          value: "20 pts",
          text: "Zurich — 20 pts",
        },
        copy: "Zurich — 20 pts",
        pattern: "magnitude",
        rank: 3,
        rankRole: "leader",
      },
      {
        kind: "reveal",
        camera: [6.800000000000001, 46.6, 8, 47.199999999999996],
        highlight: ["Bern"],
        dim: true,
        callout: {
          region: "Bern",
          name: "Bern",
          value: "10 pts",
          text: "Bern — 10 pts",
        },
        copy: "Bern — 10 pts",
        pattern: "magnitude",
        rank: 4,
        rankRole: "tail",
      },
      {
        kind: "takeaway",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: [],
        dim: false,
        callout: null,
        // The takeaway's caption used to be "" here — the salience baseline captured the
        // defect, not a choice: with no `insight` the beat carried nothing, so the page closed
        // on its own description and the video on no card at all. It now carries the type's own
        // derived closer (map-story.ts's closers; tests/map-closers.test.ts).
        copy: "Geneva: 40 pts, Bern: 10 pts — a 4-fold gap",
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
    // uses instead.
    //
    // The box is `tourStopBox` (core/tour-box.ts), not the constant ±1.5° these numbers used
    // to assert: these three markers span 2.4° of longitude and 1.2° of latitude, and each
    // axis is halved on its own → ±0.6° by ±0.3°. The old ±1.5° framed every stop WIDER than
    // the box holding all three, which is how a guided tour of four Alpine glaciers ended up
    // as one motionless wide shot — see tour-box.ts's header.
    const allBounds = [6.1, 46.2, 8.5, 47.4];
    const box = (c: number[], expected: number[]) =>
      c.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, 9));
    box(reveals[0].camera, [7.9, 47.1, 9.1, 47.7]); // Zurich ±0.6° × ±0.3°
    expect(reveals[0].camera).not.toEqual(allBounds);
    box(reveals[1].camera, [5.5, 45.9, 6.7, 46.5]); // Geneva ±0.6° × ±0.3°
    box(reveals[2].camera, [6, 46.2, 7.2, 46.8]); // Lausanne ±0.6° × ±0.3°
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

  // Recaptured 2026-08-07 (fix/locator-step-captions): every reveal now declares
  // `pattern: "categorical"`. A locator walk ranks NOTHING — the few-annotated regime follows
  // the markers' input order and a marker has no number at all — and the scrolly caption
  // engine used to read rank off a beat's POSITION, which is how a French page shipped
  // "Pont d'Austerlitz — , the highest of the 5 shown". The tag is the deriver stating what
  // it knows, so the composer no longer has to guess.
  it("without arcBeats: byte-identical to the captured salience baseline", () => {
    const beats = deriveLocatorStory(locatorMarkers, {
      title: "Three Swiss places",
      lang: undefined,
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
        camera: [5.5, 45.900000000000006, 6.699999999999999, 46.5],
        highlight: ["Geneva"],
        dim: true,
        callout: {
          region: "Geneva",
          name: "Geneva",
          value: "",
          text: "Geneva",
        },
        copy: "Geneva",
        pattern: "categorical",
      },
      {
        kind: "reveal",
        camera: [6, 46.2, 7.199999999999999, 46.8],
        highlight: ["Lausanne"],
        dim: true,
        callout: {
          region: "Lausanne",
          name: "Lausanne",
          value: "",
          text: "Lausanne",
        },
        copy: "Lausanne",
        pattern: "categorical",
      },
      {
        kind: "reveal",
        camera: [7.9, 47.1, 9.1, 47.699999999999996],
        highlight: ["Zurich"],
        dim: true,
        callout: {
          region: "Zurich",
          name: "Zurich",
          value: "",
          text: "Zurich",
        },
        copy: "Zurich",
        pattern: "categorical",
      },
      {
        kind: "takeaway",
        camera: [6.1, 46.2, 8.5, 47.4],
        highlight: [],
        dim: false,
        callout: null,
        // The takeaway's caption used to be "" here — the salience baseline captured the
        // defect, not a choice: with no `insight` the beat carried nothing, so the page closed
        // on its own description and the video on no card at all. It now carries the type's own
        // derived closer (map-story.ts's closers; tests/map-closers.test.ts).
        copy: "3 sites, 226 km end to end",
      },
    ]);
  });
});

// Four unit-square regions in a 2x2 arrangement, keyed A..D — same fixture as
// cartogram-story.test.ts's own unit tests, so the wiring proof and the deriver's own
// tests stay comparable.
const cartogramSquare = (
  id: string,
  x: number,
  y: number,
): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
        [x, y],
      ],
    ],
  },
});
const cartogramFeatures: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    cartogramSquare("A", 0, 1),
    cartogramSquare("B", 2, 1),
    cartogramSquare("C", 0, -1),
    cartogramSquare("D", 2, -1),
  ],
};
// Values: B=16 (highest), D=9 (2nd), A=4 (3rd), C=1 (lowest) — same ranking as
// cartogram-story.test.ts, so the ARC below (C, A, D) both skips the top-ranked region (B)
// and reorders the rest, proving it is not just a re-sorted salience walk.
const cartogramValues = [
  { id: "A", value: 4 },
  { id: "B", value: 16 },
  { id: "C", value: 1 },
  { id: "D", value: 9 },
];
const cartogramLayout = computeCartogram(
  { variant: "scaled", values: cartogramValues, valueLabel: "pop" },
  cartogramFeatures,
);
const cartogramArc: MapArcBeat[] = [
  { region: "C", role: "establish", text: "C starts the smallest." },
  { region: "A", role: "build", text: "A grows in the middle." },
  { region: "D", role: "payoff", text: "D closes near the top." },
];

// Reproduces cartogram-story.ts's private `frameCell` — the same "expand a cell bbox to
// >= 50% of the full extent" rule a value-ranked reveal ALSO uses, so an arc-anchored
// camera is pinned to the SAME math a ranked reveal would produce for that cell, not a
// bespoke shape invented for the arc path.
function expectedCartogramCamera(id: string): [number, number, number, number] {
  const cell = cartogramLayout.cells.find((c) => c.id === id)!;
  const [cw, cs, ce, cn] = bbox(cell.feature) as [
    number,
    number,
    number,
    number,
  ];
  const [fw, fs, fe, fn] = cartogramLayout.bounds;
  const cx = (cw + ce) / 2;
  const cy = (cs + cn) / 2;
  const halfW = Math.max((ce - cw) / 2, ((fe - fw) * 0.5) / 2);
  const halfH = Math.max((cn - cs) / 2, ((fn - fs) * 0.5) / 2);
  return [cx - halfW, cy - halfH, cx + halfW, cy + halfH];
}

describe("deriveCartogramStory — applyMapArc wiring", () => {
  it("with a confirmed arcBeats: reveals follow the ARC order (not the value-ranked order), carry the claim text verbatim, and the camera frames the NAMED cell's own bbox — not the map's default framing", () => {
    const beats = deriveCartogramStory(cartogramLayout, {
      title: "Four regions, in the order the story needs",
      arcBeats: cartogramArc,
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    // ARC order (C, A, D) — NOT value-ranked order (B, D, A, C), which the value-ranked
    // walk below would give, and skips B entirely (the arc's own selection, not a cap).
    expect(reveals.map((b) => b.highlight[0])).toEqual(["C", "A", "D"]);
    expect(reveals.map((b) => b.role)).toEqual([
      "establish",
      "build",
      "payoff",
    ]);
    expect(reveals.map((b) => b.copy)).toEqual([
      "C starts the smallest.",
      "A grows in the middle.",
      "D closes near the top.",
    ]);
    for (const b of reveals) {
      expect(b.callout?.text).toBe(b.copy);
    }
    // Camera is the NAMED cell's own frameCell box — never the establish/title full extent,
    // which the value-ranked walk's title/establish/takeaway beats use instead.
    expect(reveals.map((b) => b.camera)).toEqual([
      expectedCartogramCamera("C"),
      expectedCartogramCamera("A"),
      expectedCartogramCamera("D"),
    ]);
    for (const r of reveals)
      expect(r.camera).not.toEqual(cartogramLayout.bounds);
  });

  it("an arcBeats naming a region id that does not exist is refused by name, listing the real ids — not silently dropped", () => {
    const result = validateCartogramConfig({
      type: "cartogram",
      basemap: "world",
      title: "Four regions cartogram with a real insight",
      values: cartogramValues,
      arcBeats: [
        {
          region: "Nowhere",
          role: "establish",
          text: "Nowhere is not on this map.",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /"Nowhere" not found in the data/i.test(e)),
      ).toBe(true);
      expect(result.errors.some((e) => /A.*B.*C.*D/.test(e))).toBe(true);
    }
  });

  it("without arcBeats: byte-identical to the captured value-ranked baseline", () => {
    const beats = deriveCartogramStory(cartogramLayout, {
      title: "Population cartogram",
      description: "Regions scaled by population",
      insight: "B has the most people",
    });
    expect(beats).toEqual([
      {
        kind: "title",
        camera: [0.2499880989371377, -0.8750000000000001, 3, 2],
        highlight: [],
        dim: false,
        callout: null,
        copy: "Population cartogram",
      },
      {
        kind: "establish",
        camera: [0.2499880989371377, -0.8750000000000001, 3, 2],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
      {
        kind: "reveal",
        camera: [1.8124970247342844, 0.78125, 3.1875029752657156, 2.21875],
        highlight: ["B"],
        dim: true,
        callout: {
          region: "B",
          name: "B",
          value: "16",
          text: "16 pop — the highest — B",
        },
        copy: "16 pop — the highest — B",
        pattern: "magnitude",
        rank: 1,
        rankRole: "leader",
      },
      {
        kind: "reveal",
        camera: [1.8124970247342844, -1.21875, 3.1875029752657156, 0.21875],
        highlight: ["D"],
        dim: true,
        callout: {
          region: "D",
          name: "D",
          value: "9",
          text: "9 pop — the 2nd highest — D",
        },
        copy: "9 pop — the 2nd highest — D",
        pattern: "magnitude",
        rank: 2,
        rankRole: "leader",
      },
      {
        kind: "reveal",
        camera: [-0.18750297526571558, 0.78125, 1.1875029752657156, 2.21875],
        highlight: ["A"],
        dim: true,
        callout: {
          region: "A",
          name: "A",
          value: "4",
          text: "4 pop — #3 — A",
        },
        copy: "4 pop — #3 — A",
        pattern: "magnitude",
        rank: 3,
        rankRole: "leader",
      },
      {
        kind: "reveal",
        camera: [-0.18750297526571558, -1.21875, 1.1875029752657156, 0.21875],
        highlight: ["C"],
        dim: true,
        callout: {
          region: "C",
          name: "C",
          value: "1",
          text: "1 pop — #4 — C",
        },
        copy: "1 pop — #4 — C",
        pattern: "magnitude",
        rank: 4,
        rankRole: "tail",
      },
      {
        kind: "takeaway",
        camera: [0.2499880989371377, -0.8750000000000001, 3, 2],
        highlight: [],
        dim: false,
        callout: null,
        copy: "B has the most people",
      },
    ]);
  });
});

// Four unit-square regions in a 2x2 arrangement, keyed A..D — the SAME values/layout shape
// as cartogram-story.test.ts / the cartogram wiring block above (B=16 highest, D=9 2nd,
// A=4 3rd, C=1 lowest), so the ARC below (C, A, D) both skips the top-ranked region (B) and
// reorders the rest, proving it is not just a re-sorted density walk. dotValue:1 keeps each
// region's totalCount == its raw value (no rounding), so the expected callout text is exact.
const dotDensitySquare = (
  id: string,
  x: number,
  y: number,
): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id, name: id },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
        [x, y],
      ],
    ],
  },
});
const dotDensityFeatures: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    dotDensitySquare("A", 0, 1),
    dotDensitySquare("B", 2, 1),
    dotDensitySquare("C", 0, -1),
    dotDensitySquare("D", 2, -1),
  ],
};
const dotDensityValues = [
  { iso_a3: "A", value: 4 },
  { iso_a3: "B", value: 16 },
  { iso_a3: "C", value: 1 },
  { iso_a3: "D", value: 9 },
];
const dotDensityLayout = computeDotDensity(
  {
    regionKey: "iso_a3",
    valueField: "value",
    rows: dotDensityValues,
    dotValue: 1,
  },
  dotDensityFeatures,
  "iso_a3",
);
const dotDensityArc: MapArcBeat[] = [
  { region: "C", role: "establish", text: "C starts the smallest." },
  { region: "A", role: "build", text: "A grows in the middle." },
  { region: "D", role: "payoff", text: "D closes near the top." },
];

// The reveal camera is `regionBounds(region.feature)` — the EXACT expression
// deriveDotDensityStory's own density-ranked walk uses for a reveal's camera (no
// frame-expand step, unlike cartogram's frameCell) — so an arc-anchored camera is pinned
// to the SAME math a ranked reveal would produce for that region, not a bespoke shape
// invented for the arc path.
function expectedDotDensityCamera(
  id: string,
): [number, number, number, number] {
  const region = dotDensityLayout.regions.find((r) => r.key === id)!;
  return regionBounds(region.feature);
}

describe("deriveDotDensityStory — applyMapArc wiring", () => {
  it("with a confirmed arcBeats: reveals follow the ARC order (not the density-ranked order), carry the claim text verbatim, and the camera frames the NAMED region's own bounds — not the map's default framing", () => {
    const beats = deriveDotDensityStory(dotDensityLayout, {
      title: "Four regions, in the order the story needs",
      arcBeats: dotDensityArc,
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    // ARC order (C, A, D) — NOT density-ranked order (B, D, A, C), which the density-ranked
    // walk below would give, and skips B entirely (the arc's own selection, not a cap).
    expect(reveals.map((b) => b.highlight[0])).toEqual(["C", "A", "D"]);
    expect(reveals.map((b) => b.role)).toEqual([
      "establish",
      "build",
      "payoff",
    ]);
    expect(reveals.map((b) => b.copy)).toEqual([
      "C starts the smallest.",
      "A grows in the middle.",
      "D closes near the top.",
    ]);
    for (const b of reveals) expect(b.callout?.text).toBe(b.copy);
    // Camera is the NAMED region's own bounds — never the establish/title full extent, which
    // the density-ranked walk's title/establish/takeaway beats use instead.
    expect(reveals.map((b) => b.camera)).toEqual([
      expectedDotDensityCamera("C"),
      expectedDotDensityCamera("A"),
      expectedDotDensityCamera("D"),
    ]);
    for (const r of reveals)
      expect(r.camera).not.toEqual(dotDensityLayout.bounds);
  });

  it("an arcBeats naming a regionKey value that does not exist is refused by name, listing the real ones — not silently dropped", () => {
    const result = validateDotDensityConfig({
      type: "dot-density",
      basemap: "world",
      boundaries: "world",
      regionKey: "iso_a3",
      valueField: "value",
      title: "Four regions dot-density with a real insight",
      rows: dotDensityValues,
      arcBeats: [
        {
          region: "Nowhere",
          role: "establish",
          text: "Nowhere is not on this map.",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /"Nowhere" not found in the data/i.test(e)),
      ).toBe(true);
      expect(result.errors.some((e) => /A.*B.*C.*D/.test(e))).toBe(true);
    }
  });

  it("without arcBeats: byte-identical to the captured density-ranked baseline", () => {
    const beats = deriveDotDensityStory(dotDensityLayout, {
      title: "Population dot-density",
      description: "Regions dotted by population",
      insight: "B has the most people",
    });
    expect(beats).toEqual([
      {
        kind: "title",
        camera: [0, -1, 3, 2],
        highlight: [],
        dim: false,
        callout: null,
        copy: "Population dot-density",
      },
      {
        kind: "establish",
        camera: [0, -1, 3, 2],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
      {
        kind: "reveal",
        camera: [2, 1, 3, 2],
        highlight: ["B"],
        dim: true,
        callout: { region: "B", name: "B", value: "16", text: "B — 16" },
        copy: "B — 16",
      },
      {
        kind: "reveal",
        camera: [2, -1, 3, 0],
        highlight: ["D"],
        dim: true,
        callout: { region: "D", name: "D", value: "9", text: "D — 9" },
        copy: "D — 9",
      },
      {
        kind: "reveal",
        camera: [0, 1, 1, 2],
        highlight: ["A"],
        dim: true,
        callout: { region: "A", name: "A", value: "4", text: "A — 4" },
        copy: "A — 4",
      },
      {
        kind: "reveal",
        camera: [0, -1, 1, 0],
        highlight: ["C"],
        dim: true,
        callout: { region: "C", name: "C", value: "1", text: "C — 1" },
        copy: "C — 1",
      },
      {
        kind: "takeaway",
        camera: [0, -1, 3, 2],
        highlight: [],
        dim: false,
        callout: null,
        copy: "B has the most people",
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

// ---------------------------------------------------------------------------
// route — the one arc-capable type whose anchors are COMPUTED, not declared.
// `computeRouteReveal` needs the injected geometry to know which territories a route
// crosses at all, so — unlike the five blocks above — a route's arcBeats content
// (does `region` name a real territory?) is NOT checked by validateRouteConfig; it is
// checked by resolveRouteArc, at produce time (see route-story.ts / validate-config.ts's
// validateRouteConfig for the Step 1 finding this asymmetry comes from).
//
// Three unit-square territories side by side along +lon — AAA[0,1], BBB[1,2], CCC[2,3] —
// crossed by a route running west→east through all three, at lat 0.5 (mirrors
// tests/route-geo.test.ts's fixture shape, extended to a 3rd territory so an arc can both
// SKIP one and REORDER the rest, proving it is not just a re-sorted geographic walk).
// ---------------------------------------------------------------------------

const routePoly = (k: string, x0: number): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: k, name: k },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x0, 0],
        [x0 + 1, 0],
        [x0 + 1, 1],
        [x0, 1],
        [x0, 0],
      ],
    ],
  },
});
const routeBoundaries: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [routePoly("AAA", 0), routePoly("BBB", 1), routePoly("CCC", 2)],
};
const routeConfig = {
  type: "route" as const,
  route: [
    [0.2, 0.5],
    [2.8, 0.5],
  ] as [number, number][],
  basemap: "world",
  title: "A path across three lands",
};
const routeLayout = computeRouteReveal(routeConfig, routeBoundaries);
// ARC order (CCC, AAA) — NOT geographic entry order (AAA, BBB, CCC, since the route starts
// inside AAA and exits through BBB into CCC), and skips BBB entirely (the arc's own
// selection, not a cap).
const routeArc: MapArcBeat[] = [
  { region: "CCC", role: "establish", text: "CCC opens the story." },
  { region: "AAA", role: "payoff", text: "AAA closes it." },
];

function expectedRouteCamera(key: string): [number, number, number, number] {
  const t = routeLayout.territories.find((x) => x.key === key)!;
  return routeArcCamera(t);
}

describe("resolveRouteArc — the produce-time anchor resolver", () => {
  it("with a confirmed arcBeats: walks the ARC order (not geographic entry order), carries the claim text verbatim, and the camera frames the NAMED territory's own footprint — not the route's cumulative drawn-through bounds", () => {
    const resolved = resolveRouteArc(routeLayout, routeArc);
    expect(resolved.map((r) => r.territory.key)).toEqual(["CCC", "AAA"]);
    expect(resolved.map((r) => r.text)).toEqual([
      "CCC opens the story.",
      "AAA closes it.",
    ]);
    expect(resolved.map((r) => r.camera)).toEqual([
      expectedRouteCamera("CCC"),
      expectedRouteCamera("AAA"),
    ]);
    for (const r of resolved) expect(r.camera).not.toEqual(routeLayout.bounds);
  });

  it("an arcBeats naming a territory this route does not cross is refused BY NAME, listing the territories it actually crosses", () => {
    const callResolve = () =>
      resolveRouteArc(routeLayout, [
        {
          region: "Nowhere",
          role: "establish",
          text: "Nowhere is not on this route.",
        },
      ]);
    expect(callResolve).toThrow(/"Nowhere".*not one this route crosses/);
    expect(callResolve).toThrow(/AAA.*BBB.*CCC/);
  });
});

describe("routeStoryToChapters — resolveRouteArc wiring", () => {
  it("with a confirmed arcBeats: drawTo steps follow the ARC order and carry the claim text verbatim, not the note/label fallback", () => {
    const story = routeStoryToChapters(
      routeLayout,
      resolveRouteWalk(routeLayout, routeArc),
      { title: routeConfig.title },
    );
    const draws = story.steps.filter((s) => s.action === "drawTo");
    expect(draws).toHaveLength(2); // the arc's own length — not layout.territories.length (3)
    expect(draws.map((s) => s.ref)).toEqual([0, 1]);
    expect(draws.map((s) => s.prose)).toEqual([
      "CCC opens the story.",
      "AAA closes it.",
    ]);
    // The takeaway's sentinel ref is the ARC's length, not the geographic walk's.
    const takeaway = story.steps[story.steps.length - 1];
    expect(takeaway.ref).toBe(2);
  });

  it("an arcBeats naming an unknown territory is refused by name BEFORE the story is ever built — resolveRouteWalk throws while resolving the argument, routeStoryToChapters never runs", () => {
    const callResolve = () =>
      routeStoryToChapters(
        routeLayout,
        resolveRouteWalk(routeLayout, [
          {
            region: "Nowhere",
            role: "establish",
            text: "Nowhere is not on this route.",
          },
        ]),
        { title: routeConfig.title },
      );
    expect(callResolve).toThrow(/"Nowhere".*not one this route crosses/);
    expect(callResolve).toThrow(/AAA.*BBB.*CCC/);
  });

  it("without arcBeats: byte-identical to the captured geographic-order baseline", () => {
    const story = routeStoryToChapters(
      routeLayout,
      resolveRouteWalk(routeLayout, undefined),
      {
        title: routeConfig.title,
        insight: "Three lands, one path.",
      },
    );
    expect(story.steps).toEqual([
      {
        id: "step-0-intro",
        visual: "map",
        action: "flyTo",
        ref: 0,
        prose: "A path across three lands",
        align: "center",
      },
      {
        id: "step-1-overview",
        visual: "map",
        action: "flyTo",
        ref: -1,
        prose: "A path across three lands",
        align: "center",
      },
      {
        id: "step-2-draw",
        visual: "map",
        action: "drawTo",
        ref: 0,
        prose: "AAA",
        align: "center",
      },
      {
        id: "step-3-draw",
        visual: "map",
        action: "drawTo",
        ref: 1,
        prose: "BBB",
        align: "center",
      },
      {
        id: "step-4-draw",
        visual: "map",
        action: "drawTo",
        ref: 2,
        prose: "CCC",
        align: "center",
      },
      {
        id: "step-5-takeaway",
        visual: "map",
        action: "flyTo",
        ref: 3,
        prose: "Three lands, one path.",
        align: "center",
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// resolveRouteWalk — the ONLY place a route's arc/geographic dispatch happens.
// routeStoryToChapters takes the ALREADY-RESOLVED walk as a parameter (not `arcBeats`) —
// deliberately, so there is no second call site inside a render for the caption and the
// camera/highlight (RouteScrolly.tsx) to receive a different value from. This is not a
// hypothetical: it happened TWICE — first a component built its walk order inline, separately
// from routeStoryToChapters's own resolution; then, even after extracting resolveRouteWalk so
// both sides delegated to the SAME function, the component still held two independent CALLS to
// it (one direct, one indirect through routeStoryToChapters's old signature) and a mutation
// that broke only the direct one left every grepped literal textually intact. These tests pass
// ONE resolveRouteWalk() result into routeStoryToChapters — the SAME value a real caller must
// now construct once and thread everywhere, by construction — and assert the steps agree with
// it, so a regression in the shared resolver reddens here directly.
// ---------------------------------------------------------------------------

describe("resolveRouteWalk — the walk routeStoryToChapters and RouteScrolly.tsx both resolve from", () => {
  it("with a confirmed arcBeats: walk order/keys match the ARC (not geographic order), and every draw step's territory-key is in lockstep with routeStoryToChapters's own step order", () => {
    const walk = resolveRouteWalk(routeLayout, routeArc);
    // ARC order (CCC, AAA) — not geographic entry order (AAA, BBB, CCC) — and each entry
    // carries the confirmed camera + verbatim text (never null, unlike the geographic walk).
    expect(walk.map((w) => w.territory.key)).toEqual(["CCC", "AAA"]);
    expect(walk.map((w) => w.text)).toEqual([
      "CCC opens the story.",
      "AAA closes it.",
    ]);
    expect(walk.map((w) => w.camera)).toEqual([
      expectedRouteCamera("CCC"),
      expectedRouteCamera("AAA"),
    ]);

    // The lockstep proof: routeStoryToChapters's draw steps (ref 0..N-1, in order) must name
    // exactly walk[ref].territory, step count included — this is what "the caption and the
    // camera/highlight never disagree" actually means, checked directly rather than assumed.
    // `walk` is passed in DIRECTLY — the same value a real caller must thread, not re-derived.
    const story = routeStoryToChapters(routeLayout, walk, {
      title: routeConfig.title,
    });
    const draws = story.steps.filter((s) => s.action === "drawTo");
    expect(draws).toHaveLength(walk.length);
    draws.forEach((step, i) => {
      expect(step.ref).toBe(i);
      // The step's prose IS the walk entry's text at the same index — the two were built
      // from the exact same resolveRouteWalk() call, not two independent re-derivations.
      expect(step.prose).toBe(walk[i].text);
    });
    // The takeaway sentinel ref is the walk's own length.
    expect(story.steps[story.steps.length - 1].ref).toBe(walk.length);
  });

  it("without arcBeats: the walk is the geographic order, camera/text null (the caller's cumulative-camera/label-fallback branches apply), still in lockstep with routeStoryToChapters", () => {
    const walk = resolveRouteWalk(routeLayout, undefined);
    expect(walk.map((w) => w.territory.key)).toEqual(["AAA", "BBB", "CCC"]);
    for (const w of walk) {
      expect(w.camera).toBeNull();
      expect(w.text).toBeNull();
    }

    const story = routeStoryToChapters(routeLayout, walk, {
      title: routeConfig.title,
    });
    const draws = story.steps.filter((s) => s.action === "drawTo");
    expect(draws).toHaveLength(walk.length);
    draws.forEach((step, i) => expect(step.ref).toBe(i));
  });

  it("an empty arcBeats array behaves exactly like an absent one (falls back to the geographic walk) — mirrors every other arc-capable type's `?.length` gate", () => {
    expect(resolveRouteWalk(routeLayout, [])).toEqual(
      resolveRouteWalk(routeLayout, undefined),
    );
  });
});

describe("validateRouteConfig — arcBeats", () => {
  const baseRoute = {
    type: "route" as const,
    basemap: "world",
    title: "A path across three real lands",
    route: [
      [0.2, 0.5],
      [2.8, 0.5],
    ] as [number, number][],
  };

  it("passes a STRUCTURALLY well-formed arcBeats — content (does `region` name a real territory?) is NOT checked here, only at produce time", () => {
    const result = validateRouteConfig({
      ...baseRoute,
      // "Nowhere" cannot be checked at the gate (no geometry yet) — this is the Step 1
      // asymmetry, not a bug: validateRouteConfig only checks the claim-arc STRUCTURE.
      arcBeats: [
        { region: "Nowhere", role: "establish", text: "sets the scene" },
        { region: "StillNowhere", role: "build", text: "builds the case" },
        { region: "AlsoNowhere", role: "payoff", text: "lands it" },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a STRUCTURALLY malformed arcBeats (no establish) even though the territories can't be checked yet", () => {
    const result = validateRouteConfig({
      ...baseRoute,
      arcBeats: [{ region: "Nowhere", role: "payoff", text: "lands it" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.some((e) => /open.*establish/i.test(e))).toBe(true);
  });

  it("rejects a non-array arcBeats", () => {
    const result = validateRouteConfig({
      ...baseRoute,
      arcBeats: "not-an-array",
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.some((e) => /must be an ARRAY/i.test(e))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hex-grid — the LAST arc-capable type, and the hardest: its units (grid cells) do not
// exist until the data is BINNED, and a hex-grid point carries no name at all
// (HexGridData.points has no label field — see hex-grid-geo.ts). So, unlike every block
// above, the journalist cannot name a data KEY; the anchor is a PLACE — a free-text name
// plus its (lon, lat) — resolved against the binned grid by point-in-polygon (see
// hex-grid-story.ts's deriveHexGridStory / resolveHexGridArc, and MapArcBeat.lon/lat in
// map-arc.ts). Two clusters far enough apart (2°E vs 20°E) that a 30km square grid drops
// every cell in the gap between them — the EMPTY area the Step-1 case needs.
// ---------------------------------------------------------------------------

const hexClusterA = [
  { lon: 2.0, lat: 46.0 },
  { lon: 2.05, lat: 46.02 },
  { lon: 1.95, lat: 45.98 },
  { lon: 2.02, lat: 45.97 },
];
const hexClusterB = [
  { lon: 20.0, lat: 46.0 },
  { lon: 20.05, lat: 46.02 },
  { lon: 19.95, lat: 45.98 },
  { lon: 20.02, lat: 45.97 },
];
const hexGridLayout = computeHexGrid({
  points: [...hexClusterA, ...hexClusterB],
  binShape: "square",
  aggregate: "count",
  cellSizeKm: 30,
});

// Independently re-derives the expected camera by locating the containing cell via the SAME
// point-in-polygon test resolveHexGridArc uses internally, then framing it via the EXPORTED
// frameCell — never re-implementing that framing math, mirroring route's expectedRouteCamera.
function expectedHexGridCamera(
  lon: number,
  lat: number,
): [number, number, number, number] {
  const pt = turfPoint([lon, lat]);
  const idx = hexGridLayout.cells.findIndex((c) =>
    booleanPointInPolygon(pt, c.feature as GeoJSON.Feature<GeoJSON.Polygon>),
  );
  if (idx === -1) throw new Error("test fixture bug: point matches no cell");
  return frameCell(
    bbox(hexGridLayout.cells[idx].feature) as [number, number, number, number],
    hexGridLayout.bounds,
  );
}

describe("deriveHexGridStory — arcBeats anchored on a place, resolved to its cell", () => {
  it("with a confirmed arcBeats: reveals follow the ARC order, carry the claim text verbatim, and the camera frames the CONTAINING cell — not the full extent", () => {
    const beats = deriveHexGridStory(hexGridLayout, {
      title: "Two clusters, one confirmed order",
      arcBeats: [
        {
          region: "The eastern cluster",
          role: "establish",
          text: "It starts in the east.",
          lon: 20.0,
          lat: 46.0,
        },
        {
          region: "The western cluster",
          role: "payoff",
          text: "It closes in the west.",
          lon: 2.0,
          lat: 46.0,
        },
      ],
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals).toHaveLength(2); // the arc's own length — not the ranked cap (5)
    expect(reveals.map((b) => b.copy)).toEqual([
      "It starts in the east.",
      "It closes in the west.",
    ]);
    expect(reveals.map((b) => b.callout?.text)).toEqual([
      "It starts in the east.",
      "It closes in the west.",
    ]);
    // The place NAME the journalist gave — never the rank descriptor the ranked walk uses.
    expect(reveals.map((b) => b.callout?.name)).toEqual([
      "The eastern cluster",
      "The western cluster",
    ]);
    expect(reveals.map((b) => b.role)).toEqual(["establish", "payoff"]);
    expect(reveals.map((b) => b.authored)).toEqual([true, true]);
    expect(reveals.map((b) => b.camera)).toEqual([
      expectedHexGridCamera(20.0, 46.0),
      expectedHexGridCamera(2.0, 46.0),
    ]);
    for (const r of reveals) expect(r.camera).not.toEqual(hexGridLayout.bounds);
  });

  it("a place that falls in an EMPTY cell (no populated cell contains it) is refused BY NAME — Step 1 decision (a): never silently snapped or framed", () => {
    const callDerive = () =>
      deriveHexGridStory(hexGridLayout, {
        title: "Two clusters, one confirmed order",
        arcBeats: [
          {
            region: "Nowhere between them",
            role: "establish",
            text: "x",
            lon: 11,
            lat: 46,
          },
        ],
      });
    expect(callDerive).toThrow(/"Nowhere between them"/);
    expect(callDerive).toThrow(/empty/i);
  });

  it("an anchor missing lon/lat is refused by name — a hex-grid anchor is a coordinate, not a lookup key", () => {
    const callDerive = () =>
      deriveHexGridStory(hexGridLayout, {
        title: "Two clusters, one confirmed order",
        arcBeats: [
          { region: "Somewhere unspecified", role: "establish", text: "x" },
        ],
      });
    expect(callDerive).toThrow(/"Somewhere unspecified"/);
  });

  it("without arcBeats: byte-identical to the value-ranked baseline (see hex-grid-story.test.ts's own suite for the full ranked-path proof)", () => {
    const withArc = deriveHexGridStory(hexGridLayout, {
      title: "Two clusters",
      arcBeats: [
        {
          region: "The eastern cluster",
          role: "establish",
          text: "x",
          lon: 20.0,
          lat: 46.0,
        },
      ],
    });
    const withoutArc = deriveHexGridStory(hexGridLayout, {
      title: "Two clusters",
    });
    // The ranked walk visits every populated cell (4, under the default cap of 5) — the arc
    // above visits exactly 1. The two walks cannot accidentally agree, so this is a real lever.
    expect(withArc.filter((b) => b.kind === "reveal")).toHaveLength(1);
    expect(withoutArc.filter((b) => b.kind === "reveal")).toHaveLength(4);
  });
});

describe("validateHexGridConfig — arcBeats", () => {
  const basePoints = [...hexClusterA, ...hexClusterB];
  const baseHexGrid = {
    type: "hex-grid" as const,
    basemap: "world",
    title: "A confirmed hex-grid arc, structurally valid",
    points: basePoints,
    binShape: "square" as const,
    cellSizeKm: 30,
  };

  it("passes a STRUCTURALLY well-formed arcBeats — content (does this place land on data?) is NOT checked here, only at produce time", () => {
    const result = validateHexGridConfig({
      ...baseHexGrid,
      // "Nowhere" cannot be checked at the gate (computeHexGrid needs @turf/turf, forbidden
      // in the validation import closure — see validate-closure.test.ts) — this is the same
      // Step 1 asymmetry as route's, not a bug: validateHexGridConfig only checks the claim-
      // arc STRUCTURE (role sequence + a well-formed coordinate pair per beat).
      arcBeats: [
        {
          region: "Nowhere",
          role: "establish",
          text: "sets the scene",
          lon: 0,
          lat: 0,
        },
        {
          region: "StillNowhere",
          role: "build",
          text: "builds the case",
          lon: 1,
          lat: 1,
        },
        {
          region: "AlsoNowhere",
          role: "payoff",
          text: "lands it",
          lon: 2,
          lat: 2,
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a STRUCTURALLY malformed arcBeats (no establish) even though the place can't be checked yet", () => {
    const result = validateHexGridConfig({
      ...baseHexGrid,
      arcBeats: [
        { region: "Nowhere", role: "payoff", text: "lands it", lon: 0, lat: 0 },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.some((e) => /open.*establish/i.test(e))).toBe(true);
  });

  it("rejects an arcBeat with no lon/lat, or an out-of-range one — the SHAPE check the gate CAN run, unlike the content check", () => {
    const missing = validateHexGridConfig({
      ...baseHexGrid,
      arcBeats: [{ region: "Nowhere", role: "establish", text: "x" }],
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok)
      expect(missing.errors.some((e) => /lon/i.test(e))).toBe(true);

    const outOfRange = validateHexGridConfig({
      ...baseHexGrid,
      arcBeats: [
        { region: "Nowhere", role: "establish", text: "x", lon: 999, lat: 0 },
      ],
    });
    expect(outOfRange.ok).toBe(false);
    if (!outOfRange.ok)
      expect(outOfRange.errors.some((e) => /lon/i.test(e))).toBe(true);
  });

  it("rejects a non-array arcBeats", () => {
    const result = validateHexGridConfig({
      ...baseHexGrid,
      arcBeats: "not-an-array",
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.some((e) => /must be an ARRAY/i.test(e))).toBe(true);
  });
});
