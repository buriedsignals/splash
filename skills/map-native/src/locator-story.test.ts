import { describe, it, expect } from "bun:test";
import { deriveLocatorStory, locatorBeatsForMode } from "./locator-story.ts";
import type { LocatorMarker } from "./locator-geo.ts";
import type { MapArcBeat } from "./map-story.ts";

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

  it("a DERIVED walk still drops it in sequential mode — its reveals sit on the establishing bounds already, so the dwell really is dead air", () => {
    expect(
      locatorBeatsForMode(derived, "sequential").map((b) => b.kind),
    ).toEqual(["title", "reveal", "reveal", "reveal", "reveal", "takeaway"]);
  });

  it("context mode is untouched either way", () => {
    expect(locatorBeatsForMode(authored, "context")).toEqual(authored);
    expect(locatorBeatsForMode(derived, "context")).toEqual(derived);
  });
});
