// The peak-vs-centroid defect, pinned.
//
// REAL RUN, 2026-08-06 (exports/glaciers-requiem-2026): a map-native LOCATOR video of four
// Alpine sites plotted "Cervin" at lon 7.661000215400804, lat 45.986011489842674. That is not
// the Matterhorn summit — it is MapTiler's `Matterhorngletscher` feature, a GLACIER polygon
// whose returned `center` is its centroid, 1063 m north of the summit, on the Zmutt flank. The
// beat it illustrates reads « Au sommet du Cervin, à 4478 mètres, des cascades torrentielles ».
//
// The candidate payloads below are VERBATIM excerpts of live MapTiler geocoding responses
// captured 2026-08-06 (fields trimmed to the ones this module reads). The live API is proved
// separately by geocode-live.test.ts, which is opt-in because it hits the network — this file
// stays pure and pins the SELECTION, which is where the defect lives.
import { describe, expect, it } from "bun:test";
import {
  chooseCandidate,
  geocodePlace,
  parseFeatures,
  type GeocodeCandidate,
} from "./geocode";

// --- Live captures, 2026-08-06 -------------------------------------------------------------

// GET /geocoding/Matterhorn.json (no `types`) — features[0]. This is the exact feature the
// failing run shipped.
const MATTERHORNGLETSCHER = {
  type: "Feature",
  text: "Matterhorngletscher",
  place_name: "Matterhorngletscher, Suisse",
  place_type: ["major_landform"],
  properties: {
    categories: ["glacier"],
    ref: "osm:r14779829",
    wikidata: "Q6789746",
  },
  geometry: {
    type: "Point",
    coordinates: [7.661000215400804, 45.986011489842674],
  },
};

// GET /geocoding/Cervin.json?types=poi — features[0]. The summit itself, carrying the very
// elevation the beat's sentence names.
const CERVIN_PEAK = {
  type: "Feature",
  text: "Cervin",
  place_name: "Cervin, Zermatt",
  place_type: ["poi"],
  properties: {
    categories: ["peak"],
    ref: "osm:n26863664",
    wikidata: "Q1374",
    feature_tags: {
      natural: "peak",
      importance: "international",
      ele: "4478",
      prominence: "1038",
    },
  },
  geometry: {
    type: "Point",
    coordinates: [7.658602260053158, 45.97642633812452],
  },
};

// GET /geocoding/Cervin.json?types=poi — features[2]. A wine bar in Milan. The POI layer is
// NOT a peak layer; something has to pick.
const CERVIN_WINE_BAR = {
  type: "Feature",
  text: "Cervìn",
  place_name: "Cervìn, Via Zecca Vecchia 4, 20123 Milan, Italie",
  place_type: ["poi"],
  properties: {
    categories: ["wine", "restaurant"],
    feature_tags: { shop: "wine", amenity: "restaurant" },
  },
  geometry: {
    type: "Point",
    coordinates: [9.18438758701086, 45.46263743565096],
  },
};

// GET /geocoding/Glacier d'Aletsch.json (no `types`) — features[0]. The run got this one RIGHT,
// and it must stay right: a glacier subject wants the landform, not a POI.
const ALETSCH = {
  type: "Feature",
  text: "Glacier d'Aletsch",
  place_name: "Glacier d'Aletsch, Suisse",
  place_type: ["major_landform"],
  properties: {
    categories: ["glacier"],
    ref: "osm:w42742456",
    wikidata: "Q204658",
  },
  geometry: {
    type: "Point",
    coordinates: [8.077508042316026, 46.451632464223096],
  },
};

describe("parseFeatures", () => {
  it("reads the fields a resolution has to show back: name, coordinate, categories, elevation", () => {
    const [peak] = parseFeatures({ features: [CERVIN_PEAK] }, "poi");
    expect(peak).toEqual({
      name: "Cervin",
      placeName: "Cervin, Zermatt",
      lon: 7.658602260053158,
      lat: 45.97642633812452,
      categories: ["peak"],
      elevationM: 4478,
      ref: "osm:n26863664",
      layer: "poi",
    });
  });

  it("keeps a feature that carries no elevation, rather than dropping it", () => {
    const [glacier] = parseFeatures(
      { features: [MATTERHORNGLETSCHER] },
      "default",
    );
    expect(glacier.name).toBe("Matterhorngletscher");
    expect(glacier.categories).toEqual(["glacier"]);
    expect(glacier.elevationM).toBeUndefined();
  });

  it("promotes the natural= tag into categories so a peak is recognisable either way", () => {
    // Some features carry natural=peak in feature_tags but an empty categories array.
    const tagged = {
      ...CERVIN_PEAK,
      properties: { ...CERVIN_PEAK.properties, categories: [] },
    };
    const [c] = parseFeatures({ features: [tagged] }, "poi");
    expect(c.categories).toContain("peak");
  });

  it("skips a non-Point geometry rather than inventing a coordinate for it", () => {
    const line = {
      ...ALETSCH,
      geometry: {
        type: "LineString",
        coordinates: [
          [8, 46],
          [8.1, 46.1],
        ],
      },
    };
    expect(parseFeatures({ features: [line] }, "default")).toEqual([]);
  });

  it("skips a MALFORMED non-Point geometry whose coordinates LOOK like a point", () => {
    // The only case that isolates the geometry-TYPE check: well-formed GeoJSON nests a
    // LineString's coordinates, so the numeric check alone already rejects it. A feed that
    // flattens them would otherwise be read as a Point and plotted — a coordinate invented out
    // of one vertex of a line, which is the exact failure mode this module exists to refuse.
    const flattened = {
      ...ALETSCH,
      geometry: { type: "LineString", coordinates: [8.0775, 46.4516] },
    };
    expect(parseFeatures({ features: [flattened] }, "default")).toEqual([]);
  });
});

describe("chooseCandidate — expect:'peak'", () => {
  it("THE DEFECT: prefers the summit over the glacier centroid that shipped", () => {
    const chosen = chooseCandidate(
      [
        ...parseFeatures({ features: [MATTERHORNGLETSCHER] }, "default"),
        ...parseFeatures({ features: [CERVIN_PEAK, CERVIN_WINE_BAR] }, "poi"),
      ],
      { expect: "peak" },
    );
    expect(chosen?.name).toBe("Cervin");
    expect(chosen?.lon).toBeCloseTo(7.6586, 4);
    expect(chosen?.lat).toBeCloseTo(45.9764, 4);
    expect(chosen?.elevationM).toBe(4478);
  });

  it("does not fall back to a wine bar just because it is the only POI", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [CERVIN_WINE_BAR] }, "poi"),
      { expect: "peak" },
    );
    expect(chosen).toBeNull();
  });

  it("returns null rather than a nearest-miss when no candidate is a peak", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [MATTERHORNGLETSCHER, ALETSCH] }, "default"),
      { expect: "peak" },
    );
    expect(chosen).toBeNull();
  });

  it("prefers the peak whose elevation matches an elevation the sentence states", () => {
    // Two real peaks named "Matterhorn": the Alpine one (4478 m) and Matterhorn, Nevada
    // (3250 m). A sentence naming 4478 m disambiguates them; first-hit order does not.
    const nevada: GeocodeCandidate = {
      name: "Matterhorn",
      placeName: "Matterhorn, Elko, États-Unis d'Amérique",
      lon: -115.37534482777119,
      lat: 41.810740532405546,
      categories: ["peak"],
      elevationM: 3250,
      layer: "poi",
    };
    const alpine = parseFeatures({ features: [CERVIN_PEAK] }, "poi")[0];
    const chosen = chooseCandidate([nevada, alpine], {
      expect: "peak",
      elevationM: 4478,
    });
    expect(chosen?.lat).toBeCloseTo(45.9764, 4);
  });
});

describe("the key never reaches an error message", () => {
  const KEY = "sk-not-a-real-key-0123456789";

  it("redacts the key when the transport itself throws (it carries the URL)", async () => {
    // A DNS/timeout failure rejects with the request URL in the message, and the key is IN that
    // URL. This module is the first thing in the tree to put a MapTiler key on a URL it builds,
    // so it is the first that can leak one into a log.
    const throwing = (async (u: string) => {
      throw new Error(`connect ECONNREFUSED for ${u}`);
    }) as unknown as typeof fetch;
    let message = "";
    try {
      await geocodePlace("Cervin", { key: KEY, fetchImpl: throwing });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toContain(KEY);
    expect(message).toContain("Cervin");
    // The REASON survives the redaction — a swallowed cause makes a dead network and an expired
    // key indistinguishable on the journalist's machine, which is where this runs.
    expect(message).toContain("ECONNREFUSED");
    expect(message).toContain("***");
  });

  it("redacts the key on a non-OK response too", async () => {
    const forbidden = (async () =>
      new Response("nope", { status: 403 })) as unknown as typeof fetch;
    let message = "";
    try {
      await geocodePlace("Cervin", { key: KEY, fetchImpl: forbidden });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toContain(KEY);
    expect(message).toContain("403");
  });
});

describe("chooseCandidate — no expectation", () => {
  it("leaves the glacier path alone: the first candidate wins", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [ALETSCH] }, "default"),
      {},
    );
    expect(chosen?.name).toBe("Glacier d'Aletsch");
    expect(chosen?.lon).toBeCloseTo(8.0775, 4);
  });

  it("returns null on an empty candidate list instead of throwing", () => {
    expect(chooseCandidate([], {})).toBeNull();
    expect(chooseCandidate([], { expect: "peak" })).toBeNull();
  });
});
