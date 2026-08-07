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
import { geocodePlace } from "./geocode";

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
