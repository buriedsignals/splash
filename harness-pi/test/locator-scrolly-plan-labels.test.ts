import { describe, expect, it } from "bun:test";
import { locatorPlan } from "../craft/scrolly/locator/plan.mjs";

// gx-locator scrolly (Gemma 12B, mvg93 and the mvg94 replay of the worked example, 2026-11-19), on the live page:
// the subject's name broke inside its number ("Zaporijjia · 6 / 000 MW installés", MapLibre's default 10-em wrap),
// and two French stations' values printed one over the other ("5 460 MW" on "5 320 MW", both anchored below).
function plan() {
  const stub = new Proxy({}, { get: (_, k) => (typeof k === "string" ? `#${k}` : undefined) });
  return locatorPlan({
    tints: stub,
    subjectCountryIso: "UA",
    stations: [
      { lon: 1.9, lat: 51.0, r: 1, label: "5 460 MW", isSubject: false },
      { lon: 0.6, lat: 49.9, r: 1, label: "5 320 MW", isSubject: false },
    ],
    subject: { lon: 34.6, lat: 47.5, label: "Zaporijjia · 6 000 MW installés", riverAt: [33.4, 47], riverLabel: "Dniepr" },
    places: [],
    colours: stub,
    fonts: stub,
    cameras: [],
    statesForCards: [],
    referenceWidth: 1600,
    referenceHeight: 900,
    radiusPx: 1,
    subjectRadiusPx: { rest: 6, named: 10 },
    placeDotPx: 3,
  });
}
const layer = (id: string) => plan().layers.find((l: { id: string }) => l.id === id);

describe("locator scrolly plan — the words drawn on the live map", () => {
  it("should keep the subject's name on one line", () => {
    expect(layer("subject-name").layout["text-max-width"]).toBeGreaterThanOrEqual(30);
  });
  it("should set two neighbouring stations' values on opposite sides of their dots", () => {
    const anchors = layer("station-values").data.features.map((f: { properties: { anchor: string } }) => f.properties.anchor);
    expect(new Set(anchors).size).toBe(2);
  });
  it("should still print every station's value, never drop one to make room", () => {
    expect(layer("station-values").layout["text-allow-overlap"]).toBe(true);
  });
});
