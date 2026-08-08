import { describe, it, expect } from "bun:test";
import { deriveLocatorStory, locatorBeatsForMode } from "./locator-story.ts";
import type { LocatorMarker } from "./locator-geo.ts";
import type { MapArcBeat } from "./map-story.ts";
import { WIDE_TOUR_DELTA } from "./core/tour-box.ts";

// Rémy's own run, 2026-08-06 — four glaciers inside 90 km, toured as a `story`.
const glaciers: LocatorMarker[] = [
  {
    lon: 8.077508042316026,
    lat: 46.451632464223096,
    label: "Glacier d'Aletsch",
  },
  { lon: 7.661000215400804, lat: 45.986011489842674, label: "Cervin" },
  { lon: 8.39847520305841, lat: 46.62606149864873, label: "Glacier du Rhône" },
  {
    lon: 7.547186841148459,
    lat: 46.00520315741525,
    label: "Glacier du Mont Miné",
  },
];
const glacierArc: MapArcBeat[] = [
  { region: "Glacier d'Aletsch", role: "establish", text: "Aletsch." },
  { region: "Cervin", role: "build", text: "Le Cervin." },
  { region: "Glacier du Rhône", role: "turn", text: "Le Rhône." },
  { region: "Glacier du Mont Miné", role: "payoff", text: "Le Mont Miné." },
];

const width = (c: number[]) => c[2]! - c[0]!;
const height = (c: number[]) => c[3]! - c[1]!;
const centre = (c: number[]) => [(c[0]! + c[2]!) / 2, (c[1]! + c[3]!) / 2];

describe("deriveLocatorStory — a guided tour of tightly-clustered markers actually travels", () => {
  const beats = deriveLocatorStory(glaciers, {
    title: "L'été 2026 a mis les glaciers alpins à nu",
    arcBeats: glacierArc,
  });
  const establish = beats.find((b) => b.kind === "establish")!;
  const reveals = beats.filter((b) => b.kind === "reveal");

  it("frames each stop TIGHTER than the establishing shot — a tour zooms in, it does not zoom out", () => {
    for (const r of reveals) {
      expect(width(r.camera)).toBeLessThan(width(establish.camera));
      expect(height(r.camera)).toBeLessThan(height(establish.camera));
    }
  });

  it("moves the camera further between consecutive stops than the width of the frame it is holding — so a stop is a NEW view, not the same wide view with a different pin lit", () => {
    for (let i = 1; i < reveals.length; i++) {
      const a = centre(reveals[i - 1]!.camera);
      const b = centre(reveals[i]!.camera);
      const travelled = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
      expect(travelled).toBeGreaterThan(width(reveals[i]!.camera));
    }
  });

  it("still centres each stop on its own marker", () => {
    expect(centre(reveals[0]!.camera)[0]).toBeCloseTo(glaciers[0]!.lon, 9);
    expect(centre(reveals[0]!.camera)[1]).toBeCloseTo(glaciers[0]!.lat, 9);
    expect(centre(reveals[2]!.camera)[0]).toBeCloseTo(glaciers[2]!.lon, 9);
  });

  it("keeps the establishing and closing beats on the whole set — the tour zooming in must not cost the reader the territory", () => {
    const all: [number, number, number, number] = [
      7.547186841148459, 45.986011489842674, 8.39847520305841,
      46.62606149864873,
    ];
    expect(beats[0]!.camera).toEqual(all); // title
    expect(establish.camera).toEqual(all);
    expect(beats.at(-1)!.camera).toEqual(all); // takeaway
  });
});

// The five Seine-side sites of locator-few.json — annotated places, no categories, so
// deriveLocatorStory takes its FEW-ANNOTATED branch. A scrolly of exactly this shape could not
// be produced at all: every reveal was pinned to `allBounds`, so the sticky map held one frame
// for the whole story and skills/scrolly's reduced-motion guard refused the build ("vacuous
// check: step 3's camera equals step 2's").
const seineSites: LocatorMarker[] = [
  {
    lon: 2.3699,
    lat: 48.8503,
    label: "Pont d'Austerlitz",
    note: "Start line where the 85-boat athletes' parade entered the Seine.",
  },
  { lon: 2.3499, lat: 48.853, label: "Notre-Dame de Paris" },
  { lon: 2.3376, lat: 48.8606, label: "Louvre riverfront" },
  { lon: 2.313, lat: 48.8606, label: "Pont Alexandre III" },
  { lon: 2.2895, lat: 48.8584, label: "Eiffel Tower / Trocadéro" },
];

describe("deriveLocatorStory — a derived walk of a few annotated places tours them too", () => {
  const beats = deriveLocatorStory(seineSites, {
    title: "Where the Paris 2024 opening ceremony unfolded",
  });
  const establish = beats.find((b) => b.kind === "establish")!;
  const reveals = beats.filter((b) => b.kind === "reveal");

  it("gives every reveal its OWN frame — the whole story no longer holds one camera", () => {
    const frames = new Set(reveals.map((r) => JSON.stringify(r.camera)));
    expect(frames.size).toBe(reveals.length);
    for (const r of reveals) {
      expect(r.camera).not.toEqual(establish.camera);
    }
  });

  it("frames each stop TIGHTER than the establishing shot on both axes, whatever SHAPE the set has", () => {
    for (const r of reveals) {
      expect(width(r.camera)).toBeLessThan(width(establish.camera));
      expect(height(r.camera)).toBeLessThan(height(establish.camera));
    }
  });

  it("centres each stop on its own marker", () => {
    reveals.forEach((r, i) => {
      expect(centre(r.camera)[0]).toBeCloseTo(seineSites[i]!.lon, 9);
      expect(centre(r.camera)[1]).toBeCloseTo(seineSites[i]!.lat, 9);
    });
  });

  it("keeps the establishing and closing beats on the whole set", () => {
    const all: [number, number, number, number] = [
      2.2895, 48.8503, 2.3699, 48.8606,
    ];
    expect(beats[0]!.camera).toEqual(all); // title
    expect(establish.camera).toEqual(all);
    expect(beats.at(-1)!.camera).toEqual(all); // takeaway
  });

  it("keeps the caption on each place's own note", () => {
    expect(reveals[0]!.copy).toBe(seineSites[0]!.note);
    expect(reveals[1]!.copy).toBe("Notre-Dame de Paris");
  });
});

describe("deriveLocatorStory — a set with NO spread has no tour to serve", () => {
  const one: LocatorMarker[] = [
    { lon: 6.1432, lat: 46.2044, label: "Rue du Stand 26" },
  ];
  const beats = deriveLocatorStory(one, { title: "One address" });

  it("frames every beat on the same box — nothing to fly to is not a defect, it is the story", () => {
    const frames = new Set(beats.map((b) => JSON.stringify(b.camera)));
    expect(frames.size).toBe(1);
  });

  it("does NOT hand the renderer a zero-area point — that box solved to zoom 22, a blank tile", () => {
    const [w, s, e, n] = beats[0]!.camera;
    expect(e - w).toBeCloseTo(WIDE_TOUR_DELTA * 2, 12);
    expect(n - s).toBeCloseTo(WIDE_TOUR_DELTA * 2, 12);
    expect((w + e) / 2).toBeCloseTo(6.1432, 9);
    expect((s + n) / 2).toBeCloseTo(46.2044, 9);
  });
});

describe("locatorBeatsForMode", () => {
  const authored = deriveLocatorStory(glaciers, {
    title: "T",
    arcBeats: glacierArc,
  });
  const derived = deriveLocatorStory(glaciers, { title: "T" });

  it("an AUTHORED walk keeps its establishing overview in sequential mode — the tour now zooms in, so this is the only shot that shows the territory it crosses", () => {
    const kinds = locatorBeatsForMode(authored, "sequential").map(
      (b) => b.kind,
    );
    expect(kinds).toContain("establish");
    expect(kinds).toEqual([
      "title",
      "establish",
      "reveal",
      "reveal",
      "reveal",
      "reveal",
      "takeaway",
    ]);
  });

  it("a DERIVED walk that tours keeps it too — it zooms in at every stop now, so the establish beat is its only wide shot before the close", () => {
    expect(
      locatorBeatsForMode(derived, "sequential").map((b) => b.kind),
    ).toEqual([
      "title",
      "establish",
      "reveal",
      "reveal",
      "reveal",
      "reveal",
      "takeaway",
    ]);
  });

  it("drops it only when the reveals REALLY sit on the establishing bounds — then the dwell is the dead air beatsForMode describes", () => {
    const still = deriveLocatorStory(
      [{ lon: 6.1432, lat: 46.2044, label: "Rue du Stand 26" }],
      { title: "T" },
    );
    expect(locatorBeatsForMode(still, "sequential").map((b) => b.kind)).toEqual(
      ["title", "reveal", "takeaway"],
    );
  });

  it("context mode is untouched either way", () => {
    expect(locatorBeatsForMode(authored, "context")).toEqual(authored);
    expect(locatorBeatsForMode(derived, "context")).toEqual(derived);
  });
});

// ---------------------------------------------------------------------------
// A LOCATOR RANKS NOTHING, AND ITS COUNT WORD IS FURNITURE.
//
// The categorized regime walks categories in ALPHABETICAL order and captions each with a
// count. Both facts have to reach the caption engine: position is not rank here (so
// scrolly's rank fallback, which reads rank off position, must be switched off), and
// "sites" is a word splash generates — it has to come out of the locale table like every
// other generated word, or a French page says "Écoles — 3 sites, the highest of the 5
// shown" and an Italian one says "sites" too.
// ---------------------------------------------------------------------------
describe("deriveLocatorStory — the categorized regime declares itself categorical", () => {
  const sites: LocatorMarker[] = [
    { lon: 6.1, lat: 46.2, label: "École A", category: "Écoles" },
    { lon: 6.2, lat: 46.3, label: "École B", category: "Écoles" },
    { lon: 6.3, lat: 46.1, label: "Hôpital", category: "Hôpitaux" },
  ];

  it("tags every reveal categorical, so no ranking language is asserted over the alphabet", () => {
    const beats = deriveLocatorStory(sites, { title: "T", lang: "fr" });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(2);
    expect(reveals.every((b) => b.pattern === "categorical")).toBe(true);
  });

  it("localizes the count word, and carries it INSIDE the callout value", () => {
    const fr = deriveLocatorStory(sites, { title: "T", lang: "fr" });
    const frReveals = fr.filter((b) => b.kind === "reveal");
    // Category order is `[...new Set(...)].sort()` — UTF-16 code units, so "Hôpitaux" (H)
    // precedes "Écoles" (É). Which is itself why a rank read off POSITION here would be a
    // claim about the alphabet, not about the data.
    expect(frReveals.map((b) => b.copy)).toEqual([
      "Hôpitaux — 1 site",
      "Écoles — 2 sites",
    ]);
    // The count belongs to the VALUE, not to the free text: scrolly composes its caption
    // from name + value, so a count word left outside them is a count word the page loses.
    expect(frReveals.map((b) => b.callout!.value)).toEqual([
      "1 site",
      "2 sites",
    ]);

    const de = deriveLocatorStory(sites, { title: "T", lang: "de" });
    expect(
      de.filter((b) => b.kind === "reveal").map((b) => b.callout!.value),
    ).toEqual(["1 Standort", "2 Standorte"]);

    const it_ = deriveLocatorStory(sites, { title: "T", lang: "it" });
    expect(
      it_.filter((b) => b.kind === "reveal").map((b) => b.callout!.value),
    ).toEqual(["1 sito", "2 siti"]);

    const en = deriveLocatorStory(sites, { title: "T", lang: undefined });
    expect(
      en.filter((b) => b.kind === "reveal").map((b) => b.callout!.value),
    ).toEqual(["1 site", "2 sites"]);
  });

  it("tags the few-annotated regime categorical too — a walk of places ranks nothing either", () => {
    const places: LocatorMarker[] = [
      { lon: 2.36, lat: 48.85, label: "Pont d'Austerlitz", note: "Départ." },
      { lon: 2.28, lat: 48.85, label: "Tour Eiffel", note: "Final." },
    ];
    const beats = deriveLocatorStory(places, { title: "T", lang: "fr" });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.every((b) => b.pattern === "categorical")).toBe(true);
    expect(reveals.every((b) => b.callout!.value === "")).toBe(true);
  });
});
