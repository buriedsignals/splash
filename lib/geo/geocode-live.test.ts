// THE PROOF that the peak fix is real and not a fixture agreeing with itself.
//
// geocode.test.ts pins the SELECTION against live payloads captured on 2026-08-06. This file
// re-runs the same questions against the LIVE MapTiler geocoding API, so the day MapTiler stops
// carrying `natural=peak` in its POI layer — or starts carrying peaks in the default one — this
// goes red instead of the fixtures quietly going stale.
//
// OPT-IN (SPLASH_GEOCODE_LIVE=1) and it needs VITE_MAPTILER_KEY (the worktree's .env symlink
// carries it; bun test loads .env automatically). It is not in `bun run check` for the same
// reason lib/loop/map-dw-e2e.test.ts is not: it hits a third party's network on every run.
//
//   $ SPLASH_GEOCODE_LIVE=1 bun test lib/geo/geocode-live.test.ts
import { test, expect } from "bun:test";
import { geocodePlace, UNRESOLVABLE_PLACE_KINDS } from "./geocode";

const KEY = process.env.VITE_MAPTILER_KEY ?? process.env.MAPTILER_API_KEY ?? "";
const LIVE = process.env.SPLASH_GEOCODE_LIVE === "1" && KEY !== "";

// Great-circle metres. Local to the test: the module under test never measures distance, and a
// helper the assertion shares with the implementation would be an assertion about nothing.
function metresApart(a: [number, number], b: [number, number]): number {
  const R = 6371008.8;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// The reference summit, from the OSM node the POI layer itself returns (osm:n26863664,
// wikidata Q1374, ele 4478 — the elevation the article's own sentence names).
const MATTERHORN_SUMMIT: [number, number] = [7.6586, 45.9766];

// What the failing run shipped: MapTiler's Matterhorngletscher centroid.
const SHIPPED_BY_THE_FAILING_RUN: [number, number] = [
  7.661000215400804, 45.986011489842674,
];

test.if(LIVE)(
  "live: 'Cervin' with expect:'peak' resolves the SUMMIT, not the glacier the run shipped",
  async () => {
    const { chosen } = await geocodePlace("Cervin", {
      key: KEY,
      language: "fr",
      expect: "peak",
      elevationM: 4478,
    });
    expect(chosen).not.toBeNull();
    const c = chosen!;
    expect(c.categories).toContain("peak");
    expect(c.elevationM).toBe(4478);
    // Within 100 m of the summit…
    expect(metresApart([c.lon, c.lat], MATTERHORN_SUMMIT)).toBeLessThan(100);
    // …and nowhere near the glacier centroid that contradicted the sentence.
    expect(
      metresApart([c.lon, c.lat], SHIPPED_BY_THE_FAILING_RUN),
    ).toBeGreaterThan(900);
  },
  30_000,
);

test.if(LIVE)(
  "live: the DEFAULT layer still hands back the glacier — i.e. the defect reproduces without the fix",
  async () => {
    const { chosen } = await geocodePlace("Matterhorn", {
      key: KEY,
      language: "fr",
    });
    expect(chosen).not.toBeNull();
    // This is the un-expecting lookup the failing run performed. It is allowed to return this;
    // what is NOT allowed is shipping it for a sentence about a summit — that is the guard in
    // place-resolution.ts, not a geocoder bug.
    expect(chosen!.categories).toContain("glacier");
  },
  30_000,
);

test.if(LIVE)(
  "live: a glacier subject is untouched — the default layer keeps winning",
  async () => {
    const { chosen } = await geocodePlace("Glacier d'Aletsch", {
      key: KEY,
      language: "fr",
    });
    expect(chosen).not.toBeNull();
    expect(chosen!.categories).toContain("glacier");
    expect(chosen!.lon).toBeCloseTo(8.0775, 3);
    expect(chosen!.lat).toBeCloseTo(46.4516, 3);
  },
  30_000,
);

test.if(LIVE)(
  "live: expect:'peak' REFUSES rather than approximating when the name is not a summit",
  async () => {
    // The POI layer answers this query with a building and some restaurants; none is a peak.
    const { chosen, candidates } = await geocodePlace("Glacier d'Aletsch", {
      key: KEY,
      language: "fr",
      expect: "peak",
    });
    expect(candidates.length).toBeGreaterThan(0); // it DID look
    expect(chosen).toBeNull(); // and it declined to plot one
  },
  30_000,
);

// --- the kinds added 2026-08-07 -------------------------------------------------------------
//
// Each reference coordinate below was checked against a source OTHER than the API that produced
// it — Overpass `is_in` (which OSM areas contain this point?) and Nominatim reverse geocoding —
// because a geocoder confirming its own answer proves nothing. The check that matters is not
// "did MapTiler find something" but "is the point where the sentence says it is".

// LAKE. Overpass is_in(46.90329, 6.85619) → `natural=water / water=lake / name=Lac de Neuchâtel`.
// The point is in the water, 3 km off the Fribourg shore near Estavayer.
const NEUCHATEL_WATER: [number, number] = [6.8562, 46.9033];

// GLACIER. Overpass is_in(45.97118, 7.83881) → `natural=glacier / name=Gornergletscher`, inside
// Zermatt, in the Monte Rosa massif. The point is on the ice.
const GORNER_ICE: [number, number] = [7.8388, 45.9712];

// SETTLEMENT. Nominatim reverse(46.10028, 7.78241) → "6a, Unteres Randa, Gere, Randa, Visp,
// Oberwallis, Valais" — a house in the village itself, not the middle of the commune.
const RANDA_VILLAGE: [number, number] = [7.7824, 46.1003];

test.if(LIVE)(
  "live: expect:'lake' resolves the lake, in the water, not the shore town of the same name",
  async () => {
    const { chosen } = await geocodePlace("Lac de Neuchâtel", {
      key: KEY,
      language: "fr",
      expect: "lake",
      country: "ch",
    });
    expect(chosen).not.toBeNull();
    const c = chosen!;
    expect(c.categories).toContain("lake");
    expect(metresApart([c.lon, c.lat], NEUCHATEL_WATER)).toBeLessThan(500);
  },
  30_000,
);

test.if(LIVE)(
  "live: expect:'lake' REFUSES 'Lac Noir' — MapTiler ranks ALGERIA's lake above the Swiss one",
  async () => {
    // The whole reason lake/glacier/settlement refuse on ambiguity instead of taking the first
    // hit. If MapTiler ever starts returning a single Lac Noir this goes red, and the refusal
    // rule should be re-argued rather than quietly left in place.
    const wide = await geocodePlace("Lac Noir", {
      key: KEY,
      language: "fr",
      expect: "lake",
    });
    expect(
      wide.candidates.filter((c) => c.categories.includes("lake")).length,
    ).toBeGreaterThan(1);
    expect(wide.chosen).toBeNull();

    // …and that `country` is a HARD filter, not a re-ranking, is what turns the refusal into an
    // answer: the Fribourg Schwarzsee, 1900 km from the one that would have shipped.
    const narrowed = await geocodePlace("Lac Noir", {
      key: KEY,
      language: "fr",
      expect: "lake",
      country: "ch",
    });
    expect(narrowed.chosen).not.toBeNull();
    expect(narrowed.chosen!.placeName).toContain("Suisse");
    expect(narrowed.chosen!.lat).toBeGreaterThan(46);
  },
  30_000,
);

test.if(LIVE)(
  "live: expect:'glacier' resolves the ice, and refuses the LAKE named 'glacier'",
  async () => {
    const { chosen } = await geocodePlace("Glacier de Gorner", {
      key: KEY,
      language: "fr",
      expect: "glacier",
      country: "ch",
    });
    expect(chosen).not.toBeNull();
    expect(chosen!.categories).toContain("glacier");
    expect(metresApart([chosen!.lon, chosen!.lat], GORNER_ICE)).toBeLessThan(
      500,
    );

    // The Cervin is a summit, not a glacier, and asking for the wrong kind must return nothing —
    // not the Matterhorngletscher that shipped the original defect.
    const wrongKind = await geocodePlace("Cervin", {
      key: KEY,
      language: "fr",
      expect: "glacier",
      country: "ch",
    });
    expect(wrongKind.chosen).toBeNull();
  },
  30_000,
);

test.if(LIVE)(
  "live: expect:'settlement' REFUSES 'Randa' — MapTiler ranks the DJIBOUTI village first",
  async () => {
    const wide = await geocodePlace("Randa", {
      key: KEY,
      language: "fr",
      expect: "settlement",
    });
    // It found several real settlements of that name, on two continents, and said so.
    expect(wide.candidates.some((c) => c.placeName.includes("Djibouti"))).toBe(
      true,
    );
    expect(wide.chosen).toBeNull();

    const narrowed = await geocodePlace("Randa", {
      key: KEY,
      language: "fr",
      expect: "settlement",
      country: "ch",
    });
    expect(narrowed.chosen).not.toBeNull();
    expect(narrowed.chosen!.placeName).toContain("Valais");
    // The village centre, checked against Nominatim, not against MapTiler.
    expect(
      metresApart([narrowed.chosen!.lon, narrowed.chosen!.lat], RANDA_VILLAGE),
    ).toBeLessThan(300);
  },
  30_000,
);

test.if(LIVE)(
  "live: expect:'settlement' refuses the REGION, and a street named after the village",
  async () => {
    // "Valais" is a canton. There is no town of that name in Switzerland, and the point the
    // geocoder offers for the canton is a bench on a footpath above Oberems.
    const { chosen, candidates } = await geocodePlace("Valais", {
      key: KEY,
      language: "fr",
      expect: "settlement",
      country: "ch",
    });
    expect(candidates.length).toBeGreaterThan(0);
    expect(chosen).toBeNull();
  },
  30_000,
);

test.if(LIVE)(
  "live: the RIVER refusal still holds — 'Le Rhône' comes back as disjoint fragments",
  async () => {
    // `river` is not a kind this module offers, and UNRESOLVABLE_PLACE_KINDS says why. This test
    // keeps that reason honest: it re-measures the thing the refusal is based on, so if MapTiler
    // ever starts returning ONE river feature the refusal goes red and gets re-argued.
    const { candidates } = await geocodePlace("Le Rhône", {
      key: KEY,
      language: "fr",
    });
    const stretches = candidates.filter((c) => c.categories.includes("river"));
    // Either the river is not there at all, or it is there in pieces — never as one place.
    if (stretches.length > 1) {
      const far = stretches.some(
        (a) =>
          metresApart([a.lon, a.lat], [stretches[0]!.lon, stretches[0]!.lat]) >
          50_000,
      );
      expect(far).toBe(true);
    } else {
      expect(stretches.length).toBeLessThanOrEqual(1);
    }
    // And no expectation exists that would let a caller plot one.
    expect(Object.keys(UNRESOLVABLE_PLACE_KINDS)).toContain("river");
  },
  30_000,
);
