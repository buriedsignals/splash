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
  UNRESOLVABLE_PLACE_KINDS,
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

// --- Live captures, 2026-08-07: the second batch of kinds ------------------------------------
//
// Every payload below is a VERBATIM excerpt (fields trimmed to the ones this module reads) of a
// live MapTiler geocoding response captured while MEASURING which kinds this module can honestly
// answer. The measurements themselves — including the ones that ended in a refusal — are written
// up in geocode.ts beside the kinds they justify.

// GET /geocoding/Lac Léman.json — features[0]. A lake: `major_landform`, category `water`, and
// the tag that actually says lake. Independently confirmed IN the water by Overpass `is_in`
// (2026-08-07): the point is inside `natural=water / water=lake / name=Le Léman`.
const LEMAN = {
  type: "Feature",
  text: "Le Léman",
  place_name: "Le Léman",
  place_type: ["major_landform"],
  properties: {
    categories: ["water"],
    ref: "osm:r332617",
    feature_tags: { natural: "water", water: "lake", ele: "372" },
  },
  geometry: {
    type: "Point",
    coordinates: [6.528399472850651, 46.417352588369205],
  },
};

// GET /geocoding/Lac Noir.json?language=fr — features[0] and features[1]. TWO real lakes of the
// same name, and MapTiler ranks ALGERIA first. First-hit-within-kind would ship the Algerian one
// for a sentence about the Fribourg Schwarzsee: this is the peak defect again, one layer in.
const LAC_NOIR_ALGERIA = {
  type: "Feature",
  text: "Lac Noir",
  place_name: "Lac Noir, Algérie",
  place_type: ["major_landform"],
  properties: {
    categories: ["water"],
    ref: "osm:w265773750",
    feature_tags: { natural: "water", water: "lake" },
  },
  geometry: {
    type: "Point",
    coordinates: [4.602679906530284, 36.69636701909809],
  },
};
const LAC_NOIR_SUISSE = {
  type: "Feature",
  text: "Lac Noir",
  place_name: "Lac Noir, Suisse",
  place_type: ["major_landform"],
  properties: {
    categories: ["water"],
    ref: "osm:r2132952",
    feature_tags: { natural: "water", water: "lake", ele: "1046" },
  },
  geometry: {
    type: "Point",
    coordinates: [7.281545188225664, 46.66547539806942],
  },
};
// features[2] of the same response: the HAMLET named after the lake, 600 m from it. A `place`,
// not a landform — so it is a settlement, and it is not a lake.
const LAC_NOIR_VILLAGE = {
  type: "Feature",
  text: "Lac Noir",
  place_name: "Lac Noir, Planfayon, Suisse",
  place_type: ["place"],
  properties: { kind: "place", ref: "osm:n240041166" },
  geometry: {
    type: "Point",
    coordinates: [7.288334369659424, 46.67033583993985],
  },
};
// features[3]: a RESERVOIR, not a lake. `natural=water` alone does not make a lake either — see
// "Lac de la Joux" below, which is water with nothing saying what kind.
const LAC_NOIR_RESERVOIR = {
  type: "Feature",
  text: "Lac Noir",
  place_name: "Lac Noir, France",
  place_type: ["major_landform"],
  properties: {
    categories: ["water"],
    ref: "osm:w19387142",
    feature_tags: { natural: "water", water: "reservoir", ele: "950" },
  },
  geometry: {
    type: "Point",
    coordinates: [7.096688511568573, 48.11293454147083],
  },
};
// GET /geocoding/Lac de Joux.json — features[2]. Water, unqualified.
const LAC_DE_LA_JOUX = {
  type: "Feature",
  text: "Lac de la Joux",
  place_name: "Lac de la Joux, France",
  place_type: ["major_landform"],
  properties: {
    categories: ["water"],
    ref: "osm:w577554745",
    feature_tags: { natural: "water" },
  },
  geometry: {
    type: "Point",
    coordinates: [6.755775540597142, 46.360653240133395],
  },
};

// GET /geocoding/Lac de Neuchâtel.json?country=ch — features[0] and features[3]. TWO lakes, and
// only one of them answers the query: MapTiler scores the Neuchâtel lake 1 and the unrelated Lac
// des Taillères 0.741667. Refusing on "more than one lake" alone would refuse this.
const NEUCHATEL_LAKE = {
  type: "Feature",
  text: "Lac de Neuchâtel",
  place_name: "Lac de Neuchâtel, Suisse",
  place_type: ["major_landform"],
  relevance: 1,
  properties: {
    categories: ["water"],
    ref: "osm:r390323",
    country_code: "ch",
    feature_tags: { natural: "water", water: "lake", ele: "429" },
  },
  geometry: {
    type: "Point",
    coordinates: [6.856191573581555, 46.903286812391705],
  },
};
const LAC_DES_TAILLERES = {
  type: "Feature",
  text: "Lac des Taillères",
  place_name: "Lac des Taillères, Suisse",
  place_type: ["major_landform"],
  relevance: 0.741667,
  properties: {
    categories: ["water"],
    ref: "osm:w-taillieres",
    country_code: "ch",
    feature_tags: { natural: "water", water: "lake" },
  },
  geometry: {
    type: "Point",
    coordinates: [6.5748336421128215, 46.96706198359574],
  },
};

// GET /geocoding/Glacier de Gorner.json — features[0]. Confirmed ON the ice by Overpass `is_in`
// (2026-08-07): the point is inside `natural=glacier / name=Gornergletscher`.
const GORNER = {
  type: "Feature",
  text: "Glacier du Gorner",
  place_name: "Glacier du Gorner, Suisse",
  place_type: ["major_landform"],
  properties: {
    categories: ["glacier"],
    ref: "osm:r14779748",
    feature_tags: { natural: "glacier", type: "multipolygon" },
  },
  geometry: {
    type: "Point",
    coordinates: [7.8388125057408615, 45.971176951683674],
  },
};
// GET /geocoding/Glacier d'Aletsch.json — features[5]. A LAKE in Nepal whose name is the word
// "glacier". The kind has to come from the tags, never from the name.
const LAKE_CALLED_GLACIER = {
  type: "Feature",
  text: "glacier",
  place_name: "glacier, Népal",
  place_type: ["major_landform"],
  properties: {
    categories: ["water"],
    ref: "osm:w846905682",
    feature_tags: { natural: "water", water: "lake" },
  },
  geometry: {
    type: "Point",
    coordinates: [85.43635625833406, 28.108191024095053],
  },
};

// GET /geocoding/Randa.json?language=fr — features[0] and features[1]. THE SETTLEMENT DEFECT:
// MapTiler ranks the Djibouti village FIRST, 4400 km from the Valais village of the same name
// that sits under the Matterhorn. Both are real settlements, so no kind filter separates them.
const RANDA_DJIBOUTI = {
  type: "Feature",
  text: "Randa",
  place_name: "Randa, Sous-préfecture de Randa, Djibouti",
  place_type: ["place"],
  properties: { kind: "place", ref: "osm:n316808512" },
  geometry: {
    type: "Point",
    coordinates: [42.65768185257912, 11.848328068384399],
  },
};
const RANDA_VALAIS = {
  type: "Feature",
  text: "Randa",
  place_name: "Randa, Valais, Suisse",
  place_type: ["municipality"],
  properties: { kind: "admin_area", ref: "osm:r1685406" },
  geometry: {
    type: "Point",
    coordinates: [7.782411687076092, 46.100279319132106],
  },
};
// GET /geocoding/Randa.json?country=ch — features[1]. The 1991 rockslide scar above the village.
// A landform, not a settlement.
const RANDA_BERGSTURZ = {
  type: "Feature",
  text: "Randa Bergsturz",
  place_name: "Randa Bergsturz, Suisse",
  place_type: ["major_landform"],
  properties: {
    categories: ["scree"],
    ref: "osm:w-scree",
    feature_tags: { natural: "scree" },
  },
  geometry: {
    type: "Point",
    coordinates: [7.780764431054081, 46.11140723689645],
  },
};
// GET /geocoding/Zermatt.json — features[0] and features[1]. The village, then a street in New
// Hampshire. Streets FLOOD settlement queries; they are the noise the kind filter removes.
const ZERMATT = {
  type: "Feature",
  text: "Zermatt",
  place_name: "Zermatt, Valais, Suisse",
  place_type: ["municipality"],
  properties: { kind: "admin_area", ref: "osm:r1685406" },
  geometry: {
    type: "Point",
    coordinates: [7.749253883957863, 46.02120766315873],
  },
};
const ZERMATT_PLACE_NH = {
  type: "Feature",
  text: "Zermatt Place",
  place_name:
    "Zermatt Place, Madison, New Hampshire 03849, États-Unis d'Amérique",
  place_type: ["address"],
  properties: { kind: "street", ref: "osm:w1318952109" },
  geometry: {
    type: "Point",
    coordinates: [-71.12213686108589, 43.933169365640964],
  },
};
// GET /geocoding/Valais.json — features[0]. A REGION, whose returned point landed on a bench on
// a footpath above Oberems (Nominatim reverse, 2026-08-07). Not a town, and not a place.
const VALAIS_REGION = {
  type: "Feature",
  text: "Valais",
  place_name: "Valais, Suisse",
  place_type: ["region"],
  properties: { kind: "admin_area", ref: "osm:r1686699" },
  geometry: {
    type: "Point",
    coordinates: [7.660575695335865, 46.23030648601599],
  },
};

// GET /geocoding/Le Rhône.json — features[4]. ONE OSM WAY of the river, with a bbox 191 km tall,
// and a returned point that Overpass puts 500–1000 m from the nearest stretch of the Rhône —
// Nominatim reverse-geocodes it onto the Route d'Avignon. This is why `river` is refused.
const RHONE_SEGMENT = {
  type: "Feature",
  text: "Le Rhône",
  place_name: "Le Rhône, France",
  place_type: ["major_landform"],
  properties: {
    categories: [],
    ref: "osm:w246430224",
    feature_tags: { waterway: "river" },
  },
  bbox: [4.5, 43.3, 4.9, 45.0],
  geometry: {
    type: "Point",
    coordinates: [4.715704992413521, 44.17776799444442],
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
      // The geocoder's own classification of the FEATURE, kept because it is what separates a
      // town from the region of the same name, and a lake from the hamlet named after it.
      placeType: ["poi"],
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
      placeType: ["poi"],
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

describe("parseFeatures — the fields the second batch of kinds needs", () => {
  it("promotes water= into categories, so a lake is recognisable from its tag", () => {
    const [lake] = parseFeatures({ features: [LEMAN] }, "default");
    expect(lake.categories).toContain("water");
    expect(lake.categories).toContain("lake");
    expect(lake.placeType).toEqual(["major_landform"]);
  });

  it("promotes waterway= too, so a caller can SEE that a hit is a watercourse", () => {
    // The Rhône segment arrives with categories EMPTY — `waterway=river` is the only thing on it
    // that says what it is. Without the promotion a river is indistinguishable from an untyped
    // landform, and the whole reason `river` is refused becomes invisible to the caller.
    const [river] = parseFeatures({ features: [RHONE_SEGMENT] }, "default");
    expect(river.categories).toContain("river");
  });

  it("keeps place_type and kind, which is what tells a town from its region", () => {
    const [town] = parseFeatures({ features: [RANDA_VALAIS] }, "default");
    expect(town.placeType).toEqual(["municipality"]);
    expect(town.kind).toBe("admin_area");
    const [region] = parseFeatures({ features: [VALAIS_REGION] }, "default");
    expect(region.placeType).toEqual(["region"]);
  });
});

describe("chooseCandidate — expect:'lake'", () => {
  it("picks the lake over the hamlet named after it and the stream nearby", () => {
    const chosen = chooseCandidate(
      parseFeatures(
        { features: [LAC_NOIR_VILLAGE, LAC_NOIR_SUISSE] },
        "default",
      ),
      { expect: "lake" },
    );
    expect(chosen?.ref).toBe("osm:r2132952");
    expect(chosen?.lat).toBeCloseTo(46.6655, 4);
  });

  it("THE SETTLEMENT-ERA DEFECT: refuses two lakes of the same name rather than taking the first", () => {
    // MapTiler ranks the ALGERIAN Lac Noir first; the Fribourg one is second. First-hit-within-
    // kind would have shipped Algeria for a Swiss sentence — 1900 km, not 1063 m.
    const chosen = chooseCandidate(
      parseFeatures(
        { features: [LAC_NOIR_ALGERIA, LAC_NOIR_SUISSE] },
        "default",
      ),
      { expect: "lake" },
    );
    expect(chosen).toBeNull();
  });

  it("does not accept a reservoir as a lake", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [LAC_NOIR_RESERVOIR] }, "default"),
      { expect: "lake" },
    );
    expect(chosen).toBeNull();
  });

  it("does not accept bare natural=water: unqualified water is not a lake", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [LAC_DE_LA_JOUX] }, "default"),
      { expect: "lake" },
    );
    expect(chosen).toBeNull();
  });

  it("is not fooled by the near-miss lake MapTiler pads the list with", () => {
    // GET /geocoding/Lac de Neuchâtel.json?country=ch returns the lake at relevance 1 and an
    // unrelated Jura lake at 0.741667. Both are `water=lake`, so counting kinds alone refuses a
    // query that has exactly one right answer. MapTiler's own score for the QUERY separates them.
    const chosen = chooseCandidate(
      parseFeatures(
        { features: [NEUCHATEL_LAKE, LAC_DES_TAILLERES] },
        "default",
      ),
      { expect: "lake" },
    );
    expect(chosen?.name).toBe("Lac de Neuchâtel");
    expect(chosen?.relevance).toBe(1);
    expect(chosen?.countryCode).toBe("ch");
  });

  it("still refuses when two lakes answer the name EQUALLY well", () => {
    // The same mechanism must not soften the real refusal: Algeria and Fribourg both score 1.
    const chosen = chooseCandidate(
      parseFeatures(
        {
          features: [
            { ...LAC_NOIR_ALGERIA, relevance: 1 },
            { ...LAC_NOIR_SUISSE, relevance: 1 },
          ],
        },
        "default",
      ),
      { expect: "lake" },
    );
    expect(chosen).toBeNull();
  });

  it("returns null when nothing among the hits is a lake", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [GORNER, MATTERHORNGLETSCHER] }, "default"),
      { expect: "lake" },
    );
    expect(chosen).toBeNull();
  });
});

describe("chooseCandidate — expect:'glacier'", () => {
  it("picks the glacier", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [GORNER] }, "default"),
      { expect: "glacier" },
    );
    expect(chosen?.name).toBe("Glacier du Gorner");
    expect(chosen?.lon).toBeCloseTo(7.8388, 4);
  });

  it("refuses a LAKE whose name is the word 'glacier' — the kind comes from the tag, not the name", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [LAKE_CALLED_GLACIER] }, "default"),
      { expect: "glacier" },
    );
    expect(chosen).toBeNull();
  });

  it("refuses two glaciers of the same name rather than taking the first", () => {
    const twin = {
      ...GORNER,
      properties: { ...GORNER.properties, ref: "osm:r-elsewhere" },
      geometry: { type: "Point", coordinates: [-73.5, 46.2] },
    };
    const chosen = chooseCandidate(
      parseFeatures({ features: [GORNER, twin] }, "default"),
      { expect: "glacier" },
    );
    expect(chosen).toBeNull();
  });

  it("returns null when the hits are a peak and a summit-side glacier query gone wrong", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [CERVIN_PEAK] }, "poi"),
      { expect: "glacier" },
    );
    expect(chosen).toBeNull();
  });
});

describe("chooseCandidate — expect:'settlement'", () => {
  it("picks the village and drops the streets named after it", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [ZERMATT, ZERMATT_PLACE_NH] }, "default"),
      { expect: "settlement" },
    );
    expect(chosen?.placeName).toBe("Zermatt, Valais, Suisse");
  });

  it("THE DEFECT: refuses 'Randa' rather than shipping the Djibouti village MapTiler ranks first", () => {
    // Both are settlements, so no kind filter separates them; the honest answer is to say so.
    // `country: "ch"` is what resolves it, and it is a HARD filter server-side (measured).
    const chosen = chooseCandidate(
      parseFeatures({ features: [RANDA_DJIBOUTI, RANDA_VALAIS] }, "default"),
      { expect: "settlement" },
    );
    expect(chosen).toBeNull();
  });

  it("with the country narrowed to one settlement, resolves the Valais village", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [RANDA_VALAIS, RANDA_BERGSTURZ] }, "default"),
      { expect: "settlement" },
    );
    expect(chosen?.lon).toBeCloseTo(7.7824, 4);
    expect(chosen?.lat).toBeCloseTo(46.1003, 4);
  });

  it("refuses the REGION of the same name — a town is not its canton", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [VALAIS_REGION] }, "default"),
      { expect: "settlement" },
    );
    expect(chosen).toBeNull();
  });

  it("accepts a bare place node, not only an administrative municipality", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [LAC_NOIR_VILLAGE] }, "default"),
      { expect: "settlement" },
    );
    expect(chosen?.placeName).toBe("Lac Noir, Planfayon, Suisse");
  });

  it("returns null when every hit is a street", () => {
    const chosen = chooseCandidate(
      parseFeatures({ features: [ZERMATT_PLACE_NH] }, "default"),
      { expect: "settlement" },
    );
    expect(chosen).toBeNull();
  });
});

describe("country: the disambiguator that is a HARD filter", () => {
  it("sends a validated country code to MapTiler", async () => {
    let seen = "";
    const spy = (async (u: string) => {
      seen = u;
      return new Response(JSON.stringify({ features: [] }));
    }) as unknown as typeof fetch;
    await geocodePlace("Randa", {
      key: "k",
      expect: "settlement",
      country: "ch",
      fetchImpl: spy,
    });
    expect(new URL(seen).searchParams.get("country")).toBe("ch");
  });

  it("accepts a comma-separated pair, because a border feature is in two countries", async () => {
    let seen = "";
    const spy = (async (u: string) => {
      seen = u;
      return new Response(JSON.stringify({ features: [] }));
    }) as unknown as typeof fetch;
    await geocodePlace("Léman", {
      key: "k",
      expect: "lake",
      country: "ch,fr",
      fetchImpl: spy,
    });
    expect(new URL(seen).searchParams.get("country")).toBe("ch,fr");
  });

  it("REFUSES a country that is not an ISO alpha-2 code, before any request goes out", async () => {
    // Untrusted input reaches this parameter (a country read out of an article). It is a closed
    // vocabulary, so it is allowlisted rather than passed through and hoped for: a typo that the
    // API silently ignores would widen the search back to the whole world without saying so.
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response(JSON.stringify({ features: [] }));
    }) as unknown as typeof fetch;
    await expect(
      geocodePlace("Randa", {
        key: "k",
        expect: "settlement",
        country: "switzerland",
        fetchImpl: spy,
      }),
    ).rejects.toThrow(/country/i);
    expect(called).toBe(false);
  });

  it("refuses a list so long it is not a narrowing any more", async () => {
    const many = [
      "ch",
      "fr",
      "it",
      "de",
      "at",
      "li",
      "es",
      "pt",
      "be",
      "nl",
      "lu",
    ].join(",");
    await expect(
      geocodePlace("Randa", {
        key: "k",
        expect: "settlement",
        country: many,
        fetchImpl: (async () =>
          new Response(
            JSON.stringify({ features: [] }),
          )) as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/country/i);
  });
});

describe("the kinds this module refuses", () => {
  it("names a measured reason for every refused kind", () => {
    for (const kind of ["river", "massif", "landmark", "admin-area"]) {
      const reason = UNRESOLVABLE_PLACE_KINDS[kind];
      expect(typeof reason).toBe("string");
      expect(reason!.length).toBeGreaterThan(40);
    }
  });

  it("refuses a river as an EXPECTATION, so a caller cannot ask for one by accident", () => {
    // `river` is not in ExpectedPlaceKind, so this is a type error at every real call site. The
    // runtime half matters anyway: a kind read out of JSON is a string, and an unknown string
    // must refuse rather than fall through to first-hit-wins.
    const chosen = chooseCandidate(
      parseFeatures({ features: [RHONE_SEGMENT] }, "default"),
      { expect: "river" as never },
    );
    expect(chosen).toBeNull();
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
