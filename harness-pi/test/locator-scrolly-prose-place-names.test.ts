import { describe, expect, it } from "bun:test";
import { proseSpelling } from "../craft/_shared/place-labels.mjs";

// gx-locator scrolly (Qwen3.5-9B mvq144 and Gemma 12B mvg96, 2026-11-19): card 4 of a French page read « Kyiv,
// Bucharest, Kharkiv, Rostov-on-Don ». `places[].name` must be MapTiler's spelling (it filters the map's own
// labels), and the example's card copied that same name into its sentence.

const places = [
  { name: "Kyiv", lon: 30.5147, lat: 50.4353 },
  { name: "Bucharest", lon: 26.098, lat: 44.4353 },
  { name: "Kharkiv", lon: 36.23, lat: 49.99 },
  { name: "Rostov-on-Don", lon: 39.71, lat: 47.24 },
];
const said = (text: string) => {
  try {
    proseSpelling(text, places, "fr");
    return "";
  } catch (e) {
    return String((e as Error).message);
  }
};

describe("a scrolly card's place names", () => {
  it("should refuse a French card that prints the map's English spelling", () => {
    expect(said("villes : Kyiv, Bucharest, Kharkiv, Rostov-on-Don.")).toContain(
      '"Kyiv" → "Kiev"',
    );
  });

  it("should name every place it refuses at once", () => {
    expect(said("villes : Kyiv, Bucharest, Kharkiv, Rostov-on-Don.")).toContain(
      '"Rostov-on-Don" → "Rostov-sur-le-Don"',
    );
  });

  it("should accept the page's own names", () => {
    expect(said("villes : Kiev, Bucarest, Kharkiv, Rostov-sur-le-Don.")).toBe(
      "",
    );
  });

  it("should leave an English page alone", () => {
    expect(() => proseSpelling("Kyiv, Bucharest", places, "en")).not.toThrow();
  });
});
